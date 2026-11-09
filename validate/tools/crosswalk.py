"""Crosswalk: how the EDGAR plugin's table-driven rules are scoped, against the EDGAR XBRL Guide's instance types.

Reads, and changes nothing:
  - the plugin's dei-validations.json and ft-validations.json (the rules), exg-set-definitions.json (EXG 1.1,
    Tables 6-1 to 6-4) and InstanceTypes.py (the resolver), from the plugin's validate/ directory;
  - guide.json, the guide's tables as resources/exg/build/extract.py writes them from the Word source.

Writes into an output directory:
  - families.tsv  one row per family of plugin rules (one check instantiated per submission type, see familyKey):
                  its scope stated in instance types where that is exact, and where not, which submissions the
                  plugin and the instance types disagree on; its link to EXG section 3 rows
  - rows.tsv      one row per EXG section 3 table row: its Incl/Excl parsed, tokens that do not parse, linked rules
  - report.md     the counts

Method.  A scope is compared as a function over situations, not as a list of names.  A situation is one instance
of one submission: submission type, dei:DocumentType, attachment document type, investment company type, and the
registrant's entity sets.  The universe is every submission type named in Table 6-1 or in the plugin's rules,
each with its plausible forms inside and its exhibits (situations()).  For each situation:
  - the plugin rule applies or not, by the gate Filing.py uses (pluginApplies);
  - the resolver gives its submission sets and instance types (InstanceTypes.py, unchanged), once per plausible
    combination of entity sets;
  - an EXG row applies or not, by its Incl and Excl cells (rowApplies).
A rule's scope is exactly expressible in instance types when one set of instance types selects the same
situations the rule's gate does.  The candidate is the union of the instance types of the situations where the
rule applies; it is exact when no situation outside the rule's gate has one of them, and every situation inside
the gate has at least one instance type for some entity sets.

Readings of the guide that this depends on, which are ours (the guide does not settle them):
  - Exhibit instances.  As the resolver reads Table 6-4: an instance that is itself an exhibit named by a matching
    row has those rows' instance types only.  For "s:" cells, it is in a submission set only where that set
    holds nothing but exhibits (FE, SE, TO): an 8-K's Exhibit 98 is EX98.SPAC, not "s: 8K".  A submission set whose Table 6-4 rows all name an exhibit (FE, SE) holds only those exhibits'
    instances, so an S-1's primary document is not "in FE" although Table 6-1 lists S-1 under FE; otherwise
    3.1.5's "Excl s: FE" would exclude every S-1 primary document.
  - "s: ALL" and "i: ALL" are every instance that is in a submission set or has an instance type, exhibits
    included.

Entity sets.  The plugin has no entity axis, so where EXG scopes by entity set the comparison takes the entity sets
the proposal determines from the submission (entity-sets-proposal.md) as the registrant's; every other entity set
that a Table 6-4 row of the submission's sets names is tried too, and only reported as EXG narrowing the rule.

Usage: python3 crosswalk.py <plugin validate dir> <guide.json> <out dir>
"""
import collections, csv, importlib.util, json, os, re, sys

FUND_FORMS = ("N-1A", "N-2", "N-3", "N-4", "N-6")
# exhibit instances: attachment document type -> dei:DocumentType variants it carries
EXHIBIT_DOC_TYPES = {
    "EX-98": ("EX-98",),
    "EX-99.4R HISTORIC": ("EX-99.4R HISTORIC",),
    "EX-2.01": ("2.01 SD",),
    "EX-99.K SDR": ("K SDR",),
    "EX-99.L SDR": ("L SDR",),
}
SBSEF_EXHIBITS = tuple("EX-99.{}.SBSEF".format(x) for x in "CDEFHIJKLPQRS")
FEE_EXHIBIT = "EX-FILING FEES"
# Filing.py: attachmentDocumentTypeReqSubDocTypePattern; the plugin appends §<exhibit> to the submission type
REQ_SUB_DOC_TYPE = re.compile(r"(EX-98|EX-99\.4R HISTORIC).*")
# sub-type literals that are document or attachment types, not submission types (the plugin's desktop-preview
# convention, dei-validations.json comment3); they are not EDGAR submission types and get no situations of their own
def isPseudoSubmissionType(t):
    return t.startswith("EX-") or t in ("2.01 SD", "K SDR", "L SDR")


def loadInstanceTypes(validateDir):
    spec = importlib.util.spec_from_file_location("InstanceTypes", os.path.join(validateDir, "InstanceTypes.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------- plugin rules

def compileSubTypeSet(classes, forms):
    """Util.py compileSubTypeSet: expand @class references; '!not!' and '*' stay as members."""
    out, seen = [], set()
    def walk(fs):
        for f in (fs if isinstance(fs, list) else [fs]):
            if isinstance(f, list):
                walk(f)
            elif f.startswith("@"):
                if f not in seen and f[1:] in classes:
                    seen.add(f)
                    walk(classes[f[1:]])
            elif f not in out:
                out.append(f)
    walk(forms)
    return set(out)


def loadRules(validateDir, fileName, kind):
    with open(os.path.join(validateDir, "resources", fileName)) as fh:
        data = json.load(fh)
    classes = data["sub-type-classes"]
    rules = []
    for index, sev in enumerate(data["sub-type-element-validations"]):
        if all(k.startswith("comment") for k in sev):
            continue
        subTypes = compileSubTypeSet(classes, sev.get("sub-types", sev.get("sub-type", [])))
        if "*" in subTypes:
            subTypes = {"all"}
        rules.append({
            "kind": kind, "index": index, "sev": sev, "subTypes": subTypes,
            "pattern": re.compile(sev["sub-types-pattern"]) if "sub-types-pattern" in sev else None,
            "docTypes": sev.get("docTypes"),
            "names": normaliseNames(sev.get("xbrl-names", sev.get("xbrl-name"))),
            "efm": sev.get("efm"), "msgSection": sev.get("msgSection"), "validation": sev.get("validation"),
        })
    return rules, classes


def normaliseNames(names):
    if names is None:
        return []
    if isinstance(names, str):
        names = [names]
    flat = []
    for n in names:
        if isinstance(n, list):
            flat.extend(n)
        else:
            flat.append(n)
    return [n if ":" in n else "dei:" + n for n in flat]


def pluginApplies(rule, submissionType, deiDocumentType, attachmentDocumentType):
    """The gate in Filing.py's loop over sub-type-element-validations: a rule that fails it is skipped (and its
    names become unexpected for the form)."""
    subTypes = rule["subTypes"]
    if subTypes in ({"all"}, {"n/a"}):
        bySubType = True
    else:
        check = {submissionType, "{}§{}".format(submissionType, deiDocumentType)}
        bySubType = (not check.isdisjoint(subTypes)) ^ ("!not!" in subTypes)
        if not bySubType and rule["pattern"] is not None and rule["pattern"].match(submissionType):
            bySubType = True
    docTypes = rule["docTypes"]
    if docTypes:
        byDocType = (attachmentDocumentType is not None and any(attachmentDocumentType.startswith(dt) for dt in docTypes)) \
                    ^ ("!not!" in docTypes)
        return bySubType and byDocType
    return bySubType


# ---------------------------------------------------------------- situations

def situations(sets, deiRules, ftRules):
    """Every instance situation: (submissionType, deiDocumentType, attachmentDocumentType, invCompanyType)."""
    table61 = collections.defaultdict(set)  # base submission type -> suffixes
    for code, entry in sets["submissionSets"].items():
        for t in entry["submissionTypes"]:
            m = re.match(r"(.*?)([#%].*)?$", t)
            table61[m.group(1)].add(m.group(2) or "")
    pluginForms = collections.defaultdict(set)  # base submission type -> forms after §
    literals = set()
    for rule in deiRules + ftRules:
        for t in rule["subTypes"]:
            if t in ("!not!", "all", "n/a"):
                continue
            base, _, form = t.partition("§")
            literals.add(base)
            if form:
                pluginForms[base].add(form)
    submissionTypes = sorted((set(table61) | literals) - {t for t in literals | set(table61) if isPseudoSubmissionType(t)})
    suffixForm = {k: m.group(1) for k, v in sets["submissionSetSuffixes"].items()
                  for m in [re.match(r"The Form is an? (\S+?)\.?$", v)] if m}
    exhibitSubmissions = collections.defaultdict(set)
    for base, forms in pluginForms.items():
        for f in forms:
            if f in EXHIBIT_DOC_TYPES:
                exhibitSubmissions[f].add(base)
    # an exhibit goes with the submission types of the Table 6-4 rows that name it; where Table 6-1 ties it to
    # particular submission types by a % suffix (SD%201, SDR%KL), with those only; EX-99.4R HISTORIC with N-4s only
    suffixOfExhibit = {"EX-2.01": "%201", "EX-99.K SDR": "%KL", "EX-99.L SDR": "%KL"}
    for row in sets["instanceTypes"]:
        ex = row.get("exhibitType")
        if not ex:
            continue
        exKey = next((k for k in list(EXHIBIT_DOC_TYPES) + list(SBSEF_EXHIBITS) if k.upper() == ex.upper()), None)
        if exKey:
            for t in sets["submissionSets"][row["submissionSet"]]["submissionTypes"]:
                m = re.match(r"(.*?)([#%].*)?$", t)
                if exKey in suffixOfExhibit and m.group(2) != suffixOfExhibit[exKey]:
                    continue
                if exKey == "EX-99.4R HISTORIC" and not (m.group(2) == "#N4" or m.group(1).startswith("N-4")):
                    continue
                exhibitSubmissions[exKey].add(m.group(1))
    feeSubmissions = set(re.match(r"(.*?)([#%].*)?$", t).group(1) for t in sets["submissionSets"]["FE"]["submissionTypes"])
    for rule in ftRules:
        feeSubmissions |= {t for t in rule["subTypes"] if t not in ("!not!", "all", "n/a") and not isPseudoSubmissionType(t)}
    fundish = {s for s in submissionTypes
               if any(f in FUND_FORMS for f in pluginForms.get(s, ()))
               or any(suffixForm.get(x, "") in FUND_FORMS for x in table61.get(s, ()))
               or s.split("/")[0] in ("485APOS", "485BPOS", "485BXT", "485POS", "486APOS", "486BPOS", "486BXT", "497",
                                      "N-CSR", "N-CSRS", "N-1A", "N-2", "N-3", "N-4", "N-6", "N-14 8C", "POS 8C", "POS AMI")}
    # a submission that a Table 6-1 entry ties to an exhibit (SD%201, SDR%KL) has its XBRL in that exhibit only;
    # "any", not "all": AM lists SDR/A without the %KL that OA gives it
    exhibitOnlySubmissions = {s for s, suffixes in table61.items() if any(x.startswith("%") for x in suffixes)}
    out = []
    for s in submissionTypes:
        if s in exhibitOnlySubmissions:
            continue
        forms = {s} | {f for f in pluginForms.get(s, ()) if f not in EXHIBIT_DOC_TYPES} \
                | {suffixForm[x] for x in table61.get(s, ()) if x in suffixForm}
        # a fund submission always has an investment company type; when the plugin's § entries or Table 6-1's #
        # suffixes name the forms a submission type carries, only those
        fundForms = [f for f in FUND_FORMS if f in forms] or list(FUND_FORMS)
        for d in sorted(forms):
            invTypes = [None]
            if s in fundish:
                invTypes = [d] if d in FUND_FORMS else fundForms
            for i in invTypes:
                out.append(("primary", s, d, s, i))
    for ex, subs in exhibitSubmissions.items():
        for s in sorted(subs):
            for d in EXHIBIT_DOC_TYPES.get(ex, (ex,)):
                out.append(("exhibit", s, d, ex, "N-4" if ex == "EX-99.4R HISTORIC" else None))
    for s in sorted(feeSubmissions):
        out.append(("fee", s, s, FEE_EXHIBIT, None))
    return out


def entitySetCombos(IT, sets, kind, s, d, a, i, submissionSets):
    """Plausible entity-set combinations for one situation: those the proposal determines, and each entity set
    that a Table 6-4 row of the situation's submission sets names; an Exhibit 98 is filed by a SPAC."""
    determined = IT.determineEntitySets(submissionSets, s, d, a, (), i, set())
    named = {row["includedEntitySet"] for row in sets["instanceTypes"] if row["submissionSet"] in submissionSets}
    named |= {x for row in sets["instanceTypes"] if row["submissionSet"] in submissionSets for x in row["excludedEntitySets"]}
    determined = frozenset(determined) | ({"SPAC"} if a and a.startswith("EX-98") else set())
    combos = {frozenset({"ALL", e}) | ({"SPAC"} if a and a.startswith("EX-98") else set()) for e in named - {"ALL"}}
    combos.discard(determined)
    return [determined] + sorted(combos, key=sorted)


def resolveSituation(IT, sets, sit):
    """[(entitySets, submission sets of the instance, instance types)] for one situation; the first is for the
    entity sets the proposal determines (entity-sets-proposal.md), the rest for each other entity set that a Table
    6-4 row of the submission's sets names."""
    kind, s, d, a, i = sit
    submissionSets, _ = IT.submissionSetsOf(sets, s, d, a, i)
    results = []
    for E in entitySetCombos(IT, sets, kind, s, d, a, i, submissionSets):
        _, types = IT.instanceTypesOf(sets, submissionSets, set(E), a, d)
        instSets = IT.scopeSubmissionSetsOf(sets, submissionSets, types, a, d)
        results.append((E, frozenset(instSets), frozenset(types)))
    return results


def pluginSubmissionType(s, a):
    m = REQ_SUB_DOC_TYPE.match(a or "")
    return "{}§{}".format(s, m.group(m.lastindex)) if m else s


# ---------------------------------------------------------------- EXG rows

# The scope-cell evaluator is the plugin's own (InstanceTypes.parseScopeCell, scopeMatches, scopeApplies,
# scopeSubmissionSetsOf), so the crosswalk and the rules that will use it cannot drift apart.

def parseScopeCell(text, sets):
    return IT.parseScopeCell(sets, text)


def rowApplies(row, instSets, types):
    return IT.scopeApplies(None, row["inclParsed"], row["exclParsed"], instSets, types)


def loadExgRows(guide, sets):
    conceptsBySection = collections.defaultdict(dict)
    for c in guide["concepts"]:
        conceptsBySection[c["Section"]][c["Elt"].strip()] = c["Concept"].strip()
    rows = []
    for v in guide["validations"]:
        if "Incl" not in v and "Types" not in v:  # chapters 8 to 10 have no scope columns
            continue
        if v.get("rowDeleted"):
            continue
        incl = v.get("Incl") or v.get("Types") or ""
        refs = v.get("EFM v68 Ref") or v.get("Ref") or ""
        text = " ".join(str(v.get(k) or "") for k in ("Check", "Assertion", "On failure"))
        concepts = {conceptsBySection[v["Section"]].get(n) for n in re.findall(r"\{\d+\}", text)}
        concepts = {c for c in concepts if c and re.match(r"^[a-z-]+:\w+$", c)}
        refSections = re.findall(r"§\s*([\d.]+\d)", refs.replace("\xa0", " "))
        codes = [t.strip() for t in re.split(r"[,;]", re.sub(r"§\s*[\d.]+", "", refs.replace("\xa0", " "))) if t.strip()
                 and not t.strip().lower().startswith("item")]
        check = (v.get("Check") or v.get("Assertion") or "").replace("\n", " ").strip()
        # "A {n} fact is absent." states where a concept is unexpected: in the legacy file that is implicit, the
        # complement of every entry naming the concept (see unexpectedFamilies)
        absent = re.match(r"^A (\{\d+\}) fact is absent\.?$", check)
        rows.append({"section": v["Section"], "row": v["Row"], "incl": incl, "excl": v.get("Excl") or "",
                     "absentConcept": conceptsBySection[v["Section"]].get(absent.group(1)) if absent else None,
                     "inclParsed": parseScopeCell(incl, sets), "exclParsed": parseScopeCell(v.get("Excl"), sets),
                     "concepts": concepts, "refSections": refSections, "codes": codes,
                     "check": (v.get("Check") or v.get("Assertion") or "").replace("\n", " ")})
    return rows


def link(rule, rows):
    """EXG rows for a plugin rule, best tier first: concept and EFM section and cell code; concept and section;
    the rule's own EXG section (msgSection) and concept."""
    names = set(rule["names"])
    if not names:
        return "none", []
    tiers = {"code": [], "section": [], "msgSection": []}
    val = (rule["validation"] or "").lower()
    for r in rows:
        if not (names & r["concepts"]) or r["absentConcept"]:
            continue
        if rule["msgSection"] and rule["msgSection"].split(":", 1)[-1] == r["section"]:
            tiers["msgSection"].append(r)
        if rule["efm"] and rule["efm"] in r["refSections"]:
            codes = {c.lower() for c in r["codes"]} | {c.lower().rstrip("*") for c in r["codes"]}
            (tiers["code"] if val and val in codes else tiers["section"]).append(r)
    for tier in ("code", "section", "msgSection"):
        if tiers[tier]:
            return tier, tiers[tier]
    return "none", []


# ---------------------------------------------------------------- main

def describeTypes(types, sets):
    """A set of instance types, written as the guide writes scopes: whole submission sets as s:, the rest as i:."""
    bySet = collections.defaultdict(set)
    for r in sets["instanceTypes"]:
        bySet[r["submissionSet"]].add(r["instanceType"])
    whole = sorted(code for code, ts in bySet.items() if ts and ts <= types and len(bySet[code]) > 1)
    covered = set().union(*(bySet[c] for c in whole)) if whole else set()
    rest = sorted(types - covered)
    parts = []
    if whole:
        parts.append("s: " + ", ".join(whole))
    if rest:
        parts.append("i: " + ", ".join(rest))
    return "; ".join(parts) or "(none)"


def sitLabel(sit):
    kind, s, d, a, i = sit
    label = s
    if d != s:
        label += " [" + d + "]"
    if kind == "exhibit" or kind == "fee":
        label += " " + a
    if i and i != d:
        label += " inv " + i
    return label


IT = None  # validate/InstanceTypes.py of the plugin checkout given


def main(validateDir, guidePath, outDir):
    global IT
    IT = loadInstanceTypes(validateDir)
    with open(os.path.join(validateDir, "resources", "exg-set-definitions.json")) as fh:
        sets = json.load(fh)
    with open(guidePath) as fh:
        guide = json.load(fh)
    deiRules, _ = loadRules(validateDir, "dei-validations.json", "dei")
    ftRules, _ = loadRules(validateDir, "ft-validations.json", "ft")
    rows = loadExgRows(guide, sets)
    sits = situations(sets, deiRules, ftRules)
    resolved = {sit: resolveSituation(IT, sets, sit) for sit in sits}
    os.makedirs(outDir, exist_ok=True)

    families = collections.OrderedDict()
    for rule in deiRules + ftRules:
        families.setdefault(familyKey(rule), []).append(rule)
    rowLinks = collections.defaultdict(list)
    familyOut = []
    for key, members in families.items():
        f = analyseFamily(members, sits, resolved, rows, sets)
        for r in f.pop("linkedRowObjects"):
            rowLinks[(r["section"], r["row"])].append(f["id"])
        familyOut.append(f)
    for rule, gate, absenceRows in unexpectedFamilies(deiRules, sits, rows):
        f = analyseFamily([rule], sits, resolved, rows, sets, inGate=gate, linked=absenceRows)
        f["file"] = "dei-unexpected"
        for r in f.pop("linkedRowObjects"):
            rowLinks[(r["section"], r["row"])].append(f["id"])
        familyOut.append(f)

    cols = ["id", "file", "entries", "efm", "msgSection", "validation", "names", "axis", "references", "storeOnly",
            "inGate", "instanceTypes", "exact", "noInstanceType", "exgWider", "linkTier", "linkedRows", "closestRows", "pluginOnly",
            "exgOnly", "entityNarrowed"]
    with open(os.path.join(outDir, "families.tsv"), "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(cols)
        for f in familyOut:
            w.writerow([" | ".join(map(str, f[c])) if isinstance(f[c], list) else f[c] for c in cols])
    with open(os.path.join(outDir, "rows.tsv"), "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(["section", "row", "incl", "excl", "issues", "concepts", "efmRef", "linkedFamilies", "check"])
        for r in rows:
            issues = r["inclParsed"]["issues"] + ["Excl: " + x for x in r["exclParsed"]["issues"]]
            w.writerow([r["section"], r["row"], r["incl"], r["excl"], " | ".join(issues), " ".join(sorted(r["concepts"])),
                        " ".join(r["refSections"]) + " " + ",".join(r["codes"]),
                        " ".join(rowLinks[(r["section"], r["row"])]), r["check"][:160]])
    with open(os.path.join(outDir, "crosswalk.json"), "w") as fh:
        json.dump({"situations": len(sits), "families": familyOut,
                   "rows": [{k: (sorted(v) if isinstance(v, set) else v) for k, v in r.items()
                             if k not in ("inclParsed", "exclParsed")} |
                            {"issues": r["inclParsed"]["issues"] + ["Excl: " + x for x in r["exclParsed"]["issues"]],
                             "linkedFamilies": rowLinks[(r["section"], r["row"])]}
                            for r in rows]}, fh, indent=1, default=sorted)
    summarise(familyOut, deiRules, ftRules, rows, rowLinks, sits, outDir)


def familyKey(rule):
    """Entries that are one check instantiated per submission type: the plugin writes, for example, one
    DocumentType xv entry per form with that form as its value, where EXG writes one row.  They share the file,
    names, reference, validation code, axis and referenced facts, and differ in sub-types and value."""
    sev = rule["sev"]
    return (rule["kind"], tuple(sorted(rule["names"])), rule["efm"] or rule["msgSection"], rule["validation"],
            json.dumps(sev.get("axis"), sort_keys=True), json.dumps(sev.get("references"), sort_keys=True),
            sev.get("store-db-name"))


def unexpectedFamilies(deiRules, sits, rows):
    """The legacy file's implicit absence check, one family per concept.  Filing.py marks a concept unexpected for
    an instance where an entry naming it does not apply, no entry naming it with a validation applies, and a
    (blank) or (blank-error) entry that admits the concept applies; that is what EXG's "A {n} fact is absent." rows
    state.  Yields (rule-like dict, gate, linked absence rows)."""
    applicable = [sit for sit in sits if sit[0] != "fee"]
    gateOf = {}
    def gate(rule):
        if id(rule) not in gateOf:
            gateOf[id(rule)] = {sit for sit in applicable
                                if pluginApplies(rule, pluginSubmissionType(sit[1], sit[3]), sit[2], sit[3])}
        return gateOf[id(rule)]
    blanks = [r for r in deiRules if r["validation"] in ("(blank)", "(blank-error)")]
    names = sorted({n for r in deiRules if r["validation"] not in (None, "fany") for n in r["names"]})
    absenceRows = collections.defaultdict(list)
    for r in rows:
        if r["absentConcept"]:
            absenceRows[r["absentConcept"]].append(r)
    for name in names:
        naming = [r for r in deiRules if name in r["names"] and r["validation"] not in (None, "fany")]
        expected = set().union(*(gate(r) for r in naming
                                 if not r["validation"].startswith("fdep") and r["subTypes"] != {"n/a"}))
        notApplying = set().union(*(set(applicable) - gate(r) for r in naming))
        blankGate = set().union(set(), *(gate(b) for b in blanks
                                         if (b["sev"].get("include-xbrl-names") is None or name in normaliseNames(b["sev"]["include-xbrl-names"]))
                                         and (b["sev"].get("exclude-xbrl-names") is None or name not in normaliseNames(b["sev"]["exclude-xbrl-names"]))))
        unexpected = (blankGate & notApplying) - expected
        rule = {"kind": "dei", "index": "unexpected:" + name, "names": [name], "efm": None, "msgSection": None,
                "validation": "(unexpected)", "sev": {}}
        yield rule, unexpected, absenceRows.get(name, [])


def analyseFamily(members, sits, resolved, rows, sets, inGate=None, linked=None):
    first = members[0]
    kind = first["kind"]
    applicable = [sit for sit in sits if (sit[0] == "fee") == (kind == "ft")]
    if inGate is None:
        inGate = {sit for sit in applicable for rule in members
                  if pluginApplies(rule, pluginSubmissionType(sit[1], sit[3]), sit[2], sit[3])}
    S = set()
    for sit in inGate:
        for _, _, types in resolved[sit]:
            S |= types
    noType = sorted({sitLabel(sit) for sit in inGate if not any(types for _, _, types in resolved[sit])})
    wider = sorted({sitLabel(sit) for sit in applicable if sit not in inGate and resolved[sit][0][2] & S})
    if linked is None:
        tier, linked = link(first, rows)
    else:
        tier = "absence" if linked else "none"
    # compare with each linked row and with all of them together, and keep the closest: EXG often splits one
    # concept's check over rows of different scope, of which the family is one
    best = None
    reaching = [r for r in linked if any(rowApplies(r, instSets, types)
                                         for sit in inGate for _, instSets, types in resolved[sit][:1])]
    candidates = [[r] for r in linked]
    if len(reaching) > 1:
        candidates.append(reaching)
    if len(linked) > len(reaching) > 0 or (len(linked) > 1 and not reaching):
        candidates.append(linked)
    for candidate in candidates:
        pluginOnly, exgOnly, entityNarrowed = set(), set(), set()
        for sit in applicable:
            p = sit in inGate
            if p and not any(types for _, _, types in resolved[sit]):
                continue  # outside EXG section 3 altogether: reported as noInstanceType
            # judged on the determined entity sets (the first); other entity sets only show where EXG narrows
            hits = [any(rowApplies(r, instSets, types) for r in candidate) for _, instSets, types in resolved[sit]]
            if p and not any(hits):
                pluginOnly.add(sitLabel(sit))
            elif not p and hits[0]:
                exgOnly.add(sitLabel(sit))
            elif p and not all(hits):
                entityNarrowed.add(sitLabel(sit))
        score = (len(pluginOnly) + len(exgOnly), len(candidate))
        if best is None or score < best[0]:
            best = (score, candidate, pluginOnly, exgOnly, entityNarrowed)
    closest, pluginOnly, exgOnly, entityNarrowed = (best[1:] if best else ([], set(), set(), set()))
    sev = first["sev"]
    return {
        "id": "{}:{}".format(kind, first["index"]), "file": kind, "entries": [m["index"] for m in members],
        "efm": first["efm"] or "", "msgSection": first["msgSection"] or "", "validation": first["validation"] or "",
        "names": " ".join(first["names"]), "axis": json.dumps(sev.get("axis")) if sev.get("axis") else "",
        "references": json.dumps(sev.get("references")) if sev.get("references") else "",
        "storeOnly": bool(sev.get("store-db-name")) and not sev.get("validation"),
        "inGate": len(inGate), "instanceTypes": describeTypes(S, sets), "exact": bool(inGate) and not noType and not wider,
        "noInstanceType": noType, "exgWider": wider,
        "linkTier": tier, "linkedRows": ["{}#{}".format(r["section"], r["row"]) for r in linked],
        "closestRows": ["{}#{}".format(r["section"], r["row"]) for r in closest],
        "linkedRowObjects": linked,
        "pluginOnly": sorted(pluginOnly), "exgOnly": sorted(exgOnly), "entityNarrowed": sorted(entityNarrowed),
    }


def summarise(families, deiRules, ftRules, rows, rowLinks, sits, outDir):
    out = []
    p = out.append
    for kind, rules in (("dei", deiRules), ("ft", ftRules)):
        fs = [f for f in families if f["file"] == kind]
        p("## {}-validations.json: {} entries in {} families\n".format(kind, len(rules), len(fs)))
        c = collections.Counter()
        for f in fs:
            if f["inGate"] == 0:
                c["applies to no situation"] += 1
            elif f["exact"]:
                c["exact in instance types"] += 1
            else:
                if f["noInstanceType"]:
                    c["applies where EXG has no instance type"] += 1
                if f["exgWider"]:
                    c["its instance types reach further than its gate"] += 1
        for k, v in c.most_common():
            p("- {}: {}".format(k, v))
        t = collections.Counter(f["linkTier"] for f in fs)
        p("- linked to an EXG section 3 row: by concept, EFM section and cell code {}; by concept and EFM section {}; "
          "by concept and msgSection {}; not linked {}".format(t["code"], t["section"], t["msgSection"], t["none"]))
        linked = [f for f in fs if f["linkTier"] != "none"]
        if linked:
            same = sum(1 for f in linked if not f["pluginOnly"] and not f["exgOnly"])
            p("- of the {} linked, scope agrees with the closest linked row(s) (entity sets aside, and where EXG has an instance type) in {}; plugin applies where EXG does not in {}; EXG applies where the plugin does not in {}; EXG narrows by entity set in {}".format(
                len(linked), same, sum(1 for f in linked if f["pluginOnly"]), sum(1 for f in linked if f["exgOnly"]),
                sum(1 for f in linked if f["entityNarrowed"])))
        p("")
    us = [f for f in families if f["file"] == "dei-unexpected"]
    ul = [f for f in us if f["linkTier"] != "none"]
    p("## dei-validations.json implicit absence: {} concepts\n".format(len(us)))
    p("- linked to an EXG \"A {{n}} fact is absent.\" row: {}; of those, scope agrees in {}; the legacy file reports "
      "the fact unexpected where EXG does not say absent in {}; EXG says absent where the legacy file does not in {}\n".format(
        len(ul), sum(1 for f in ul if not f["pluginOnly"] and not f["exgOnly"]), sum(1 for f in ul if f["pluginOnly"]),
        sum(1 for f in ul if f["exgOnly"])))
    secRows = [r for r in rows if r["section"].startswith("3.")]
    p("## EXG section 3 rows: {}\n".format(len(secRows)))
    p("- linked to at least one plugin family: {}".format(sum(1 for r in secRows if rowLinks[(r["section"], r["row"])])))
    p("- with a scope cell token that does not parse as written: {}".format(
        sum(1 for r in secRows if r["inclParsed"]["issues"] or r["exclParsed"]["issues"])))
    p("\nSituations enumerated: {}".format(len(sits)))
    with open(os.path.join(outDir, "summary.md"), "w") as fh:
        fh.write("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
