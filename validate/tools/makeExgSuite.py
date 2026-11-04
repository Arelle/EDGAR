"""Write a dual-mode copy of the EFM conformance suite: every testcase file with EXG twins added (makeExgTwins.py).

The suite itself is not touched.  Each leaf testcase file of the suite's index is written, with its twins, to the
same relative path under the output directory, with its data paths made absolute; an index (testcases.xml) lists
them all, so the copy runs like the suite (for example with EDGAR-handoffs tools/runSuite.py --suite).  A report
(twins.tsv) lists, per testcase file, the twins made and every failing variation left without one, and why.

With --relative, data paths are left as they are, and only testcase files that gained twins are written: the
output is then a drop-in set of testcase files for the suite's own folders (for merging into the suite source), with
no index.

Usage: python3 makeExgSuite.py <suite conf/testcases.xml> <efm-exg-references.json> <out dir> [<dir of a legacy-mode
run's *.log.xml>] [--relative]   (the logs give each twin its exact EXG section; see makeExgTwins.py --observed)
"""
import contextlib, io, os, sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import makeExgTwins  # noqa: E402


def leafTestcases(indexPath, seen=None):
    """Testcase files listed by an index, in order, expanding nested indexes."""
    seen = set() if seen is None else seen
    out = []
    for e in ET.parse(indexPath).getroot().iter():
        if e.tag.split("}")[-1] == "testcase" and e.get("uri"):
            path = os.path.normpath(os.path.join(os.path.dirname(indexPath), e.get("uri")))
            if path in seen or not os.path.exists(path):
                continue
            seen.add(path)
            if ET.parse(path).getroot().tag.split("}")[-1] == "testcases":
                out.extend(leafTestcases(path, seen))
            else:
                out.append(path)
    return out


def main(indexPath, referencesPath, outDir, observedDir=None, relative=False):
    suiteRoot = os.path.dirname(os.path.abspath(indexPath))
    leaves = leafTestcases(os.path.abspath(indexPath))
    observed = None
    if observedDir:
        import glob
        observed = makeExgTwins.observedSections(glob.glob(os.path.join(observedDir, "*.log.xml")))
    report = ["testcase\ttwins\tno twin\tvariation\tnum\tname\treason"]
    totals = [0, 0]
    uris = []
    for path in leaves:
        rel = os.path.relpath(path, suiteRoot)
        out = os.path.join(outDir, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            makeExgTwins.main(path, referencesPath, out, absolute=not relative, observed=observed)
        lines = buf.getvalue().splitlines()
        made = int(lines[0].split(": ")[1].split()[0]) if lines else 0
        skipped = [l.split(None, 5)[2:] for l in lines[1:] if l.strip().startswith("no twin:")]
        if relative and not made:
            os.remove(out)  # unchanged: nothing to merge
        totals[0] += made
        totals[1] += len(skipped)
        report.append("{}\t{}\t{}".format(rel, made, len(skipped)))
        for s in skipped:
            report.append("{}\t\t\t{}".format(rel, "\t".join(s)))
        uris.append(rel)
    if not relative:  # a relative output is copied over the suite's own files, so it must not hold an index
        with open(os.path.join(outDir, "testcases.xml"), "w", encoding="utf-8") as fh:
            fh.write('<?xml version="1.0" encoding="UTF-8"?>\n<testcases name="EFM suite with EXG twins">\n')
            for rel in uris:
                fh.write('  <testcase uri="{}"/>\n'.format(rel))
            fh.write("</testcases>\n")
    with open(os.path.join(outDir, "twins.tsv"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(report) + "\n")
    print("{} testcase files; {} twins; {} failing variations without a twin".format(len(leaves), *totals))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--relative"]
    if len(args) not in (3, 4):
        sys.exit(__doc__)
    main(*args, relative="--relative" in sys.argv[1:])
