"""Candidate EXG references for the legacy checks, for review: the input to efm-exg-references.json.

For each legacy family (crosswalk.py's families of dei-validations.json entries) and each concept it checks, the
EXG section 3 section whose code the check would carry in EXG mode.  A message code takes the section, not the row,
so a concept whose candidate rows all lie in one section is settled even when the row is not.

Candidates, by the rulings in resources/exg/handoffs/mapping-rulings.md:
  1. rows that bind the concept and cite the family's EFM section (in the "EFM v68 Ref" cell);
  2. not 3.1.1, which creates no checks, and not "A {n} fact is absent." rows, which belong to the legacy file's
     implicit absence check (crosswalk.py's unexpectedFamilies), not to these families;
  3. rows whose context class (the "c" column) is compatible with the legacy entry's axis binding.  The axis key
     is only a filter here: no axis binds undimensioned contexts (the required context, or any undimensioned one,
     depending on the check), so it is compatible with r, se and a; "a" (business contact or US agent) with bc and
     a; "f" (former address) with fa and a; "oef:class" with cc and a; the class-of-stock keys with r, se and a;
  4. where several sections remain, narrowed in turn, each step applied only when it leaves something:
     a. rows whose EFM cell code is the legacy validation code ("oph" stays on the all-contexts "neither or both"
        row it is);
     b. rows in a specific context class over all-contexts (c = a) rows;
     c. rows where the concept is the subject of the check, not a condition: in "If ... then ...", the concepts
        after "then"; otherwise every concept the check names;
     d. the concept's home section: rows that check that concept alone;
     e. rows whose Incl scope shares an instance type with the legacy family's gate;
  5. a ruling in mapping-rulings.md, where one exists (RULINGS below), overrides the above.  A ruling for concept ""
     is for the whole check: it is written as a row of its own, for checks whose messages name no concept (a
     required taxonomy, the required context's duration).  RULING_ROWS gives the guide rows a ruling rests on.

Tiers in the output: "code" (one section, and the row's EFM cell code is the legacy validation code), "section" (one
section, EFM section agrees but the cell code does not), "ruling", "several" (for review), "none" (unlinked).

Also written: absence-candidates.tsv, for the legacy file's implicit absence check.  Filing.py reports a concept
unexpected (from a "(blank)" or "(blank-error)" entry) with the EFM section of the entries that name the concept
for that context; EXG states the same check as "A {n} fact is absent." rows.  Each (EFM section of an entry naming
the concept, concept) maps to the section of the concept's absence row in a context compatible with that entry's
axis key, with the rulings in ABSENCE_RULINGS (the business-contact phone to 3.2.1.4, as for the other checks).  A
concept with no absence row maps to the section whose concept table lists it (tier "home"), or by
ABSENCE_HOME_RULINGS where several do or none does.

Usage: python3 references.py <crosswalk out dir with crosswalk.json> <guide.json> <plugin validate dir> <out dir>
"""
import collections, csv, json, os, re, sys

# rulings recorded in resources/exg/handoffs/mapping-rulings.md: (EFM section, legacy validation code, concept or "*") -> EXG section
RULINGS = {
    ("6.5.46", "security-axis", "*"): "3.2.4.1",
    ("6.5.46", "ot1", "*"): "3.2.4.1",
    ("6.5.46", "te", "*"): "3.2.4.3",
    ("6.5.46", "t1", "*"): "3.2.4.4",
    # N-2: registration flags and file numbers are 3.1.24.1, amendments 3.1.24.2
    ("6.5.55", "n2c", "dei:DocumentRegistrationStatement"): "3.1.24.1",
    ("6.5.55", "n2c", "dei:InvestmentCompanyActRegistration"): "3.1.24.1",
    ("6.5.55", "o", "dei:DocumentRegistrationStatement"): "3.1.24.1",
    ("6.5.55", "o", "dei:InvestmentCompanyActRegistration"): "3.1.24.1",
    ("6.5.55", "ov", "dei:DocumentRegistrationStatement"): "3.1.24.1",
    # business-contact phone: 3.2.1.4 "Phone", where the area code is checked with it (review, 2026-10-10)
    ("6.5.51", "r", "dei:LocalPhoneNumber"): "3.2.1.4",
    ("6.5.51", "o", "dei:LocalPhoneNumber"): "3.2.1.4",
    # rows that cite another EFM section, or name the concept differently (review, 2026-10-28)
    ("6.5.47", "r", "dei:EntityAddressCountry"): "3.1.22.3",
    ("6.5.51", "o3", "dei:ContactPersonnelFaxNumber"): "3.2.1.1",
    ("6.5.55", "n2e", "dei:ExhibitsOnly462dFileNumber"): "3.1.24.6",
    ("6.5.58.02", "fdepflag-present", "rxp:*"): "3.3.2",
    ("6.5.58.10", "r", "rxp:AlternativeReportingRegime"): "3.3.1",
    ("6.5.59.02", "p1y-ending-on", "*"): "3.4",
    ("6.5.59.03", "monthly-facts", "*"): "3.4",
    ("6.5.59.04", "future", "dei:DocumentPeriodEndDate"): "3.1.7",
    # facts of a taxonomy not among the instance's permitted entry points (1.3 table)
    ("6.5.55", "(supported-taxonomy)", "cef:*"): "1.3",
    ("6.5.56", "(supported-taxonomy)", "vip:*"): "1.3",
    # concept "": the whole check, for checks whose messages name no concept (MessageReferences.inferredMsgSection)
    ("6.5.55", "taxonomy-url-required-in-dts", ""): "1.3",
    ("6.5.56", "taxonomy-url-required-in-dts", ""): "1.3",
    ("6.5.58.01", "taxonomy-url-required-in-dts", ""): "1.3",
    ("6.5.59.01", "taxonomy-url-required-in-dts", ""): "1.3",
    ("6.5.60", "taxonomy-url-required-in-dts", ""): "1.3",
    ("6.5.60", "taxonomy-url-unexpected-in-dts", ""): "1.3",
    ("6.5.57", "required-context-duration", ""): "3.2.6",
    ("6.5.77", "item-facts-dependency", ""): "3.1.23.8",
    # the facts these name are absent from the DTS when the check fails, so its messages name none
    ("6.5.49", "taxonomy-version-required", ""): "3.1.23.2",
    ("6.5.54", "taxonomy-version-required", ""): "3.1.16",
}

# the guide rows a ruling rests on, where its candidates do not show them (section#row)
RULING_ROWS = {
    ("6.5.47", "r", "dei:EntityAddressCountry"): ["3.1.22.3#3"],
    ("6.5.51", "o3", "dei:ContactPersonnelFaxNumber"): ["3.2.1.1#4"],
    ("6.5.55", "n2e", "dei:ExhibitsOnly462dFileNumber"): ["3.1.24.6#9", "3.1.24.6#10"],
    ("6.5.58.02", "fdepflag-present", "rxp:*"): ["3.3.2#1", "3.3.2#3"],
    ("6.5.58.10", "r", "rxp:AlternativeReportingRegime"): ["3.3.1#1"],
    ("6.5.59.02", "p1y-ending-on", "*"): ["3.4#1"],
    ("6.5.57", "required-context-duration", ""): ["3.2.6#4", "3.2.6#5"],
    ("6.5.77", "item-facts-dependency", ""): ["3.1.23.8#1"],
}

COMPATIBLE = {
    "": {"r", "se", "a", ""},
    "a": {"bc", "a"},
    "f": {"fa", "a"},
    "oef:class": {"cc", "a"},
    "c": {"r", "se", "a", ""},
    "c-or-required-context": {"r", "se", "a", ""},
}


def subjectSlots(check):
    """{n} slots a check is about: after "then" in an "If ... then ..." check, else all of them."""
    m = re.match(r"\s*If\b.*?\bthen\b(.*)$", check, re.S | re.I)
    return set(re.findall(r"\{\d+\}", m.group(1) if m else check))


def typesOf(described, sets):
    """Instance types from crosswalk.describeTypes' "s: AF, QF; i: 8K.A" form."""
    bySet = collections.defaultdict(set)
    for r in sets["instanceTypes"]:
        bySet[r["submissionSet"]].add(r["instanceType"])
    out = set()
    for part in described.split(";"):
        kind, _, codes = part.strip().partition(":")
        for code in (c.strip() for c in codes.split(",") if c.strip()):
            out |= bySet[code] if kind.strip() == "s" else {code}
    return out


def rowTypes(row, sets):
    """Instance types a row's Incl cell names (submission sets expanded; ALL is every instance type)."""
    cell = row["incl"]
    if cell["all"]:
        return {r["instanceType"] for r in sets["instanceTypes"]}
    out = set(cell["i"])
    for r in sets["instanceTypes"]:
        if r["submissionSet"] in cell["s"]:
            out.add(r["instanceType"])
    return out


def main(crosswalkDir, guidePath, validateDir, outDir):
    with open(os.path.join(crosswalkDir, "crosswalk.json")) as fh:
        cw = json.load(fh)
    with open(guidePath) as fh:
        guide = json.load(fh)
    with open(os.path.join(validateDir, "resources", "dei-validations.json")) as fh:
        dei = json.load(fh)
    with open(os.path.join(validateDir, "resources", "exg-set-definitions.json")) as fh:
        sets = json.load(fh)
    import importlib.util
    spec = importlib.util.spec_from_file_location("InstanceTypes", os.path.join(validateDir, "InstanceTypes.py"))
    IT = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(IT)
    entries = dei["sub-type-element-validations"]
    concepts = collections.defaultdict(dict)
    for c in guide["concepts"]:
        concepts[c["Section"]][c["Elt"].strip()] = c["Concept"].strip()
    rows = []
    for v in guide["validations"]:
        sec = v["Section"]
        if not sec.startswith("3.") or sec == "3.1.1" or v.get("rowDeleted"):
            continue
        check = (v.get("Check") or v.get("Assertion") or "").replace("\n", " ").strip()
        if re.match(r"^A \{\d+\} fact is absent\.?$", check):
            continue
        refs = (v.get("EFM v68 Ref") or v.get("Ref") or "").replace("\xa0", " ")
        text = check + " " + (v.get("On failure") or "")
        slots = set(re.findall(r"\{\d+\}", text))
        rows.append({"section": sec, "row": v["Row"], "c": (v.get("c") or "").strip(), "check": check,
                     "incl": IT.parseScopeCell(sets, v.get("Incl") or v.get("Types") or ""),
                     "bound": {concepts[sec].get(n): n for n in slots if concepts[sec].get(n)},
                     "subjects": {concepts[sec].get(n) for n in subjectSlots(check) if concepts[sec].get(n)},
                     "refSections": re.findall(r"§\s*([\d.]+\d)", refs),
                     "codes": [t.strip() for t in re.split(r"[,;]", re.sub(r"§\s*[\d.]+", "", refs)) if t.strip()]})
    titles = guide["sections"]
    guideRows = {(v["Section"], str(v["Row"])): v for v in guide["validations"] if not v.get("rowDeleted")}

    def rulingRows(key):
        """RULING_ROWS[key] in the candidates' form ("3.2.6#4 c= The required context period is 6 months.")."""
        texts = []
        for ref in RULING_ROWS.get(key, ()):
            sec, _sep, row = ref.partition("#")
            v = guideRows[(sec, row)]
            texts.append("{}#{} c={} {}".format(sec, row, (v.get("c") or "").strip(),
                                                (v.get("Check") or "").replace("\n", " ").strip()[:70]))
        return texts

    out = []
    for f in cw["families"]:
        if f["file"] != "dei" or f["msgSection"]:
            continue
        sev = entries[f["entries"][0]]
        axis = sev.get("axis", "")
        compatible = COMPATIBLE.get(axis, {"r", "se", "a", ""})
        val = (f["validation"] or "").lower()
        for name in f["names"].split():
            cand = [r for r in rows if name in r["bound"] and f["efm"] and f["efm"] in r["refSections"]]
            ctx = [r for r in cand if r["c"] in compatible]
            sectionsBeforeNarrowing = len({r["section"] for r in ctx})
            familyTypes = typesOf(f["instanceTypes"], sets)
            codesOf = lambda r: {c.lower() for c in r["codes"]} | {c.lower().rstrip("*") for c in r["codes"]}
            for narrow in (lambda r: val in codesOf(r),
                           lambda r: r["c"] != "a",
                           lambda r: name in r["subjects"],
                           lambda r: set(r["bound"]) == {name},
                           lambda r: bool(rowTypes(r, sets) & familyTypes)):
                if len({r["section"] for r in ctx}) <= 1:
                    break
                kept = [r for r in ctx if narrow(r)]
                if kept:
                    ctx = kept
            secs = sorted({r["section"] for r in ctx})
            rulingKey = next((k for k in ((f["efm"], f["validation"], name), (f["efm"], f["validation"], "*")) if k in RULINGS), None)
            ruling = RULINGS.get(rulingKey)
            if ruling:
                tier, chosen = "ruling", ruling
            elif not cand:
                tier, chosen = "none", ""
            elif len(secs) == 1:
                codeMatch = any(val in {c.lower() for c in r["codes"]} | {c.lower().rstrip("*") for c in r["codes"]}
                                for r in ctx if r["section"] == secs[0])
                tier, chosen = ("code" if codeMatch else "section"), secs[0]
            elif not secs:
                tier, chosen = "several", ""  # candidates, but none in a compatible context
            else:
                tier, chosen = "several", ""
            out.append({
                "family": f["id"], "entries": " ".join(map(str, f["entries"])), "efm": f["efm"], "validation": f["validation"],
                "axis": axis, "concept": name, "tier": tier, "exgSection": chosen,
                "sectionsBeforeNarrowing": sectionsBeforeNarrowing, "familyInstanceTypes": f["instanceTypes"],
                "exgTitle": titles.get(chosen, ""),
                "efmCodePrefix": "EFM." + ".".join(p.zfill(2) if i else p for i, p in enumerate(f["efm"].split("."))) if f["efm"] else "",
                "exgCodePrefix": "EXG." + ".".join(p.zfill(2) if i else p for i, p in enumerate(chosen.split("."))) if chosen else "",
                "candidates": " | ".join(rulingRows(rulingKey)) if rulingKey in RULING_ROWS else
                              " | ".join("{}#{} c={} {}".format(r["section"], r["row"], r["c"], r["check"][:70])
                                         for r in (ctx if chosen or secs else cand)),
                "otherContexts": " | ".join("{}#{} c={}".format(r["section"], r["row"], r["c"]) for r in cand if r not in ctx),
            })
    # rulings for a whole check (concept ""), whatever concepts its entries name
    for (efm, validation, name), chosen in RULINGS.items():
        if name != "":
            continue
        ents = [i for i, e in enumerate(entries) if e.get("efm") == efm and e.get("validation") == validation]
        if not ents:
            print("ruling for no entry:", efm, validation)
        for axis in sorted({entries[i].get("axis", "") for i in ents}):
            out.append({
                "family": "", "entries": " ".join(str(i) for i in ents if entries[i].get("axis", "") == axis),
                "efm": efm, "validation": validation, "axis": axis, "concept": "", "tier": "ruling", "exgSection": chosen,
                "sectionsBeforeNarrowing": 0, "familyInstanceTypes": "", "exgTitle": titles.get(chosen, ""),
                "efmCodePrefix": "EFM." + ".".join(p.zfill(2) if i else p for i, p in enumerate(efm.split("."))),
                "exgCodePrefix": "EXG." + ".".join(p.zfill(2) if i else p for i, p in enumerate(chosen.split("."))),
                "candidates": " | ".join(rulingRows((efm, validation, name))), "otherContexts": "",
            })

    os.makedirs(outDir, exist_ok=True)
    cols = list(out[0])
    with open(os.path.join(outDir, "candidates.tsv"), "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(cols)
        for r in out:
            w.writerow([r[c] for c in cols])
    tiers = collections.Counter(r["tier"] for r in out)
    print(len(out), "family-concept pairs:", dict(tiers))
    with open(os.path.join(outDir, "candidates.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    writeSpotCheck(out, dei, os.path.join(outDir, "spot-check.md"))
    writeAbsence(guide, concepts, entries, os.path.join(outDir, "absence-candidates.tsv"))


def normaliseNames(names):
    """An entry's xbrl-names as prefixed concepts (dei: when unprefixed)."""
    names = names if isinstance(names, list) else [names]
    return [n if ":" in n else "dei:" + n for n in names if isinstance(n, str)]


ABSENCE_RULINGS = {
    ("dei:LocalPhoneNumber", "a"): "3.2.1.4",  # as RULINGS: the business-contact phone is 3.2.1.4
    # business-contact address lines 2 and 3: 3.1.22.2, as their other checks (its absence rows are c = r)
    ("dei:EntityAddressAddressLine2", "a"): "3.1.22.2",
    ("dei:EntityAddressAddressLine3", "a"): "3.1.22.2",
    # class contexts of N-CSR: 3.2.6, as the other 6.5.57 class checks (review, 2026-10-28)
    ("dei:TradingSymbol", "oef:class"): "3.2.6",
    ("dei:NoTradingSymbolFlag", "oef:class"): "3.2.6",
}

# a concept with no absence row: the section whose concept table lists it ("home"), where one does besides 3.1.1;
# otherwise, or to choose among several, these rulings (review, 2026-10-28)
ABSENCE_HOME_RULINGS = {
    ("6.5.55", "dei:InvestmentCompanyActRegistration"): "3.1.24.1",  # as RULINGS: the N-2 registration flags
    ("6.5.46", "dei:Security12bTitle"): "3.2.4.1",  # as RULINGS: security-axis
    ("6.5.46", "dei:Security12gTitle"): "3.2.4.1",
    ("6.5.46", "dei:SecurityExchangeName"): "3.2.4.3",  # as RULINGS: te
    ("6.5.57", "dei:SecurityExchangeName"): "3.2.6",  # class contexts, as the other 6.5.57 class checks
    ("6.5.51", "dei:ContactPersonnelFaxNumber"): "3.2.1.1",  # listed as dei:ContactPersonnelFax
    ("6.5.55", "dei:ExhibitsOnly462dFileNumber"): "3.1.24.6",  # listed as dei:ExhibitOnly462dFileNumber
    ("6.5.59.02", "sro:CmspStpPrgrsTextBlock"): "3.4",  # the 17AD-27 text blocks, one of which 3.4 lists
    ("6.5.59.02", "sro:CmspActnIntdsToTakeForStpTextBlock"): "3.4",
    ("6.5.59.03", "sro:CmspStpPrgrsTextBlock"): "3.4",
}


def writeAbsence(guide, concepts, entries, path):
    """Implicit absence: (EFM section, concept) of a legacy "unexpected" message -> EXG absence-row section."""
    absent = collections.defaultdict(list)
    for v in guide["validations"]:
        sec = v["Section"]
        if not sec.startswith("3.") or sec == "3.1.1" or v.get("rowDeleted"):
            continue
        m = re.match(r"^A (\{\d+\}) fact is absent\.?$", (v.get("Check") or v.get("Assertion") or "").strip())
        if m and concepts[sec].get(m.group(1)):
            absent[concepts[sec][m.group(1)]].append((sec, v["Row"], (v.get("c") or "").strip()))
    pairs = collections.OrderedDict()  # (efm, concept) -> set of axis keys
    for e in entries:
        if e.get("validation") in (None, "fany") or all(k.startswith("comment") for k in e) or not e.get("efm"):
            continue
        for n in normaliseNames(e.get("xbrl-names", e.get("xbrl-name"))):
            pairs.setdefault((e["efm"], n), set()).add(e.get("axis", ""))
    rows = []
    home = collections.defaultdict(set)  # concept -> sections whose concept tables list it
    for sec, elts in concepts.items():
        if sec.startswith("3.") and sec != "3.1.1":
            for concept in elts.values():
                home[concept].add(sec)
    for (efm, name), axes in pairs.items():
        if name not in absent:
            if name.endswith(":*") or name.startswith("header:"):
                continue
            homes = sorted(home.get(name, ()))
            ruling = ABSENCE_HOME_RULINGS.get((efm, name))
            if ruling:
                tier, chosen = "ruling", ruling
            elif len(homes) == 1:
                tier, chosen = "home", homes[0]
            else:
                tier, chosen = ("several" if homes else "none"), ",".join(homes)
            rows.append([efm, "(unexpected)", "", name, tier, chosen, "", " ".join(sorted(axes))])
            continue
        secs, used = set(), []
        for axis in sorted(axes):
            ruling = ABSENCE_RULINGS.get((name, axis))
            cand = [r for r in absent[name] if r[2] in COMPATIBLE.get(axis, {"r", "se", "a", ""})]
            if ruling:
                secs.add(ruling); used += [r for r in absent[name] if r[0] == ruling]
            else:
                secs |= {r[0] for r in cand}; used += cand
        tier = "absence" if len(secs) == 1 else ("several" if secs else "none")
        rows.append([efm, "(unexpected)", "", name, tier, ",".join(sorted(secs)) if tier != "absence" else secs.pop(),
                     " | ".join("{}#{} c={}".format(*r) for r in used), " ".join(sorted(axes))])
    with open(path, "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(["efm", "validation", "axis", "concept", "tier", "exgSection", "candidates", "legacyAxes"])
        w.writerows(rows)
    print(len(rows), "absence pairs:", dict(collections.Counter(r[4] for r in rows)))


def writeSpotCheck(out, dei, path):
    """The settled pairs by EXG section, for review."""
    legend = {k: (v.get("validation") or "")[:70] for k, v in dei["validations"].items()}
    settled = [r for r in out if r["tier"] in ("code", "section", "ruling")]
    bySection = collections.defaultdict(list)
    for r in settled:
        bySection[r["exgSection"]].append(r)
    lines = ["# Spot-check list: legacy checks and the EXG section whose code each would carry", "",
             "For review. Each line is one legacy check (a family of `dei-validations.json` entries) and one concept "
             "it checks, with the EDGAR XBRL Guide section 3 section whose code the check's message would carry in "
             "EXG mode: the code prefix changes from the EFM section's to the EXG section's, and the rest of the "
             "code (the message key) stays.",
             "",
             "Tiers: **code**, one section and the row's EFM cell code is the legacy validation code; **section**, "
             "one section and the EFM section agrees; **ruling**, decided in "
             "`validate/resources/exg/handoffs/mapping-rulings.md`. Rows: the EXG rows that decided it.", "",
             "{} of {} family-concept pairs; the rest are in README.md.".format(len(settled), len(out)), ""]
    for sec in sorted(bySection, key=lambda s: [int(x) for x in s.split(".")]):
        rs = bySection[sec]
        lines.append("## {} {} ({})\n".format(sec, rs[0]["exgTitle"], rs[0]["exgCodePrefix"]))
        lines.append("| Legacy entries | EFM | Validation | Concept | Tier | Rows |\n|---|---|---|---|---|---|")
        for r in sorted(rs, key=lambda r: (r["efm"], r["family"], r["concept"])):
            rows = ", ".join(x.split(" c=")[0] for x in r["candidates"].split(" | ") if x)
            lines.append("| {} | {} | `{}` {} | {} | {} | {} |".format(r["entries"], r["efm"], r["validation"],
                         legend.get(r["validation"], ""), r["concept"], r["tier"], rows))
        lines.append("")
    with open(path, "w") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
