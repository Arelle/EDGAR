"""Join Arelle XML log files into one well-formed XML file, for tools that read a whole suite run (makeExgConf.py).

Arelle writes an XML log file as one or more <log> documents one after another (a conformance run writes one per
testcase load and one per variation), each with its own XML declaration, so the files cannot simply be concatenated
into a well-formed document.  The output is a <logs> document holding each input <log> document, in input order, with
a source attribute naming its file; the <log> documents are kept whole, so a tool can tell where each one starts.

An input may be a log file or a folder, whose *.xml files (in subfolders too) are taken in name order, numbers in
names compared by value (run-2.xml before run-10.xml).  A file a run left unfinished is kept up to its last complete
entry, its open <log> documents closed, and reported.

Usage: python3 joinXmlLogs.py <out.xml> <log file or folder> [<log file or folder> ...]
"""
import glob, os, re, sys
from xml.sax.saxutils import quoteattr

declarationPattern = re.compile(r"<\?xml[^>]*\?>")
logStartPattern = re.compile(r"<log(?=[\s>/])")
logEndPattern = re.compile(r"</log\s*>")


def naturalKey(path):
    return [int(p) if p.isdigit() else p for p in re.split(r"(\d+)", path)]


def inputFiles(paths, outPath):
    files = []
    for path in paths:
        if os.path.isdir(path):
            files.extend(sorted(glob.glob(os.path.join(path, "**", "*.xml"), recursive=True), key=naturalKey))
        else:
            files.append(path)
    out = os.path.abspath(outPath)
    return [f for f in files if os.path.abspath(f) != out]


def main(outPath, paths):
    files = inputFiles(paths, outPath)
    if not files:
        sys.exit("no log files in " + " ".join(paths))
    documents = 0
    with open(outPath, "w", encoding="utf-8") as out:
        out.write('<?xml version="1.0" encoding="utf-8"?>\n<logs>\n')
        for path in files:
            source = quoteattr(os.path.relpath(path, os.path.dirname(os.path.abspath(outPath))))
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = declarationPattern.sub("", fh.read())
            starts = len(logStartPattern.findall(text))
            depth = starts - len(logEndPattern.findall(text))
            if depth > 0:  # a run that stopped: keep up to its last complete entry, then close its <log> documents
                ends = [m.end() for m in re.finditer(r"</entry\s*>|<log\b[^>]*>|</log\s*>", text)]
                text = text[:ends[-1]] if ends else ""
                starts = len(logStartPattern.findall(text))
                depth = starts - len(logEndPattern.findall(text))
                print("{}: unfinished, {} <log> document(s) closed after the last complete entry".format(path, depth))
                text += "\n" + "</log>\n" * depth
            documents += starts
            out.write(logStartPattern.sub("<log source={}".format(source), text).strip() + "\n")
        out.write("</logs>\n")
    print("{} files, {} <log> documents joined into {}".format(len(files), documents, outPath))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])
