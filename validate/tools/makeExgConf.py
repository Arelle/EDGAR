"""Write the EXG-mode conformance suite (conf/EXG): the EFM suite's failing variations, each in the testcase of the
EDGAR XBRL Guide section whose code it logs in EXG mode, in folders that follow the guide's chapters and sections.

    conf/EXG/EXG-testcases.xml                                  the index, in guide order
    conf/EXG/03-instance-validations/
        03-01-expected-facts-in-the-required-context/
            03-01-05-form-or-exhibit-type-testcase.xml          the variations that log EXG.3.01.05...
            03-01-22-01-street-city-and-zip-testcase.xml

A testcase file is written for each deepest section with variations, in the folder of its chapter and level-2
section (a level-2 or chapter section's own file is in that section's folder).  Folder and file names are the
section number, its levels two digits as in the code (EXG.3.01.22.01 -> 03-01-22-01), followed by the guide's title.

The testcases are in the XBRL conformance format of the suite's filing fee testcases (http://xbrl.org/2008/conformance):
each variation expects the exact codes it logs in EXG mode as <error> elements (<error severity="error">
EXG.11.10.GraphicFileContent</error>), which Arelle matches whole; a code that is not an XML name, which Arelle could
not read as an error QName, is given as a string (nonStandardErrorCodes="true").  A
variation is a copy of the EFM suite's: id
"_<source testcase>_<id>" ("_605-20-gen_001ng"), its name, its description followed by its source, its ELOparams
with "messageCodes": "EXG" added, and its data paths made relative to the new file (the instance files are not copied).

The codes come from Arelle XML logs (--logFile *.xml) of an EXG-mode run of the EFM suite (messageCodes=EXG), in
which every message coded by the guide carries its efmCode argument: the messages logged for the variation whose
efmCode the variation's expected code matches, as Arelle matches an EFM-coded run (ModelTestcaseObject.expected:
"EFM.6.05.20" for num="60520" by prefix, the assert's name for num="99999").  The log shows a code as section:name
(MessageReferences.displayCode); the code Arelle records, which the testcase must expect, is formed again as the
plugin forms it (MessageReferences.messageCode, exgMessageCode), so that the log of an earlier run gives the codes of
the plugin as it is: a table-driven message's from its message key ("dq-{tag}-Missing" with tag EntityFileNumber ->
"EXG.3.01.18.EntityFileNumberMissing"), a check that logs its EFM code directly, the section followed by the rest of
the EFM code after its numeric levels, PascalCase ("EFM.5.02.05.graphicFileContent" -> "EXG.11.10.GraphicFileContent";
"EFM.6.07.11" -> "EXG.10.02", named by its edgarCode).  An assert that already names an EXG code is placed by it: a
code (num="99999" name="EXG.7.03.FactsNotInMovements") is expected as it is, a section (num="EXG.3.05")
by the codes the log shows for it, or where it shows none, as a code prefix (nonStandardErrorCodes="true").

A variation whose expected code is logged under more than one EXG section (it fails checks of several sections)
expects the codes of the messages its assert's name picks out (the name, compared without case or punctuation, is
the tag the message names or is within the code as shown), where those lie in one section.  As Arelle does, only a
variation's first assert is considered.

A variation is left out, and reported, when its expected code is logged with no EXG code (a check left EFM-coded, or
not EXG-coded), not logged (a check retired from EXG mode, or a variation that fails), or logged under more than one
EXG section that its assert's name does not narrow to one.  Valid variations are not included.

Testcases already in the output folder (and an index that lists them) are not read as EFM testcases; earlier output
is removed first, so regenerating after the references change replaces it.

Usage: python3 makeExgConf.py <suite conf/testcases.xml> <guide.json (resources/exg/build/extract.py)> <out dir,
       normally conf/EXG> <EXG-mode log.xml> [<log.xml> ...] [--report <placement.tsv>]
"""
import collections, json, os, re, sys
import xml.etree.ElementTree as ET

EDGAR_CONF = "http://edgar/2009/conformance"
XBRL_CONF = "http://xbrl.org/2008/conformance"
INDEX_NAME = "EXG-testcases.xml"
CREATOR = ("SEC Office of Structured Disclosure", "StructuredData@sec.gov")
REFERENCES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "resources", "efm-exg-references.json")
exgSectionPattern = re.compile(r"EXG(?:\.[0-9]+)+")
# a code Arelle can read as the local name of an <error> QName; others are given as strings
ncNamePattern = re.compile(r"[A-Za-z_][A-Za-z0-9_.-]*$")
SEVERITY = {"err": "error", "wrn": "warning"}


def localName(elt):
    return elt.tag.rpartition("}")[2]


def leafTestcases(indexPath, skipDir, seen=None):
    """Testcase files listed by an index, in order, expanding nested indexes; none under skipDir (the output)."""
    seen = set() if seen is None else seen
    out = []
    for e in ET.parse(indexPath).getroot().iter():
        if localName(e) == "testcase" and e.get("uri"):
            path = os.path.normpath(os.path.join(os.path.dirname(indexPath), e.get("uri")))
            if path in seen or not os.path.exists(path) or path.startswith(skipDir + os.sep):
                continue
            seen.add(path)
            if localName(ET.parse(path).getroot()) == "testcases":
                out.extend(leafTestcases(path, skipDir, seen))
            else:
                out.append(path)
    return out


def logEntries(path):
    """The entries of an Arelle XML log, streamed, with None where each <log> document starts; a log file may hold
    several <log> documents (Arelle appends, and writes one per variation of a conformance run; joinXmlLogs.py keeps
    them)."""
    parser = ET.XMLPullParser(("start", "end"))
    parser.feed("<logs>")
    def events():
        for event, elt in parser.read_events():
            if event == "start" and elt.tag == "log":
                yield None
            elif event == "end" and elt.tag == "entry":
                yield elt
                elt.clear()
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            parser.feed(re.sub(r"<\?xml[^>]*\?>", "", line))
            yield from events()
    parser.feed("</logs>")
    yield from events()


def messageReferences():
    """The plugin's MessageReferences module (pure functions, no Arelle imports), by which the codes are formed."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "MessageReferences", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "MessageReferences.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

MR = messageReferences()


def recordedCode(shown, message):
    """The code Arelle records for a message the log shows as section:name, formed as the plugin forms it, so that a
    log of an earlier run gives the codes of the plugin as it is (see the module docstring)."""
    section, sep, name = shown.partition(":")
    if not sep:
        return MR.exgMessageCode(shown)
    attrs = dict(message.attrib)
    edgarCode, arelleCode = attrs.get("edgarCode"), attrs.get("arelleCode") or ""
    if edgarCode and arelleCode.startswith("EXG."):  # a table-driven message: its code from its message key
        try:
            return MR.exgMessageCode(MR.messageCode(edgarCode, attrs))
        except (KeyError, IndexError, ValueError):
            pass
    efmCode = attrs.get("efmCode")
    if efmCode:  # a check that logs its EFM code directly: its section and the rest of the EFM code, or its given name
        rest = efmCode.split(".")[1:]
        while rest and rest[0].isdigit():
            rest.pop(0)
        if efmCode in MR.exgCodeNames:
            rest = [MR.exgCodeNames[efmCode]]
        if rest:
            return MR.exgMessageCode(".".join([section] + rest))
    # a section only takes the name the log shows, its edgarCode's (MR.exgNamedCode)
    return MR.exgNamedCode(section, name=name)


Message = collections.namedtuple("Message", "code efmCode shown tag")  # shown: the code as the log shows it


def loggedMessages(logPaths):
    """{(testcase file name, variation id): [Message]}: the codes Arelle recorded for the messages it logged while it
    ran each variation (with their efmCode, the code as shown, and the tag the message names), which follow the
    variation's "[info] Variation ..." entry (its ref is "<testcase file>#<id>") in the same <log> document."""
    out = collections.defaultdict(list)
    for path in logPaths:
        key = None
        for entry in logEntries(path):
            if entry is None:  # a <log> document starts
                key = None
                continue
            code = entry.get("code") or ""
            msg, ref = entry.find("message"), entry.find("ref")
            text = (msg.text or "") if msg is not None else ""
            if code == "info" and text.startswith("[info] Variation ") and ref is not None:
                file, _, vid = (ref.get("href") or "").partition("#")
                key = (os.path.basename(file), vid)
                out[key]
            elif (code == "info" and text.startswith("[info] Testcase ")) or code == "arelle:testCaseResults":
                key = None
            elif key is not None and code and msg is not None:
                out[key].append(Message(recordedCode(code, msg) if code.startswith("EXG.") else code, msg.get("efmCode"),
                                        code, msg.get("tag") or ""))
    return out


def normalized(text):
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def asserts(variation):
    return list(variation.iter("{%s}assert" % EDGAR_CONF))


def expectedCode(variation):
    """The code Arelle expects of a variation in an EFM-coded run, from its first assert (ModelTestcaseObject.expected),
    or None; "" for a variation with no assert."""
    for a in asserts(variation)[:1]:
        num = a.get("num") or ""
        if num.startswith("EXG."):
            return num
        if num == "99999":
            return a.get("name")
        if len(num) == 5:
            return "EFM.{0}.{1}.{2}".format(num[0], num[1:3], num[3:6])
        return None
    return ""


def matches(expected, code):
    """Arelle's match of a logged code to an expected one (Validate.py), for the codes an EFM-coded run logs, with its
    special cases for checks Arelle itself makes, whose codes are not EFM's."""
    return (code == expected or (expected.startswith(("EFM.", "EXG.")) and code.startswith(expected)) or
            (expected == "EFM.6.03.04" and code.startswith("xmlSchema:")) or
            (expected == "EFM.6.03.05" and (code.startswith("xmlSchema:") or code == "EFM.5.02.01.01")) or
            (expected == "EFM.6.04.03" and code.startswith(("xmlSchema:", "utr:", "xbrl.", "xlink:"))) or
            (expected == "EFM.6.05.35" and code.startswith("utre:")))


def sectionOf(code):
    """The code's section, its levels two digits as in the plugin's codes: "EXG.11.10.GraphicFileContent" ->
    "EXG.11.10", the renderer's "EXG.7.3.FactsNotInMovements" -> "EXG.7.03"."""
    m = exgSectionPattern.match(code)
    if not m:
        return None
    levels = m.group(0).split(".")[1:]
    return "EXG." + ".".join([levels[0]] + ["{:02d}".format(int(p)) for p in levels[1:]])


def sectionKey(section):
    return [int(p) for p in sectionOf(section).split(".")[1:]]


def placement(variation, messages, retired=frozenset()):
    """(EXG section, [(expected code, severity, is a prefix)], None) for a variation placed, or (None, None, reason)
    for one left out, or (None, None, None) for a valid variation.  retired: the EFM sections ("EFM.6.05.44") of
    checks efm-exg-references.json retires from EXG mode."""
    expected = expectedCode(variation)
    if expected == "":
        return None, None, None
    if expected is None:
        return None, None, "assert num {} not handled".format(asserts(variation)[0].get("num"))
    if expected.startswith("EXG."):  # its asserts name EXG codes
        errors = []
        for a in asserts(variation):
            severity = SEVERITY.get(a.get("severity"), "error")
            num, name = a.get("num") or "", a.get("name") or ""
            if num.startswith("EXG."):
                codes = sorted({m.code for m in messages if matches(num, m.code)})
                errors.extend((code, severity, False) for code in codes) if codes else errors.append((num, severity, True))
            elif name.startswith("EXG."):
                errors.append((MR.exgMessageCode(name), severity, False))
        return sectionOf(expected), errors, None
    if not expected.startswith("EFM."):
        return None, None, "expects a code of no guide"
    a = asserts(variation)[0]  # Arelle expects only the first assert's code
    matched = [m for m in messages if m.code.startswith("EXG.") and m.efmCode and matches(expected, m.efmCode)]
    codes = sorted({m.code for m in matched})
    sections = {sectionOf(code) for code in codes}
    if len(sections) > 1:  # checks in several sections fail: those of the concept or check the assert names, if in one
        name = normalized(a.get("name"))
        named = sorted({m.code for m in matched if name and (name in normalized(m.shown) or
                                                              name in (normalized(m.tag), normalized("dei:" + m.tag)))})
        if len({sectionOf(code) for code in named}) == 1:
            codes, sections = named, {sectionOf(named[0])}
    if len(sections) == 1:
        return sections.pop(), [(code, SEVERITY.get(a.get("severity"), "error"), False) for code in codes], None
    if sections:
        return None, None, "several sections: " + ", ".join(sorted(sections, key=sectionKey))
    if any(not m.code.startswith("EXG.") and matches(expected, m.code) for m in messages):
        return None, None, "logged with no EXG code"
    if ".".join(expected.split(".")[:4]) in retired:
        return None, None, "retired from EXG mode"
    return None, None, "not logged in EXG mode"


def slug(title, limit=48):
    words = re.sub(r"[^a-z0-9]+", " ", title.lower()).split()
    out = []
    for w in words:
        if out and len("-".join(out + [w])) > limit:
            break
        out.append(w)
    return "-".join(out)


def guideSection(section):
    """"EXG.3.01.05" -> "3.1.5"."""
    return ".".join(str(p) for p in sectionKey(section))


def sectionPath(section, titles):
    """The testcase file of an EXG section, relative to the output folder: "EXG.3.01.05" ->
    "03-instance-validations/03-01-expected-facts-in-the-required-context/03-01-05-form-or-exhibit-type-testcase.xml"."""
    levels = sectionKey(section)
    def name(n):
        key = ".".join(str(p) for p in levels[:n])
        if key not in titles:
            raise KeyError("EXG {} has no section title in guide.json".format(key))
        return "-".join("{:02d}".format(p) for p in levels[:n]) + "-" + slug(titles[key])
    folders = [name(n) for n in range(1, min(len(levels), 2) + 1)]
    return "/".join(folders + [name(len(levels)) + "-testcase.xml"])


def childText(elt, name):
    child = elt.find("{%s}%s" % (EDGAR_CONF, name))
    return " ".join("".join(child.itertext()).split()) if child is not None else ""


def exgVariation(variation, sourcePath, sourceRel, outPath, errors):
    """The variation's copy for the EXG suite, in the XBRL conformance format (see the module docstring)."""
    base = os.path.basename(sourcePath)
    base = base[:-len("-testcase.xml")] if base.endswith("-testcase.xml") else os.path.splitext(base)[0]
    vid = variation.get("id") or ""
    v = ET.Element("{%s}variation" % XBRL_CONF, {"id": "_{}{}".format(base, vid if vid.startswith("_") else "_" + vid)})
    if childText(variation, "name"):
        v.set("name", childText(variation, "name"))
    description = childText(variation, "description")
    ET.SubElement(v, "{%s}description" % XBRL_CONF).text = "{}{}(EFM suite {}#{})".format(description, " " if description else "", sourceRel, vid)
    data = ET.SubElement(v, "{%s}data" % XBRL_CONF)
    sourceDir, outDir = os.path.dirname(sourcePath), os.path.dirname(outPath)
    hasElo = False
    for source in variation.iter("{%s}data" % EDGAR_CONF):
        for d in source:
            if localName(d) == "parameter":
                attrib = dict(d.attrib)
                if attrib.get("name") == "ELOparams":
                    elo = json.loads(attrib.get("value") or "{}")
                    elo["messageCodes"] = "EXG"
                    attrib["value"] = json.dumps(elo)
                    hasElo = True
                ET.SubElement(data, "{%s}parameter" % XBRL_CONF, attrib)
            elif d.text and d.text.strip():
                path = d.text.strip()
                if os.path.exists(os.path.join(sourceDir, path)):
                    path = os.path.relpath(os.path.join(sourceDir, path), outDir).replace(os.sep, "/")
                ET.SubElement(data, "{%s}%s" % (XBRL_CONF, localName(d)), dict(d.attrib)).text = path
    if not hasElo:
        data.insert(0, ET.Element("{%s}parameter" % XBRL_CONF, {"name": "ELOparams", "value": json.dumps({"messageCodes": "EXG"})}))
    result = ET.SubElement(v, "{%s}result" % XBRL_CONF)
    for code, severity, isPrefix in errors:
        e = ET.SubElement(result, "{%s}error" % XBRL_CONF, {"severity": severity})
        if isPrefix or not ncNamePattern.match(code):  # Arelle reads an <error> as a QName unless told otherwise
            e.set("nonStandardErrorCodes", "true")
        e.text = code
    return v


def testcaseText(section, title, variations):
    number = guideSection(section)
    root = ET.Element("{%s}testcase" % XBRL_CONF)
    creator = ET.SubElement(root, "{%s}creator" % XBRL_CONF)
    ET.SubElement(creator, "{%s}name" % XBRL_CONF).text = CREATOR[0]
    ET.SubElement(creator, "{%s}email" % XBRL_CONF).text = CREATOR[1]
    ET.SubElement(root, "{%s}number" % XBRL_CONF).text = number
    ET.SubElement(root, "{%s}name" % XBRL_CONF).text = "EDGAR XBRL Guide {} {}".format(number, title)
    ET.SubElement(root, "{%s}description" % XBRL_CONF).text = (
        "EDGAR XBRL Guide {} {}: variations of the EFM suite, run with messageCodes EXG".format(number, title))
    root.extend(variations)
    ET.indent(root, space="  ")
    return "<?xml version='1.0' encoding='UTF-8'?>\n" + ET.tostring(root, encoding="unicode") + "\n"


def removeEarlierOutput(outDir):
    for dirPath, _dirNames, fileNames in os.walk(outDir, topdown=False):
        for f in fileNames:
            if f.endswith("-testcase.xml") or f == INDEX_NAME:
                os.remove(os.path.join(dirPath, f))
        if dirPath != outDir and not os.listdir(dirPath):
            os.rmdir(dirPath)


def main(indexPath, guidePath, outDir, logPaths, reportPath=None):
    indexPath, outDir = os.path.abspath(indexPath), os.path.abspath(outDir)
    titles = json.load(open(guidePath, encoding="utf-8"))["sections"]
    references = json.load(open(REFERENCES, encoding="utf-8"))
    retired = {"EFM." + ".".join([p if i == 0 else p.zfill(2) for i, p in enumerate(r["efm"].split("."))])
               for r in references["references"] if not r["exg"]}
    logged = loggedMessages(logPaths)
    ET.register_namespace("", XBRL_CONF)
    bySection = collections.defaultdict(list)
    report = ["testcase\tvariation\texpected\tsection\tcodes\treason"]
    counts = collections.Counter()
    for path in leafTestcases(indexPath, outDir):
        root = ET.parse(path).getroot()
        if root.tag != "{%s}testcase" % EDGAR_CONF:
            continue  # the fee testcases (XBRL conformance format) expect EFM.FT codes, which stay EFM-coded
        rel = os.path.relpath(path, os.path.dirname(indexPath)).replace(os.sep, "/")
        for v in root.iter("{%s}variation" % EDGAR_CONF):
            if (v.get("id") or "").endswith("-exg"):
                continue  # an EXG-mode twin (makeExgTwins.py)
            key = (os.path.basename(path), v.get("id"))
            expected = expectedCode(v)
            if key not in logged and expected and not expected.startswith("EXG."):
                section, errors, reason = None, None, "not in the logs"
            else:
                section, errors, reason = placement(v, logged.get(key, ()), retired)
            if section is None and reason is None:
                continue  # a valid variation
            if section:
                bySection[section].append((path, rel, v, errors))
                counts["placed"] += 1
                if any(isPrefix for _, _, isPrefix in errors):
                    counts["placed, expecting a code prefix (none logged)"] += 1
                report.append("\t".join((rel, v.get("id"), expected or "", section,
                                         " ".join(c + ("*" if p else "") for c, _, p in errors), "")))
            else:
                counts[reason.partition(":")[0]] += 1
                report.append("\t".join((rel, v.get("id"), expected or "", "", "", reason)))
    if os.path.isdir(outDir):
        removeEarlierOutput(outDir)
    uris = []
    for section in sorted(bySection, key=sectionKey):
        rel = sectionPath(section, titles)
        outPath = os.path.join(outDir, rel)
        os.makedirs(os.path.dirname(outPath), exist_ok=True)
        variations = [exgVariation(v, path, srcRel, outPath, errors) for path, srcRel, v, errors in bySection[section]]
        with open(outPath, "w", encoding="utf-8") as fh:
            fh.write(testcaseText(section, titles[guideSection(section)], variations))
        uris.append(rel)
    lib = os.path.relpath(os.path.join(os.path.dirname(os.path.dirname(outDir)), "lib"), outDir).replace(os.sep, "/")
    with open(os.path.join(outDir, INDEX_NAME), "w", encoding="utf-8") as fh:
        fh.write("<?xml version='1.0' encoding='UTF-8'?>\n")
        fh.write('<?xml-stylesheet type="text/xsl" href="{}/testcases.xsl"?>\n'.format(lib))
        fh.write('<testcases name="EDGAR XBRL Guide">\n')
        for rel in uris:
            fh.write('  <testcase uri="{}"/>\n'.format(rel))
        fh.write("</testcases>\n")
    if reportPath:
        with open(reportPath, "w", encoding="utf-8") as fh:
            fh.write("\n".join(report) + "\n")
    print("{} testcase files; {} variations placed".format(len(uris), counts.pop("placed", 0)))
    for reason, n in counts.most_common():
        print("  {}: {}".format(reason if reason.startswith("placed") else "left out, " + reason, n))


if __name__ == "__main__":
    args = sys.argv[1:]
    report = None
    if "--report" in args:
        i = args.index("--report")
        report = args[i + 1]
        del args[i:i + 2]
    if len(args) < 4:
        sys.exit(__doc__)
    main(args[0], args[1], args[2], args[3:], report)
