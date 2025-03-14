# README for EDGAR/validate/resources/xule

This is EDGAR's version of XULE for DQCRT-supported files.

At this time, and only for testing purposes, only rule 0004 is provided.

## Rulemap.json files

When operating in a closed environment such as EDGAR or installed desktop, the Xule rules are in rulesets in this directory which are operated offline (as local files).  Since the installed location of the EDGAR plugin is unknown until runtime and may vary or not be in the usual arelle/plugin directory, a disclosureSystem mappedPaths entry is added at initialization time to remap "/__xule_resources_dir__" to the runtime location of its directory.

If operating online and latest ruleset is desired from GitHub, the ruleset edgarRulesetMapOnline.json is used, which references the master branch of the EDGAR project repo.

## Rule sources

EDGAR operates from pre-built rules usually not updated during the quarter or longer period between EDGAR usual updates.  It does not use the XBRL.US repo, except for EDGAR to sync with at regular updates and then use them to update this directory.

## Combined ugt calculation linkbases

The file us-gaap-cal-{year}-all.xsd is pre-built for the current release by cat'ing all the independent cal linkbases into this single file (for significantly faster loading).
