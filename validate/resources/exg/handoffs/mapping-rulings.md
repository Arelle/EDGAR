# Mapping the legacy checks to EXG rows: rules and rulings

This file records how the plugin's legacy checks (`dei-validations.json`) are matched to EDGAR XBRL Guide section 3
rows, for `efm-exg-references.json` and the conformance suite's EXG variations. Every ambiguity is
settled in review; this is the record of the rulings and of the evidence each one rests on.

## How a legacy check is matched

- **Concept and EFM section first.** A legacy check is matched by its concept and its EFM section. Where those
  leave several sections, the legacy entry's context decides: the legacy file splits contexts by EFM section exactly
  as EXG splits them by its `c` column.

  | Legacy | EXG |
  |---|---|
  | 6.5.48, no axis: principal office, in the required context | 3.1.22, `c = r` |
  | 6.5.51, axis `a`: business contact (BusinessContactMember or UsAgentContactMember) | 3.2.1, `c = bc` (BusinessContactMember only) |
  | 6.5.53, axis `f`: former address | 3.2.2, `c = fa` |
  | 6.5.57, `oef:class`, all on N-CSR forms | 3.2.6, `c = cc` |

  A context class is not inferred from the absence of an axis: there can be many contexts without dimensions,
  and the required context is the one of them that meets the required-context rules (review, 2026-10-10).
- **The subject of a check, not a condition** (review, 2026-10-10). Where a concept appears in several sections,
  the section where it is the checked fact decides, not one where it only conditions another fact. For example,
  EntityAddressAddressLine1 goes to 3.1.22.1, not 3.1.22.2.
- **3.1.1 creates no checks** (review, 2026-10-10). It is the notation section: its tables follow "an example is
  shown below" and are the pattern for the sections after it, so its rows are never linked.
- **Where EXG states a check more finely or more than once, the plugin follows EXG as written for now**, and the
  question is reported to the EXG author (review, 2026-10-10). A future Word draft that changes it is applied like any
  other guide change.

## Rulings

| Legacy | EXG | Ruling and evidence |
|---|---|---|
| 6.5.46 `security-axis` (Security12bTitle, Security12gTitle) | 3.2.4.1 rows 1-2 | The legacy check is "one non-ADR fact with no dimensions, or every fact in an axis context, not both". 3.2.4.1 rows 1 and 2 are "present in at most one of the cases 1-3": case 1 is no axis, cases 2 and 3 are at least two members on StatementClassOfStockAxis or ClassesOfShareCapitalAxis. A single security in a one-member axis context is in no case, and only the legacy check flags it (reported to the EXG author) |
| 6.5.46 `ot1` (12b or 12g, not both) | 3.2.4.1 row 3 | "At most one {1} or {2} fact is present" |
| 6.5.46 `te` (SecurityExchangeName depends on Security12bTitle) | 3.2.4.3 | |
| 6.5.46 `t1` (TradingSymbol or NoTradingSymbolFlag) | 3.2.4.4 | |
| (none) | 3.2.4.2 (EntityListingsExchangeAxis) | A new EXG check with no legacy counterpart |
| 6.5.55 N-2 registration flags and file numbers (legacy 360-365) | 3.1.24.1 | EXG splits N-2 by concept, not by original versus amendment. Both 3.1.24.1 and 3.1.24.2 are `i: RD.CEF` and start "If the submission type is N-2, then ... absent". RD.CEF reaches the forms the legacy `@N-2-a` does (the N-2 family, and 486*, POS 8C, POS AMI carrying an N-2) |
| 6.5.55 pre- and post-effective amendments and their numbers (legacy 366-369, 377-378) | 3.1.24.2 | as above |
| 6.5.48 `ol1`/`ol2` (address lines 2 and 3, principal office) | 3.1.22.2 rows 1, 4 | |
| 6.5.51 `ol1`/`ol2` (business contact) | 3.1.22.2 rows 1, 4 (`c = a`) | 3.2.1.2 has no such rows, so the all-contexts rows apply. Same code as the principal-office case |
| 6.5.51 `r`/`o` LocalPhoneNumber (business contact; legacy 323, 324, 326, 327, 330, 331, 333) | 3.2.1.4 | EXG checks it in 3.2.1.1 row 5 and 3.2.1.4 row 4, both `i: AF.CA`. 3.2.1.4 "Phone" was chosen because the number is no use without the area code checked with it there (review, 2026-10-10). Suggested fix for the EXG author. Legacy 322 (`o3`) stays on 3.2.1.1 row 4, its own check |
| 3.2.6 scope | `s: HF, i: AF.OEF` | Read as AF.OEF in place of AF.CEF (review, 2026-10-10): closed-end N-CSRs carry no oef facts, while open-end N-CSRs do (a census of December 2025 to August 2026 filings: 2,115 open-end N-CSRs carry the oef facts, 249 closed-end ones use the cef taxonomy and carry none). It can change with a future guide. Suggested fix for the EXG author |
| 6.5.53 `ol1`/`ol2` (former address) | 3.2.2.1 rows 4, 6, and also 3.1.22.2 rows 1, 4 | Implemented twice, as EXG states it; reported to the EXG author (review, 2026-10-10) |

### Checks the crosswalk left unlinked (review, 2026-10-28)

The crosswalk links a check through rows that cite its EFM section and name its concept. These checks have no such
row: the guide cites another section, names the concept differently, states the check in a table rather than in
rows, or does not state it at all.

A check whose messages name no concept (`xbrl-names` empty, or a `tag` that is not a concept) is keyed by concept
`""`, the whole check (`MessageReferences.inferredMsgSection`). Such a row also serves a concept with no row of its
own.

| Legacy | EXG | Ruling and evidence |
|---|---|---|
| 6.5.47 `r` EntityAddressCountry (20-F) | 3.1.22.3 | Row 3, "Ri" for AF.FPI; the row cites § 6.5.48 |
| 6.5.51 `o3` ContactPersonnelFaxNumber | 3.2.1.1 | Row 4 (O3). The guide names the concept `dei:ContactPersonnelFax`; suggested fix for the EXG author |
| 6.5.55 `n2e` ExhibitsOnly462dFileNumber | 3.1.24.6 | Rows 9 and 10 (n2o). The guide names the concept `dei:ExhibitOnly462dFileNumber`; suggested fix for the EXG author |
| 6.5.55 `(supported-taxonomy)` cef:* | 1.3 | Facts of a taxonomy the instance type does not permit. 1.3's "ALL" row permits cef for every instance type, so EXG flags none of these; mapped to 1.3 as the section stating which taxonomies an instance may use. Reported to the EXG author |
| 6.5.56 `(supported-taxonomy)` vip:* | 1.3 | vip is an entry point of RD.V3, RD.V4 and RD.V6 only |
| `taxonomy-url-required-in-dts` (6.5.55, 6.5.56, 6.5.58.01, 6.5.59.01, 6.5.60) | 1.3 | "Entry Point Required": RD.CEF, RD.OEF, RD.V3, RD.V4, RD.V6, R33.UIT, R40.UIT, RXP.*, EBP.A, OA.SRO. Concept `""` |
| 6.5.60 `taxonomy-url-unexpected-in-dts` (IFRS in an 11-K) | 1.3 | EBP.A permits no entry point but ebp. Concept `""` |
| 6.5.57 `required-context-duration` | 3.2.6 | Rows 4 and 5 (6 and 12 months). Its messages' `tag` is "Required Context Period Duration", so concept `""` |
| 6.5.58.02 `fdepflag-present` rxp:* | 3.3.2 | Rows 1 and 3: EntityReportingCurrencyISOCode and rxp:TotalPayments missing |
| 6.5.58.10 `r` rxp:AlternativeReportingRegime | 3.3.1 | Row 1 |
| 6.5.59.02 `p1y-ending-on` | 3.4 | Row 1. The guide's concept table lists one of the three text blocks the legacy check names; suggested fix for the EXG author |
| 6.5.59.03 `monthly-facts` | 3.4 | No guide row; the section of the other 17AD-27 checks |
| 6.5.59.04 `future` (17AD-27 DocumentPeriodEndDate) | 3.1.7 | No guide row; the section of the concept |
| 6.5.77 `item-facts-dependency` (CYD facts for Item 1.05) | 3.1.23.8 | Row 1. Concept `""` |
| 6.5.51 `(unexpected)` EntityAddressAddressLine2, 3 (business contact) | 3.1.22.2 | As the business-contact checks of the address lines (rows 1, 4 above); its absence rows 3 and 6 are stated for the required context |
| 6.5.57 `(unexpected)` TradingSymbol, NoTradingSymbolFlag (class contexts) | 3.2.6 | As the other 6.5.57 class checks; 3.2.6 lists both concepts but has no absence rows for them |
| 6.5.49, 6.5.54 `taxonomy-version-required` | 3.1.23.2, 3.1.16 | The sections of the concepts the check requires. Concept `""`: an instance's `xbrl-names` are narrowed to the concepts its DTS defines, and the check fails when they are missing, so its messages name none |

The `o` entries left unlinked (6.5.21, 6.5.46, 6.5.47, 6.5.51) log no message.

### Absence checks of concepts with no absence row (review, 2026-10-28)

The implicit absence check (`(unexpected)`) maps a concept to the section of its "A {n} fact is absent." row. Most
N-2 concepts (6.5.55), and a few others, have no such row: the guide states their absence as "If {1} is N-2, then a
{n} fact is absent.", or not at all. Such a concept takes the section whose concept table lists it, besides 3.1.1
(basis `home`). Where several sections or none list it:

| Legacy | EXG | Ruling and evidence |
|---|---|---|
| 6.5.55 InvestmentCompanyActRegistration | 3.1.24.1 | Listed in 3.1.24.1 and 3.1.24.2; the N-2 registration flags are 3.1.24.1, as their other checks |
| 6.5.46 Security12bTitle, Security12gTitle | 3.2.4.1 | As `security-axis` |
| 6.5.46 SecurityExchangeName | 3.2.4.3 | As `te` |
| 6.5.57 SecurityExchangeName | 3.2.6 | Class contexts, as the other 6.5.57 class checks |
| 6.5.51 ContactPersonnelFaxNumber | 3.2.1.1 | Listed as `dei:ContactPersonnelFax` |
| 6.5.55 ExhibitsOnly462dFileNumber | 3.1.24.6 | Listed as `dei:ExhibitOnly462dFileNumber` |
| 6.5.59.02, 6.5.59.03 sro text blocks not listed | 3.4 | The 17AD-27 section, which lists one of the three |

## Submission header parameter checks

`Filing.py` compares each submission header (ELO) parameter that a `dei-validations.json` entry names as its
`elo-name` with the entry's fact. It also reports a parameter given for a form that does not use it. Both are logged
with EFM section 6.5.40, whatever the entry's own EFM section (`tools/eloCodes.py`, `build/elo-candidates.tsv`).

### How a header parameter check is matched

- **By the parameter, not the concept.** The check is keyed by validation `(elo)` followed by the parameter's name
  (`(elo)periodOfReport`), with no axis and no concept (`MessageReferences.eloMsgSection`).
- **The guide's rows that cite "§ 6.5.40 Item n"**, in the sections whose concept tables list the parameter's
  concepts. Where several rows qualify, the rows whose check names the parameter ("If header element
  voluntaryFilerFlag has a value") decide.
- **A parameter given for a form that does not use it** (`(elo-unexpected)`) takes the same section as the
  parameter's check (review, 2026-10-28).
- Checks of item 5.03 parameters pass a `headerTag` too, but they are logged with EFM section 6.5.21 and are matched
  as legacy checks.

### Rulings (review, 2026-10-28)

| Parameter | EXG | Ruling and evidence |
|---|---|---|
| `periodOfReport` | 3.1.7 | 3.1.7 row 6 (§ 6.5.40 Item 2) |
| `voluntaryFilerFlag`, `wellKnownSeasonedIssuerFlag`, `shellCompanyFlag` | 3.1.10 | 3.1.10 rows 3, 7 and 11 (Items 3, 4 and 5) |
| `smallBusinessFlag`, `emergingGrowthCompanyFlag`, `exTransitionPeriodFlag` | 3.1.11 | 3.1.11 rows 3, 7 and 14 (Items 9, 6 and 7) |
| `entityRegistration.fyEnd`, `submissionHeader.fyEnd` | 3.1.12 | 3.1.12 row 3 (Item 1) |
| `acceleratedFilerStatus` | 3.1.13 | 3.1.13 rows 4 to 7 (Items 10 to 13) |
| `invCompanyType` | 3.1.17 | 3.1.17 row 3 (Item 8) |
| `eligibleFundFlag`, `pursuantGeneralInstructionFlag`, `filerNewRegistrantFlag` | 3.1.24.7 | No guide row compares these N-2 cover page flags with the header. Their concepts are in 3.1.24.7's tables, so the check takes that section. Suggested fix for the EXG author: state the header comparison |

## Checks that log an EFM code directly

These are the checks that log an EFM code with `modelXbrl.error`, `warning` or `log`, in the plugin and in Arelle's
own modules, rather than through a `dei-validations.json` entry (`tools/directCodes.py`, `build/direct-candidates.tsv`).

### How a direct check is matched

- **The guide's rows that cite the code's EFM section.** Chapters 8 to 10 state most of these checks as validation
  rows, and the rows' EFM cells cite the legacy section (8.5 row 1 cites § 6.5.38). Where the rows lie in several
  sections:
  - a row citing an item of the section (`§ 6.5.58 Item 5`) belongs to the code with that level
    (`EFM.6.05.58.05`);
  - otherwise the row whose failure text is the check's `edgarCode` (`du-0538-Context-Has-Period-Forever` is
    "Context Has Period Forever").
- **Otherwise the section whose prose cites it.** Chapters 5, 6 and 11 state some rules in prose only, often as
  "(Formerly EFM v68 § 6.8.11)". The change logs (chapter 12) cite sections they changed, not rules, and are not
  used.
- **A check logged with one code for checks in different sections** is decided by the concept the message names,
  where that tells them apart; by the whole code, where a code built at run time names the facts
  (`EXACT_CODE_RULINGS`); or by the message's `edgarCode`, where the checks have different ones (validation
  `(edgarCode)` followed by the edgarCode). Otherwise it keeps its EFM code.
- **A check that keeps its EFM code** has no reference, so EXG mode shows it with its EFM code. That is the case
  where the guide has no such check, where the code cannot tell the guide's checks apart, or where the message is
  logged outside the model's log.
- **A retired check** is one the guide no longer makes. EXG mode does not log it at all (Checks retired from EXG
  mode, below).

### Rulings (review, 2026-10-26; revisited 2026-10-28)

| Legacy | EXG | Ruling and evidence |
|---|---|---|
| `EFM.5.02.02.*` (validateHtm) | keeps EFM | `validateHtm` runs only under its own `efm-htm` disclosure system, for plain HTML documents. EFM 5.2.2 restricts every HTML attachment; EXG chapter 11 restricts Inline XBRL documents only |
| `EFM.5.02.02.06` (Arelle) | 8.1 | Disallowed entity code, checked in every file of an XBRL submission: 8.1 row 9, "The file does not contain HTML entity codes" (File Entity Code). Revisited 2026-10-28 |
| `EFM.5.02.05` | keeps EFM | An instance and an Inline XBRL document in one submission. The guide does not state it (the 1.4 attachment table only implies it), and it is logged by `efmFiling.error`, outside the model's log, so it cannot be rewritten (review, 2026-10-28) |
| `EFM.6.03.08`, `EFM.6.03.08.moreThanOneIns` | removed | More than one attachment document type, or more than one instance of one type, in a submission. EFM v68 § 6.3.8 is Reserved and the guide does not state them; removed from `filingValidate`, in both modes, as the author advises for reserved sections (review, 2026-10-30) |
| `EFM.5.02.05.xhtmlNamespaceMissing` | 11 | Chapter 11 ("Previously EFM § 5.2.5"): an Inline XBRL document's root element is html in the XHTML namespace. 9.1.3 (Prohibited HTML) is the restricted BODY content model only |
| `EFM.5.02.05.doctypeDisallowed` | 11.1 | |
| `EFM.5.02.05.tupleDisallowed`, `fractionDisallowed`, `targetDisallowed` | 11.11 | Inline XBRL 1.1 features not supported by EDGAR |
| `EFM.5.02.05.12.unupportedTransformationRegistry` | 11.12 | |
| `EFM.5.02.05.14.hidden-fact-*` | 11.14 | Hidden element restriction |
| `EFM.5.02.05.standardNamespacePrefix` | 8.2 | Standard Namespace Prefix |
| `EFM.5.02.05.anchorElementPosition` (Arelle) | 11.8 | Restrictions on HTML bookmark positions |
| `EFM.5.02.05.schemaLocationDisallowed` (Arelle) | 11.13 | "Attribute xsi:schemaLocation should not be used" |
| `EFM.5.02.05.xmlBaseDisallowed` (Arelle) | 8.6 | 8.6 row 1 forbids xml:base on any element, as Arelle checks it; 11.11 states it for Inline XBRL elements only |
| `EFM.6.03.03.matchInstance` | 5.2 | A schema or linkbase file name should be like the instance's: 5.2 "Its file name is like the instance, but with suffix .xsd", and its label linkbase `wxy8k20251015_lab.xml`. Revisited 2026-10-28; previously kept, 8.1 checking name syntax and extensions only |
| `EFM.6.05.02` | 3.1.2; 3.1.3 for `dei:EntityCentralIndexKey` | An invalid entity identifier cannot equal the CIK (3.1.2 row 1). The same code is logged for a `dei:EntityCentralIndexKey` of 0000000000 (3.1.3). The guide's 8.2 cites § 6.5.2 for namespace prefixes, and the suite's testcase 605-02 is named "EXG 8.2" after it, but it tests the entity identifier (suggested fix for the EXG author). Named `Entity-Identifier-Value` (invalid identifier; `cp-0502-Non-Matching-Cik` names the 0000000000 check) (review, 2026-10-30) |
| `EFM.6.05.10` | 9.7 | 9.7 row 2 (start and instant dates) cites 6.5.9 for what the legacy code checks as 6.5.10 |
| `EFM.6.05.20.deiFactsMissing` | 3.1.5 | No dei namespace: the first required fact, dei:DocumentType, is missing (3.1.5 row 1) |
| `EFM.6.05.20.exhibitDocumentType` | 3.1.5 | dei:DocumentType not permitted for the K SDR or L SDR exhibit (3.1.5 row 3) |
| `EFM.6.05.57.classIdMember*` | 3.2.6 | Class id members, as the series id members (6.5.41) are 3.2.5 by its prose |
| `EFM.6.05.58` | removed | Fiscal year end against document period end (Form SD). Not in the guide; the check is removed from `Filing.py`, in both modes (XBRL Guide author, 2026-10-30: "Remove the validation (even though it would be sensible for a variety of other filings too)") |
| `EFM.6.05.58.03.{F}-{G}-Dependency` | 3.3.4, 3.3.5 | The code names both facts of the 3.3.4 or 3.3.5 row "If a {F} fact is present, then a {G} fact is present": A-M, M-A, Cm-A, K-A, K-Km, Km-K are 3.3.4 (amount, currency, conversion); A-R, A-Gv, A-Co, Co-A, Gv-Co, P-A, R-A, Pr-Gv, Sn-Co are 3.3.5 (member-valued), and so are E-Co, Gv-A and Pr-A, which have no row but are of member-valued facts. Revisited 2026-10-28 |
| `EFM.6.05.58.08.GovernmentAxis-*`, `.09.ProjectAxis-*` | 3.3.7, 3.3.8 | Item 8 is stated twice, for government (gac) and project (pac) aggregate contexts; the legacy code keeps them apart as items 8 and 9 |
| `EFM.6.05.58.exhibitDocumentType` | 3.1.5 | dei:DocumentType 2.01 SD if and only if the attachment is EX-2.01 (3.1.5 row 2) |
| `EFM.6.07.09.roleEnding` | 10.2 | Role Ending Mismatch (10.2 row 1) |
| `EFM.6.07.31` | 8.7 | The declaration of a fractionItemType concept (8.7 row 5). ix:fraction (8.5 row 4) is `EFM.5.02.05.fractionDisallowed` |
| `EFM.6.18.01`, `EFM.6.18.02` | 8.5 | A reference to a custom or standard element needs a link:referenceLink, which 8.5 row 6 (§ 18) does not allow |
| `EFM.6.22.00`, `EFM.6.22.02` (Arelle) | 8.3 | 8.3 cites "§ 6.22" without a subsection. Row 1's failure text is 6.22.00's edgarCode; row 2 is a standard namespace only at its edgartaxonomies URL (6.22.02) |
| `EFM.6.05.15.dtdError` (Arelle) | 9.1.1 | A text block failing the EDGAR body DTD, as `EFM.6.05.15` (Text Block Not Well Formed XML). Found by the call's `messageCodes` (review, 2026-10-28) |
| `EFM.6.05.34.` activeContent, externalReference, graphicDataUrl, graphicDataEncodingError, graphicFileType, graphicFileContent, graphicFileError, nestedTable (Arelle, footnotes) | 9.1 | The 9.1 rows state these checks: href and src URLs (rows 1, 2), JavaScript (row 3), graphics (rows 4, 5), nested tables (row 6), as the text block codes `EFM.6.05.16.*` are. Built at run time by `validateHtmlContent` (review, 2026-10-28) |
| `EFM.6.05.34.disallowedMetaContent` (Arelle) | 9.1.2 | No 9.1 row; the footnote section |
| `EFM.5.02.05.nestedTable` (Arelle, Inline XBRL) | 11.7 | "Nested HTML table elements are not allowed … This applies also to Inline XBRL documents" (review, 2026-10-28) |
| `EFM.5.02.05.` activeContent, externalReference, graphicDataUrl, graphicDataEncodingError, graphicFileType, graphicFileContent, graphicFileError (Arelle, Inline XBRL) | 11.10 | HTML attribute values not allowed: src only local jpeg and gif graphics; href only local or SEC documents, "This precludes active content such as JavaScript" |
| `EFM.5.02.05.disallowedMetaContent` (Arelle, Inline XBRL) | 11.3 | "The `<head>` element must contain a `<meta>` element as shown: … content="text/html"" |
| `EFM.6.03.03.noLinkElement`, `EFM.6.23.01.noLinkElement` (`val.EFM60303`) | 8.1 | A linkbase with no extended link, whose type cannot be told: 8.1 rows 3 to 6 require each linkbase to contain the extended link of its type. Found by their `messageCodes` catalogs (review, 2026-10-29) |
| `EFM.6.03.03`, `EFM.6.23.01` (`val.EFM60303` file name patterns) | retired | See Checks retired from EXG mode below. `EFM.6.58.01`, also in their catalogs, is never logged |
| `EFM.6.05.45.coverPageFactNotVisible` | each fact's section; else 3.1 | The message is reported on the hidden facts. A fact takes the section of its concept's "{n} in Facts Not Visible" row (81 concepts); facts of several sections, or of a concept whose rows lie in several, take 3.1, to which 11.14 refers dei facts in ix:hidden ("Except for certain restrictions detailed in § 3.1"). Revisited 2026-10-28 |
| `EFM.6.07.32` | 5.11.2 (text block); 5.11 (other non-numeric) | Told apart by edgarCode. `rq-0732-TextBlock-Must-Be-Duration`: 5.11.2, "(Formerly EFM v68 § 6.7.32) A custom concept of type textBlockItemType must have period type duration". `rq-0732-Nonnnumeric-Must-Be-Duration` (non-numeric, non-abstract): 5.11 Custom Non-Numeric Concepts, as the guide states the rule for abstracts (5.11.1, 8.7 row 4) and text blocks only. Revisited 2026-10-28 |
| `EFM.6.03.02` | 8.1 | A linkbase whose extended link is not of a standard kind: 8.1 rows 3 to 6 require a linkbase to contain only the extended link of its type, as for `noLinkElement`. Named `Invalid-Linkbase-Link-Element` (review, 2026-10-30) |
| `EFM.6.15.04` | 5.9.2 | The same calculation, a summation concept with the same set of items, in two roles: 5.9.2 Avoid calculation relationship redundancy, whose prose cites § 6.15.4 (basis `prose`). The September 2026 draft cited "§ 6.5.14", a typo the author corrected in the November 2026 draft; until then this was a ruling. Named `Calculation-Relationships-Redundant` (review, 2026-10-30) |
| `EFM.6.15.02,6.13.02,6.13.03`, `EFM.6.15.03,6.13.02,6.13.03` (+ `.missingItemsNil`, `.parenthetical`; PreCalAlignment) | 5.9.1 | A required calculation missing, in a statement (6.15.02) or a note (6.15.03): 5.9.1 When calculation relationships are required, of line items in "the financial statements or the footnotes". 5.9.3, which cites § 6.15.3, is alternate calculations. The code is keyed by its first section, the sections it also cites dropped: EXG mode shows `EXG.5.09.01`, `EXG.5.09.01.MissingItemsNil`. Named `Required-Calculation-Missing` (review, 2026-10-30) |

### Codes with no EFM section (review, 2026-10-28)

A few EFM codes carry no EFM section number. A single-name code (`EFM.disallowedRedact`) is keyed by efm `""` and
validation `(code)` followed by the name, and is mapped only where a ruling names it (`tools/directCodes.py`); it
keeps its code in EFM mode. The others keep their codes by design.

| Legacy | EXG | Ruling and evidence |
|---|---|---|
| `EFM.disallowedRedact` | 1.4 | `-sec-ix-redact` in a submission whose instance type does not allow redaction. The 1.4 attachment table's "Inline Redaction Allowed" column is the only statement of which instance types allow it (11.17 describes how to redact). EXG mode: `EXG.1.04.DisallowedRedact` |
| `EFM.coverFacts`, `EFM.feeFacts`, `EFM.attachmentDocumentType` | keeps EFM | INFO-RESULT messages that hand the cover or fee facts (JSON), or the attachment document type, to EDGAR, which reads them by code. Not findings |
| `EFM.privateFilesNotDisseminated`, `EFM.stripExhibit` (render) | keeps EFM | INFO-RESULT notices of files withheld from dissemination or stripped for errors. Not findings |
| `EFM.ft.*` (`ft-validations.json`) | keeps EFM | Fee exhibit checks, numbered by `MessageNumericId` (`EFM.FT.2.3.1.dbtVal4`). Chapter 4 describes the fee tables but states no validation rows to map them to; a separate project |
| `EFM.N/A` | — | Arelle's code for a check that does not apply under EFM (GFM checks); never logged under EFM |

### Checks that log an EXG code (review, 2026-10-30)

| Code | Check | Ruling and evidence |
|---|---|---|
| `EXG.1.04:InlineXbrlRequired` (formerly `EXG.12.08`) | An xBRL-XML instance using a `.*sec.gov/spac/.*` namespace (error), or of a submission type in `Consts.subTypesWarningforxBRLXml` (warning) | Written in January 2025 against the FRD; the guide has no 12.8 (chapter 12 is the change logs). 1.4 Attachment types states which attachments may, or must, be Inline XBRL. Logged with this code in both modes (no EFM section). Open question for the author: the submission types are those of 3.5 Figure 5, where an Inline XBRL primary document is Optional for all, and an Inline XBRL EX-98 Required only for S-1, S-4, F-1, F-4, 14A, 14C and SC TO-I |

### Names (review, 2026-10-30)

A code that is a section only takes its name from the message's `edgarCode` (`MessageReferences.exgNamedCode`), or
for one of Arelle's own messages, its `arelleMessagesText.xml` entry's, in PascalCase as every EXG code's name, both
in the code recorded (testcase results) and in the log (`Entity-Identifier-Value`: `EXG.3.01.02.EntityIdentifierValue`,
shown as `[EXG.3.01.02:EntityIdentifierValue]`; see README, Codes in the log); without
one the code is the bare section (`[EXG.3.01.02]`). `tools/directCodes.py` reports the calls that would. Names given to checks that had none; these
`edgarCode`s are the name alone, with no category-and-section prefix (`cp-0502-`): EDGAR's `ArelleValidationWrapper`
uses an `edgarCode` only as a key to an `arelleMessagesText.xml` entry, of which these have none, so their messages
take the entry of their code as before:

| Legacy | EXG | edgarCode |
|---|---|---|
| `EFM.6.05.02` (invalid identifier) | 3.1.2 | `Entity-Identifier-Value` |
| `EFM.6.07.06` | 10.1 | `Target-Namespace-Date-Mismatch` |
| `EFM.6.08.03` (roleType, arcroleType) | 5.12 | `Role-Type-Standard-UsedOn`, `Arcrole-Type-Standard-UsedOn` |
| `EFM.6.08.06` | 5.6.3 | `Concept-Name-Company-Or-Period` |
| `EFM.6.08.11` | 6.8.1.2 | `Monetary-Balance-Missing` |
| `EFM.6.08.16` | 5.11.4 | `Date-Must-Be-Duration` |
| `EFM.6.08.17` | 5.11.4 | `String-Must-Be-Duration` |
| `EFM.6.11.05` | 6.8.1.3 | `Documentation-Label-Missing` |

### EXG names that differ from the EFM code's suffix (review, 2026-11-02)

An EXG code's name is the EFM code's suffix in PascalCase (`EFM.5.02.05.14.hidden-fact-not-found` ->
`EXG.11.14.HiddenFactNotFound`), except for the codes `MessageReferences.exgCodeNames` names, where the review chose
EDGAR's name for the check, as `arelleMessagesText.xml` has always shown it, or a name of its own. The codes are
logged as before in EFM mode. A family's checks share one EXG code; the message text tells them apart.

| Legacy | EXG | Name | Basis |
|---|---|---|---|
| `EFM.6.03.03.noLinkElement` | 8.1 | `ValidFileExtension` | EDGAR's `cp-0303-Valid-File-Extension` |
| `EFM.5.02.05.{activeContent, disallowedMetaContent, externalReference, graphicDataUrl, graphicFileContent, graphicFileError, graphicFileType, nestedTable}` | 11.3, 11.7, 11.10 | `ProhibitedHtml` | EDGAR's `cp-0502-Prohibited-Html` |
| `EFM.6.05.15.dtdError` | 9.1.1 | `TextBlockNotWellFormedXML` | EDGAR's `cp-0515-Text-Block-Not-Well-Formed-XML`, as `EFM.6.05.15` |
| `EFM.6.05.16.{activeContent, externalReference, graphicDataUrl, graphicFileContent, graphicFileError, graphicFileType, nestedTable}` | 9.1 | `ProhibitedHtmlBody` | EDGAR's `cp-0516-Prohibited-Html-Body`, as `EFM.6.05.16` |
| `EFM.6.05.23.submissionIdentifier` | 3.1.3 | `CikValue` | review: as `EFM.6.05.23.cikValue` (EDGAR's `cp-0523-Non-Matching-Cik` not used) |
| `EFM.6.05.34.{activeContent, disallowedMetaContent, dtdError, externalReference, graphicDataUrl, graphicFileContent, graphicFileError, graphicFileType, nestedTable}` | 9.1, 9.1.2 | `ProhibitedHtmlFootnoteBody` | EDGAR's `cp-0534-Prohibited-Html-Footnote-Body`, as `EFM.6.05.34` |
| `EFM.6.07.09.roleEnding` | 10.2 | `RoleEndingMismatch` | EDGAR's `du-0709-Role-Ending-Mismatch` |
| `EFM.6.05.58.04.NoConversionMethodNeeded` | 3.3.4 | `ConversionMethodValue` | EDGAR's `rxp-055804-Conversion-Method-Value` |

Kept as the suffix gives them, though EDGAR's name differs: the SRO checks (`Sro1YrPeriod`, `SroMonthlyFacts`; EDGAR's
`dq-sro-1yr-period`, `dq-sro-monthly-facts`), and the resource extraction checks whose codes are built at run time
from the facts they compare, `EFM.6.05.58.03` (`ARDependency`, `KmKDependency`, ...; EDGAR's
`rxp-055803-Context-Required-Facts`), `.06` (`RoyaltiesPDependency`), `.07` (`PRoyaltiesDependency`), `.08`
(`GovernmentAxisGvValueDependency`) and `.09` (`ProjectAxisPrValueDependency`).

### Checks retired from EXG mode (XBRL Guide author, 2026-10-29; review, 2026-10-30)

Checks the guide no longer makes. Their rows in `efm-exg-references.json` have `"exg": null` and basis `retired`
(`tools/directCodes.py` `RETIRED`). When `messageCodes` lists EXG first, their messages are not logged and do not
count as errors; in EFM mode they are logged with their EFM codes as before. `tools/makeExgConf.py` leaves a
variation that expects one of them out of the EXG conformance suite (`conf/EXG`), and reports it as retired.

| Legacy | Check | Reasoning (the author's, unless noted) |
|---|---|---|
| `EFM.6.03.03`, `EFM.6.23.01` (`val.EFM60303`) | Instance, schema and linkbase file name patterns ("{base}-{yyyymmdd}.xsd") | The naming is a convention only (EXG 1.4). Many accepted filings do not follow it: 29 "tmb-20260630x10q.htm" filed by one agent in August 2026; "exfilingfees.htm" is common |
| `EFM.6.05.05` | Segment content other than explicit dimension members | EFM 6.5.5 is reserved. There is nothing wrong with a typed dimension unless it is custom, which 6.7.2 (EXG 8.6) checks |
| `EFM.6.05.43` | Negative values of concepts that should not have them | Made redundant by DQC rules years ago |
| `EFM.6.05.44.customAxis` | A custom axis where a standard axis is preferred | EFM 6.5.44 is reserved; a reserved section is no longer checked |
| `EFM.6.07.13`, `EFM.6.07.13.arcroleEnding` | Restrictions on a custom arcroleType's URI | Redundant: a filer may define an arcrole, but not use it (6.9.6, EXG 8.5, mapped) |
| `EFM.6.07.14` | Unique arcroleType URIs | As 6.7.13 |
| `EFM.6.07.15` | arcroleType with a nonempty definition | As 6.7.13 |
| `EFM.6.07.25` | Custom substitution groups | Pointless: any substitution group must still validate as an xbrli:item |
| `EFM.6.08.05.firstLetter`, `.disallowedCharacter`, `.LC3` | Concept name style: a capital first letter, no punctuation, the LC3 form of the label | Not the author's; review, 2026-10-30. 10.3 states the style as "a common convention" only, and that a name must not change merely to agree with a changed label, which comparing it with the current label (LC3) contradicts. The disallowed characters are invalid in any XML name, so schema validation rejects them anyway |
| `EFM.6.08.05.nameLength` | Concept name over 200 characters | Not the author's; review, 2026-10-30. Redundant: `EFM.6.07.29` (over 200 bytes in UTF-8, EXG 8.8) reports the same name |

`EFM.6.03.03.matchInstance` (5.2), which checks the same convention, stays mapped (review, 2026-10-29).

### Where the conformance suite's testcase names differ

The suite's testcase names give an EXG section ("EXG 8.5 | EDGAR Filer Manual v68 6.5.4"). Of the 123 names, 90
agree with the references and 29 name sections with no direct check. Four do not agree, and the references follow
the guide as it stands (xbrl-guide_wip.docx):

| Testcase | Name | Reference | Why |
|---|---|---|---|
| 605-02 | EXG 8.2 | 3.1.2, 3.1.3 | See `EFM.6.05.02` above |
| 612-02 | EXG 6.10.4 | 10.4 | 10.4 row 2 (Presentation Order Duplicates) cites § 6.12.2 |
| 626-08 | EXG 10.7.8 | 10.7.7 | 10.7.7 row 2 (Too Many Annual Return Facts) cites § 6.26.8; the names follow an earlier numbering of 10.7 |
| 626-09 | EXG 10.7.9 | 10.7.8 | 10.7.8 row 1 (Primary Axis On Rows) cites § 6.26.9 |

The 29 name sections with no direct check: the rendering sections (6.24), and checks made where the plugin's
releveler does not reach or that keep their EFM codes.
