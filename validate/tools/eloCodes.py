"""Candidate EXG references for the checks of submission header (ELO) parameters against facts: the input to the
"(elo)" rows of efm-exg-references.json.

Filing.py checks each header parameter that a dei-validations.json entry names as its "elo-name" (periodOfReport,
smallBusinessFlag, ...) against the entry's fact, and reports a parameter given for a form that does not use it
((elo-unexpected)); both are logged with EFM section 6.5.40 (EFM § 6.5.40 Item n).  A check is keyed by validation
"(elo)" followed by the parameter's name, no axis and no concept, the parameter identifying the check
(MessageReferences.eloMsgSection).

Candidates: the guide's validation rows whose "EFM v68 Ref" cell cites "§ 6.5.40 Item", in the sections whose concept
tables list the parameter's concept.  A ruling (RULINGS below, recorded in resources/exg/handoffs/mapping-rulings.md)
overrides them.  The unexpected-parameter report takes the same section as the parameter's check (review, 2026-10-28).

Tiers in the output: "ruling", "elo" (one section), "several" (for review), "none".  buildReferences.py builds
"ruling" and "elo".

Usage: python3 eloCodes.py <guide.json> <plugin validate dir> <out elo-candidates.tsv>
"""
import collections, csv, json, os, re, sys

# rulings recorded in resources/exg/handoffs/mapping-rulings.md: header parameter -> EXG section
RULINGS = {
    # the N-2 cover page flags: no guide row compares them with the header; their concepts are 3.1.24.7's
    "eligibleFundFlag": "3.1.24.7",
    "pursuantGeneralInstructionFlag": "3.1.24.7",
    "filerNewRegistrantFlag": "3.1.24.7",
}
eloRefPattern = re.compile(r"§\s*6\.5\.40\s+Item\s+([0-9]+)")

def eloConcepts(validateDir):
    """{header parameter: set of concepts} from dei-validations.json's elo-name entries."""
    deiValidations = json.load(open(os.path.join(validateDir, "resources", "dei-validations.json"), encoding="utf-8"))
    out = collections.defaultdict(set)
    for v in deiValidations["sub-type-element-validations"]:
        if isinstance(v, dict) and v.get("elo-name"):
            names = v.get("xbrl-names") or ()
            for n in ([names] if isinstance(names, str) else names):
                out[v["elo-name"]].add(n if ":" in n else "dei:" + n)
    return out

def main(guidePath, validateDir, outPath):
    guide = json.load(open(guidePath, encoding="utf-8"))
    sectionsOf = collections.defaultdict(set)  # concept -> sections whose concept tables list it
    for c in guide["concepts"]:
        if not c.get("rowDeleted"):
            sectionsOf[(c.get("Concept") or "").strip()].add(c["Section"])
    eloRows = collections.defaultdict(list)  # section -> rows citing § 6.5.40 Item n
    for v in guide["validations"]:
        m = eloRefPattern.search(v.get("EFM v68 Ref") or "")
        if m and not v.get("rowDeleted"):
            eloRows[v["Section"]].append((v, m.group(1)))
    out = []
    for name, concepts in sorted(eloConcepts(validateDir).items()):
        cands = [(v, item) for c in sorted(concepts) for s in sorted(sectionsOf.get(c, ())) for v, item in eloRows.get(s, ())]
        # the rows whose check names the parameter, where any does ("If header element voluntaryFilerFlag has a value")
        named = [(v, item) for v, item in cands if name.rpartition(".")[2] in (v.get("Check") or "")]
        cands = named or cands
        secs = {v["Section"] for v, _item in cands}
        if name in RULINGS:
            tier, exg = "ruling", RULINGS[name]
        elif len(secs) == 1:
            tier, exg = "elo", next(iter(secs))
        else:
            tier, exg = ("several" if secs else "none"), ",".join(sorted(secs))
        out.append(["6.5.40", "(elo)" + name, "", "", tier, exg,
                    " | ".join(f"{v['Section']}#{v['Row']} Item {item} {v.get('On failure') or ''}" for v, item in cands),
                    " ".join(sorted(concepts))])
    with open(outPath, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\n")
        w.writerow(["efm", "validation", "axis", "concept", "tier", "exgSection", "candidates", "concepts"])
        w.writerows(out)
    print(len(out), "header parameter checks:", dict(collections.Counter(r[4] for r in out)))

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
