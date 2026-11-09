"""The warning and error messages the EDGAR plugin logs, with the codes the log gives them under the messageCodes
guides (default EXG), one row per check and message text: the content of the published lists of EDGAR XBRL errors
and warnings (efm/lib/xbrlerrors.htm and xbrlwarnings.htm, built by idt's ErrorWarningFileGenerator.py).

Rows come from
  - dei-validations.json: each entry's messages for each concept it names, coded as sevMessage codes them
    (inferredMsgSection, eloMsgSection, messageSectionArgs, messageCode);
  - the plugin's and Arelle's log calls with a literal EFM or EXG code (the scan of directCodes.py), coded as
    severityReleveler codes them (directMsgSection, directCodeArgs, exgNamedCode).  A code built from a
    Consts.linkbaseValidations entry ("EXG.{lbVal.exgDef}.relationshipNotPermitted") is listed for each entry; a code
    built otherwise at run time is listed with the codes efm-exg-references.json lists for it, else with its fields
    named ("EXG.3.03.06.P{localName}Dependency").  A check whose EXG section depends
    on the concepts it reports (coverPageFactNotVisible) is listed once for each such section;
  - Arelle's own messages in render/resources/arelleMessagesText.xml, whose text EDGAR shows in place of Arelle's.
Message texts have their {name} fields as written (Python templates' %(name)s become {name}).  Checks retired from
EXG mode are left out, as are checks that can never log (neverLogged), Arelle's own EFM checks (which do not run
under the plugin's disclosure system), validateHtm's checks (plain HTML documents, under its own efm-htm disclosure
system), -SEMANTIC messages (EDGAR's log level filter hides them) and info messages.  Fee-tagging
(ft-validations.json) and DQC (dqc-us-rules.json) messages keep their codes under any guide and are not listed.

Run from the Arelle directory (the tool imports the plugin's modules):
  python -m arelle.plugin.EDGAR.validate.tools.messageList [--guides "EXG"] <out.tsv>
"""
import ast, collections, csv, json, os, re, string, sys
from xml.etree import ElementTree

from arelle.plugin.EDGAR.validate import Consts, MessageReferences as MR
from arelle.plugin.EDGAR.validate.MessageNumericId import messageNumericId
from arelle.plugin.EDGAR.validate.MessageText import MessagesText, messagesTextPath, namingEdgarCode

toolsDir = os.path.dirname(os.path.abspath(__file__))
if toolsDir not in sys.path:
    sys.path.append(toolsDir)
import directCodes  # noqa: E402

validateDir = os.path.dirname(toolsDir)
pluginDir = os.path.dirname(validateDir)
arelleDir = os.path.dirname(os.path.dirname(pluginDir))

# code: as the log shows it ("EXG.3.01.02:EntityIdentifierValue"); recordedCode: as Arelle records it (testcase
# results); section: the guide section ("3.1.2"); efmCode: the code as an EFM-coded run shows it, "" for none
Row = collections.namedtuple("Row", "code recordedCode level text number section efmCode edgarCode source")

# a field a code is formed with but no value is known for, kept through code forming (PascalCase names, lowercased
# initials) as a word, then put back as "{field}"
def marker(token):
    return f"Qq{token}Qq"
markerPattern = re.compile(r"(?i)qq([a-z0-9_]+?)qq")
templateArgPattern = re.compile(r"%\(([A-Za-z_][A-Za-z0-9_]*)\)[sdrf]")


def unmark(code, replacements=None):
    return markerPattern.sub(lambda m: (replacements or {}).get(m.group(1).lower(), "{" + m.group(1) + "}"), code)


def templateText(text):
    """A Python %-template as message text: "%(name)s" -> "{name}", "%%" -> "%"."""
    return templateArgPattern.sub(r"{\1}", text).replace("%%", "%").strip()


def sectionOf(code):
    """The guide section of a code as the guide numbers it, "EXG.3.01.02.Name" -> "3.1.2", "EFM.6.05.20.x" -> "6.5.20"."""
    m = re.match(r"(?:EXG|EFM)((?:\.[0-9]+)+)", code or "")
    return ".".join(str(int(level)) for level in m.group(1).split(".")[1:]) if m else ""


def numberOf(level, code):
    return str(messageNumericId(None, level.upper(), code, {})[1] or "")


def isExgLed(guides):
    return guides[0] != "EFM"


# how Filing.py's checks name their concepts in a table-driven message (tag): validations whose tag is the condition
# fact (a reference) and whose check is of the entry's concepts (sevMessage); validations whose tag is the reported
# fact's prefixed QName (ftName(f)); validations with a fixed tag
conditionFactValidations = {"ra", "f2", "t"}
qnameTagValidations = {"f3yrs", "future", "fw-unexpected"}
fixedTags = {"required-context-duration": "Required Context Period Duration"}
# validations whose check also logs at another level than the validation's (sevMessage's severity argument)
alsoLevels = {"et1": "warning"}


class Coder:
    """Forms the codes of a message under the guides and under EFM, as the plugin does."""
    def __init__(self, guides):
        self.guides = guides
        with open(os.path.join(validateDir, "resources", "efm-exg-references.json"), encoding="utf-8") as fh:
            self.index = MR.referencesIndex(json.load(fh))
        self.messagesText = MessagesText(messagesTextPath)
        # the levels a cover page fact not visible is reported at, by concept, from its dei-validations.json entries'
        # dei/cover: "cover" a warning, "COVER" an error (Filing.py, isCoverVisible)
        with open(os.path.join(validateDir, "resources", "dei-validations.json"), encoding="utf-8") as fh:
            entries = json.load(fh)["sub-type-element-validations"]
        self.coverLevels = collections.defaultdict(set)
        for entry in entries:
            level = {"cover": "warning", "COVER": "error"}.get(entry.get("dei/cover"))
            names = entry.get("xbrl-names") or ()
            if level and entry.get("validation") and not entry["validation"].startswith("fdep"):
                for name in [names] if isinstance(names, str) else names:
                    self.coverLevels[MR.messageConcepts({"tag": name}, ())[0]].add(level)

    def sectionLevels(self, code, concepts, levels):
        """The levels a directly logged code is reported at in a section: for a cover page fact not visible, those of
        the section's concepts (coverLevels); otherwise the call's."""
        if code == "EFM.6.05.45.coverPageFactNotVisible" and concepts:
            return [level for level in levels if any(level in self.coverLevels.get(c, ()) for c in concepts)]
        return levels

    def tableCodes(self, messageKey, efm, msgSection, args):
        """(recorded code, shown code, edgarCode, EFM code shown) of a table-driven message, as sevMessage forms them."""
        def formed(guides):
            logArgs = dict(args)
            logArgs.update(MR.messageSectionArgs(efm, msgSection, guides))
            for _text, field, _spec, _conv in string.Formatter().parse(messageKey):
                if field and field not in logArgs:
                    logArgs[field] = marker(field)
            edgarCode = MR.messageEdgarCode(messageKey, logArgs.get("arelleCode"))
            recorded = MR.exgMessageCode(MR.messageCode(messageKey, logArgs))
            return unmark(recorded), unmark(MR.displayCode(recorded, edgarCode, logArgs)), edgarCode
        recorded, shown, edgarCode = formed(self.guides)
        efmShown = formed(("EFM",))[1] if efm else ""
        return recorded, shown, edgarCode, efmShown

    def listedCodes(self, runTimeCode):
        """The codes efm-exg-references.json lists for a code built at run time (its fields as markers),
        "EFM.6.05.58.03.{F}-{G}-Dependency" -> "EFM.6.05.58.03.A-M-Dependency", ...; [] if none."""
        parts = MR.directCodeParts(unmark(runTimeCode, {}))
        if not parts:
            return []
        efm, _rest = parts
        prefix = runTimeCode.partition(".")[0] + "."
        # the rest of the code after its EFM section levels, its markers matching any text
        sectionLevels = len(efm.split(".")) if efm else 0
        rest = ".".join(runTimeCode.split(".")[1 + sectionLevels:])
        restPattern = re.compile("".join(".+?" if markerPattern.fullmatch(part) else re.escape(part)
                                         for part in re.split(r"(Qq[A-Za-z0-9_]+?Qq)", rest)) + "$")
        sectionCode = prefix + ".".join(MR.sectionCodeParts(efm)) if efm else prefix.rstrip(".")
        return sorted({f"{sectionCode}.{validation[6:]}" for (e, validation, axis, concept) in self.index
                       if e == efm and validation.startswith("(code)") and not validation.endswith("*")
                       and restPattern.match(validation[6:])})

    def directCodes(self, code, edgarCode, concepts=()):
        """[(recorded code, shown code, EFM code shown, concepts)] of a directly logged code, as severityReleveler forms
        them: none for a check retired from EXG mode, one for each EXG section of a check whose section depends on the
        concepts it reports, with those concepts (() for the code's own section)."""
        entryEdgarCode = namingEdgarCode(code, {"edgarCode": edgarCode} if edgarCode else {}, self.messagesText)
        if code.startswith("EXG."):
            recorded = MR.exgNamedCode(code, entryEdgarCode)
            return [(recorded, MR.displayCode(recorded, entryEdgarCode), "", ())]
        efmShown = MR.displayCode(code, entryEdgarCode) if code.startswith("EFM.") else ""
        parts = MR.directCodeParts(code)
        if not parts:
            return [(code, efmShown or code, efmShown, ())]
        efm, rest = parts
        sections = {}  # section: concepts
        base = MR.directMsgSection(self.index, code, (), edgarCode)
        if base:
            sections[base] = ()
        validations = set(MR.directValidations(rest))
        for (e, validation, axis, concept), section in sorted(self.index.items(), key=str):
            if e == efm and validation in validations and concept and section != base:
                sections[section] = sections.get(section, ()) + (concept,)
        if not sections:
            return [(code, efmShown, efmShown, ())]
        rows = []
        for section, sectionConcepts in sections.items():
            if section == MR.retiredReference:
                if isExgLed(self.guides):
                    continue
                rows.append((code, efmShown, efmShown, sectionConcepts))
                continue
            recorded = MR.exgNamedCode(MR.directCodeArgs(code, section, self.guides)[0], entryEdgarCode)
            rows.append((recorded, MR.displayCode(recorded, entryEdgarCode), efmShown, sectionConcepts))
        return rows


def tableRows(coder):
    """Rows of the dei-validations.json entries' messages: for each entry and concept, the entry's validation message
    (and the validation's alternate messages), the unexpected-fact message and the submission header (ELO) match
    message; and the unexpected submission header parameter messages.  An axis-validations entry's "message" is not
    listed: sevMessage does not log it (it skips that key), so an entry whose validation has no message ("o") logs none."""
    with open(os.path.join(validateDir, "resources", "dei-validations.json"), encoding="utf-8") as fh:
        dv = json.load(fh)
    validations, messages = dv["validations"], dv["messages"]
    entries = dv["sub-type-element-validations"]
    # the unexpected-fact checks: the level of the one that reports a concept, by its include or exclude list
    blankChecks = [(validations[e["validation"]]["severity"], e.get("include-xbrl-names"), e.get("exclude-xbrl-names"))
                   for e in entries if e.get("validation") in ("(blank)", "(blank-error)")]
    rows = []

    def add(level, messageKey, efm, msgSection, args, text, source):
        recorded, shown, edgarCode, efmShown = coder.tableCodes(messageKey, efm, msgSection, args)
        if level == "warningifpragmaticelseerror":
            level = "warning"  # EDGAR validates efm-pragmatic
        rows.append(Row(shown, recorded, level, text, numberOf(level, recorded), sectionOf(recorded), efmShown,
                        edgarCode, source))

    def messageText(messageKey, entry, args, level):
        text = messages.get(messageKey)
        if text is None:
            return None
        text = text.replace("{msgCoda}", entry.get("msgCoda", ""))
        for field, value in args.items():
            text = text.replace("{" + field + "}", value)
        return text.replace("{severityVerb}", "must" if level == "error" else "should").strip()

    def variants(validationKey, names, references, key):
        """[(arguments, concepts)] of an entry's message as its check logs it: per concept, its tag; where the check
        names the entry's references, per reference."""
        if validationKey in fixedTags:
            return [({"tag": fixedTags[validationKey]}, [])]
        if not names:
            return [({}, [])]
        if validationKey in conditionFactValidations and references:
            # the tag names the condition fact (a reference), the check is of the entry's concepts (otherTag, otherTags)
            return [({"tag": r, "otherTag": name, "otherTags": ", ".join(names)}, MR.messageConcepts({"tag": name}, ()))
                    for r in references for name in names]
        result = []
        for name in names:
            tag = "dei:" + name if validationKey in qnameTagValidations and ":" not in name else name
            others = references if "{otherTag}" in key + (messages.get(key) or "") and references else (None,)
            for other in others:
                args = {"tag": tag}
                if other is not None:
                    args["otherTag"] = other
                if references:
                    args["otherTags"] = ", ".join(references)
                result.append((args, MR.messageConcepts({"tag": name}, ())))
        return result

    for i, entry in enumerate(entries):
        efm, msgSection = entry.get("efm"), entry.get("msgSection")
        validationKey = entry.get("validation")
        validation = validations.get(validationKey)
        if not (efm or msgSection) or validation is None or validationKey in ("(blank)", "(blank-error)", "(elo-unexpected)"):
            continue
        level = (entry.get("severity") or validation["severity"]).lower()
        names = entry.get("xbrl-names") or ()
        names = [names] if isinstance(names, str) else names
        axis = entry.get("axis") or ""
        source = f"dei-validations.json#{i}"
        keys = [entry.get("message") or validation.get("message")]
        keys += [validation[k] for k in validation if k.startswith("message-")]
        references = entry.get("references") or ()
        references = [references] if isinstance(references, str) else references
        for key in dict.fromkeys(k for k in keys if k):
            for args, concepts in variants(validationKey, names, references, key):
                section = msgSection or MR.inferredMsgSection(coder.index, efm, validationKey, axis, concepts,
                                                              allowRetired=True)
                if section == MR.retiredReference:
                    if isExgLed(coder.guides):
                        continue
                    section = None
                text = messageText(key, entry, args, level)
                if text is not None:
                    add(level, key, efm, section, args, text, source)
                    if validationKey in alsoLevels:
                        otherLevel = alsoLevels[validationKey]
                        add(otherLevel, key, efm, section, args, messageText(key, entry, args, otherLevel), source)
        for name in names:
            # a fact of the concept reported for a submission type the entry does not expect it for
            key = "dq-{efmSection}-{tag}-Unexpected"
            for blankLevel, include, exclude in (blankChecks if "*" not in name else ()):
                if (include is None or name in include) and (exclude is None or name not in exclude):
                    section = msgSection or MR.inferredMsgSection(coder.index, efm, "(unexpected)", "",
                                                                  MR.messageConcepts({"tag": name}, ()), allowRetired=True)
                    if section == MR.retiredReference:
                        if isExgLed(coder.guides):
                            continue
                        section = None
                    text = messageText(key, entry, {"tag": name}, blankLevel)
                    if text is not None:
                        add(blankLevel, key, efm, section, {"tag": name}, text, source)
                    break
            # the fact compared with its submission header parameter
            eloName = entry.get("elo-name")
            if eloName:
                key = entry.get("elo-match-message", "dq-0540-{tag}-Value")
                text = messageText(key, entry, {"tag": name}, level)
                if text is not None:
                    add(level, key, MR.eloEfmSection, MR.eloMsgSection(coder.index, eloName),
                        {"tag": name, "headerTag": eloName}, text, source)
    # a submission header parameter given for a submission type that does not use it
    validation = validations.get("(elo-unexpected)")
    if validation:
        eloNames = sorted({e["elo-name"] for e in entries if e.get("elo-name")})
        for eloName in eloNames:
            key = validation["message"]
            text = messages.get(key)
            if text is not None:
                add(validation["severity"].lower(), key, MR.eloEfmSection, MR.eloMsgSection(coder.index, eloName),
                    {"headerTag": eloName}, text.replace("{headerTag}", eloName).strip(), "dei-validations.json(elo-unexpected)")
    return rows


def callLevels(call):
    """The levels a log call logs at: error and warning only; both where the level is chosen at run time."""
    method = call.func.attr
    if method in ("error", "exception"):
        return ["error"]
    if method == "warning":
        return ["warning"]
    if method == "log" and call.args:
        level = call.args[0]
        if isinstance(level, ast.Constant):
            return [level.value.lower()] if level.value in ("ERROR", "WARNING") else []
        return ["error", "warning"]
    return []


def textOf(node, assigned):
    """A log call's message text: its template, from _("..."), a string, a concatenation or f-string (the
    non-literal parts as "{...}"), or a name assigned a string in the module; None if none."""
    if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "_" and node.args:
        node = node.args[0]
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return templateText(node.value)
    if isinstance(node, ast.Name) and node.id in assigned:
        return templateText(assigned[node.id])
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        parts = [textOf(n, assigned) for n in (node.left, node.right)]
        return "".join(p if p is not None else "{...}" for p in parts)
    if isinstance(node, ast.JoinedStr):
        return templateText("".join(v.value if isinstance(v, ast.Constant) else "{" + ast.unparse(v.value) + "}"
                                    for v in node.values))
    return None


def evaluated(node):
    """The values of a code or edgarCode built from a Consts.linkbaseValidations entry, one per entry that has the
    attributes it uses; [] when it is built from anything else."""
    names = {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}
    if not names or not names <= {"lbVal", "abbrNs"}:
        return []
    expression = compile(ast.Expression(node), "<code>", "eval")
    values = []
    for abbrNs, lbVal in Consts.linkbaseValidations.items():
        try:
            value = eval(expression, {}, {"lbVal": lbVal, "abbrNs": abbrNs})
        except Exception:
            continue
        if isinstance(value, str) and "None" not in value:
            values.append((abbrNs, value))
    return values


def runTimeCode(node):
    """A code an f-string builds from anything but a linkbaseValidations entry, its fields as markers, and their
    replacements, each the last name of its expression ("{qnameFacts[rxp.P].xValue.localName}" -> "{localName}");
    None if node is not such an f-string."""
    if not isinstance(node, ast.JoinedStr):
        return None
    replacements, code = {}, ""
    for i, v in enumerate(node.values):
        if isinstance(v, ast.Constant):
            code += v.value
        else:
            expression = v.value
            name = (expression.attr if isinstance(expression, ast.Attribute) else
                    expression.id if isinstance(expression, ast.Name) else "...")
            replacements[f"x{i}"] = "{" + name + "}"
            code += marker(f"x{i}")
    return code, replacements


# Arelle's flags for its own disclosure system checks, False for the plugin's disclosure system (a plugin type)
arelleDisclosureSystemFlags = {"validateEFM", "validateGFM", "validateEFMorGFM", "validateEFMorGFMorSBRNL", "EFM", "GFM",
                               "EFMorGFM"}
# codes whose checks can never log, whatever the guides, with the reason
neverLogged = {
    # both ModelDocument.py calls depend on DisclosureSystem.disallowedHrefOfNamespace, which has returned False on
    # every path since 2013 (Arelle commit 3531ad613); disallowed locations are reported as EFM.6.22.00
    "EFM.6.22.02": "DisclosureSystem.disallowedHrefOfNamespace is always False",
}


def directCallRows(coder, dirs):
    """Rows of the log calls with an EFM or EXG code in the modules of dirs [(path, label)].  A code given as an
    attribute (val.EFM60303) is each value the modules assign that attribute; Arelle's calls inside its own EFM or GFM
    disclosure system checks (if val.validateEFM...) are left out: the plugin's disclosure system is a plugin type, for
    which Arelle does not perform them."""
    trees = []
    for d, label in dirs:
        if not os.path.isdir(d):
            continue
        for fileName in sorted(os.listdir(d)):
            if fileName.endswith(".py"):
                path = os.path.join(d, fileName)
                with open(path, encoding="utf-8") as fh:
                    trees.append((label, fileName, ast.parse(fh.read(), path)))
    # attribute -> the codes the modules assign it (val.EFM60303 = "EFM.6.03.03")
    attrCodes = collections.defaultdict(set)
    for _label, _fileName, tree in trees:
        for n in ast.walk(tree):
            if (isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Attribute)
                    and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str)
                    and n.value.value.startswith(("EFM.", "EXG."))):
                attrCodes[n.targets[0].attr].add(n.value.value)

    def resolvedCodes(node):
        """The codes of a code argument built from attributes with assigned codes, None if it uses none."""
        if isinstance(node, ast.Tuple) and node.elts:
            return resolvedCodes(node.elts[0])
        if isinstance(node, ast.Attribute) and node.attr in attrCodes:
            return sorted(attrCodes[node.attr])
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            left = resolvedCodes(node.left)
            right = [node.right.value] if isinstance(node.right, ast.Constant) and isinstance(node.right.value, str) else None
            return [l + r for l in left for r in right] if left and right else None
        return None

    rows = []
    for label, fileName, tree in trees:
        parents = {child: parent for parent in ast.walk(tree) for child in ast.iter_child_nodes(parent)}

        def inDisclosureSystemCheck(node):
            while node in parents:
                parent = parents[node]
                if isinstance(parent, ast.If) and node in parent.body and any(
                        (isinstance(t, ast.Attribute) and t.attr in arelleDisclosureSystemFlags) or
                        (isinstance(t, ast.Name) and t.id in arelleDisclosureSystemFlags) for t in ast.walk(parent.test)):
                    return True
                node = parent
            return False

        assigned = {n.targets[0].id: n.value.value for n in ast.walk(tree)
                    if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)
                    and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str)}
        # names assigned a tuple of codes, which a call may give as its messageCodes argument
        assignedCodes = {n.targets[0].id: n.value for n in ast.walk(tree)
                         if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)
                         and isinstance(n.value, (ast.Tuple, ast.List))
                         and all(isinstance(e, ast.Constant) and isinstance(e.value, str) for e in n.value.elts)}
        for n in ast.walk(tree):
            if not (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in directCodes.LOG_METHODS):
                continue
            args = n.args[1:] if n.func.attr == "log" else n.args
            levels = callLevels(n)
            if not args or not levels or (label == "arelle" and inDisclosureSystemCheck(n)):
                continue
            edgarCodeNode = next((k.value for k in n.keywords if k.arg == "edgarCode"), None)
            staticEdgarCode = (edgarCodeNode.value if isinstance(edgarCodeNode, ast.Constant)
                               and isinstance(edgarCodeNode.value, str) else None)
            # (code, edgarCode, replacements of run-time fields)
            keywords = [ast.keyword(arg=k.arg, value=assignedCodes[k.value.id])
                        if k.arg == "messageCodes" and isinstance(k.value, ast.Name) and k.value.id in assignedCodes else k
                        for k in n.keywords]
            resolved = resolvedCodes(args[0])
            codes = [(c, staticEdgarCode, None)
                     for c in (resolved if resolved is not None else directCodes.callCodes(args[0], keywords))
                     if not c.endswith("*") and c != "EFM.N/A" and c not in neverLogged]  # EFM.N/A: a GFM check with no EFM code
            literal = directCodes.literalCode(args[0])
            if literal and literal.startswith("EXG.") and not literal.endswith("*"):
                codes.append((literal, staticEdgarCode, None))
            built = evaluated(args[0])
            if built:
                edgarCodes = dict(evaluated(edgarCodeNode)) if edgarCodeNode is not None else {}
                codes.extend((value, edgarCodes.get(abbrNs, staticEdgarCode), None) for abbrNs, value in built)
            elif literal and literal.endswith("*"):
                runTime = runTimeCode(args[0])
                if runTime and runTime[0].startswith(("EFM.", "EXG.")):
                    listed = coder.listedCodes(runTime[0])
                    codes.extend((c, staticEdgarCode, None) for c in listed)
                    if not listed:
                        codes.append((runTime[0], staticEdgarCode, runTime[1]))
            if not codes:
                continue
            text = textOf(args[1], assigned) if len(args) > 1 else None
            source = "{}:{}".format(os.path.join(label, fileName), n.lineno)
            for code, edgarCode, replacements in {(c, e): (c, e, r) for c, e, r in codes}.values():
                entryKey = coder.messagesText.lookupKey(edgarCode, code)
                # Arelle's own messages show their arelleMessagesText.xml text in EDGAR
                callText = coder.messagesText.texts[entryKey] if label == "arelle" and entryKey else text
                if callText is None:
                    callText = "(dynamic)"
                for recorded, shown, efmShown, concepts in coder.directCodes(code, edgarCode):
                    recorded, shown, efmShown = (unmark(c, replacements) for c in (recorded, shown, efmShown))
                    for level in coder.sectionLevels(code, concepts, levels):
                        rows.append(Row(shown, recorded, level, callText, numberOf(level, recorded),
                                        sectionOf(recorded), efmShown, edgarCode or "", source))
    return rows


def messagesTextRows(coder, listedCodes):
    """Rows of Arelle's own messages in arelleMessagesText.xml that no scanned call lists (a code built at run time)."""
    rows = []
    for elt in ElementTree.parse(messagesTextPath).getroot().iter("message"):
        code, level = elt.get("code"), (elt.get("level") or "").lower()
        if not code or code in listedCodes or code in neverLogged or level not in ("error", "warning"):
            continue
        text = (elt.text or "").strip()
        for recorded, shown, efmShown, _concepts in coder.directCodes(code, elt.get("edgarCode")):
            rows.append(Row(shown, recorded, level, text, numberOf(level, recorded), sectionOf(recorded), efmShown,
                            elt.get("edgarCode") or "", "arelleMessagesText.xml"))
    return rows


def messageRows(guides=("EXG",)):
    """The rows, sorted by guide section and code, one per code, level and text."""
    guides = MR.parseMessageCodes(guides)
    coder = Coder(guides)
    # validateHtm runs only under its own efm-htm disclosure system, for plain HTML documents, never on XBRL filings
    dirs = [(os.path.join(pluginDir, sub), sub) for sub in directCodes.SCANNED_DIRS if sub != "validateHtm"]
    dirs.append((arelleDir, "arelle"))
    rows = tableRows(coder) + directCallRows(coder, dirs)
    listed = {r.efmCode.partition(":")[0] for r in rows} | {r.recordedCode for r in rows}
    rows += messagesTextRows(coder, listed)
    unique = {}
    for r in rows:
        unique.setdefault((r.recordedCode, r.level, r.text), r)
    def sortKey(r):
        m = re.match(r"(EXG|EFM)((?:\.[0-9]+)*)(.*)", r.recordedCode)
        if not m:
            return (2, (), r.recordedCode, r.level, r.text)
        return (0 if m.group(1) == "EXG" else 1, tuple(int(x) for x in m.group(2).split(".")[1:]), m.group(3), r.level, r.text)
    return sorted(unique.values(), key=sortKey)


def main(argv):
    guides = ("EXG",)
    if len(argv) > 2 and argv[0] == "--guides":
        guides, argv = argv[1], argv[2:]
    if len(argv) != 1:
        print(__doc__)
        return 2
    rows = messageRows(guides)
    with open(argv[0], "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh, delimiter="\t")
        writer.writerow(Row._fields)
        writer.writerows(rows)
    counts = collections.Counter(r.level for r in rows)
    print(f"{len(rows)} messages ({counts['error']} errors, {counts['warning']} warnings) -> {argv[0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
