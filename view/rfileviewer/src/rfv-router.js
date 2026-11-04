// Edgar(tm) r-file-viewer was created by staff of the U.S. Securities and Exchange Commission.
// Data and content created by government employees within the scope of their employment
// are not subject to domestic copyright protection. 17 U.S.C. 105.

/*
 * rfv-router.js
 * EDGAR R File Viewer — Neptune/DMZ Router Module
 *
 * Description:
 *   Core Express Router used by Neptune’s EDGAR application to serve the
 *   R‑File Viewer (RFV). This module *does not* create an Express app or
 *   call app.listen(); instead, it exports a factory that returns an
 *   Express.Router() instance for Neptune to mount under /cgi-bin/viewer.
 *
 *   The router replicates and extends the legacy viewer.pl CGI behavior:
 *     • Accepts CGI‑style query parameters (cik, accession_number, action)
 *     • Fetches or resolves FilingSummary.xml from S3 or local Archives
 *     • Parses FilingSummary (XML/JSON) using parser.js
 *     • Maps reports using map-reports.js (instances, categories, flags)
 *     • Builds the accordion menu via transform-menu.js
 *     • Performs server-side XML → HTML transforms for .xml reports
 *     • Embeds transformed HTML reports into the page when available
 *     • Queries filer metadata from Neptune DB (or stub/none in dev mode)
 *     • Produces a complete SEC-style HTML page via transform-page.js
 *
 * Execution Environment:
 *   • Neptune DMZ (production)
 *   • Dev1 and local development (via server-dev.js)
 *   • Node.js only — not used in Arelle/PythonMonkey transform mode
 *
 * Inputs (via buildRfvRouter options):
 *   express      – Express module (NOT an app instance)
 *   apiPath      – Mount point for CGI-style route (e.g. "/viewer")
 *   serverRoot   – Physical root path containing /Archives and /include
 *   includeDir   – Path to pinned client assets (accordionMenu, jQuery)
 *   log_debug    – Optional logging callback
 *   runQuery     – Neptune DB adapter (optional; enables live filer data)
 *   awsConfig    – Optional Neptune configuration (buckets, paths, etc.)
 *
 * Outputs:
 *   • Returns an Express.Router() instance
 *   • Handles GET /cgi-bin/viewer?action=view&…
 *   • Sends complete HTML page (including embedded Shadow DOM boot logic)
 *
 * Responsibilities:
 *   • Validate and sanitize CGI parameters via secureField()
 *   • Normalize accession numbers (20‑digit → dashed → undashed)
 *   • Determine filing data source (S3 vs local Archives)
 *   • Parse FilingSummary.xml and construct fsParsed
 *   • Build rfvMenu structure and menu HTML
 *   • Perform server-side XSLT transforms for .xml R‑files
 *   • Inject transformedHtmlReports into renderPage()
 *   • Retrieve filer metadata via Neptune DB or stub
 *   • Handle all server-side runtime errors and emit safe diagnostics
 *
 * Notable Behaviors:
 *   • XML→HTML transforms use InstanceReport.xslt via xsltproc
 *   • No filesystem writes; only reads within serverRoot
 *   • No client‑side XSLT (Chrome deprecated XSLTProcessor)
 *   • Router emits HTML optimized for Shadow DOM rendering on the client
 *
 * Notes:
 *   • This module contains 100% of RFV’s server-mode logic.
 *   • In transform mode (Arelle/PythonMonkey), NONE of this file runs.
 *   • Keep router stable — numerous EDGAR systems depend on its CGI paths.
 */


// (ESM-friendly CJS interop)
import { parseFilingSummary } from '../../viewer-common-src/parser.js';
import { mapReports, extractReportsAndMenuCats } from '../../viewer-common-src/map-reports.js';
import { getFilerData } from './db.js';
import { renderAccordionMenu } from './transform-menu.js';
import { transformXmlToHtml } from './transform-xml-to-html.js';
import { renderPage, toRootRelative } from './transform-page.js';
import fs from 'fs/promises';
import path from 'node:path';

export function buildRfvRouter({
    express,
    apiPath,
    serverRoot,
    includeDir,
    log_debug = () => {},
    runQuery = null,
    awsConfig = null,
}) {

    if (!express || typeof express.Router !== 'function' || typeof express.static !== 'function') {
        throw new Error('buildRfvRouter: "express" must be the Express module (import express from "express"), NOT an app instance.');
    }
    console.log("RFV express.Router =", express.Router);
    console.log("RFV express.static =", express.static);
    console.log("RFV apiPath =", apiPath);

    const { Router } = express;
    const router = Router();

    // Main CGI-style endpoint
    router.get(apiPath, async (req, res) => {
        try {
            log_debug(`RFV API query params ${JSON.stringify(req.query)}`);

            const rawCik = req.query.cik;
            const rawAccessionNumber = req.query.accession_number;
            if (typeof rawCik !== 'string' || !/^\d{1,10}$/.test(rawCik) ||
                typeof rawAccessionNumber !== 'string' ||
                !/^(?:\d{18}|\d{10}-\d{2}-\d{6})$/.test(rawAccessionNumber)) {
                const errorPageHtml = renderPage({
                    accessionNumber: '',
                    fsParsed: { rfvMenu: [], log: [] },
                    mode: 'server',
                    menuHtml: '',
                    filer_data: [],
                    log_debug,
                    errors: ['Invalid CIK or accession number'],
                    noindex: true
                });
                return res.status(400).type('text/html').send(errorPageHtml);
            }

            let accessionNumberDashed = rawAccessionNumber;

            // normalize 18-digit accession to dashed format
            if (!accessionNumberDashed.includes('-')) {
                accessionNumberDashed =
                    `${accessionNumberDashed.slice(0,10)}-` +
                    `${accessionNumberDashed.slice(10,12)}-` +
                    `${accessionNumberDashed.slice(12)}`;
            }

            const accessionNumber = accessionNumberDashed.replace(/-/g, '');
            const cik = rawCik.replace(/^0+/, '');

            // Determine S3 vs local path
            const envMode = Number(process.env.DEV_ENV_MODE ?? '0');
            const FILING_DATA_PATH =
                envMode === 0
                    ? `https://s3.amazonaws.com/${awsConfig?.buckets?.['archives.sec.gov'] ?? 'archives.sec.gov'}/edgar/data`
                    : `${req.protocol}://${req.get('host')}/Archives/edgar/data`;

            const aliasPath = `${FILING_DATA_PATH}/${cik}/${accessionNumber}`;
            const baseDir = toRootRelative(aliasPath);
            const filingSummaryPath = `${aliasPath}/FilingSummary.xml`;

            // Load + parse filing summary
            log_debug(`RFV Filing Summary path ${filingSummaryPath}`);
            const parsedFilingSummary = await parseFilingSummary(filingSummaryPath, log_debug);
            log_debug(`RFV Filing Summary parsed successfully`);
            const fsParsed = mapReports(parsedFilingSummary, log_debug);

            // block logs for rfv-router operation
            if (Array.isArray(fsParsed.log) && fsParsed.log.length > 0)
                fsParsed.log.length = 0;  // empty the log array if there were any entries

            // Build accordion menu - step 1 - prep reports data
            const categorizedReports = extractReportsAndMenuCats(fsParsed);

            // Build accordion menu - step 2 - build html
            const menuHtml = renderAccordionMenu(categorizedReports, 'server', false, fsParsed.log);

            // Transform old XML R-files (.xml → HTML)
            const reportsByPos =
                fsParsed.rfvMenu.find(o => 'allReports' in o)?.allReports ?? {};

            const positions = Object.keys(reportsByPos)
                .map(Number).sort((a, b) => a - b);

            const transformedHtmlReports = {};

            for (const pos of positions) {
                const fileName = reportsByPos[pos];

                if (!fileName || fileName === 'ALL_REPORTS_SYNTHETIC')
                    continue;

                if (/\.xml$/i.test(fileName)) {
                    const xmlFullPath = `${serverRoot}${baseDir}/${fileName}`;
                    const xsltFullPath = `${includeDir}/InstanceReport.xslt`;

                    try {
                        const htmlString = await transformXmlToHtml({
                            xmlFullPath,
                            baseDir,
                            xsltFullPath
                        });
                        transformedHtmlReports[pos] =
                            Buffer.from(htmlString, 'utf8').toString('base64');
                    } catch (e) {
                        console.error(`XML->HTML transform failed for ${xmlFullPath}`, e);
                    }
                }
            }

            // Database info
            const filer_data =
                await getFilerData(accessionNumberDashed, log_debug, runQuery);

            // Final page construction
            const pageHtml = renderPage({
                accessionNumber,
                fsParsed,
                aliasPath,
                mode: 'server',
                title: null,
                menuHtml,
                transformedHtmlReports,
                filer_data: filer_data.result,
                log_debug,
                secws: false,
                errors: filer_data.errors
            });

            res.type('text/html').send(pageHtml);
        } catch (e) {
            res.status(500)
                .send(`RFV Exception: ${e.message}`);
        }
    });

    return router;
}