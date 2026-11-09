"""
See COPYRIGHT.md for copyright information.

The text of EDGAR messages from render/resources/arelleMessagesText.xml, applied to Arelle's own log so that Arelle
users see the message EDGAR users see.

EDGAR (ArelleValidationWrapper.java) reads Arelle's XML log and, for an entry whose edgarCode or code has a message in
arelleMessagesText.xml, shows that message instead, with its {name} variables replaced by the entry's message
attributes and by values from its refs (refSource, refSources, ...), by commons-lang StrSubstitutor, and then
$local-name(...) replaced by the local name of a QName.  MessageTextFilter does the same to each log record as it is
logged, so every handler (XML or text log file, buffer, GUI) shows that text; EDGAR's own substitution then yields
the same text again.  The functions follow the Java code, including its quirks, so that the two agree:
  - a message's text is the last one in the file for its code;
  - argument values are as Arelle writes them as XML attributes, so truncated to logXmlMaxAttributeLength;
  - a variable that has no value is left as written ("{name}"), and a value is itself substituted;
  - the message is looked up by edgarCode first, then by code.

Messages coded by EXG (the messageCodes parameter) are looked up as they are in EFM mode: by the EFM code they carry
as efmCode, and by their edgarCode with the "-{efmSection}" an EXG-coded message drops (MessageReferences.messageEdgarCode)
put back.  So a message reads the same whichever guide codes it.

The file holds only Arelle's own messages (ValidateFilingText.py, ModelDocument.py); the plugin writes its own.
MessageTextFilter also shows each code in the log as section:name (MessageReferences.displayCode), naming one of
Arelle's own messages by its entry's edgarCode attribute.
"""
import logging, os
from collections.abc import Mapping
from lxml import etree
from .MessageReferences import displayCode

messagesTextPath = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "render", "resources", "arelleMessagesText.xml")
DEFAULT_XML_MAX_ATTRIBUTE_LENGTH = 128  # as arelle.logging.handlers.LogHandlerWithXml
DEFAULT_JSON_MAX_ATTRIBUTE_LENGTH = 4096000
attributeWhitespace = str.maketrans("\r\n\t", "   ")

class MessagesText:
    """The messages of an arelleMessagesText.xml file, read as ArelleValidationWrapper.loadMessagesText reads them."""
    def __init__(self, path):
        self.texts = {}
        self.edgarCodes = {}  # code -> the edgarCode its entry names, for a message logged without one
        root = etree.parse(path).getroot()
        self.prefix = root.get("variablePrefix", "")
        self.suffix = root.get("variableSuffix", "")
        escape = root.get("variablePrefixEscape", "")
        self.escape = escape if len(escape) == 1 else None
        for elt in root.iterchildren("message"):
            code = elt.get("code") or ""
            text = elt.xpath("string()").strip()
            if code and text:
                self.texts[code] = text  # a later message of the same code replaces an earlier one, as in Java
                self.edgarCodes[code] = elt.get("edgarCode")
        # the edgarCode of an EXG-coded table-driven message less its "-{efmSection}" -> the edgarCode it is keyed by
        self.efmSectionKeys = {code.replace("-{efmSection}", ""): code for code in self.texts if "-{efmSection}" in code}

    def lookupKey(self, edgarCode, code):
        """The code or edgarCode of the entry for a message's edgarCode and code, as EDGAR looks it up in EFM mode;
        None if none."""
        if isinstance(edgarCode, str):
            for key in (edgarCode, self.efmSectionKeys.get(edgarCode)):
                if key in self.texts:
                    return key
        if isinstance(code, str) and code in self.texts:
            return code
        return None

    def lookup(self, edgarCode, code):
        """The message text for a message's edgarCode and code, as EDGAR looks it up in EFM mode; None if none."""
        key = self.lookupKey(edgarCode, code)
        return self.texts[key] if key else None

    def substitute(self, text, args):
        """text with its variables replaced from args, then $local-name(...) replaced, as ArelleValidationWrapper does;
        None when a variable refers to itself (StrSubstitutor raises IllegalStateException)."""
        try:
            text = substitute(text, args.get, self.prefix, self.suffix, self.escape)
            return substitute(text, localName, "$local-name(", ")", "$")
        except RecursionError:
            return None

def localName(qnameArg):
    """ArelleValidationWrapper's local-name lookup: the part after the colon of a prefixed name."""
    parts = qnameArg.split(":")
    return parts[1] if len(parts) == 2 else qnameArg

def substitute(text, resolve, prefix, suffix, escape, priorVariables=None, valueDelimiter=":-"):
    """org.apache.commons.lang3.text.StrSubstitutor.replace: each prefix...suffix variable whose name resolve gives a
    value (or that has a default, after the value delimiter) replaced by it, the value itself substituted; an escape
    character before the prefix removed and the variable left; other variables left as written.  Variables are not
    nested.  Raises RecursionError for a variable whose value refers to itself."""
    if not prefix or not suffix:
        return text
    priorVariables = priorVariables or []
    result = ""  # the text before start, substituted; as Java's buffer, an escape may be the end of a value
    pos, start, n = 0, 0, len(text)
    while pos < n:
        if not text.startswith(prefix, pos):
            pos += 1
            continue
        before = result + text[start:pos]
        if before and escape and before[-1] == escape:
            result = before[:-1]  # the escape character is dropped; scanning resumes after it, the prefix as written
            start = pos
            pos += 1
            continue
        varStart = pos
        end = text.find(suffix, pos + len(prefix))
        if end < 0:
            break  # an unterminated variable: the rest is as written
        varName = text[pos + len(prefix):end]
        pos = end + len(suffix)
        defaultValue = None
        if valueDelimiter:
            # the name ends at the first value delimiter, unless a prefix comes first (a nested variable, not supported)
            for i in range(len(varName)):
                if varName.startswith(prefix, i):
                    break
                if varName.startswith(valueDelimiter, i):
                    varName, defaultValue = varName[:i], varName[i + len(valueDelimiter):]
                    break
        if varName in priorVariables:
            raise RecursionError(f"Infinite loop in property interpolation of {varName}")
        value = resolve(varName)
        if value is None:
            value = defaultValue
        if value is not None:
            result += text[start:varStart] + substitute(str(value), resolve, prefix, suffix, escape,
                                                         priorVariables + [varName], valueDelimiter)
            start = pos
    return result + text[start:]

def messageArgs(args, refs, truncateAt=DEFAULT_XML_MAX_ATTRIBUTE_LENGTH):
    """The values ArelleValidationWrapper substitutes for a log entry: its message attributes (the record's args, as
    LogHandlerWithXml writes them, truncated), then refUrl, refLine and refSource from its first ref, refSources (all
    refs), refSources2_n (the second on) and refSource2... (each further ref), unless an attribute has the name."""
    values = {}
    for name, value in (args.items() if isinstance(args, Mapping) else ()):
        s = str(value)
        limit = DEFAULT_JSON_MAX_ATTRIBUTE_LENGTH if name == "json" else truncateAt
        s = s if limit is None or len(s) <= limit else s[:limit] + "..."
        # as an XML parser reads an attribute value: line ends, newlines and tabs become spaces; names as
        # LogHandlerWithXml writes them, with characters other than letters, digits, ".", "-" and "_" as "_"
        values["".join(c if c.isalnum() or c in ".-_" else "_" for c in str(name))] = \
            s.replace("\r\n", " ").translate(attributeWhitespace)
    refNum = 0
    for ref in refs or ():
        href = ref.get("href") if isinstance(ref, Mapping) else None
        if href is None:
            continue
        refNum += 1
        fileName = str(href).split("#")[0].rpartition("/")[2]
        sourceLine = str(ref["sourceLine"]) if "sourceLine" in ref else ""
        if sourceLine:
            source = f"{fileName} line {sourceLine}"
            values.setdefault("refLine", sourceLine)
        else:
            source = fileName
        if "refSource" not in values:
            values["refSource"] = source
            values["refUrl"] = fileName
        else:
            values[f"refSource{refNum}"] = source
        if "refSources" in values:
            values["refSources"] += ", " + source
            values["refSources2_n"] = values["refSources2_n"] + ", " + source if "refSources2_n" in values else source
        else:
            values["refSources"] = source
    return values

_messagesTextCache = {}
def loadMessagesText(path=messagesTextPath):
    """The MessagesText of path, loaded once; None when the file is missing or cannot be read."""
    if path not in _messagesTextCache:
        try:
            _messagesTextCache[path] = MessagesText(path)
        except (OSError, etree.XMLSyntaxError):
            _messagesTextCache[path] = None
    return _messagesTextCache[path]

def recordMessageEntry(record, messagesText):
    """The arelleMessagesText.xml entry (its code or edgarCode) for a log record; None when there is none."""
    args = record.args if isinstance(record.args, Mapping) else {}
    if record.args and not args:
        return None  # positional arguments: not a coded message
    return messagesText.lookupKey(args.get("edgarCode"), args.get("efmCode") or getattr(record, "messageCode", None))

def namingEdgarCode(code, args, messagesText=None):
    """The edgarCode that names a message's code (MessageReferences.exgNamedCode, displayCode): its edgarCode argument,
    or for one of Arelle's own messages, which has none, the edgarCode of its arelleMessagesText.xml entry (by its
    efmCode argument or its code); None if neither."""
    if isinstance(args.get("edgarCode"), str):
        return args["edgarCode"]
    messagesText = messagesText or loadMessagesText()
    key = messagesText.lookupKey(None, args.get("efmCode") or code) if messagesText is not None else None
    return messagesText.edgarCodes.get(key) if key else None

def recordMessageText(record, messagesText, truncateAt=DEFAULT_XML_MAX_ATTRIBUTE_LENGTH, key=None):
    """The text EDGAR shows for a log record, or None when arelleMessagesText.xml has no message for it."""
    key = key or recordMessageEntry(record, messagesText)
    if key is None:
        return None
    args = record.args if isinstance(record.args, Mapping) else {}
    return messagesText.substitute(messagesText.texts[key], messageArgs(args, getattr(record, "refs", None), truncateAt))

class MessageTextFilter(logging.Filter):
    """Gives each record logged while the EDGAR disclosure system is in effect the text EDGAR shows for it, and the
    code it shows as section:name (MessageReferences.displayCode).  Only the log is affected: the code recorded in
    modelXbrl.errors (testcase results), the code filters and the numeric ID see the code as logged."""
    isEdgarMessageTextFilter = True

    def __init__(self, cntlr, messagesText):
        super().__init__()
        self.cntlr = cntlr
        self.messagesText = messagesText

    def filter(self, record):
        try:
            if getattr(getattr(self.cntlr.modelManager, "disclosureSystem", None), "EFMplugin", False):
                truncateAt = getattr(getattr(self.cntlr, "logHandler", None), "logXmlMaxAttributeLength", None) or DEFAULT_XML_MAX_ATTRIBUTE_LENGTH
                key = recordMessageEntry(record, self.messagesText)
                text = recordMessageText(record, self.messagesText, truncateAt, key) if key else None
                if text is not None:
                    record.msg = text.replace("%", "%%") if record.args else text  # formatted with its args
                # the code as the log shows it, section:name (after the text is looked up by the code as logged); the
                # name from the message's edgarCode, or for one of Arelle's own messages, its entry's
                args = record.args if isinstance(record.args, Mapping) else {}
                if hasattr(record, "messageCode"):
                    edgarCode = args.get("edgarCode") or (self.messagesText.edgarCodes.get(key) if key else None)
                    record.messageCode = displayCode(record.messageCode, edgarCode, args)
        except Exception:  # the message is logged as Arelle composed it rather than not at all
            pass
        return True

def installMessageTextFilter(cntlr):
    """Adds a MessageTextFilter to the controller's logger, once."""
    logger = getattr(cntlr, "logger", None)
    if logger is None or any(getattr(f, "isEdgarMessageTextFilter", False) for f in logger.filters):
        return
    messagesText = loadMessagesText()
    if messagesText is not None:
        logger.addFilter(MessageTextFilter(cntlr, messagesText))
