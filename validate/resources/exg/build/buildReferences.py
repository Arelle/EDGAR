"""Write the plugin resource efm-exg-references.json from the reviewed candidates (validate/tools/references.py's candidates.tsv, kept here as
references-candidates.tsv).

The resource maps a legacy check, identified by its EFM section, validation code, axis key and concept, to the
EDGAR XBRL Guide section whose code it carries in EXG mode.  Only reviewed references go in: "ruling" (rulings
made in review, ../handoffs/mapping-rulings.md), "code" (the row's EFM cell code is the legacy validation code) and "section"
(confirmed by a sample review of review-first.md).  Duplicate keys must agree, or the build stops.

The implicit absence check (absence-candidates.tsv, tier "absence") is keyed by validation "(unexpected)" and no axis:
the legacy file reports such a message from its "(blank)" or "(blank-error)" entries, with the EFM section of the
entries naming the concept, which identifies the context.  A concept the guide gives no absence row takes the section
whose concept table lists it (tier "home").

The checks that log an EFM code directly, not through a dei-validations.json entry (direct-candidates.tsv,
validate/tools/directCodes.py), are keyed by validation "(code)" followed by the rest of the code, no axis, and concept
"" or the concept a ruling names; tiers "direct" and "prose" go in with the rulings, "kept" and the unresolved do not.
Where one code is logged for checks the guide states in different sections, a row keyed by validation "(edgarCode)"
followed by the message's edgarCode tells them apart.  A check ruled not to be performed in EXG mode (tier "retired")
goes in with exg null and basis "retired"; its messages are not logged when EXG leads messageCodes.

The checks of submission header (ELO) parameters against facts (elo-candidates.tsv, validate/tools/eloCodes.py) are
keyed by EFM section 6.5.40, validation "(elo)" followed by the parameter's name, no axis and no concept; tier "elo"
goes in with the rulings.

Usage: python3 buildReferences.py <candidates.tsv> <absence-candidates.tsv> <direct-candidates.tsv> <elo-candidates.tsv> <edition> <review note> <out efm-exg-references.json>
"""
import csv, json, sys

REVIEWED = ("ruling", "code", "section", "absence", "home", "direct", "prose", "elo", "retired")


def rowsOf(r):
    """The guide rows (section#row) a reference rests on: references.py writes "3.1.5#1 c=r ...", directCodes.py
    "8.1#1 File Name".  A direct row keeps only rows of its own section, as its ruling may set aside the candidates;
    a legacy row keeps all its candidates, the rulings' evidence among them."""
    rows = [x.split(" c=")[0].split(" ")[0] for x in r["candidates"].split(" | ") if x]
    if r["validation"].startswith(("(code)", "(edgarCode)")):
        return [x for x in rows if "#" in x and x.partition("#")[0] == r["exgSection"]]
    return rows


def main(candidatesPath, absencePath, directPath, eloPath, edition, reviewNote, outPath):
    refs = {}
    candidates = []
    for path in (candidatesPath, absencePath, directPath, eloPath):
        with open(path, newline="") as fh:
            candidates.extend(csv.DictReader(fh, delimiter="\t"))
    if True:
        for r in candidates:
            retired = r["tier"] == "retired"
            if r["tier"] not in REVIEWED or not (r["exgSection"] or retired):
                continue
            key = (r["efm"], r["validation"], r["axis"], r["concept"])
            rows = [] if retired else rowsOf(r)
            exg = None if retired else r["exgSection"]
            if key in refs:
                if refs[key]["exg"] != exg:
                    sys.exit("conflicting references for {}: {} and {}".format(key, refs[key]["exg"], exg))
                refs[key]["rows"] = sorted(set(refs[key]["rows"]) | set(rows))
                continue
            refs[key] = {"efm": r["efm"], "validation": r["validation"], "axis": r["axis"], "concept": r["concept"],
                         "exg": exg, "basis": r["tier"], "rows": rows}
    out = {
        "comment": [
            "EDGAR XBRL Guide (EXG) references for legacy checks (dei-validations.json entries) that carry only an EDGAR",
            "Filer Manual (EFM) reference. A check is identified by its EFM section, validation code, axis key and the",
            "concept its message names; exg is the EXG section whose code the message carries when the messageCodes",
            "parameter lists EXG first, and which every message from such a check gives as its exgSection argument.",
            "rows are the EXG rows the reference rests on (section#row). basis: ruling (decided in review),",
            "code (the row's EFM cell code is the validation code), section (concept and EFM section agree; confirmed",
            "by sample review), absence (the legacy implicit unexpected-fact check, validation (unexpected), to the",
            "concept's EXG absence row), home (such a check of a concept with no absence row, to the section whose",
            "concept table lists it), direct (a check that logs its EFM code directly, validation (code) followed",
            "by the rest of the code, to the section whose rows cite its EFM section), prose (such a check, to the",
            "section whose text cites its EFM section), elo (a check of a submission header parameter against its fact,",
            "validation (elo) followed by the parameter's name, to the section of its EFM 6.5.40 Item row), retired (a",
            "check the guide no longer makes, exg null: its messages are not logged when messageCodes lists EXG first).",
            "Generated; do not edit by hand. Published for filing preparers",
            "and consumers of disseminated filings who meet EXG codes for the first time."],
        "edition": edition,
        "review": reviewNote,
        # retired checks last
        "references": sorted(refs.values(), key=lambda r: ([int(x) for x in r["exg"].split(".")] if r["exg"] else [999],
                                                          r["efm"], r["validation"], r["axis"], r["concept"])),
    }
    # one reference per line, so the file reads as a table and diffs line by line
    body = json.dumps({k: v for k, v in out.items() if k != "references"}, indent=1, ensure_ascii=False)[:-2]
    lines = [json.dumps(r, ensure_ascii=False) for r in out["references"]]
    with open(outPath, "w", encoding="utf-8") as fh:
        fh.write(body + ',\n "references": [\n  ' + ",\n  ".join(lines) + "\n ]\n}\n")
    print(len(refs), "references written to", outPath)


if __name__ == "__main__":
    if len(sys.argv) != 8:
        sys.exit(__doc__)
    main(*sys.argv[1:])
