"""Weight the crosswalk's scope differences by real filings.

Reads crosswalk.json (written by crosswalk.py) and a corpus comparison's report.md, whose "EXG instance types
(after)" table gives, per form, its instances and their instance types over the corpus months.  Writes, beside
crosswalk.json, weights.md and families-weighted.tsv.

A difference names situations (crosswalk.py's labels: submission type, form inside, exhibit).  Each is weighted
by the corpus instances it stands for:
  - a primary-document situation: the form's instances whose instance type names no exhibit, and is not FE.A,
    counting those with no instance type;
  - an exhibit situation: the form's instances of exhibit instance types (EX98.SPAC, RD.H99, RXP.*, K.SDR, ...);
  - a fee-exhibit situation: the form's FE.A instances.
Situations of one form and kind count once per family (the variants by investment company type or form inside are
not told apart in the corpus table).

Caveat: the table has one instance record per filing, so a filing with both a cover instance and a fee exhibit
shows as one of them.

Usage: python3 weight.py <crosswalk out dir> <corpus report.md> <exg-set-definitions.json>
"""
import collections, csv, json, os, re, sys

FEE = "FE.A"


def corpusTable(reportPath):
    """{form: Counter(instance type or '(none)': instances)} from the report's instance-types table."""
    table, inTable = {}, False
    with open(reportPath) as fh:
        for line in fh:
            if line.startswith("## EXG instance types"):
                inTable = True
                continue
            if inTable and line.startswith("#"):
                break
            m = re.match(r"\| (.+?) \| (\d+) \| (.*) \|$", line.strip()) if inTable else None
            if m and m.group(1) != "form":
                table[m.group(1)] = collections.Counter(
                    {t.strip(): int(n) for t, n in re.findall(r"([^,()]+?) \((\d+)\)", m.group(3).replace("(none) (", "none ("))})
    return {form: collections.Counter({("(none)" if t == "none" else t): n for t, n in c.items()}) for form, c in table.items()}


def situationKey(label):
    """(form, kind) of a crosswalk situation label."""
    if label.endswith(" EX-FILING FEES"):
        return label[:-len(" EX-FILING FEES")], "fee"
    m = re.match(r"(.*?) \[[^\]]*\] (EX-.*?)(?: inv .*)?$", label)
    if m:
        return m.group(1), "exhibit"
    return re.sub(r" \[.*|\s+inv .*", "", label), "primary"


def main(outDir, reportPath, setsPath):
    with open(os.path.join(outDir, "crosswalk.json")) as fh:
        cw = json.load(fh)
    with open(setsPath) as fh:
        sets = json.load(fh)
    exhibitTypes = {r["instanceType"] for r in sets["instanceTypes"] if r.get("exhibitType")} - {FEE}
    corpus = corpusTable(reportPath)

    def weight(key):
        form, kind = key
        c = corpus.get(form, collections.Counter())
        if kind == "fee":
            return c.get(FEE, 0)
        if kind == "exhibit":
            return sum(n for t, n in c.items() if t in exhibitTypes)
        return sum(n for t, n in c.items() if t != FEE and t not in exhibitTypes)

    def weigh(labels):
        keys = {situationKey(x) for x in labels}
        return sum(weight(k) for k in keys), sorted(((weight(k), k[0] + ("" if k[1] == "primary" else " (" + k[1] + ")"))
                                                     for k in keys if weight(k)), reverse=True)

    rows = []
    byForm = collections.defaultdict(lambda: collections.Counter())
    for f in cw["families"]:
        r = {"id": f["id"], "file": f["file"], "names": f["names"], "validation": f["validation"], "efm": f["efm"],
             "linkTier": f["linkTier"], "closestRows": " ".join(f.get("closestRows", []))}
        for key in ("pluginOnly", "exgOnly", "noInstanceType", "entityNarrowed"):
            total, parts = weigh(f[key])
            r[key] = total
            r[key + "Forms"] = ", ".join("{} {}".format(form, n) for n, form in parts[:8])
            for n, form in parts:
                byForm[(f["file"] == "dei-unexpected", key, form)]["families"] += 1
                byForm[(f["file"] == "dei-unexpected", key, form)]["instances"] = n
        rows.append(r)

    cols = ["id", "file", "names", "validation", "efm", "linkTier", "closestRows", "pluginOnly", "pluginOnlyForms",
            "exgOnly", "exgOnlyForms", "noInstanceType", "noInstanceTypeForms", "entityNarrowed", "entityNarrowedForms"]
    with open(os.path.join(outDir, "families-weighted.tsv"), "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(cols)
        for r in rows:
            w.writerow([r[c] for c in cols])

    out = []
    p = out.append
    dei = [r for r in rows if r["file"] == "dei"]
    linked = [r for r in dei if r["linkTier"] != "none"]
    p("Corpus: {} forms, {} instances.\n".format(len(corpus), sum(sum(c.values()) for c in corpus.values())))
    unexpected = [r for r in rows if r["file"] == "dei-unexpected" and r["linkTier"] != "none"]
    for key, title, pool in (("exgOnly", "EXG applies where the legacy rule does not (linked dei families)", linked),
                             ("pluginOnly", "The legacy rule applies where EXG does not, with an instance type (linked dei families)", linked),
                             ("noInstanceType", "The legacy rule applies where EXG has no instance type (all dei families)", dei),
                             ("exgOnly", "EXG says absent where the legacy file does not report the fact as unexpected (implicit absence families)", unexpected),
                             ("pluginOnly", "The legacy file reports the fact as unexpected where EXG has no absence row (implicit absence families)", unexpected)):
        touched = [r for r in pool if r[key]]
        p("## {}\n".format(title))
        p("{} of {} families have the difference; {} of them on at least one corpus instance.\n".format(
            sum(1 for r in pool if r[key] or r[key + "Forms"]), len(pool), len(touched)))
        isUnexpected = pool is unexpected
        forms = sorted(((v["instances"], v["families"], form) for (u, k, form), v in byForm.items()
                        if k == key and u == isUnexpected and v["instances"]), reverse=True)
        p("| form | corpus instances | families |\n|---|---:|---:|")
        for n, fam, form in forms[:25]:
            p("| {} | {} | {} |".format(form, n, fam))
        p("\nFamilies with the most instances affected:\n")
        p("| family | names | validation | instances | forms |\n|---|---|---|---:|---|")
        for r in sorted(touched, key=lambda r: -r[key])[:15]:
            p("| {} | {} | {} | {} | {} |".format(r["id"], r["names"][:60], r["validation"], r[key], r[key + "Forms"]))
        p("")
    with open(os.path.join(outDir, "weights.md"), "w") as fh:
        fh.write("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
