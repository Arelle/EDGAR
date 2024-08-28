/*
After updating run `node 'filingsCsvToJson.mjs'` from /cypress/utils
*/

export const addendum = {
    "filingsNeedingCorrectedSectionCount": {
        "000121390021056659": {
            "correction": -1, 
            "reason": "parenthetical"
        },
        "000110465923127862": {
            "correction": -1, 
            "reason": "linked to hidden fact"
        },
        "000143774923034166": {
            "correction": -1, 
            "reason": "no anchor data for fact link"
        },
        "000089418923007993": {
            "correction": 5, 
            "reason": "5 's' reports in metadata",
            "note": "Risk/Return Detail Data link broken.  Links to footnote maybe."
        },
        "000175528122000036": {
            "correction": -2, 
            "reason": "2 facts lack anchor data",
            "note": ""
        },
        "000090831524000023": {
            "correction": -1,
            "reason": "standardCatNameMap doesn't contain key 'uncategorized' for section 'Pay vs Performance Disclosure'",
        },
        "000101376223000425": {
            "correction": -1,
            "reason": "no linkable fact for section Unaudited Interim Condensed Statements of Comprehensive Loss (Parentheticals) (no anchor data)",
        },
    }
};