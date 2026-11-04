import { Section, SectionFact } from '../interface/meta';
import { convertToSelector } from "../helpers/utils";

/**
 * Description
 * @param {any} filingSummary:any
 * @param {any} metaLinksReports:any
 * @returns {any} => Flatter array of metalinks reports (section items).
 */

const findInstanceDocName = (instanceHtm, fsInputFiles) => {
    const isHtm = (x) => x.includes('.htm') || x.includes('.html') || x.includes('.xhtml');

    const match = fsInputFiles.find(file => {
        const orig = file?._attributes?.original;
        const text = file?._text;
        return orig && isHtm(text) && instanceHtm.includes(orig);
    });
    if (!match?._attributes?.doctype) {
        console.log('no doc match', instanceHtm);
        if (!PRODUCTION) console.log('no match on InstanceDocName', match?._attributes?.doctype);
    }
    return match?._attributes?.doctype;
};

/**
 * Robustly match a FilingSummary <Report> object to a MetaLinks report.
 *
 * fsReport: a single Report from FilingSummary, e.g.
 *   {
 *     ShortName, Role, ParentRole?, Position, HtmlFileName?, instance?, MenuCategory?
 *   }
 *
 * metaLinksReportsInput: can be either:
 *   - Array of MetaLinks report objects (each with at least role/shortName/groupType/anchors)
 *   - Dictionary keyed by 'R<number>' => report object (as in your sample: { R1: {...}, R10: {...} })
 */
function findMatchingMetaReport(fsReport, metaLinksReportsInput) {
    const mlReports = Array.isArray(metaLinksReportsInput)
        ? metaLinksReportsInput.map(addDerivedFieldsFromArray)
        : Object.entries(metaLinksReportsInput).map(([id, rep]) => addDerivedFieldsFromDict(id, rep));

    const fs = addDerivedFieldsToFs(fsReport);

    // 1) Strong match by exact role
    let candidates = mlReports.filter(ml => equalsIgnoreCase(ml.role, fs.role) && ml.instanceHtm.split(' ').includes(fs.instance));
    if (candidates.length === 1) return candidates[0];

    // 1b) If FS is a child role (Tables/Details), its ParentRole may match ml.role
    if (!candidates.length && fs.parentRole) {
        candidates = mlReports.filter(ml => equalsIgnoreCase(ml.role, fs.parentRole));
        if (candidates.length === 1) return candidates[0];
    }

    // 2) Match on normalized ShortName (strip suffixes, normalize punctuation/whitespace)
    candidates = mlReports.filter(ml => normalizeTitle(ml.shortName) === fs.baseShortName);
    if (candidates.length === 1) return candidates[0];

    // 3) Refine by group type derived from FS MenuCategory
    if (candidates.length > 1) {
        const expectedGroups = menuCategoryToGroupTypes(fs.menuCategory);
        const byGroup = candidates.filter(ml => expectedGroups.has(ml.groupType));
        if (byGroup.length === 1) return byGroup[0];
        if (byGroup.length > 1) candidates = byGroup; // keep narrowed set
    }

    // 4) Refine by instance/baseRef (amat-20191027.htm)
    if (fs.instance) {
        const byInstance = candidates.filter(ml => getInstFromMlRepBaseRef(ml) === fs.instance);
        if (byInstance.length === 1) return byInstance[0];
        if (byInstance.length > 1) candidates = byInstance;
    }

    // 5) Match by R-number from HtmlFileName (R<n>.htm) vs MetaLinks id (R<n>)
    if (fs.rNumber != null) {
        const byR = mlReports.find(ml => ml.rNumber === fs.rNumber);
        if (byR) return byR;
    }

    // 6) Weak fuzzy fallback using token overlap on normalized shortNames
    candidates = mlReports
        .map(ml => ({ ml, score: tokenOverlap(fs.baseShortName, normalizeTitle(ml.shortName)) }))
        .filter(x => x.score >= 0.6)     // threshold; tune for your corpus
        .sort((a, b) => b.score - a.score)
        .map(x => x.ml);

    if (candidates.length >= 1) return candidates[0];

    // 7) Last resort: match by Position if ml.order is present (derived from 'R<number>')
    const byPosition = mlReports.find(ml => ml.order !== undefined && Number(ml.order) === Number(fs.position));
    if (byPosition) return byPosition;

    return null;
}

/* ------------------------ Helpers ------------------------ */

function addDerivedFieldsToFs(fs) {
    const menuCategory = fs.MenuCategory ?? fs.menuCategory ?? '';
    const position = Number(fs.Position ?? fs.position ?? NaN);
    const html = fs.HtmlFileName ?? fs.htmlFileName ?? '';
    const rMatch = html.match(/^R(\d+)\.htm$/i);
    const rNumber = rMatch ? Number(rMatch[1]) : null;

    const role = fs.Role ?? fs.role ?? '';
    const parentRole = fs.ParentRole ?? fs.parentRole ?? '';

    const shortName = fs.ShortName ?? fs.shortName ?? '';
    return {
        ...fs,
        menuCategory,
        position,
        rNumber,
        role,
        parentRole,
        baseShortName: normalizeTitle(stripTrailingParenthetical(shortName)),
        instance: fs.instance ?? fs.Instance ?? ''
    };
}

function addDerivedFieldsFromDict(id, rep) {
    const rMatch = id.match(/^R(\d+)$/i);
    const rNumber = rMatch ? Number(rMatch[1]) : undefined;

    return {
        id,
        rNumber,
        order: rNumber, // enables positional fallback if needed
        ...rep,
        role: rep.role ?? '',
        shortName: rep.shortName ?? inferShortNameFromLongName(rep.longName),
        groupType: (rep.groupType ?? '').toLowerCase()
    };
}

function addDerivedFieldsFromArray(rep) {
    const id = rep.id ?? rep.reportId ?? (rep.htmlFileName ? rep.htmlFileName.replace(/\.htm$/i, '') : undefined);
    const rMatch = id ? id.match(/^R(\d+)$/i) : null;
    const rNumber = rMatch ? Number(rMatch[1]) : (rep.order ?? undefined);

    return {
        ...rep,
        id,
        rNumber,
        order: rNumber ?? rep.order,
        role: rep.role ?? '',
        shortName: rep.shortName ?? inferShortNameFromLongName(rep.longName),
        groupType: (rep.groupType ?? '').toLowerCase()
    };
}

function inferShortNameFromLongName(longName = '') {
    // Your longName looks like: "2109102 - Disclosure - Earnings Per Share"
    // Try to take the last segment after " - " if shortName is missing.
    const parts = longName.split(' - ');
    return parts.length ? parts[parts.length - 1] : longName;
}

function equalsIgnoreCase(a, b) {
    return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function getInstFromMlRepBaseRef(ml) {
    // Prefer uniqueAnchor.baseRef, then firstAnchor.baseRef
    return ml?.uniqueAnchor?.baseRef ?? ml?.firstAnchor?.baseRef ?? '';
}

function stripTrailingParenthetical(s) {
    // Remove only final parenthetical suffixes like "(Tables)", "(Details)", "(Parenthetical)"
    if (!s) return s;
    return s.replace(/\s*\([^)]*\)\s*$/g, '');
}

function normalizeTitle(s) {
    if (!s) return '';
    let t = s;
    t = t.replace(/&amp;/gi, '&');
    // normalize curly quotes to straight
    t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    // collapse odd encoding artifacts like "??"
    t = t.replace(/\?{2,}/g, ' ');
    // turn most punctuation/separators to spaces, collapse whitespace
    t = t.replace(/[^\w]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return t;
}

function menuCategoryToGroupTypes(menuCategory = '') {
    // Map FilingSummary MenuCategory to likely MetaLinks groupType(s)
    // Adjust as needed if your MetaLinks uses different labels
    const mc = menuCategory.toLowerCase();
    switch (mc) {
        case 'cover': return new Set(['document', 'cover']);
        case 'statements': return new Set(['statement', 'document']); // adjust if your MetaLinks uses 'statement'
        case 'notes': return new Set(['disclosure']);
        case 'tables': return new Set(['tables']);
        case 'details': return new Set(['details']);
        case 'policies': return new Set(['disclosure', 'policies']); // some vendors keep policies as disclosures
        default: return new Set([mc]); // fallback
    }
}

function tokenOverlap(a, b) {
    const A = new Set(a.split(' ').filter(Boolean));
    const B = new Set(b.split(' ').filter(Boolean));
    if (!A.size || !B.size) return 0;
    const inter = [...A].filter(x => B.has(x)).length;
    const union = new Set([...A, ...B]).size;
    return inter / union;
}


// const findMatchingMetaReport = (fsReport, metaLinksReports) => {
//     const repsMatchingShortName = metaLinksReports.filter(m => m.shortName === fsReport.ShortName);
//     if (repsMatchingShortName.length == 1) {
//         return repsMatchingShortName[0]
//     }

//     // look for match on instance and order - not sure if this ever happens
//     if (repsMatchingShortName.length < 1) {
//         console.log('no match on short name', fsReport)
//         const repMatchingPosition = metaLinksReports.find(m => Number(m.order) === fsReport.Position);
//         if (repMatchingPosition) {
//             return repMatchingPosition;
//         }
//         else {
//             console.log('no match on order and pos either')
//             console.log('metaLinksReports', metaLinksReports);
//             const matchByPosInArray = metaLinksReports.find((m, index) => index-1 === Number(fsReport.Position));
//             if (matchByPosInArray) {
//                 const firstWordIsSame = matchByPosInArray.shortName.substring(0, matchByPosInArray.shortName.indexOf(' ')) == fsReport.ShortName.substring(0, fsReport.ShortName.indexOf(' '));
//                 if (firstWordIsSame) {
//                     debugger;
//                     return matchByPosInArray;
//                 }
//             }
//             return null;
//         }
//     }

//     // refine by matching instance
//     if (repsMatchingShortName.length > 1) {
//         console.info('more than one matching shortName')
//         const matchingInstaceAndShortName = repsMatchingShortName.filter(mlRep => getInstFromMlRep(mlRep) === fsReport.instance)
//         if (matchingInstaceAndShortName.length === 1) {
//             return matchingInstaceAndShortName[0];
//         }
//         if (matchingInstaceAndShortName.length === 0) {
//             console.log('no matchingInstaceAndShortName.  maybe try order and pos')
//         }
//         const repMatchingPosAndOrder = metaLinksReports.find(m => Number(m.order) === fsReport.Position);
//         if (repMatchingPosAndOrder) {
//             return repMatchingPosAndOrder
//         }
//         else {
//             console.error('no repMatchingPosAndOrder and therefore no matching ml rep') 
//             console.log('metaLinksReports', metaLinksReports);
//             debugger;

//         }
//         console.error('no repMatchingPosAndOrder and therefore no matching ml rep') 
//         return null;
//     }
// };

export function enrichWithMetalinks(
    fsReportsData,              // ← shared canonical data
    metaLinksReports,           // ← IX metalinks.json
    fsInputFiles,
) {
    const enriched: Section[] = [];

    // Loop through mustard's reports in menuCats so IX matches mustard ordering EXACTLY
    for (const [catName, fsReports] of fsReportsData.menuCats.entries()) {
        for (const fsReport of fsReports) {
            const meta = findMatchingMetaReport(fsReport, metaLinksReports);

            if (!meta) {
                if (fsReport.instance !== "N/A") {
                    console.error(`could not find matching metalinks report for filings summary report ${JSON.stringify(fsReport)}`)
                }
                // IX may skip reports that aren't in metalinks (?)
                continue;
            }

            const section: Section = {
                shortName: fsReport.ShortName,
                menuCat: catName,               // ← FROM MUSTARD, NOT metalinks
                position: fsReport.Position,    // ← FROM MUSTARD, NOT FilingSummary
                instanceHtm: meta?.instanceHtm || '', // <-- IX-specific
                role: meta.role || fsReport.Role || '',
                longName: meta.longName || fsReport.LongName || '',
                groupType: meta.groupType || '',
                subGroupType: meta.subGroupType || '',
                order: meta.order ?? (meta as any).rNumber ?? fsReport.Position ?? 0,
                isDefault: (meta.isDefault === 'true' || meta.isDefault === true) as any,
                instanceIndex: (meta as any).instanceIndex ?? 0,
                normalizedCategory: fsReport.normalizedCategory || '',
                instanceDocName: null as any,
                meta,
            };

            // Instance doc name → domId
            section.instanceDocName = findInstanceDocName(meta?.instanceHtm, fsInputFiles);
            if (section.instanceDocName) {
                section.domId = `sectionDoc-${convertToSelector(section.instanceDocName, false)}`;
            } else {
                console.error('no instanceDocName', section)
            }

            // Fact / anchor enrichment
            section.fact = getFactAttrsFromAnchorProps(section) || undefined;
            if (section.fact) {
                const f = section.fact;

                section.inlineFactSelector =
                    `section[filing-url="${f.file}"] ` +
                    `[name="${f.name}"][contextref="${f.contextRef}"]`;
            }

            enriched.push(section);
        }
    }

    return enriched;
}

export const getFactAttrsFromAnchorProps = (section: Section) => {
    let fact: SectionFact | null = {};
    fact.instance = section.meta?.instanceIndex; // number
    // fact.menuCat = metaReport.menuCat;
    if (section.meta.uniqueAnchor) {
        fact.name = section.meta.uniqueAnchor.name;
        fact.contextRef = section.meta.uniqueAnchor.contextRef;
        fact.file = section.meta.uniqueAnchor.baseRef || section.instanceHtm;
        fact.ancestors = section.meta.uniqueAnchor.ancestors;
    } else if (section.meta.firstAnchor) {
        fact.name = section.meta.firstAnchor.name;
        fact.contextRef = section.meta.firstAnchor.contextRef;
        fact.file = section.meta.firstAnchor.baseRef || section.instanceHtm;
        fact.ancestors = section.meta.firstAnchor.ancestors;
    } else {
        if (!PRODUCTION) {
            console.warn(`no linkable fact for section ${section.shortName} (no anchor data)`);
            // debugger;
        }
        /* DOC: "As I recall, the reason for the anchors computed during rendering was that 
                some internal rendering process detail gets lost that neither filing summary.xml 
                nor metalinks.json could preserve (I think it had to do with how chrome will insert 
                elements like <tbody> if they were missing in the input…?), but since I can’t 
                remember what that might be (it’s certainly not obvious) go ahead and try." -WH email 4/1/2024 
        */
        fact = null;
    }
    // debugger;
    return fact;
}

export function fetchText(url: string, init?: RequestInit): Promise<string | never> {
    return fetch(url, init).then((response) => {
        if (!response.ok) {
            throw new Error(response.status.toString());
        }

        // Check the response headers to ensure the document is intended to be loaded inline.
        const contentType = response.headers.get("content-type");
        if (!contentType) {
            throw new Error(`Missing Content-Type. URL: ${url}`);
        }
        const permittedContentTypeExpression = /^(application\/xhtml\+xml|application\/xml|text\/html|text\/xml)(\s*;.*)?$/i;
        if (!permittedContentTypeExpression.test(contentType)) {
            throw new Error(`Invalid Content-Type. URL: ${url}, Content-Type: ${contentType}`);
        }
        const contentDisposition = response.headers.get("content-disposition");
        const permittedContentDispositionExpression = /^inline(\s*;.*)?$/i;
        if (contentDisposition && !permittedContentDispositionExpression.test(contentDisposition)) {
            throw new Error(`Invalid Content-Disposition. URL: ${url}, Content-Disposition: ${contentDisposition}`);
        }

        return response.text();
    });
}

export function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T | never> {
    return fetch(url, init).then((response) => {
        if (response.ok) {

            return response.json();
        }

        // switch (response.status) {
        //     case 404:
        //         throw new Error("404 - The requested resource could not be found.");
        //     default:
        //         throw new Error(response.status.toString());
        // }

        // Custom 404 message
        if (response.status === 404) {
            throw new Error(`Error: 404; could not find "${url}"`);
        }

        // All other errors fall through to your generic handler
        throw new Error(response.status.toString());



    }).catch(e => {
        if (e instanceof TypeError) {
            const errorMessage = `Possible invalid URL or network connectivity issue.`
            let ixViewerUrl = new URL(globalThis.location.href)
            let fetchUrl
            try {
                ixViewerUrl = new URL(globalThis.location.href)

                fetchUrl = new URL(url);
            } catch {
                throw new Error(errorMessage);
            }
            if (ixViewerUrl.origin !== fetchUrl.origin) {
                throw new Error(`${e.message} - The protocol, host name, and port number of the url parameter to fetch, if provided, must be identical to that of the Inline XBRL viewer (${ixViewerUrl.origin}).`);
            }
            throw new Error(errorMessage);
        }

        if (e instanceof Error) {
            throw new Error(e.message);
        }

        throw new Error('Request failed unexpectedly.');
    });
}


export function setScaleInfo(scale: string | number | undefined): string | null {
    const scaleOptions: Record<string, string> = {
        0: "Zero",
        1: "Tens",
        2: "Hundreds",
        3: "Thousands",
        4: "Ten thousands",
        5: "Hundred thousands",
        6: "Millions",
        7: "Ten Millions",
        8: "Hundred Millions",
        9: "Billions",
        10: "Ten Billions",
        11: "Hundred Billions",
        12: "Trillions",
        "-1": "Tenths",
        "-2": "Hundredths",
        "-3": "Thousandths",
        "-4": "Ten Thousandths",
        "-5": "Hundred Thousandths",
        "-6": "Millionths"
    };

    return scaleOptions[scale || ""] || null;
}
