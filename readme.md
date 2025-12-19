# EDGAR Arelle Plugin

## Overview
The EDGAR plugin, developed and maintained by the staff of the U.S. Securities and Exchange Commission (SEC), is designed to provide traditional and inline XBRL viewers for SEC filings. It also integrates with and extends the EFM Validation plugin, offering EFM validation for SEC filings. For end-user support, please contact the SEC directly at: StructuredData@sec.gov.

## Arelle Version
The current version of Arelle in use at the SEC is: **2.37.65**

## Installation
The EDGAR plugin requires the xule plugin to be present under the Arelle plugin directory. You can clone the xule repository into the plugin directory. 

The current version of xule in use at the SEC is: **30048**

## XULE & DQCRT rules
The SEC will begin using the XULE DQCRT rule implementation for filings using us-gaap/2025 and newer, otherwise the Python implemented rules will run for us-gaap/2023-4 filings. When XULE is integrated with EDGAR the Validate.Finally plugin call is disabled so that EDGAR can run XULE in its workflow with multiple IXDSes and multiple passes when redaction is involved. 

There’s an existing “formula parameter” dqcRuleFilter documented [here](https://github.com/Arelle/EDGAR/blob/26f8e70f8a54c6d20c081a2efa94b36310eb0141/validate/__init__.py#L49).
This parameter allows developers and testers to go back and forth between using the XULE vs Python on 2023, 2024 and 2025 us-gaap filings.   

The DQC rules which FASB has selected (“DQCRT”) to run in 2025 are:
0001 0004 0005 0006 0008 0009 0013 0014 0015 0033 0036 0041 0043 0044 0045 0046 0047 0048 0051 0052 0053 0054 0055 0057 0060 0061 0062_2017 0065 0068 0069 0070 0071 0072 0073 0076 0077 0078 0079 0084 0085 0089 0090 0091 0095 0098 0099 0108 0109 0112 0118 0119 0123 0126 0128 0133 0134 0135 0136 0137 0141

## IFRS without US-GAAP
If a filing has IFRS without us-gaap, for the moment it continues to use the old signwarnings and axiswarnings resource files.
