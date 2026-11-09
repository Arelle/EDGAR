"""
EDGAR XBRL Guide (EXG) instance types of a submission: submission sets, entity sets and instance types.

EXG 1.1 defines three kinds of set, and section 3 scopes its rules by them:

- submission sets (Table 6-1): groups of EDGAR submission types, with suffixes (Table 6-2) for submission types
  whose XBRL requirements depend on the form inside the submission (#) or on an exhibit in it (%);
- entity sets (Table 6-3): kinds of registrant;
- instance types (Table 6-4): a submission set, an entity set and for some rows an exhibit type yield an instance
  type code.  "Rows of the table are cumulative; that is, given a submission, every row that matches yields an
  instance type."

The tables are EXG 1.1 "Set Definitions", held as data in validate/resources/exg-set-definitions.json, which
extractSets.py generates from the guide's Word source; nothing here restates them.  Names follow the guide's terms
and Table 6-4's column headings: submissionSet(s), submissionTypes, entitySet(s) (includedEntitySet,
excludedEntitySets), exhibitType, instanceType(s).

EXG's exhibit type (Table 6-4: EX-FILING FEES, EX-98, EX-2.01, EX-99.K SDR, ...) is an EDGAR document type, so it is
matched against the attachmentDocumentType parameter (or dei:DocumentType), not against the exhibitType parameter,
which names the legal exhibit.

Entity sets are a property of the registrant.  Inside EDGAR, where the registration database is available to the
caller of Arelle, they are passed as the parameter entitySets.  Elsewhere they are determined from the submission
itself by the rules in determineEntitySets, which are OUR PROPOSAL (resources/exg/handoffs/README.md,
"Entity sets"), not EXG text.  When the parameter is given it decides, and the
determined sets are still computed so that a disagreement can be logged.

Instance of a submission vs. the submission: Table 6-4 is cumulative over a submission, but a validation runs on one
instance.  An instance that is itself an exhibit named by a matching row (the fee exhibit, EX-98, EX-2.01, the K and
L SDR exhibits, EX-99.4R HISTORIC, the SBSEF exhibits) takes the instance types of those exhibit rows only; any
other instance takes the matching rows that name no exhibit.  This reading is ours: the guide does not say how an
exhibit's instance is told apart from the primary document's.

This module has no Arelle imports, so that it can be tested on its own.
"""
import collections, json, re

# Table 6-2 '%' suffixes say an exhibit is in the submission; the guide states them in prose ("There is an Exhibit
# 2.01 in the submission"), so they are mapped to EDGAR document types here.  A suffix in the data that is not here
# is reported as unresolved rather than guessed.
EXHIBIT_SUFFIXES = {
    "%201": ("EX-2.01",),
    "%KL": ("EX-99.K SDR", "EX-99.L SDR"),
    "%98": ("EX-98",),
}

# dei:DocumentType values that stand for an exhibit, as Filing.py's EFM 6.5.20 checks pair them with attachment
# document types (2.01 SD with EX-2.01, K SDR with EX-99.K SDR, L SDR with EX-99.L SDR)
DOCUMENT_TYPE_EXHIBITS = {
    "2.01 SD": "EX-2.01",
    "K SDR": "EX-99.K SDR",
    "L SDR": "EX-99.L SDR",
}

# the form inside the submission when dei:DocumentType names an exhibit rather than a form (Consts.docTypesSubType)
FORM_OF_DOCUMENT_TYPE = {
    "EX-99.4R HISTORIC": "N-4",
}

# Table 6-2 '#' suffixes name the form inside the submission: "The Form is an N-1A."
FORM_SUFFIX_MEANING = re.compile(r"The Form is an? (\S+?)\.?$")

FORM_1_SUBMISSION_TYPES = {"1", "1/A", "1AA", "1AC", "1/A-A", "1/A-T", "1/S-M", "1/S-R", "1W"}


def loadSetDefinitions(stream):
    """The exg-set-definitions.json resource (EXG 1.1 Set Definitions), from an open text stream."""
    return json.load(stream)


def exhibitIn(exhibitType, attachmentDocumentType, documentType):
    """Whether this instance is the exhibit exhibitType (a Table 6-4 exhibit type or an EDGAR document type).

    The attachment document type may carry a suffix (EX-98.1, EX-99.K SDR.INS), so it matches by prefix; the
    comparison ignores case, since the guide writes both EX-99.4r and EX-99.4R HISTORIC.
    """
    wanted = exhibitType.upper()
    for candidate in (attachmentDocumentType, DOCUMENT_TYPE_EXHIBITS.get(documentType, documentType)):
        if candidate and candidate.upper().startswith(wanted):
            return True
    return False


def formsInside(documentType=None, invCompanyType=None):
    """Forms the submission may contain, for Table 6-2's '#' suffixes: dei:DocumentType (the plugin's "485BPOS§N-1A"
    convention; an exhibit's document type stands for its form, FORM_OF_DOCUMENT_TYPE) and the investment company
    type, whose EDGAR values are form names (N-1A, N-2, N-3, N-4, N-6).  A 485BPOS or 497 usually has DocumentType
    485BPOS or 497, so for funds the investment company type is what names the form."""
    return {f for f in (FORM_OF_DOCUMENT_TYPE.get(documentType, documentType), (invCompanyType or "").strip()) if f}


# document types the plugin uses as a submission type when none is supplied (the desktop preview of an exhibit):
# Filing.py infers the submission type from dei:DocumentType, and Consts.docTypesSubType maps only 2.01 SD
DOCUMENT_TYPE_SUBMISSION_TYPES = {
    "2.01 SD": "SD",
    "K SDR": "SDR",
    "L SDR": "SDR",
}


def baseSubmissionType(submissionType):
    """The EDGAR submission type without the plugin's '§' suffix ("S-4EF§EX-98" -> "S-4EF"), and with a document
    type standing in for a submission type replaced by that submission type ("K SDR" -> "SDR")."""
    submissionType = (submissionType or "").partition("§")[0]
    return DOCUMENT_TYPE_SUBMISSION_TYPES.get(submissionType, submissionType)


def submissionSetsOf(setDefinitions, submissionType, documentType=None, attachmentDocumentType=None, invCompanyType=None):
    """Submission sets (Table 6-1) the submission belongs to.

    Returns ({set code: the Table 6-1 entry that matched}, [unresolved suffix notes]).  An entry with a '#' suffix
    matches when one of formsInside() is the form the suffix names; an entry with a '%' suffix matches when this
    instance is one of the exhibits the suffix names.
    """
    submissionType = baseSubmissionType(submissionType)
    forms = formsInside(documentType, invCompanyType)
    suffixMeanings = setDefinitions.get("submissionSetSuffixes", {})
    matched, unresolved = {}, []
    for code, entry in setDefinitions.get("submissionSets", {}).items():
        for submissionTypeEntry in entry.get("submissionTypes", ()):
            base, sep, suffix = _splitSuffix(submissionTypeEntry)
            if base != submissionType:
                continue
            if not sep:
                matched[code] = submissionTypeEntry
                break
            suffixCode = sep + suffix
            if sep == "#":
                m = FORM_SUFFIX_MEANING.match(suffixMeanings.get(suffixCode, ""))
                if not m:
                    unresolved.append("{}: suffix {} has no form".format(code, suffixCode))
                elif m.group(1) in forms:
                    matched[code] = submissionTypeEntry
                    break
            else:
                exhibits = EXHIBIT_SUFFIXES.get(suffixCode)
                if exhibits is None:
                    unresolved.append("{}: suffix {} not mapped to exhibits".format(code, suffixCode))
                elif any(exhibitIn(e, attachmentDocumentType, documentType) for e in exhibits):
                    matched[code] = submissionTypeEntry
                    break
    return matched, unresolved


def _splitSuffix(submissionTypeEntry):
    """'485BPOS#N1' -> ('485BPOS', '#', 'N1'); 'SD%201' -> ('SD', '%', '201'); '10-K' -> ('10-K', '', '')."""
    m = re.match(r"(.*?)([#%])(.*)$", submissionTypeEntry)
    return (m.group(1), m.group(2), m.group(3)) if m else (submissionTypeEntry, "", "")


def parseEntitySetsParameter(value):
    """The entitySets parameter, Table 6-3 codes: a list in JSON (ELOparams), or one blank-separated string from a
    formula or GUI parameter, as for the seriesIds parameters (validate/__init__.py splits those already)."""
    if value is None:
        return None
    if isinstance(value, str):
        value = value.split()
    return {str(v).strip() for v in value if str(v).strip()}


def determineEntitySets(submissionSets, submissionType, documentType=None, attachmentDocumentType=None,
                        fileNumbers=(), invCompanyType=None, taxonomyPrefixes=()):
    """Entity sets (Table 6-3) determined from the submission alone.  OUR PROPOSAL, not EXG text.

    Returns {entity set code: reason}.  Every submission is in ALL.  The rules choose among the entity sets that
    Table 6-4 pairs with each submission set, using only what the submission shows: its submission type, the form
    inside it (dei:DocumentType), its exhibits, its SEC file numbers, its investment company type, and which
    standard taxonomies its facts use.
      submissionSets      as returned by submissionSetsOf
      fileNumbers         SEC file numbers of the submission (an "814-" number is a business development company)
      invCompanyType      the header invCompanyType or dei:EntityInvCompanyType (N-1A, N-2, ...)
      taxonomyPrefixes    standard taxonomy prefixes the instance's facts use (cef, spac, ...)
    """
    found = {"ALL": "every registrant"}
    def add(code, reason):
        found.setdefault(code, reason)
    submissionType = baseSubmissionType(submissionType)
    form = documentType or submissionType or ""
    baseType = submissionType.split("/")[0]
    bdc = any(str(n).strip().startswith("814-") for n in fileNumbers)
    invType = (invCompanyType or "").strip()
    if "6K" in submissionSets:
        add("FPI", "6K is filed only by foreign private issuers")
    if "AF" in submissionSets:
        if baseType in ("10-K", "10-KT") and bdc:
            add("BDC", "10-K under an 814- file number")
        elif baseType == "40-F":
            add("CA", "40-F")
        elif baseType == "20-F":
            add("FPI", "20-F")
        elif baseType == "N-CSR":
            if invType == "N-2" or (not invType and "cef" in taxonomyPrefixes):
                add("CEF", "N-CSR, investment company type N-2" if invType else "N-CSR using the cef taxonomy")
            else:
                add("OEF", "N-CSR, investment company type {}".format(invType) if invType else "N-CSR, by default")
        else:
            add("US", "annual report, by default")
    if "QF" in submissionSets:
        if baseType in ("10-Q", "10-QT") and bdc:
            add("BDC", "10-Q under an 814- file number")
        elif baseType == "SBSEF-FIN-QTR":
            add("SBSEF", "SBSEF-FIN-QTR")
        else:
            add("US", "quarterly report, by default")
    if "HF" in submissionSets:
        add("OEF", "N-CSRS")
    if "OA" in submissionSets:
        if baseType == "17AD-27":
            add("SRO", "17AD-27")
        elif baseType == "SDR":
            add("SDR", "SDR")
        elif baseType == "SBSEF-CCO-RPT":
            add("SBSEF", "SBSEF-CCO-RPT")
        elif baseType == "SD":
            add("US", "SD: nothing in the submission distinguishes RXP.US, RXP.FPI and RXP.CA")
    if "PRO" in submissionSets and (invType == "N-2" or "cef" in taxonomyPrefixes):
        add("CEF", "prospectus, investment company type N-2" if invType == "N-2" else "prospectus using the cef taxonomy")
    if "R33" in submissionSets:
        if baseType.startswith("F-") or form.startswith("F-"):
            add("FPI", "an F- form")
        elif baseType.startswith("S-11"):
            add("RT", "S-11")
        elif baseType.startswith("S-6"):
            add("UIT", "S-6")
        else:
            add("US", "33 Act registration, by default")
    if "R34" in submissionSets:
        if baseType.startswith("20FR"):
            add("FPI", "20FR")
        elif baseType.startswith("40FR"):
            add("CA", "40FR")
        elif submissionType in FORM_1_SUBMISSION_TYPES:
            add("SRO", "Form 1")
        else:
            add("US", "34 Act registration, by default")
    if "R40" in submissionSets:
        add("UIT", "N-8B-2")
    if "RD" in submissionSets:
        rdForm = {"N-1A": "OEF", "N-2": "CEF", "N-3": "V3", "N-4": "V4", "N-6": "V6",
                  "EX-99.4R HISTORIC": "V4"}
        for candidate in (documentType, invType, baseType):
            key = next((k for k in rdForm if candidate and candidate.upper().startswith(k)), None)
            if key:
                add(rdForm[key], "the form inside is {}".format(candidate))
                break
        else:
            if baseType.startswith("486"):
                add("CEF", "486 series (N-2)")
    if "RF" in submissionSets or "SE" in submissionSets:
        add("SBSEF", "SBSEF submission")
    if exhibitIn("EX-98", attachmentDocumentType, documentType):
        add("SPAC", "Exhibit 98")
    elif "spac" in taxonomyPrefixes:
        add("SPAC", "facts in the spac taxonomy")
    return found


def instanceTypesOf(setDefinitions, submissionSets, entitySets, attachmentDocumentType=None, documentType=None):
    """Instance types (Table 6-4) of the submission and of this instance.

    Returns (submissionInstanceTypes, instanceTypes): every matching row's instance type for the submission, and
    those that apply to this instance (see the module docstring).  A row matches when its submission set is one of
    the submission's, its entity set is ALL or one of the entity sets, none of its excluded entity sets is, and
    its exhibit type, if any, is this instance.
    """
    submissionRows, exhibitRows, otherRows = [], [], []
    for row in setDefinitions.get("instanceTypes", ()):
        if row["submissionSet"] not in submissionSets:
            continue
        if row["includedEntitySet"] != "ALL" and row["includedEntitySet"] not in entitySets:
            continue
        if any(x in entitySets for x in row.get("excludedEntitySets", ())):
            continue
        exhibit = row.get("exhibitType")
        if exhibit and not exhibitIn(exhibit, attachmentDocumentType, documentType):
            continue
        submissionRows.append(row["instanceType"])
        (exhibitRows if exhibit else otherRows).append(row["instanceType"])
    unique = lambda xs: list(dict.fromkeys(xs))
    return unique(submissionRows), unique(exhibitRows or otherRows)


def resolveInstanceTypes(setDefinitions, submissionType, documentType=None, attachmentDocumentType=None,
                         entitySetsParameter=None, fileNumbers=(), invCompanyType=None, taxonomyPrefixes=()):
    """Submission sets, entity sets and instance types of a submission, with how each was decided.

    Returns a dict:
      submissionSets            {code: the Table 6-1 entry that matched}
      entitySets                {code: reason}; from the parameter when given ("parameter"), else determined
      entitySetsSource          "parameter" or "determined"
      determinedEntitySets      {code: reason}, always computed
      entitySetsDisagreement    (only from parameter, only determined) when the parameter is given and differs in
                                an entity set that a Table 6-4 row of the submission's sets names
      unknownEntitySets         parameter codes that Table 6-3 does not define
      instanceTypes             this instance's instance types
      submissionInstanceTypes   every instance type the submission's matching rows yield
      unresolved                notes on suffixes the data uses that cannot be evaluated
      scopeSubmissionSets       the submission sets this instance is in for a scope cell's "s:" (scopeSubmissionSetsOf)
    """
    submissionSets, unresolved = submissionSetsOf(setDefinitions, submissionType, documentType, attachmentDocumentType,
                                                  invCompanyType)
    determined = determineEntitySets(submissionSets, submissionType, documentType, attachmentDocumentType,
                                     fileNumbers, invCompanyType, set(taxonomyPrefixes))
    param = parseEntitySetsParameter(entitySetsParameter)
    result = {"submissionSets": submissionSets, "determinedEntitySets": determined, "unresolved": unresolved}
    if param is not None:
        given = param | {"ALL"}
        result["entitySets"] = {code: "parameter" for code in sorted(given)}
        result["entitySetsSource"] = "parameter"
        result["unknownEntitySets"] = sorted(given - set(setDefinitions.get("entitySets", {})))
        # compare only entity sets that some Table 6-4 row of the submission's sets names: for an 8-K, US decides
        # nothing (8K.A is ALL), while SPAC decides EX98.SPAC
        relevant = {e for row in setDefinitions.get("instanceTypes", ()) if row["submissionSet"] in submissionSets
                    for e in [row["includedEntitySet"]] + list(row.get("excludedEntitySets", ())) if e != "ALL"}
        onlyParam, onlyDetermined = (given - set(determined)) & relevant, (set(determined) - given) & relevant
        result["entitySetsDisagreement"] = (sorted(onlyParam), sorted(onlyDetermined)) if onlyParam or onlyDetermined else None
    else:
        result["entitySets"] = determined
        result["entitySetsSource"] = "determined"
        result["unknownEntitySets"] = []
        result["entitySetsDisagreement"] = None
    result["submissionInstanceTypes"], result["instanceTypes"] = instanceTypesOf(
        setDefinitions, submissionSets, set(result["entitySets"]), attachmentDocumentType, documentType)
    result["scopeSubmissionSets"] = scopeSubmissionSetsOf(setDefinitions, submissionSets, result["instanceTypes"],
                                                          attachmentDocumentType, documentType)
    return result


# Scope cells.  EXG section 3 scopes each rule by its Incl and Excl cells: "s: AF, QF, i: AF.US, AF.BDC" names
# submission sets after "s:" and instance types after "i:".  A rule applies to an instance when its Incl cell
# matches and its Excl cell does not.  The readings below are OURS, to confirm with the EXG author; the crosswalk
# (validate/tools/crosswalk.py) uses these same functions:
#   - an instance that is itself an exhibit named by a Table 6-4 row (the fee exhibit, EX-98, EX-2.01, ...) is in a
#     submission set for "s:" only where that set holds nothing but exhibits (FE, SE, TO): an 8-K's Exhibit 98 is
#     EX98.SPAC, not "s: 8K";
#   - such an exhibit-only set does not hold the submission's other instances, so an S-1's primary document is not
#     "in FE" although Table 6-1 lists S-1 under FE (otherwise 3.1.5's "Excl s: FE" excludes every S-1);
#   - ALL, under "s:" or "i:", is every instance that is in a submission set or has an instance type.

def exhibitOnlySubmissionSets(setDefinitions):
    """Submission sets whose Table 6-4 rows all name an exhibit (FE, SE, TO)."""
    rows = collections.defaultdict(list)
    for row in setDefinitions.get("instanceTypes", ()):
        rows[row["submissionSet"]].append(row)
    return {code for code, rs in rows.items() if rs and all(r.get("exhibitType") for r in rs)}


def scopeSubmissionSetsOf(setDefinitions, submissionSets, instanceTypes, attachmentDocumentType=None, documentType=None):
    """The submission sets an instance is in for a scope cell's "s:", from the submission's sets (submissionSetsOf)
    and this instance's instance types (instanceTypesOf); see the readings above."""
    exhibitOnly = exhibitOnlySubmissionSets(setDefinitions)
    exhibitRows = [r for r in setDefinitions.get("instanceTypes", ())
                   if r["submissionSet"] in submissionSets and r.get("exhibitType") and r["instanceType"] in instanceTypes
                   and exhibitIn(r["exhibitType"], attachmentDocumentType, documentType)]
    if exhibitRows:
        return {r["submissionSet"] for r in exhibitRows} & exhibitOnly
    return set(submissionSets) - exhibitOnly


def parseScopeCell(setDefinitions, text):
    """An Incl or Excl cell: {"s": submission sets, "i": instance types, "all": bool, "issues": [...]}.

    Each code counts by what it is, whatever prefix it is written under, and is reported in issues when the prefix
    is wrong or missing; codes run together without a comma, and "All" for ALL, are read as meant and reported.
    Codes that Table 6-1 and 6-4 do not define are reported and ignored."""
    instanceTypes = {r["instanceType"] for r in setDefinitions.get("instanceTypes", ())}
    submissionSets = set(setDefinitions.get("submissionSets", {}))
    out = {"s": set(), "i": set(), "all": False, "issues": []}
    prefix = None
    for raw in re.split(r",|\s+(?=[si]\s*:)", (text or "").replace("\xa0", " ").strip()):
        tok = raw.strip()
        m = re.match(r"([si])\s*:\s*(.*)$", tok)
        if m:
            prefix, tok = m.group(1), m.group(2).strip()
        pieces = [x for x in re.split(r"\s+|(?<=[A-Z])\.\s+", tok) if x]
        if len(pieces) > 1:
            out["issues"].append("'{}' lacks a comma between codes".format(tok))
        for code in pieces:
            if code.upper() == "ALL":
                out["all"] = True
                if code != "ALL":
                    out["issues"].append("'{}' written for ALL".format(code))
                if prefix is None:
                    out["issues"].append("ALL without s: or i:")
            elif code in instanceTypes:
                out["i"].add(code)
                if prefix != "i":
                    out["issues"].append("{} is an instance type, written {}".format(
                        code, "under s:" if prefix else "without s: or i:"))
            elif code in submissionSets:
                out["s"].add(code)
                if prefix != "s":
                    out["issues"].append("{} is a submission set, written {}".format(
                        code, "under i:" if prefix else "without s: or i:"))
            else:
                out["issues"].append("{} is neither a submission set nor an instance type".format(code))
    return out


def scopeMatches(cell, scopeSubmissionSets, instanceTypes):
    """Whether a parsed scope cell names this instance."""
    return ((cell["all"] and bool(scopeSubmissionSets or instanceTypes))
            or bool(cell["s"] & set(scopeSubmissionSets)) or bool(cell["i"] & set(instanceTypes)))


def scopeApplies(setDefinitions, incl, excl, scopeSubmissionSets, instanceTypes):
    """Whether a rule scoped by EXG Incl and Excl cells (text, or parsed by parseScopeCell) applies to an instance,
    given its scopeSubmissionSets and instanceTypes as resolveInstanceTypes returns them."""
    if not isinstance(incl, dict):
        incl = parseScopeCell(setDefinitions, incl)
    if not isinstance(excl, dict):
        excl = parseScopeCell(setDefinitions, excl)
    return scopeMatches(incl, scopeSubmissionSets, instanceTypes) and not scopeMatches(excl, scopeSubmissionSets, instanceTypes)
