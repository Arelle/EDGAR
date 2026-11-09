# EDGAR Arelle Plugin

## Overview

The EDGAR plugin, developed and maintained by the staff of the U.S. Securities and Exchange Commission (SEC), is designed to provide traditional and inline XBRL viewers for SEC filings. It also integrates with and extends the EFM Validation plugin, offering EFM validation for SEC filings. For end-user support, please contact the SEC directly at: StructuredData@sec.gov.

## Arelle Version

The current version of Arelle in use at the SEC is: **2.46.1**

## Installation

The EDGAR plugin requires the xule plugin to be present under the Arelle plugin directory. You can clone the xule repository into the plugin directory.

The current version of xule in use at the SEC is: **30052**

## XULE & DQCRT rules

The SEC will begin using the XULE DQCRT rule implementation for filings using us-gaap/2025 and newer, otherwise the Python implemented rules will run for us-gaap/2023-4 filings. When XULE is integrated with EDGAR the Validate.Finally plugin call is disabled so that EDGAR can run XULE in its workflow with multiple IXDSes and multiple passes when redaction is involved.

There’s an existing “formula parameter” dqcRuleFilter documented [here](https://github.com/Arelle/EDGAR/blob/26f8e70f8a54c6d20c081a2efa94b36310eb0141/validate/__init__.py#L49).
This parameter allows developers and testers to go back and forth between using the XULE vs Python on 2023, 2024 and 2025 us-gaap filings.

The DQC rules which FASB has selected (“DQCRT”) to run in 2025 are:
0001 0004 0005 0006 0008 0009 0013 0014 0015 0033 0036 0041 0043 0044 0045 0046 0047 0048 0051 0052 0053 0054 0055 0057 0060 0061 0062_2017 0065 0068 0069 0070 0071 0072 0073 0076 0077 0078 0079 0084 0085 0089 0090 0091 0095 0098 0099 0108 0109 0112 0118 0119 0123 0126 0128 0133 0134 0135 0136 0137 0141

## IFRS without US-GAAP

If a filing has IFRS without us-gaap, for the moment it continues to use the old signwarnings and axiswarnings resource files.

## EDGAR XBRL Guide (EXG) message codes

Starting with release 26.4, the SEC issues EDGAR XBRL Guide (EXG) codes for warning and error messages instead of the legacy EDGAR Filer Manual (EFM) codes. An EXG code is the guide section that states the check, followed by the check's name. The log shows the section and name joined by a colon, and the message text is the same in either mode:

```
[EFM.6.05.02:Entity-Identifier-Value] Invalid entity identifier CIK: S876543210 - e60502004ng-20111231.htm 5   (EFM codes)
[EXG.3.01.02:EntityIdentifierValue] Invalid entity identifier CIK: S876543210 - e60502004ng-20111231.htm 5    (EXG codes)
```

The code Arelle records for the message (for example, in conformance suite results) joins the name with a period: `EXG.3.01.02.EntityIdentifierValue`.

The plugin still uses EFM codes unless the `messageCodes` parameter is set. To get EXG codes, set it in any of these ways:

- **Command line:** `--parameters "messageCodes=EXG"`
- **ELOparams:** add `"messageCodes": "EXG"` to the ELOparams JSON object. On the command line, use a parameter separator other than the comma, because the JSON contains commas:
  `--parameterSeparator "|" --parameters 'ELOparams={"submissionType": "10-K", "messageCodes": "EXG"}'`
- **JSON entry point** (`--file`): add `"messageCodes": ["EXG"]` to the entry point object, next to `attachmentDocumentType`.
- **Arelle GUI:** Tools > Formula > Parameters, add a parameter named `messageCodes` with the value `EXG`.

`messageCodes` takes guides in priority order. `EXG EFM` (a JSON list `["EXG", "EFM"]`, or a blank-separated string) codes messages by EXG and also gives each message `exgCode` and `efmCode` arguments, which is useful for comparing EXG-coded and EFM-coded runs. `EFM`, or no parameter, keeps the legacy codes.

Things to know when switching to EXG codes:

- A check that has no reference in the guide keeps its EFM code, and Arelle's own XBRL and XML Schema codes (for example `xmlSchema:valueError`) are unchanged.
- Code filters written for EFM codes (a disclosure system's `logCodeFilter`, `--logCodeFilter`) keep working: a message coded by EXG is filtered by its EFM code.
- The conformance suite has EXG versions of its testcases, organized by guide section, under `conf/EXG` (`EXG-testcases.xml`).
