"""Candidate EXG references for the checks that log an EFM code directly (modelXbrl.error, warning, info or log with a
literal "EFM.x.yy.zz..." code, a code chosen by a conditional expression, or a code built at run time that the call's
messageCodes argument lists, or UNCATALOGUED_CODES), not through a dei-validations.json entry: the input to the direct
rows of efm-exg-references.json.  A code that also cites sections after a comma (PreCalAlignment's
"EFM.6.15.02,6.13.02,6.13.03") is keyed by its first section.

A direct check is identified as the table-driven ones are, by EFM section, validation, axis and concept, with
  - efm: the code's EFM section, its first three numeric levels ("EFM.6.05.38" -> "6.5.38");
  - validation: "(code)" followed by the rest of the code ("EFM.6.05.20.exhibitDocumentType" ->
    "(code)exhibitDocumentType", "EFM.6.05.38" -> "(code)"); a code built at run time (an f-string) is keyed by
    its literal part, ending ".*" ("EFM.6.05.58.07.P-{...}-Dependency" -> "(code)07.*"), and matches any code that
    begins with it (MessageReferences.directMsgSection);
  - axis "": direct checks name no dei-validations axis;
  - concept "": the code identifies the check, whichever fact it is reported on.  A ruling may add a row for a
    concept the message names (CONCEPT_RULINGS, or GUIDE_CONCEPT_ROWS for the concepts of the guide's rows of one
    kind), where one code is logged for checks in different sections.

Rulings may also add a row for a whole code a check builds at run time (EXACT_CODE_RULINGS), and a row keyed by
validation "(edgarCode)" followed by the message's edgarCode (EDGARCODE_RULINGS), where one code is logged by checks
with different edgarCodes that the guide states in different sections.

Candidates: the guide's validation rows whose "EFM v68 Ref" cell cites the code's EFM section, or the subsection the
code's next numeric level names ("EFM.5.02.05.14..." -> 5.2.5.14) where it is cited.  Where a row cites an item of
the section ("§ 6.5.58 Item 5"), the rows of the code's item (EFM.6.05.58.05).  Where those lie in several sections,
narrowed to the rows whose "On failure" text is the check's edgarCode (less its "du-0538-" prefix) or the code's
suffix, compared without case, spaces or punctuation.  Where no validation row cites the section, the sections whose
prose cites it (extract.py's citations, change logs excepted).  A ruling (RULINGS below, recorded in
resources/exg/handoffs/mapping-rulings.md) overrides these.

Tiers in the output: "ruling", "direct" (one section; the EFM section, and where needed the item or failure text,
agree), "prose" (one section whose prose cites the EFM section), "kept" (ruled to keep its EFM code), "retired" (ruled
not to be performed in EXG mode), "several" (for review), "none" (the guide cites no such EFM section).
buildReferences.py builds "ruling", "direct", "prose" and "retired".

It also reports the calls whose code is a section only, an EXG code or an EFM code with an EXG section, that pass no
edgarCode and whose arelleMessagesText.xml entry names none: the log shows such a code with no name ("[EXG.3.01.02]"
for "[EXG.3.01.02:EntityIdentifierValue]").

Usage: python3 directCodes.py <guide.json> <plugin dir (the EDGAR plugin)> <out direct-candidates.tsv> [<arelle dir>]
  <arelle dir>: Arelle's package directory (holding ValidateFilingText.py), whose modules also log EFM codes
"""
import ast, collections, csv, json, os, re, sys
from xml.etree import ElementTree

# rulings recorded in resources/exg/handoffs/mapping-rulings.md: (EFM section, validation) -> EXG section, "" for a
# check that keeps its EFM code although the guide cites its EFM section, or RETIRED for a check the guide no longer
# makes, whose messages are not logged when EXG leads messageCodes; validation "*" rules every direct check of the EFM
# section
RETIRED = "(retired)"
RULINGS = {
    # EFM 5.2.2 restricts every HTML attachment (validateHtm, run under its own efm-htm disclosure system for plain
    # HTML documents), EXG chapter 11 only Inline XBRL documents
    ("5.2.2", "*"): "",
    # Arelle's disallowed entity code check, on every file of an XBRL submission: 8.1 row 9 File Entity Code (review,
    # 2026-10-28)
    ("5.2.2", "(code)06"): "8.1",
    # logged by efmFiling.error, outside the model's log, so the code cannot be rewritten; no guide row either
    ("5.2.5", "(code)"): "",
    # EXG chapter 11 (Previously EFM § 5.2.5) states each Inline XBRL restriction in its own section; 9.1.3 is the
    # restricted BODY content model only
    ("5.2.5", "(code)xhtmlNamespaceMissing"): "11",
    ("5.2.5", "(code)doctypeDisallowed"): "11.1",
    ("5.2.5", "(code)tupleDisallowed"): "11.11",
    ("5.2.5", "(code)fractionDisallowed"): "11.11",
    ("5.2.5", "(code)targetDisallowed"): "11.11",
    ("5.2.5", "(code)12.unsupportedTransformationRegistry"): "11.12",
    ("5.2.5", "(code)14.hidden-fact-eligible-for-transform"): "11.14",
    ("5.2.5", "(code)14.hidden-fact-multiple-references"): "11.14",
    ("5.2.5", "(code)14.hidden-fact-not-found"): "11.14",
    ("5.2.5", "(code)14.hidden-fact-not-referenced"): "11.14",
    ("5.2.5", "(code)standardNamespacePrefix"): "8.2",
    # Arelle's own Inline XBRL checks (ValidateFilingText.py)
    ("5.2.5", "(code)anchorElementPosition"): "11.8",
    ("5.2.5", "(code)schemaLocationDisallowed"): "11.13",
    ("5.2.5", "(code)xmlBaseDisallowed"): "8.6",  # 8.6 row 1, on any element; 11.11 states it for Inline XBRL elements
    # 8.3 cites "§ 6.22" without subsection: row 1 (Prohibited Href Or Schema Location, the check's edgarCode) and
    # row 2 (a standard namespace only at its edgartaxonomies URL)
    ("6.22.0", "(code)"): "8.3",
    ("6.22.2", "(code)"): "8.3",
    # schema and linkbase file names like the instance's: 5.2 "Its file name is like the instance, but with suffix
    # .xsd" (review, 2026-10-28)
    ("6.3.3", "(code)matchInstance"): "5.2",
    # the file name pattern checks logged with val.EFM60303 (EFM.6.03.03, or EFM.6.23.01 for EX-2.01), found by
    # their messageCodes catalogs: the naming is a convention only (EXG 1.4), which many accepted filings do not
    # follow (XBRL Guide author, 2026-10-29)
    ("6.3.3", "(code)"): RETIRED,
    ("6.23.1", "(code)"): RETIRED,
    # a linkbase with no extended link, whose type cannot be told: 8.1 rows 3 to 6 require a linkbase to contain the
    # extended link of its type (review, 2026-10-29)
    ("6.3.3", "(code)noLinkElement"): "8.1",
    ("6.23.1", "(code)noLinkElement"): "8.1",
    # checks the guide no longer makes (XBRL Guide author, 2026-10-29): segment content other than explicit members
    # (EFM 6.5.5 is reserved; a custom typed dimension is 6.7.2, EXG 8.6); negative values (made redundant by DQC);
    # a custom axis where a standard one is preferred (6.5.44 is reserved); restrictions on arcroleType declarations
    # (only using a custom arcrole matters, 6.9.6, EXG 8.5); custom substitution groups (any must still validate as
    # an xbrli:item)
    ("6.5.5", "(code)"): RETIRED,
    ("6.5.43", "(code)"): RETIRED,
    ("6.5.44", "(code)customAxis"): RETIRED,
    ("6.7.13", "(code)"): RETIRED,
    ("6.7.13", "(code)arcroleEnding"): RETIRED,
    ("6.7.14", "(code)"): RETIRED,
    ("6.7.15", "(code)"): RETIRED,
    ("6.7.25", "(code)"): RETIRED,
    # a linkbase whose extended link is not of a standard kind: 8.1 rows 3 to 6, as noLinkElement (review, 2026-10-30)
    ("6.3.2", "(code)"): "8.1",
    # concept name checks: 10.3 states the naming as "a common convention" only, and that a name must not change
    # merely to agree with a changed label (LC3); a name over 200 characters is also EFM.6.07.29 (8.8); the disallowed
    # characters are invalid in any XML name (review, 2026-10-30)
    ("6.8.5", "(code)nameLength"): RETIRED,
    ("6.8.5", "(code)firstLetter"): RETIRED,
    ("6.8.5", "(code)disallowedCharacter"): RETIRED,
    ("6.8.5", "(code)LC3"): RETIRED,
    # PreCalAlignment, a required calculation missing in a statement (6.15.02) or a note (6.15.03): 5.9.1 When
    # calculation relationships are required, of line items in "the financial statements or the footnotes"; 5.9.3
    # (which cites § 6.15.3) is alternate calculations (review, 2026-10-30)
    ("6.15.2", "*"): "5.9.1",
    ("6.15.3", "*"): "5.9.1",
    # ValidateFilingText.validateHtmlContent for XBRL footnotes: the 9.1 rows state these checks (href and src URLs,
    # JavaScript, graphics, nested tables), as for text blocks (EFM.6.05.16.*); the <meta> check has no 9.1 row and
    # stays with 9.1.2, the footnote section (review, 2026-10-28)
    **{("6.5.34", "(code)" + check): "9.1" for check in (
        "activeContent", "externalReference", "graphicDataUrl", "graphicDataEncodingError", "graphicFileType",
        "graphicFileContent", "graphicFileError", "nestedTable")},
    # ... and for Inline XBRL documents, chapter 11: 11.7 nested tables, 11.10 the values of src (local jpeg and gif
    # graphics) and href (local or SEC, "This precludes active content such as JavaScript"), 11.3 the <head> <meta>
    ("5.2.5", "(code)nestedTable"): "11.7",
    **{("5.2.5", "(code)" + check): "11.10" for check in (
        "activeContent", "externalReference", "graphicDataUrl", "graphicDataEncodingError", "graphicFileType",
        "graphicFileContent", "graphicFileError")},
    ("5.2.5", "(code)disallowedMetaContent"): "11.3",
    # codes with no EFM section (efm ""): -sec-ix-redact in a submission type whose instance types the 1.4 table does
    # not mark "Inline Redaction Allowed", the only statement of which instance types allow it (review, 2026-10-28)
    ("", "(code)disallowedRedact"): "1.4",
    # an invalid entity identifier cannot equal the CIK (3.1.2 row 1); the guide cites 6.5.2 for namespace prefixes
    ("6.5.2", "(code)"): "3.1.2",
    # 9.7 row 2 (start and instant dates) cites 6.5.9 for what the legacy code checks as 6.5.10
    ("6.5.10", "(code)"): "9.7",
    # no dei namespace: the first required fact, dei:DocumentType, is missing (3.1.5 row 1)
    ("6.5.20", "(code)deiFactsMissing"): "3.1.5",
    # dei:DocumentType value not permitted for the K SDR or L SDR exhibit (3.1.5 row 3)
    ("6.5.20", "(code)exhibitDocumentType"): "3.1.5",
    # class id members, as the series id members (6.5.41) are 3.2.5 Open-end Fund Series
    ("6.5.57", "(code)classIdMemberNotAxisMember"): "3.2.6",
    ("6.5.57", "(code)classIdMemberNotDeclared"): "3.2.6",
    ("6.5.57", "(code)classIdMemberNotInContext"): "3.2.6",
    # dei:DocumentType 2.01 SD if and only if the attachment is EX-2.01 (3.1.5 row 2)
    ("6.5.58", "(code)exhibitDocumentType"): "3.1.5",
    # item 8 is stated twice, for government (gac) and project (pac) aggregate contexts; the legacy code keeps them
    # apart as items 8 and 9
    ("6.5.58", "(code)08.GovernmentAxis-Gv-Value-Dependency"): "3.3.7",
    ("6.5.58", "(code)09.ProjectAxis-Pr-Value-Dependency"): "3.3.8",
    ("6.7.9", "(code)roleEnding"): "10.2",
    # cover page facts in ix:hidden: by each fact's "in Facts Not Visible" row (GUIDE_CONCEPT_ROWS below); facts of
    # several sections, or of a concept such rows place in several, take 3.1, to which 11.14 refers dei facts in
    # ix:hidden (review, 2026-10-28)
    ("6.5.45", "(code)coverPageFactNotVisible"): "3.1",
    # the declaration of a fractionItemType concept (8.7 row 5); ix:fraction (8.5 row 4) is 5.2.5 fractionDisallowed
    ("6.7.31", "(code)"): "8.7",
    # a reference to a custom or standard element needs a link:referenceLink, which is not allowed (8.5 row 6, § 18)
    ("6.18.1", "(code)"): "8.5",
    ("6.18.2", "(code)"): "8.5",
}
# rulings for a concept a direct check's message names (its tag argument or the fact it is reported on), as more rows
# beside the check's own: (EFM section, validation, concept) -> EXG section
CONCEPT_RULINGS = {
    # EFM.6.05.02 is also logged for a dei:EntityCentralIndexKey of 0000000000 (3.1.3 Central Index Key)
    ("6.5.2", "(code)", "dei:EntityCentralIndexKey"): "3.1.3",
}
# rows for each concept of the guide's rows whose failure text matches the pattern ({n} the concept's slot), where
# the concept's rows lie in one section: (EFM section, validation) -> pattern
GUIDE_CONCEPT_ROWS = {
    ("6.5.45", "(code)coverPageFactNotVisible"): r"^(\{\d+\}) in Facts Not Visible$",
}
# rulings for codes a check builds at run time, which the scan finds only by their literal part ("(code)03.*"):
# (EFM section, validation of the whole code) -> EXG section.  EFM.6.05.58.03.{F}-{G}-Dependency names the facts of
# 3.3.4 (amount, currency and conversion) or 3.3.5 (member-valued) rows "If a {F} fact is present, then a {G} fact is
# present"; E-Co, Gv-A and Pr-A have no row and are of member-valued facts (review, 2026-10-28)
EXACT_CODE_RULINGS = {
    **{("6.5.58", f"(code)03.{pair}-Dependency"): "3.3.4" for pair in ("A-M", "M-A", "Cm-A", "K-A", "K-Km", "Km-K")},
    **{("6.5.58", f"(code)03.{pair}-Dependency"): "3.3.5" for pair in ("A-R", "A-Gv", "A-Co", "Co-A", "Gv-Co", "E-Co",
                                                                         "Gv-A", "P-A", "R-A", "Pr-A", "Pr-Gv", "Sn-Co")},
}
# rulings by edgarCode, where one code is logged for checks the guide states in different sections: (EFM section,
# edgarCode) -> EXG section, written as validation "(edgarCode)" followed by the edgarCode
EDGARCODE_RULINGS = {
    # a custom text block concept must have period type duration (5.11.2, formerly EFM v68 § 6.7.32); other custom
    # non-numeric concepts: 5.11 Custom Non-Numeric Concepts (review, 2026-10-28)
    ("6.7.32", "rq-0732-TextBlock-Must-Be-Duration"): "5.11.2",
    ("6.7.32", "rq-0732-Nonnnumeric-Must-Be-Duration"): "5.11",
}

LOG_METHODS = {"error", "warning", "info", "log", "exception"}
# codes a call builds at run time without listing them in its messageCodes argument: (code, file)
UNCATALOGUED_CODES = [
    # ValidateFilingText.validateHtmlContent: its messageCodePrefix ("EFM.6.05.34." for footnotes, "EFM.5.02.05." for
    # Inline XBRL documents) followed by the check
    (prefix + check, "arelle/ValidateFilingText.py")
    for prefix in ("EFM.6.05.34.", "EFM.5.02.05.") for check in ("graphicDataUrl", "graphicDataEncodingError")
] + [
    # PreCalAlignment: a required calculation missing, in a statement (6.15.02) or a note (6.15.03), with the sections
    # it also cites, and ".missingItemsNil" (missing items nil) and ".parenthetical" (parenthetical link role) appended
    (base + suffix, "validate/PreCalAlignment.py")
    for base in ("EFM.6.15.02,6.13.02,6.13.03", "EFM.6.15.03,6.13.02,6.13.03")
    for suffix in ("", ".missingItemsNil", ".parenthetical", ".missingItemsNil.parenthetical")
]
SCANNED_DIRS = ("", "validate", "render", "validateHtm", "transform", "view")
efmCodePattern = re.compile(r"EFM\.([0-9]+)\.([0-9]+)\.([0-9]+)(?:,[0-9]+(?:\.[0-9]+)*)*(?:\.(.*))?$")  # as MessageReferences.directCodePattern
# a code with no EFM section ("EFM.disallowedRedact"), taken only where RULINGS names it, as efm ""
sectionlessCodePattern = re.compile(r"EFM\.([A-Za-z][A-Za-z0-9-]*)$")
# an EXG code that is a section only, which takes its name from the call's edgarCode
exgSectionCodePattern = re.compile(r"EXG(?:\.[0-9]+)+$")
efmRefPattern = re.compile(r"(?<![0-9.])([0-9]+(?:\.[0-9]+)+)")
itemPattern = re.compile(r"\bItem\s+([0-9]+)")


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def efmSectionOf(code):
    """("6.5.38", "rest") from "EFM.6.05.38.rest"; None for codes not of that form."""
    m = efmCodePattern.match(code or "")
    if not m:
        return None
    return "{}.{}.{}".format(*(int(g) for g in m.groups()[:3])), m.group(4) or ""


def literalCode(node):
    """A log call's code: a string constant, the first EFM code of a tuple (Arelle logs the code of the disclosure
    system in effect), or an f-string's literal prefix followed by "*"."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Tuple):
        for e in node.elts:
            c = literalCode(e)
            if c and c.startswith("EFM."):
                return c
        return None
    if isinstance(node, ast.JoinedStr):
        prefix = ""
        for v in node.values:
            if isinstance(v, ast.Constant) and isinstance(v.value, str):
                prefix += v.value
            else:
                return prefix + "*"
        return prefix
    return None


def callCodes(node, keywords):
    """The EFM codes a log call may log: its code argument's literal code (literalCode), each branch's of a code chosen
    by a conditional expression, and the EFM codes its messageCodes argument lists, Arelle's catalog of the codes of a
    call whose code is built at run time ("EFM.6.05.34." or "EFM.5.02.05." + "nestedTable")."""
    codes = []
    for branch in ((node.body, node.orelse) if isinstance(node, ast.IfExp) else (node,)):
        code = literalCode(branch)
        if code and code.startswith("EFM."):
            codes.append(code)
    for k in keywords:
        if k.arg == "messageCodes" and isinstance(k.value, (ast.Tuple, ast.List)):
            codes.extend(e.value for e in k.value.elts
                         if isinstance(e, ast.Constant) and isinstance(e.value, str) and e.value.startswith("EFM."))
    return list(dict.fromkeys(codes))


def directCalls(pluginDir, arelleDir=None, bare=None):
    """[(code, edgarCode or "", "file:line")] of the log calls with an EFM code in the plugin and, when given, in
    Arelle's own modules (ValidateFilingText.py and others log EFM codes, which reach the plugin's releveler too),
    and the codes of UNCATALOGUED_CODES.  A list given as bare receives the (code, "file:line") of the calls logging an
    EXG section code ("EXG.1.04") with no edgarCode, which the log shows with no name (MessageReferences.displayCode)."""
    calls = []
    dirs = [(os.path.join(pluginDir, sub), sub) for sub in SCANNED_DIRS]
    if arelleDir:
        dirs.append((arelleDir, "arelle"))
    for d, label in dirs:
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".py"):
                continue
            path = os.path.join(d, name)
            with open(path, encoding="utf-8") as fh:
                tree = ast.parse(fh.read(), path)
            # names assigned a tuple of codes, which a call may give as its messageCodes argument
            # (render/Embedding.py: messageCodes=_msgCodes)
            assignedCodes = {n.targets[0].id: n.value for n in ast.walk(tree)
                             if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)
                             and isinstance(n.value, (ast.Tuple, ast.List))
                             and all(isinstance(e, ast.Constant) and isinstance(e.value, str) for e in n.value.elts)}
            for n in ast.walk(tree):
                if not (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in LOG_METHODS):
                    continue
                args = n.args[1:] if n.func.attr == "log" else n.args
                if not args:
                    continue
                edgarCode = next((k.value.value for k in n.keywords if k.arg == "edgarCode"
                                  and isinstance(k.value, ast.Constant) and isinstance(k.value.value, str)), "")
                keywords = [ast.keyword(arg=k.arg, value=assignedCodes[k.value.id])
                            if k.arg == "messageCodes" and isinstance(k.value, ast.Name) and k.value.id in assignedCodes
                            else k for k in n.keywords]
                for code in callCodes(args[0], keywords):
                    calls.append((code, edgarCode, "{}:{}".format(os.path.join(label, name), n.lineno)))
                exgCode = literalCode(args[0])
                if bare is not None and not edgarCode and exgCode and exgSectionCodePattern.match(exgCode):
                    bare.append((exgCode, "{}:{}".format(os.path.join(label, name), n.lineno)))
    for code, file in UNCATALOGUED_CODES:
        if arelleDir or not file.startswith("arelle/"):
            calls.append((code, "", file + ":0"))
    return calls


def guideConceptSections(guide, pattern):
    """{concept: sections} of the guide's validation rows (not 3.1.1) whose failure text matches pattern, the concept
    being the one its concept table gives the slot the pattern captures."""
    concepts = {(c["Section"], c["Elt"].strip()): c["Concept"].strip() for c in guide["concepts"] if not c.get("rowDeleted")}
    out = collections.defaultdict(set)
    for v in guide["validations"]:
        if v.get("rowDeleted") or v["Section"] == "3.1.1":
            continue
        m = re.match(pattern, (v.get("On failure") or "").strip())
        if m and concepts.get((v["Section"], m.group(1))):
            out[concepts[(v["Section"], m.group(1))]].add(v["Section"])
    return out


def validationKey(rest):
    """The validation of a direct row from the part of the code after its EFM section."""
    if rest.endswith("*"):
        literal = rest[:-1]
        # a code built at run time matches by the dot-separated levels that are wholly literal
        literal = literal.rpartition(".")[0] if "." in literal else ""
        return "(code)" + (literal + ".*" if literal else "*")
    return "(code)" + rest


def main(guidePath, pluginDir, outPath, arelleDir=None):
    guide = json.load(open(guidePath, encoding="utf-8"))
    rowsByEfm = collections.defaultdict(list)
    for v in guide["validations"]:
        if v.get("rowDeleted") or v["Section"] == "3.1.1":
            continue
        for ref in efmRefPattern.findall(v.get("EFM v68 Ref") or ""):
            rowsByEfm[ref].append(v)
    proseByEfm = collections.defaultdict(set)  # change logs (chapter 12) cite sections they changed, not rules
    for section, refs in guide.get("citations", {}).items():
        if section.split(".")[0] != "12":
            for ref in refs:
                proseByEfm[ref].add(section)
    keys = collections.OrderedDict()  # (efm, validation) -> {"edgarCodes", "sites", "codes"}
    unparsed = []
    bare = []  # (code, site) of calls logging a code that is a section only, with no edgarCode to name it
    bareEfm = []  # (efm, validation, code, site): those of EFM codes, reported where the code has an EXG section
    for code, edgarCode, site in directCalls(pluginDir, arelleDir, bare):
        parsed = efmSectionOf(code)
        if not parsed:
            m = sectionlessCodePattern.match(code)
            if m and ("", "(code)" + m.group(1)) in RULINGS:
                parsed = ("", m.group(1))
        if not parsed:
            unparsed.append((code, site))
            continue
        efm, rest = parsed
        k = keys.setdefault((efm, validationKey(rest)), {"edgarCodes": set(), "sites": [], "codes": set()})
        k["sites"].append(site)
        k["codes"].add(code)
        if edgarCode:
            k["edgarCodes"].add(edgarCode)
        elif efm and not rest:
            bareEfm.append((efm, validationKey(rest), code, site))
    out = []
    for (efm, validation), k in keys.items():
        # a code whose next level is numeric ("EFM.5.02.05.14.hidden-fact-not-found") names a subsection; rows or
        # prose citing the subsection itself are preferred to those citing the section
        level = re.match(r"\(code\)([0-9]+)", validation)
        refs = [efm + "." + str(int(level.group(1))), efm] if level else [efm]
        ref = next((r for r in refs if rowsByEfm.get(r) or proseByEfm.get(r)), efm)
        cands = rowsByEfm.get(ref, [])
        # rows citing an item of the EFM section ("§ 6.5.58 Item 5") belong to the code with that level (EFM.6.05.58.05)
        itemRows = [v for v in cands if level and str(int(level.group(1))) in itemPattern.findall(v.get("EFM v68 Ref") or "")]
        if itemRows:
            cands = itemRows
        texts = {norm(re.sub(r"^[a-z]+-[0-9]+-", "", e)) for e in k["edgarCodes"]}
        suffix = validation[len("(code)"):].rstrip("*").rstrip(".")
        if suffix and not suffix[0].isdigit():
            texts.add(norm(suffix))
        texts.discard("")
        secs = {v["Section"] for v in cands}
        matched = [v for v in cands if norm(v.get("On failure")) in texts]
        if len(secs) > 1 and matched:
            cands, secs = matched, {v["Section"] for v in matched}
        cited = " | ".join("{}#{} {}".format(v["Section"], v["Row"], v.get("On failure") or "") for v in cands)
        prose = not secs
        if prose:
            secs = proseByEfm.get(ref, set())
            cited = " | ".join("{} {} (prose)".format(s, guide["sections"].get(s, "")) for s in sorted(secs))
        ruling = RULINGS.get((efm, validation), RULINGS.get((efm, "*")))
        if ruling == "":
            tier, exg = "kept", ""
        elif ruling == RETIRED:
            tier, exg = "retired", ""
        elif ruling is not None:
            tier, exg = "ruling", ruling
        elif len(secs) == 1:
            tier, exg = ("prose" if prose else "direct"), next(iter(secs))
        else:
            tier, exg = ("several" if secs else "none"), ",".join(sorted(secs, key=lambda s: [int(x) for x in s.split(".")]))
        row = [cited, " ".join(sorted(k["codes"])), " ".join(sorted(k["edgarCodes"])),
               # files only: line numbers would mark the candidates changed whenever unrelated code moves
               " ".join(sorted({s.rpartition(":")[0] for s in k["sites"]}))]
        out.append([efm, validation, "", "", tier, exg] + row)
        for (rEfm, rValidation, concept), section in CONCEPT_RULINGS.items():
            if (rEfm, rValidation) == (efm, validation):
                out.append([efm, validation, "", concept, "ruling", section] + row)
        pattern = GUIDE_CONCEPT_ROWS.get((efm, validation))
        if pattern:
            for concept, sections in sorted(guideConceptSections(guide, pattern).items()):
                if len(sections) == 1:
                    out.append([efm, validation, "", concept, "ruling", next(iter(sections))] + row)
        for (rEfm, edgarCode), section in EDGARCODE_RULINGS.items():
            if rEfm == efm and edgarCode in k["edgarCodes"]:
                out.append([efm, "(edgarCode)" + edgarCode, "", "", "ruling", section] + row)
        if validation.endswith(".*"):
            for (rEfm, rValidation), section in EXACT_CODE_RULINGS.items():
                if rEfm == efm and rValidation.startswith(validation[:-1]):
                    out.append([efm, rValidation, "", "", "ruling", section] + row)
    out.sort(key=lambda r: ([int(x) for x in r[0].split(".") if x], r[1]))
    with open(outPath, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\n")
        w.writerow(["efm", "validation", "axis", "concept", "tier", "exgSection", "candidates", "codes", "edgarCodes", "files"])
        w.writerows(out)
    print(len(out), "direct checks:", dict(collections.Counter(r[4] for r in out)))
    for code, site in unparsed:
        print("not an EFM section code, skipped:", code, site)
    exgTiers = {(r[0], r[1]) for r in out if r[4] in ("ruling", "direct", "prose") and not r[3]}
    # a message logged with no edgarCode takes its arelleMessagesText.xml entry's (MessageText.MessageTextFilter);
    # UNCATALOGUED_CODES (line 0) stand for calls whose edgarCode the scan does not see
    entryEdgarCodes = set()
    messagesTextPath = os.path.join(pluginDir, "render", "resources", "arelleMessagesText.xml")
    if os.path.exists(messagesTextPath):
        entryEdgarCodes = {e.get("code") for e in ElementTree.parse(messagesTextPath).getroot().iter("message")
                           if e.get("edgarCode")}
    bare += [(code, site) for efm, validation, code, site in bareEfm
             if (efm, validation) in exgTiers and code not in entryEdgarCodes and not site.endswith(":0")]
    for code, site in sorted(bare, key=lambda b: b[1]):
        print("no edgarCode, logged with no name in EXG mode:", code, site)


if __name__ == "__main__":
    if len(sys.argv) not in (4, 5):
        sys.exit(__doc__)
    main(*sys.argv[1:])
