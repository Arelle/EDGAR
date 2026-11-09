"""Rank the settled EXG references by risk, so that a reviewer checks a short list instead of every line.

A pair (legacy check, concept -> EXG section) is riskier when:
  - narrowed: its concept had candidate rows in more than one section, and the narrowing rules of references.py
    chose one;
  - kind differs: the legacy validation is one kind of check (presence, value, dependency, exclusivity) and none of
    the rows that decided it is a compatible kind, so the code may land on a section that only mentions the concept;
  - weight: the legacy check's instance types cover many instances in the corpus, so a wrong code would be seen
    often.
"code" pairs (the row's EFM cell code is the legacy validation code) and rulings are not ranked.

Usage: python3 review.py <references out dir with candidates.json> <plugin validate dir> <corpus report.md> <out.md> [N]
"""
import collections, json, math, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from references import typesOf  # noqa: E402


def legacyKind(text):
    t = (text or "").lower()
    if "may or may not" in t or t.startswith("o "):
        return "optional"
    if "not both" in t or "only one" in t or "exclusive" in t or "nether" in t or "neither" in t:
        return "exclusivity"
    if "only if" in t or "if and only if" in t or "required only if" in t or " if " in t:
        return "dependency"
    if "value" in t:
        return "value"
    if "must appear" in t or "should be present" in t or "should exist" in t or "must exist" in t:
        return "presence"
    return "other"


def rowKind(check):
    c = check.lower()
    if re.search(r"at most one|neither or both|one or both|either or both|exactly one|but not both", c):
        return "exclusivity"
    if c.startswith("if "):
        return "dependency"
    if "visible" in c:
        return "visibility"
    if "value" in c or "valued" in c:
        return "value"
    if "absent" in c or "not present" in c:
        return "absence"
    if "present" in c:
        return "presence"
    return "other"


COMPATIBLE = {
    "presence": {"presence", "value"},
    "optional": {"presence", "visibility", "absence", "value", "exclusivity", "dependency"},
    "value": {"value", "presence"},
    "dependency": {"dependency", "exclusivity"},
    "exclusivity": {"exclusivity", "dependency"},
    "other": set(),
}


def corpusByInstanceType(reportPath):
    counts, inTable = collections.Counter(), False
    for line in open(reportPath):
        if line.startswith("## EXG instance types"):
            inTable = True
            continue
        if inTable and line.startswith("#"):
            break
        if inTable:
            for t, n in re.findall(r"([A-Z0-9]+\.[A-Z0-9]+) \((\d+)\)", line):
                counts[t] += int(n)
    return counts


def entryRanges(entries):
    """ "0 1 2 3 7" -> "0-3, 7" """
    nums, out = sorted(int(x) for x in entries.split()), []
    for x in nums:
        if out and x == out[-1][1] + 1:
            out[-1][1] = x
        else:
            out.append([x, x])
    return ", ".join(str(a) if a == b else "{}-{}".format(a, b) for a, b in out)


def main(refsDir, validateDir, reportPath, outPath, n=30):
    out = json.load(open(os.path.join(refsDir, "candidates.json")))
    dei = json.load(open(os.path.join(validateDir, "resources", "dei-validations.json")))
    sets = json.load(open(os.path.join(validateDir, "resources", "exg-set-definitions.json")))
    legend = {k: v.get("validation") or "" for k, v in dei["validations"].items()}
    corpus = corpusByInstanceType(reportPath)
    ranked = []
    for r in out:
        if r["tier"] != "section":
            continue
        rows = [x for x in r["candidates"].split(" | ") if x]
        checks = [x.split(" ", 2)[2] if x.count(" ") >= 2 else "" for x in rows]
        lk = legacyKind(legend.get(r["validation"], ""))
        rks = {rowKind(c) for c in checks}
        # a legacy legend that does not say what kind of check it is ("Mutual dependent tags.") flags nothing
        kindDiffers = lk not in ("optional", "other") and not (rks & COMPATIBLE.get(lk, set()))
        narrowed = r["sectionsBeforeNarrowing"] > 1
        weight = sum(corpus.get(t, 0) for t in typesOf(r["familyInstanceTypes"], sets) if t != "FE.A")
        reasons = [x for x, on in (("narrowed", narrowed), ("kind differs: legacy {} vs rows {}".format(lk, "/".join(sorted(rks))), kindDiffers)) if on]
        score = 3 * narrowed + 3 * kindDiffers + math.log10(weight + 1)
        ranked.append((score, reasons, weight, r, rows))
    ranked.sort(key=lambda x: -x[0])
    flagged = [x for x in ranked if x[1]]
    pick = flagged + [x for x in ranked if not x[1]][:max(0, n - len(flagged))]
    lines = ["# Review first: the riskiest EXG references", "",
             "{} of the {} pairs settled by the guide's rows alone (tier \"section\": concept and EFM section agree, the "
             "EFM cell code does not), ranked by risk. The first {} are flagged for a reason; the rest of the list "
             "are the unflagged pairs that cover the most corpus instances. Confirm, for each, that the EXG section is "
             "the one the legacy check belongs to. The full list is spot-check.md.".format(len(pick), len(ranked), len(flagged)),
             "", "| # | Legacy entries | EFM | Validation | Concept | EXG section | Why flagged | Corpus instances | Deciding rows |",
             "|---|---|---|---|---|---|---|---:|---|"]
    for i, (score, reasons, weight, r, rows) in enumerate(pick, 1):
        lines.append("| {} | {} | {} | `{}` {} | {} | {} {} | {} | {:,} | {} |".format(
            i, entryRanges(r["entries"]), r["efm"], r["validation"], legend.get(r["validation"], "")[:60], r["concept"],
            r["exgSection"], r["exgTitle"], "; ".join(reasons) or "high weight", weight,
            "<br>".join(x[:110] for x in rows[:3])))
    open(outPath, "w").write("\n".join(lines) + "\n")
    print(len(flagged), "flagged;", len(pick), "listed of", len(ranked))


if __name__ == "__main__":
    if len(sys.argv) not in (5, 6):
        sys.exit(__doc__)
    main(*sys.argv[1:5], *(int(x) for x in sys.argv[5:]))
