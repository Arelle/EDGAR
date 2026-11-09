// Edgar(tm) r-file-viewer was created by staff of the U.S. Securities and Exchange Commission.
// Data and content created by government employees within the scope of their employment
// are not subject to domestic copyright protection. 17 U.S.C. 105.

// @ts-check

// Use .js file suffix for sec-gov and m365.cloud.microsoft/chat acceptability
// provide ts-check compatibility for ixviewer shared use

// normalization-shim.js
// Canonical map taken from IX Viewer mapCategoryName (standard vs no-statement)
// DO NOT expose secrets; this is client-safe mapping.

/**
 * @typedef {Object} ContextFlags
 * @property {boolean=} isRr
 * @property {boolean=} isfeeexhibit
 * @property {boolean=} isDefinitelyFs
 * @property {boolean=} isDefinitelyNotFs
 */

/** @type {Record<string,string>} */
const STATEMENT = {
  cover: "Cover",
  document: "Document & Entity Information",
  statement: "Financial Statements",
  statements: "Financial Statements",
  disclosure: "Notes to the Financial Statements",
  notes: "Notes to Financial Statements",
  policies: "Accounting Policies",
  tables: "Notes Tables",
  details: "Notes Details",
  prospectus: "Prospectus",
  rr_summaries: "RR Summaries",
  "risk/return": "RR Summaries",
  fee_exhibit: "Reports",
  "*never match category*": "Uncategorized",
};

/** @type {Record<string,string>} */
const NON_STATEMENT = {
  cover: "Cover",
  document: "Reports",
  disclosure: "Reports",
  notes: "Reports",
  policies: "Reports",
  tables: "Reports",
  fee_exhibit: "Reports",
  details: "Details",
  prospectus: "Prospectus",
  rr_summaries: "RR Summaries",
  "risk/return": "RR Summaries",
  "*never match category*": "Uncategorized",
};

/** @type {Map<boolean, Record<string,string>>} */
const NORMALIZED_CAT_MAP = new Map([
  [true, STATEMENT],
  [false, NON_STATEMENT]
])

// Helper: normalize keys
const normCatKey = (s) => String(s || "").trim().toLowerCase();

/**
 * Canonical normalization
 * - menuCat: FilingSummary menu category (preferred)
 * - longName: report long name
 * - role: xBRL role URI (for fee/FFD hints)
 * - hasStatements: instance gate
 * - contextFlags: instance-level flags (RR, fee exhibit, FS hints)
 * - priorMenuCat: ordering guard
 *
 * @param {unknown} menuCat
 * @param {unknown} longName
 * @param {unknown} role
 * @param {boolean} hasStatements
 * @param {ContextFlags=} contextFlags
 * @param {string=} priorMenuCat
 * @returns {string}
 */
export function normalizeCategory(
  menuCat,
  longName,
  role,
  hasStatements,
  contextFlags,
  priorMenuCat
) {
  const normCatMap = NORMALIZED_CAT_MAP.get(hasStatements);
  const normCatMapVals = Object.values(normCatMap ?? {});

  // 1) Map by menuCat when available

  let normCat = normCatMap?.[normCatKey(menuCat)];

  // 2) Role-based hints (e.g., fee/FFD → Reports)
  const strRole = String(role);
  if (!normCat) {
    if (strRole.includes("xbrl.sec.gov/ffd/")) normCat = "Reports";
  }
  if (strRole === "http://xbrl.sec.gov/role/uncategorizedFacts")
    normCat = "Uncategorized";
  else if ((!role || strRole === "") && longName && String(longName ?? "").startsWith("Uncategorized Items"))
    normCat = "Uncategorized";

  // 3) Heuristic fallbacks aligned to IX Viewer labels:
  if (!normCat) {
    const ln = String(longName ?? "");
    if (/ - \w+ - \(Polic/i.test(ln))          normCat =  hasStatements ? "Accounting Policies" : "Reports";
    else if (/ - \w+ - \(Table/i.test(ln))     normCat =  hasStatements ? "Notes Tables" : "Reports";
    else if (/ - [^ -]+ - \(Detail/i.test(ln)) normCat =  hasStatements ? "Notes Details" : "Details";
    else if (/ - Statement - /i.test(ln))      normCat =  "Financial Statements";
    else if (/ - Disclosure - /i.test(ln))     normCat =  hasStatements ? "Notes to the Financial Statements" : "Reports";
    else if (/Document - /i.test(ln))           normCat =  hasStatements ? "Document & Entity Information" : "Reports";
 }

  // 4) Context flags (optional alignment)
  if (!normCat) {
    if (contextFlags?.isRr || contextFlags?.isfeeexhibit) normCat = "RR Summaries";
    else if (contextFlags?.isDefinitelyFs) normCat = "Notes to the Financial Statements";
    else if (contextFlags?.isDefinitelyNotFs) {
      // if not FS and we saw tables/details patterns above they'd have returned already
      normCat =   "Reports";
    }
 }

  // 5) Default
  if (!normCat) {
    normCat =  hasStatements ? "Cover" : "Reports";
  }

  // If normCat is earlier than priorMenuCat in normalizedCatMap, filer error, use priorMenuCat
  if (priorMenuCat && normCatMapVals.indexOf(normCat) < normCatMapVals.indexOf(priorMenuCat))
    return priorMenuCat; // filer error, don't use out of order cat
  return normCat;
}
