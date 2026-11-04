"""
See COPYRIGHT.md for copyright information.

The references a table-driven (dei-validations.json, ft-validations.json) message carries, and the codes formed
from them.  The functions take plain values rather than the validation state, so that they can be tested without
loading a filing.

An entry may carry an EDGAR Filer Manual section ("efm": "6.5.20"), another guide's section ("msgSection":
"EXG:3.1.5", for the EDGAR XBRL Guide), or both.  Every reference the entry has becomes a message argument
(efmSection, exgSection), so converting a validation to EXG adds the EXG reference rather than replacing the
EFM one.  Which reference forms the message code, and with it the edgarCode and the numeric ID, is decided for all entries
alike by the messageCodes parameter, the guides in priority order (parseMessageCodes), default "EFM": with
"EFM", an entry with an EFM reference keeps the code it has always had, and only an entry with no EFM reference
takes its code from the other guide; with "EXG", every entry with an EXG reference takes its EXG code, without
editing entries.  An entry with an EFM reference and no msgSection of its own takes the EXG reference that
efm-exg-references.json gives its check (inferredMsgSection), so legacy checks are coded EXG without the entries
being edited, and their messages carry exgSection in every mode.  Listing more than one guide, such as "EXG EFM", also gives each message its full code under
each listed guide it has a reference to, as arguments efmCode and exgCode (messageGuideCodes), so that runs coded
by different guides can be compared message by message.  A message coded by another guide than EFM always carries
its EFM code as efmCode, by which arelleMessagesText.xml gives its text (MessageText).

A check that logs an EFM code directly (modelXbrl.error("EFM.6.05.38", ...)), not through a dei-validations.json
entry, is coded the same way when its message is logged: the plugin's Logging.Severity.Releveler looks the code up in
efm-exg-references.json (directMsgSection), where such checks are keyed by validation "(code)" followed by the rest
of the code, and rewrites the code and adds the arguments (directCodeArgs).
"""
import regex as re

messageCodeLeadingGuide = "EFM" # the guide whose reference forms the message code when messageCodes is not given

# the part of a message key before its code suffix, e.g. "dq-{efmSection}" in "dq-{efmSection}-{tag}-Value"
messageKeySectionPattern = re.compile(r"(.*[{]efmSection[}]|[a-z]{2}-[0-9]{4}|dq-)(.*)")

def sectionCodeParts(section):
    """Levels of a section number as they appear in codes: numeric levels after the first are two digits,
    e.g. "6.5.2" -> ["6", "05", "02"], "3.1.24.2" -> ["3", "01", "24", "02"], "ft.oClmSrc" -> ["ft", "oClmSrc"]."""
    return [level.zfill(2) if i > 0 and level.isnumeric() else level
            for i, level in enumerate(section.split("."))]

def parseMessageCodes(value):
    """The messageCodes parameter: guides in priority order, e.g. ("EXG", "EFM"), from a list (JSON) or one
    blank-separated string (formula or GUI parameter); (messageCodeLeadingGuide,) when absent or empty."""
    if isinstance(value, str):
        value = value.split()
    guides = tuple(str(v).strip().upper() for v in (value or ()) if str(v).strip())
    return guides or (messageCodeLeadingGuide,)

def referencesIndex(resource):
    """{(efm, validation, axis, concept): "EXG:section"} from the efm-exg-references.json resource; retiredReference
    for a check retired from EXG mode (exg null, basis "retired")."""
    return {(r["efm"], r["validation"], r["axis"], r["concept"]): "EXG:" + r["exg"] if r.get("exg") else retiredReference
            for r in (resource or {}).get("references", ())}

# the reference of a check that is not performed in EXG mode: its messages are not logged when EXG leads messageCodes
retiredReference = "(retired)"

def messageConcepts(logArgs, xbrlNames):
    """The concepts a message is about, prefixed (dei: when unprefixed): its tag argument, else its tags argument
    (comma-separated), else the entry's xbrl-names."""
    if logArgs.get("tag"):
        names = [logArgs["tag"]]
    elif logArgs.get("tags"):
        names = str(logArgs["tags"]).split(",")
    else:
        names = list(xbrlNames or ())
    return [n if ":" in n else "dei:" + n for n in (str(n).strip() for n in names) if n]

def inferredMsgSection(index, efm, validation, axis, concepts, allowRetired=False):
    """The EXG reference (msgSection form, "EXG:3.1.22.1") of a legacy check that carries only an EFM reference, from
    efm-exg-references.json (referencesIndex): when every concept the message names maps to the same EXG section;
    otherwise None, and the message keeps its EFM reference only.  A reference with concept "" is for the whole
    check: it applies to a concept with no reference of its own, and to a message that names no concept (a required
    taxonomy, the required context's duration).  retiredReference only where allowRetired (directMsgSection)."""
    axis = axis or ""
    wholeCheck = index.get((efm, validation, axis, ""))
    sections = {index.get((efm, validation, axis, c)) or wholeCheck for c in concepts} if concepts else {wholeCheck}
    section = sections.pop() if len(sections) == 1 and None not in sections else None
    return None if section == retiredReference and not allowRetired else section

# the EFM section of the checks of submission header (ELO) parameters against facts
eloEfmSection = "6.5.40"

def eloMsgSection(index, headerTag):
    """The EXG reference (msgSection form) of a check of the submission header parameter headerTag, such as
    periodOfReport, against its fact (or of the parameter given for a form that does not use it), from
    efm-exg-references.json, where such checks are keyed by validation "(elo)" followed by the parameter's name;
    None when there is none."""
    return index.get((eloEfmSection, "(elo)" + headerTag, "", "")) if isinstance(headerTag, str) else None

def messageCodePrefixes(efm, msgSection):
    """{guide: code prefix} for an entry's references, e.g. {"EFM": "EFM.6.05.20", "EXG": "EXG.3.01.05"}."""
    codes = {}
    if efm:
        codes["EFM"] = ".".join(["EFM"] + sectionCodeParts(efm))
    if msgSection:
        guide, _sep, number = msgSection.partition(":")
        codes[guide] = ".".join([guide] + sectionCodeParts(number))
    return codes

def messageSectionArgs(efm, msgSection, leadingGuide=messageCodeLeadingGuide):
    """Message arguments for an entry's references.

    efm: the EFM section, e.g. "6.5.20" or "ft.oClmSrc", or None
    msgSection: another guide's section as "prefix:section", e.g. "EXG:3.1.5", or None
    leadingGuide: a guide, or guides in priority order as from parseMessageCodes
    Returns efmSection ("60520") and <prefix>Section ("exgSection": "30105") for each reference present, and
    arelleCode, the code prefix ("EFM.6.05.20", "EXG.3.01.05"), from the first leading guide the entry has a
    reference to, otherwise from EFM, otherwise from the other guide.  Returns no arelleCode when there is no
    reference.
    """
    args = {}
    codes = messageCodePrefixes(efm, msgSection)
    for guide, prefix in codes.items():
        args[f"{guide.lower()}Section"] = prefix.partition(".")[2].replace(".", "")
    leading = (leadingGuide,) if isinstance(leadingGuide, str) else tuple(leadingGuide)
    for guide in (*leading, "EFM", *codes):
        if guide in codes:
            args["arelleCode"] = codes[guide]
            break
    return args

def messageGuideCodes(messageKey, logArgs, efm, msgSection, guides):
    """When more than one guide is listed (messageCodes "EXG EFM"), the message's full code under each listed guide
    the entry has a reference to, as arguments efmCode and exgCode.  Otherwise, when the message is coded by another
    guide than EFM, its EFM code as efmCode, by which arelleMessagesText.xml gives its text (MessageText); else none.
    Raises KeyError as messageCode does."""
    codes = messageCodePrefixes(efm, msgSection)
    if len(guides) > 1:
        listed = guides
    elif not str(logArgs.get("arelleCode", "")).startswith("EFM."):
        listed = ("EFM",)
    else:
        return {}
    return {f"{guide.lower()}Code": messageCode(messageKey, dict(logArgs, arelleCode=codes[guide]))
            for guide in listed if guide in codes}

# a code logged directly (modelXbrl.error("EFM.6.05.38", ...)): its EFM section's three levels and the rest; sections
# the code also cites after a comma ("EFM.6.15.02,6.13.02,6.13.03.missingItemsNil", PreCalAlignment) are not kept
directCodePattern = re.compile(r"EFM\.([0-9]+)\.([0-9]+)\.([0-9]+)(?:,[0-9]+(?:\.[0-9]+)*)*(?:\.(.*))?$")
# a code with no EFM section, a single name ("EFM.disallowedRedact"); not "EFM.ft.dbtVal4" or "EFM.N/A"
sectionlessCodePattern = re.compile(r"EFM\.([A-Za-z][A-Za-z0-9-]*)$")

def directCodeParts(code):
    """("6.5.38", "") from "EFM.6.05.38", ("5.2.5", "14.hidden-fact-not-found") from "EFM.5.02.05.14.hidden-fact-not-found",
    ("6.15.2", "missingItemsNil") from "EFM.6.15.02,6.13.02,6.13.03.missingItemsNil" (the sections it also cites dropped),
    ("", "disallowedRedact") from "EFM.disallowedRedact", a code with no EFM section; None for other codes."""
    m = directCodePattern.match(code) if isinstance(code, str) else None
    if not m:
        m = sectionlessCodePattern.match(code) if isinstance(code, str) else None
        return ("", m.group(1)) if m else None
    return "{}.{}.{}".format(*(int(g) for g in m.groups()[:3])), m.group(4) or ""

def directValidations(rest):
    """The validation keys of efm-exg-references.json a direct code's rest may match, most specific first: the code
    itself ("(code)07.P-Taxes-Dependency"), then each shorter dot-separated prefix of it as written for a code built at
    run time ("(code)07.*"), then any code of the section ("(code)*")."""
    yield "(code)" + rest
    levels = rest.split(".") if rest else []
    for i in range(len(levels) - 1, 0, -1):
        yield "(code)" + ".".join(levels[:i]) + ".*"
    yield "(code)*"

def directMsgSection(index, code, concepts=(), edgarCode=None):
    """The EXG reference (msgSection form, "EXG:9.6") of a check that logs an EFM code directly, rather than through a
    dei-validations.json entry, from efm-exg-references.json (referencesIndex): the row for the message's edgarCode,
    where one code is logged for checks the guide states in different sections (validation "(edgarCode)" followed by
    the edgarCode); else the row for a concept the message names when every such concept has one in the same section
    (inferredMsgSection); else the code's own row; None when the code has none, and the message keeps its EFM code;
    retiredReference for a check retired from EXG mode."""
    parts = directCodeParts(code)
    if not parts:
        return None
    efm, rest = parts
    if isinstance(edgarCode, str) and index.get((efm, "(edgarCode)" + edgarCode, "", "")):
        return index[(efm, "(edgarCode)" + edgarCode, "", "")]
    for validation in directValidations(rest):
        section = ((concepts and inferredMsgSection(index, efm, validation, "", concepts, allowRetired=True))
                   or index.get((efm, validation, "", "")))
        if section:
            return section
    return None

def directCodeArgs(code, msgSection, guides):
    """The code and the message arguments of a directly logged EFM code that has the EXG reference msgSection, by
    the guides in priority order (parseMessageCodes): efmSection and exgSection, as messageSectionArgs gives a
    table-driven message, and, when more than one guide is listed, efmCode and exgCode, or when it is coded by
    another guide than EFM, efmCode.  An EFM-coded message keeps
    its code as logged.  Under another guide, the code is that guide's prefix followed by the rest of the EFM code
    less its leading numeric levels, which number EFM subsections and items, not the guide's, as a PascalCase name
    (exgMessageCode): "EFM.5.02.05.14.hidden-fact-not-found" with "EXG:11.14" -> "EXG.11.14.HiddenFactNotFound", or
    the name exgCodeNames gives the code: "EFM.5.02.05.nestedTable" with "EXG:11.7" -> "EXG.11.07.ProhibitedHtml".  A
    code with no EFM section ("EFM.disallowedRedact") is EFM-coded as logged where EFM leads, and has no efmSection
    argument."""
    efm, rest = directCodeParts(code)
    codes = messageCodePrefixes(efm, msgSection)
    args = messageSectionArgs(efm, msgSection, guides)
    if not efm:
        codes["EFM"] = code
    levels = rest.split(".") if rest else []
    while levels and levels[0].isnumeric():
        levels.pop(0)
    if code in exgCodeNames:
        levels = [exgCodeNames[code]]
    def guideCode(guide):
        return code if guide == "EFM" else exgMessageCode(".".join([codes[guide]] + levels))
    leading = args.pop("arelleCode").partition(".")[0]
    if not efm:
        leading = next(guide for guide in (*guides, "EFM") if guide in codes)
    if len(guides) > 1:
        args.update({f"{guide.lower()}Code": guideCode(guide) for guide in guides if guide in codes})
    elif leading != "EFM":
        args["efmCode"] = code  # by which arelleMessagesText.xml gives the message its text (MessageText)
    return guideCode(leading), args

def messageEdgarCode(messageKey, arelleCode):
    """The edgarCode argument: the message key with its {...} fields un-expanded.  When the code comes from a
    guide other than EFM, a "-{efmSection}" in the key is dropped, e.g. "dq-{efmSection}-{tag}-Value" becomes
    "dq-{tag}-Value" for an EXG-coded message."""
    guide = (arelleCode or "").partition(".")[0]
    if guide and guide != "EFM":
        return messageKey.replace("-{efmSection}", "")
    return messageKey

def messageCode(messageKey, logArgs):
    """The message code: arelleCode followed by the message key's suffix with its fields filled from logArgs,
    commas, periods and spaces removed, and the first letter after the suffix's first hyphen lowercased,
    e.g. "EFM.6.05.20" and "dq-{efmSection}-{tag}-Value" with tag "DocumentType" -> "EFM.6.05.20.documentTypeValue".
    An EXG code takes the suffix's words as its PascalCase name (exgCodeName), "EXG.3.01.05.DocumentTypeValue",
    "dq-sro-monthly-facts" -> "EXG.3.04.SroMonthlyFacts".  Raises KeyError when logArgs lacks arelleCode or a field
    of the key."""
    m = messageKeySectionPattern.match(messageKey or "")
    keyAfterSection = m.group(2) if m else ""
    if str(logArgs["arelleCode"]).startswith("EXG."):
        name = exgCodeName(keyAfterSection.format(**logArgs))
        return "{arelleCode}.{name}".format(name=name, **logArgs) if name else "{arelleCode}".format(**logArgs)
    code = "{arelleCode}.".format(**logArgs) + keyAfterSection.format(**logArgs) \
           .replace(",", "").replace(".","").replace(" ","") # replace commas in names embedded in message code portion
    if code.endswith("."):
        code = code[:-1]
    codeSections = code.split("-")
    if len(codeSections) > 1 and codeSections[1]:
        codeSections[1] = codeSections[1][0].lower() + codeSections[1][1:] # start with lowercase
    return "".join(codeSections)

# a message code's section (its guide and the numeric levels after it, or a fee-tagging FT section) and name
displayCodePattern = re.compile(r"((?:EFM|EXG)(?:\.(?:[0-9]+|FT|ft))*\.(?:[0-9]+|FT|ft)(?:,[0-9]+(?:\.[0-9]+)*)*)(?:\.(.+))?$")
# an edgarCode's prefix, "cp-2200-", "dq-0540-", "dq-{efmSection}-", "dq-sro-", or for an EXG-coded message "dq-"; anchored,
# as an edgarCode may have none ("Entity-Identifier-Value")
edgarCodePrefixPattern = re.compile(r"^[a-z]+-(?:[0-9]+-|\{efmSection\}-|sro-)?")

# an EXG code: its section's numeric levels and its name, if any
exgCodePattern = re.compile(r"EXG((?:\.[0-9]+)+)(?:\.(.+))?$")
# the words of a name in any style: "entityFileNumberMissing", "Role-Type-Declaration-Incomplete", "oef:FundNameMissing",
# "EX98SPACFactsDependency" (an acronym is a word), "additionalSecurities462bUnexpected" (a number and a single letter
# after it, a rule's: 462b, 486a; but "1yr" is 1 and yr)
exgNameWordPattern = re.compile(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|[0-9]+(?:[a-z](?![a-z]))?")
exgNameSeparatorPattern = re.compile(r"[^A-Za-z0-9]+")

# the EXG name of a check that logs its EFM code directly, where it is not the EFM code's suffix in PascalCase: EDGAR's
# name for a family of checks that arelleMessagesText.xml has always shown under one name (cp-0502-Prohibited-Html), or a
# name chosen in review (mapping-rulings.md, Names, review 2026-11-02).  EFM mode keeps the EFM codes as they are.
exgCodeNames = {
    "EFM.6.03.03.noLinkElement": "ValidFileExtension",
    **{f"EFM.5.02.05.{check}": "ProhibitedHtml" for check in (
        "activeContent", "disallowedMetaContent", "externalReference", "graphicDataUrl", "graphicFileContent",
        "graphicFileError", "graphicFileType", "nestedTable")},
    "EFM.6.05.15.dtdError": "TextBlockNotWellFormedXML",
    **{f"EFM.6.05.16.{check}": "ProhibitedHtmlBody" for check in (
        "activeContent", "externalReference", "graphicDataUrl", "graphicFileContent", "graphicFileError",
        "graphicFileType", "nestedTable")},
    "EFM.6.05.23.submissionIdentifier": "CikValue",
    **{f"EFM.6.05.34.{check}": "ProhibitedHtmlFootnoteBody" for check in (
        "activeContent", "disallowedMetaContent", "dtdError", "externalReference", "graphicDataUrl",
        "graphicFileContent", "graphicFileError", "graphicFileType", "nestedTable")},
    "EFM.6.07.09.roleEnding": "RoleEndingMismatch",
    "EFM.6.05.58.04.NoConversionMethodNeeded": "ConversionMethodValue",
}

def exgCodeName(name):
    """A name as EXG codes give it, PascalCase like the guide's ("AllFactsFiltered"): the words of the name a check
    gives, whatever its style, each capitalized and joined, "entityFileNumberMissing" -> "EntityFileNumberMissing",
    "Role-Type-Declaration-Incomplete" -> "RoleTypeDeclarationIncomplete", "oef:FundNameMissing" ->
    "OefFundNameMissing".  A name already PascalCase is unchanged."""
    return "".join(word[:1].upper() + word[1:]
                   for part in exgNameSeparatorPattern.split(name) for word in exgNameWordPattern.findall(part))

def exgMessageCode(code):
    """An EXG code as it is logged, recorded and shown: the levels of its section after the first two digits and its
    name PascalCase (exgCodeName), whichever check logs it: "EXG.3.01.18.entityFileNumberMissing" ->
    "EXG.3.01.18.EntityFileNumberMissing", the renderer's "EXG.7.3.FactsNotInMovements" -> "EXG.7.03.FactsNotInMovements".
    Other codes (EFM codes, "EXG.rendering.tooManyCells") are as given."""
    m = exgCodePattern.match(code) if isinstance(code, str) else None
    if not m:
        return code
    levels = m.group(1).split(".")[1:]
    section = ".".join(["EXG", levels[0]] + [level.zfill(2) for level in levels[1:]])
    return f"{section}.{exgCodeName(m.group(2))}" if m.group(2) else section

def edgarCodeName(edgarCode, args=None):
    """The name an edgarCode gives a code that is a section only: the edgarCode less its prefix, if any, with its {...}
    fields filled from args, "cp-0519-Required-Context" -> "Required-Context"; "" for no edgarCode."""
    if not isinstance(edgarCode, str):
        return ""
    name = edgarCodePrefixPattern.sub("", edgarCode, count=1)
    return re.sub(r"\{(\w+)\}", lambda f: str((args or {}).get(f.group(1), f.group(0))), name)

def exgNamedCode(code, edgarCode=None, args=None, name=None):
    """An EXG code as it is recorded: a code that is a section only, logged by a check whose EFM code has no name
    ("EFM.6.05.19"), takes the PascalCase name of its edgarCode (edgarCodeName), or the name given, as the log shows
    it, so that the code tells the checks of a section apart: "EXG.3.01.02" with "cp-0519-Required-Context" ->
    "EXG.3.01.02.RequiredContext".  Other codes, and a section without a name, are as given (exgMessageCode)."""
    code = exgMessageCode(code)
    m = exgCodePattern.match(code) if isinstance(code, str) else None
    if not m or m.group(2):
        return code
    name = exgCodeName(name or edgarCodeName(edgarCode, args))
    return f"{code}.{name}" if name else code

def displayCode(code, edgarCode=None, args=None):
    """The code a message shows in the log: its section and name joined by a colon, "EXG.3.01.05:DocumentTypeValue"
    for "EXG.3.01.05.DocumentTypeValue".  An EXG code that is a section only is named as exgNamedCode records it,
    "EXG.8.03" with "cp-2200-Prohibited-Href-Or-Schema-Location" -> "EXG.8.03:ProhibitedHrefOrSchemaLocation", and an
    EFM code that is a section only takes its edgarCode's name as it is (edgarCodeName).  Other codes, and a section
    without an edgarCode, are as given."""
    code = exgNamedCode(code, edgarCode, args)
    m = displayCodePattern.match(code) if isinstance(code, str) else None
    if not m:
        return code
    section, name = m.groups()
    if not name:
        name = edgarCodeName(edgarCode, args)
    return f"{section}:{name}" if name else code
