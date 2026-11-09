# EXG resources: how they are built and maintained

This folder lives with the code so that a maintainer, or an AI assistant working for one, can pick up the EDGAR
XBRL Guide (EXG) work from here. It covers the resources generated from the guide, the tools that build and check
them, and the decisions they rest on.

## The pieces

| File | What it is | Built by |
|---|---|---|
| `validate/resources/exg-set-definitions.json` | EXG 1.1 "Set Definitions", Tables 6-1 to 6-4: submission sets, suffixes, entity sets, instance types | `build/extractSets.py`, from the guide's Word source |
| `validate/InstanceTypes.py` | Resolves an instance's submission sets, entity sets and instance types. Evaluates a rule's Incl/Excl scope cells (`scopeApplies`) | hand-written; no Arelle imports, so it can be tested alone |
| `validate/resources/efm-exg-references.json` | Maps a legacy check (`dei-validations.json` entry: EFM section, validation code, axis key, concept) to the EXG section whose code it carries. Also maps the checks that log an EFM code directly (validation `(code)` followed by the rest of the code), and the submission header parameter checks (validation `(elo)` followed by the parameter's name). Read at run time (`MessageReferences.inferredMsgSection`, `directMsgSection`, `eloMsgSection`), and published for filing preparers and consumers of disseminated filings | `build/buildReferences.py`, from the reviewed `build/references-candidates.tsv`, `build/absence-candidates.tsv`, `build/direct-candidates.tsv` and `build/elo-candidates.tsv` |
| `build/extract.py` | The guide's validation and concept tables to JSON (`guide.json`), with the EFM sections each section's prose cites (`citations`) | |
| `tools/crosswalk.py`, `tools/weight.py` | Compare the legacy rules' scopes with EXG's by situation, and weight the differences by a corpus of filings | |
| `tools/references.py`, `tools/review.py` | Candidate EXG references for the legacy checks, and a risk-ranked short list for review | |
| `tools/directCodes.py` | Candidate EXG references for the checks that log an EFM code directly (`modelXbrl.error("EFM.6.05.38", ...)`), in the plugin and in Arelle's own modules, with the rulings for them (`RULINGS`) | |
| `tools/eloCodes.py` | Candidate EXG references for the submission header (ELO) parameter checks, from the guide's rows citing "§ 6.5.40 Item n", with the rulings for them (`RULINGS`) | |
| `validate/MessageText.py` | Gives Arelle's log the message text of `render/resources/arelleMessagesText.xml`, as EDGAR shows it (see Message text) | hand-written |
| `tools/makeExgTwins.py` | Adds EXG-mode twins to a conformance-suite testcase file; superseded by `makeExgConf.py` (the suite no longer holds twins), kept for `removeTwinsAsText` | |
| `tools/makeExgConf.py` | Writes the EXG-mode conformance suite (`conf/EXG`): the EFM suite's failing variations, each in the testcase of the guide section whose code it logs in EXG mode, in folders following the guide's chapters and sections, in the XBRL conformance format of the filing fee testcases (`<error>` elements expecting exact codes) | an EXG-mode run of the EFM suite (`messageCodes=EXG`, `--logFile *.xml`) and `guide.json` |
| `tools/joinXmlLogs.py` | Joins Arelle XML log files (each one or more `<log>` documents) into one well-formed file, keeping each `<log>` document whole | |
| `tools/messageList.py` | Lists the plugin's warning and error messages with the codes the log gives them under `messageCodes` (default EXG), their EFM codes, numeric IDs, guide sections and texts, formed by the plugin's own functions from `dei-validations.json`, the plugin's and Arelle's log calls and `arelleMessagesText.xml`; the source of the published `efm/lib/xbrlerrors.htm` and `xbrlwarnings.htm` (idt `ErrorWarningFileGenerator.py`). Run from the Arelle directory: `python -m arelle.plugin.EDGAR.validate.tools.messageList out.tsv` | |
| `mapping-rulings.md` | The rules and rulings the references rest on | |

## Rebuilding after a new Word draft or edition of the guide

```
sh validate/resources/exg/build/build.sh <guide.docx> "<edition>" "<review note>" [work dir]
```

1. This regenerates `exg-set-definitions.json`. Where the guide's text cannot be used as written, `extractSets.py`
   applies a listed correction and records it in the file's `corrections`. A correction that the guide has since
   fixed reports itself unused.
2. It extracts the tables, reruns the crosswalk, and writes fresh reference candidates to the work directory.
3. **The candidates are not used until reviewed.** Compare `work/refs/candidates.tsv` with
   `build/references-candidates.tsv`, `work/refs/direct-candidates.tsv` with `build/direct-candidates.tsv`, and
   `work/refs/elo-candidates.tsv` with `build/elo-candidates.tsv`:
   - a pair whose section changed, or that is newly ambiguous, needs a decision;
   - `tools/review.py` ranks the settled pairs by risk for a sample review;
   - record each new ruling in `tools/references.py` (`RULINGS`, `RULING_ROWS`, and for the absence check
     `ABSENCE_RULINGS`, `ABSENCE_HOME_RULINGS`), for a direct check in `tools/directCodes.py`
     (`RULINGS`, `CONCEPT_RULINGS`, `GUIDE_CONCEPT_ROWS`, `EXACT_CODE_RULINGS`, `EDGARCODE_RULINGS`), or for a header
     parameter check in `tools/eloCodes.py` (`RULINGS`), and in `mapping-rulings.md`.

   Then copy the reviewed candidates over `build/references-candidates.tsv`, `build/direct-candidates.tsv` and
   `build/elo-candidates.tsv` and run `build.sh` again. A direct check is added to the candidates when its code is first logged, so a new
   `modelXbrl.error("EFM...")`, or a new code in a call's `messageCodes` catalog, also shows as a change to review. A
   code built at run time and not in any catalog must be added to `UNCATALOGUED_CODES` in `tools/directCodes.py`.
4. Run the EFM conformance suite: legacy-mode results must not change.

The guide does not give its rules stable identifiers: sections and rows renumber between editions. A message's EXG
code therefore follows the edition's section number. Tracking rules across editions is planned work: a content
fingerprint, and a registry of numeric IDs that are never reused.

## Message codes

- The `messageCodes` parameter lists guides in priority order. The default is `EFM`.
  - `EFM`: a check keeps its EFM code where it has one.
  - `EXG`: a check takes its EXG code where it has an EXG reference, and falls back to EFM otherwise.
  - Listing two guides (`EXG EFM`) also gives every message `efmCode` and `exgCode` arguments, for comparing runs.
  - A message coded by another guide than EFM always carries its EFM code as `efmCode`, which gives it its text.
- An entry's own `msgSection` is its EXG reference. An entry with only an EFM reference takes the one
  `efm-exg-references.json` gives its check, when every concept the message names maps to the same section. A
  reference with concept `""` is for the whole check: it serves messages that name no concept, and concepts with no
  reference of their own.
- Messages with an EXG reference carry the `exgSection` argument in every mode.
- `ft-validations.json` (fee exhibits) keeps its `ft.` codes, which are independent of both EFM and EXG section
  numbers.

### Submission header parameter checks

The checks of a submission header (ELO) parameter against its fact, and of a parameter given for a form that does
not use it, are logged with EFM section 6.5.40 and a `headerTag` argument naming the parameter. They are looked up
in `efm-exg-references.json` as validation `(elo)` followed by that name (`(elo)smallBusinessFlag` is 3.1.11), not by
the entry's own validation (`eloMsgSection`). A parameter with no reference keeps its EFM code. `tools/eloCodes.py`
finds the candidates; `mapping-rulings.md` records the rulings.

### Checks that log an EFM code directly

Most of the plugin's checks, and Arelle's own EFM checks (`ValidateFilingText.py`, `ValidateXbrlDTS.py`,
`ModelDocument.py`), log an EFM code directly with `modelXbrl.error`, `warning` or `log`, not through `sevMessage`.
The plugin's `Logging.Severity.Releveler` hook (`severityReleveler`, `directMessageCode`) codes their messages when
they are logged:

- The code is looked up in `efm-exg-references.json` by its EFM section and the rest of the code, as validation
  `(code)` followed by that rest: `EFM.6.05.20.exhibitDocumentType` is `6.5.20`, `(code)exhibitDocumentType`. A
  code that also cites sections after a comma (PreCalAlignment's `EFM.6.15.02,6.13.02,6.13.03.missingItemsNil`) is
  keyed by its first section, `6.15.2`, `(code)missingItemsNil`, and its EXG code drops the cited sections
  (`EXG.5.09.01.MissingItemsNil`). A
  code built at run time is keyed by its literal part (`EFM.6.05.58.07.P-{...}-Dependency` is `(code)07.*`), or by the
  whole code where a ruling gives one (`(code)03.A-M-Dependency`). Where one code is logged for checks in different
  sections, a row for the message's `edgarCode` (validation `(edgarCode)` followed by it), checked first, or for the
  concept the message names (its `tag` argument, or the fact it is reported on) decides. A code with no EFM section,
  a single name (`EFM.disallowedRedact`), is keyed by efm `""` and `(code)` followed by the name, where a ruling gives
  it a row; it has no `efmSection` argument and keeps its code in EFM mode (EXG mode: `EXG.1.04.DisallowedRedact`).
  `mapping-rulings.md` lists the codes with no EFM section and why the others keep theirs.
- A message with an EXG reference gets `efmSection` and `exgSection` in every mode, and `efmCode` and `exgCode` when
  `messageCodes` lists both guides (`efmCode` alone in EXG mode). A check's own `efmSection` argument is kept.
- In EXG mode its code is the EXG section's prefix and the rest of the EFM code, less the leading numeric levels
  that number EFM subsections and items: `EFM.5.02.05.14.hidden-fact-not-found` becomes
  `EXG.11.14.HiddenFactNotFound`, and `EFM.6.05.38` becomes `EXG.8.05`. Its numeric ID is the EXG one.
- Messages `sevMessage` has coded (they carry `arelleCode`) are left as they are.
- A check the guide no longer makes (basis `retired`, `"exg": null`) is not logged, and does not count as an error,
  when `messageCodes` lists EXG first: `severityReleveler` returns no code for it, and Arelle does not log a message
  with no code. A code recorded while the instance loaded is removed from the errors the same way. In EFM mode it is
  logged as before. `mapping-rulings.md` lists the retired checks and why.
- Not reached: messages logged without a model (`efmFiling.error`, `cntlr.addToLog`), such as `EFM.5.02.05` (an
  instance and an Inline XBRL document in one submission). They keep their EFM codes.

`tools/directCodes.py` finds the codes in the source: a literal code, each branch of a code chosen by a conditional
expression, and the codes a call built at run time lists in its `messageCodes` argument (Arelle's catalog of such
codes, as for `validateHtmlContent`'s `EFM.6.05.34.` and `EFM.5.02.05.` codes), with `UNCATALOGUED_CODES` for the few
that no catalog lists. It finds the candidates: the guide's validation rows whose EFM cell cites the code's section
(narrowed by the rows' `Item n` and their failure text against the check's `edgarCode`), or else the sections whose
prose cites it ("(Formerly EFM v68 § 6.8.11)"). The EFM conformance suite's testcase names ("EXG 8.5 | EDGAR Filer
Manual v68 6.5.4") agree with the result except where noted in `mapping-rulings.md`.

### Message text

A message's text is written once, where the message is made, and Arelle and EDGAR users read the same text:

- The plugin's messages: in its Python templates (`modelXbrl.error(code, _("..."))`) and `dei-validations.json`
  (`messages`), whose wording was taken from `render/resources/arelleMessagesText.xml`, which EDGAR used to apply
  over them; and `dqc-us-rules.json`, whose DQC messages are kept as published. Those entries were removed from the
  XML, so the DQC messages now read as `dqc-us-rules.json` gives them, for EDGAR users as for Arelle users.
- Arelle's own messages (`ValidateFilingText.py`, `ModelDocument.py`), which other disclosure systems share, keep
  their EDGAR wording in `arelleMessagesText.xml`. EDGAR applies the file (`ArelleValidationWrapper.java`), and so,
  for Arelle users, does `validate/MessageText.py`, a logging filter the validate plugin installs, whenever the
  EDGAR disclosure system is in effect. It does what the Java does: the same lookup (`edgarCode`, then code), the
  message's arguments as they are written to the XML log (truncated to 128 characters, line ends as spaces), the
  ref variables (`refSource`, `refSources`, ...), commons-lang `StrSubstitutor` substitution and `$local-name(...)`.
  It was checked against the Java library on every message in the file and on conformance-suite logs. An
  EXG-coded message is looked up by its EFM code (`efmCode`), so the file stays keyed by EFM codes.

Texts do not begin with their `edgarCode` (`[cp-0504-No-Scenario]`), and do not name the file and line the log
ends each message with (`- file.htm 6`), except where a sentence needs a file.

### Codes in the log

The log shows a code as its section and name joined by a colon (`MessageReferences.displayCode`), in both modes:
`EXG.3.01.05.DocumentTypeValue` shows as `[EXG.3.01.05:DocumentTypeValue]`. An EXG code that is a section only,
from a check whose EFM code has no name (`EFM.6.05.04`), is named by `severityReleveler` (`MessageReferences.exgNamedCode`)
from its `edgarCode` less its `cp-0504-` style prefix, if any, and Arelle's own messages from the `edgarCode` of their
`arelleMessagesText.xml` entry (`MessageText.namingEdgarCode`): `EXG.8.05` with `cp-0504-No-Scenario` is recorded as
`EXG.8.05.NoScenario` and shows as `[EXG.8.05:NoScenario]`, so that a code tells apart the checks of a section. A
message logged while the instance loads, before the guides are known, keeps its name for `recodeLoadTimeErrors`.
The colon is the log only (the `[code]` the log format shows and the log entry's `code` attribute, which EDGAR reads):
the code recorded in `modelXbrl.errors` (testcase results), the code filters, the numeric ID and the plugin's own
checks see the code as recorded, `EXG.3.01.05.DocumentTypeValue`. An EFM code that is a section only shows its
`edgarCode`'s name as it is (`[EFM.6.05.04:No-Scenario]`) and is recorded as logged.

EXG code names are PascalCase, as the guide names checks (`AllFactsFiltered`), and their sections have two-digit
levels after the chapter (`MessageReferences.exgMessageCode`, applied by `severityReleveler` to every EXG code,
whichever check logs it, and by `messageCode` and `directCodeArgs` as they form one): the words of the name a check
gives, whatever its style, each capitalized and joined (`entityFileNumberMissing`, `Role-Type-Declaration-Incomplete`,
`oef:FundNameMissing` and the renderer's `EXG.7.3.FactsNotInMovements` become `EntityFileNumberMissing`,
`RoleTypeDeclarationIncomplete`, `OefFundNameMissing` and `EXG.7.03.FactsNotInMovements`). EFM codes keep their names
as they have always been (`EFM.6.05.47.entityFileNumberMissing`), and `edgarCode`s are unchanged: EDGAR uses them only
as keys to `arelleMessagesText.xml` entries. A few checks that log their EFM code directly take a name other than their
code's suffix (`MessageReferences.exgCodeNames`; mapping-rulings.md, EXG names that differ from the EFM code's suffix):
the five 11.10 HTML checks, for example, are all `EXG.11.10.ProhibitedHtml`, EDGAR's name for them.

### Code filters

A disclosure system's `logCodeFilter` (`validate/config.xml`, Arelle's `config/disclosuresystems.xml`) and
`--logCodeFilter`, including EDGAR's (`(?!EFM)|(EFM.6.22.02)` and others in `ArelleValidationWrapper.java`), are
written for EFM codes. Arelle applies them after `severityReleveler` codes a message, so the plugin wraps the
logger's filter (`EfmCodeFilter`) to select a message coded by another guide by its EFM code (`efmCode`): a message
a filter hides in EFM mode stays hidden in EXG mode, and one it shows stays shown. A message with no EFM code at all
(a `dei-validations.json` entry with only a `msgSection`) is filtered by its EXG code, so `(?!EFM)` lets it through.

Code checks in the plugin that test `modelXbrl.errors` must accept both guides' codes (as the DQC block on
`.documentTypeValue` does).

## Readings of the guide

These readings are ours, not the guide's. They are implemented in `InstanceTypes.py` and stated there.

- **Exhibit instances.** An instance that is itself an exhibit named by a matching Table 6-4 row (the fee exhibit,
  EX-98, EX-2.01, the K and L SDR exhibits, EX-99.4R HISTORIC, the SBSEF exhibits) has only those rows' instance
  types. For `s:` cells, it is in a submission set only where that set holds nothing but exhibits (FE, SE, TO).
- **FE holds only fee exhibits.** An S-1's primary document is not "in FE", although Table 6-1 lists S-1 under FE.
- **ALL**, under `s:` or `i:`, is every instance that is in a submission set or has an instance type, fee exhibits
  included. The guide excludes the fee exhibit by name where a section-3 check should not apply to it.
- **The guide's slips in scope cells** are read as evidently meant, and reported by `parseScopeCell`: a submission
  set under `i:` or an instance type under `s:`, a missing comma, "All".
- **A document type standing in for the submission type** when an exhibit is previewed without parameters:
  `K SDR` and `L SDR` resolve as SDR, and `2.01 SD` as SD.

## Entity sets

Inside EDGAR, the caller passes the registrant's entity sets (Table 6-3 codes) as the `entitySets` parameter. Elsewhere,
`InstanceTypes.determineEntitySets` determines them from the submission, which is our proposal, not EXG text:
- FPI from a 6-K, 20-F or an F- form;
- CA from a 40-F or 40FR;
- BDC from an `814-` file number;
- CEF or OEF from the investment company type, or from use of the cef taxonomy;
- SPAC from an Exhibit 98, or from spac facts;
- US by default.

When both are available, the parameter decides, and a disagreement is logged (`logInstanceTypes`).

## Not done yet

The plan to an EXG-shaped rules file, `exg-validations.json`, which would retire `dei-validations.json`:
- context classes for the guide's `c` column;
- rule identity;
- an engine extending the `ft-validations.json` dialect with scope cells, context classes, parameters and absence
  rows;
- a generator from the guide, with listed corrections and a hand-kept overlay;
- Python handlers for rows that do not compile;
- a dual-mode conformance suite;
- maintenance templates for each kind of change: a new Word draft, a requirements document from the rule makers,
  an urgent fix by the EDGAR team.
