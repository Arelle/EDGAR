// Edgar(tm) r-file-viewer was created by staff of the U.S. Securities and Exchange Commission.
// Data and content created by government employees within the scope of their employment
// are not subject to domestic copyright protection. 17 U.S.C. 105.

// Abbreviations used: RFV - R File Viewer (this web)

/**
 * transform-page.js
 *
 * Responsible for constructing the filing viewer scaffold, attaching Shadow DOM,
 * rendering report content (single and ALL REPORTS synthetic modes), managing
 * accessibility behaviors, and handling:
 *
 *   ✓ Shadow DOM content isolation
 *   ✓ Safe inline/external CSS injection
 *   ✓ Pending/opacity transitions during content replacement
 *   ✓ Screen-reader announcements (WCAG 4.1.3)
 *   ✓ Keyboard and pointer focus management (WCAG 2.4.x)
 *   ✓ Forced focus for mouse-initiated activation
 *   ✓ Loading overlay spinner for long operations
 *   ✓ Multi-report ("All Reports") async rendering with recursion
 *   ✓ Image src rewriting and safe fallback behavior
 *
 * This module is shared between DMZ/Neptune and Arelle transform mode.
 */

// -----------------------------------------------------------------------------
// 2026-March Enhancements Summary
// -----------------------------------------------------------------------------
// - Introduced ShadowRoot for report rendering (#reportDiv.attachShadow).
// - Safety CSS injected early; external CSS loaded async but applied deterministically.
// - `.rfv-pending` fade mechanism added for no-flash report switching.
// - Added __rfvSetReady() to prevent hidden-page issues when no reports exist.
// - Updated scroll model: scrollIntoView(company-info), not scrollTo(0,0).
// - Menu CSS consolidated; long labels wrap properly.
// - Left alignment restored by removing .rfv-page centering.
// - Skip-link CSS stabilized; visible only on keyboard focus.
// - Updated showAR/toggleNext to support Shadow DOM popups with ARIA metadata.
// -----------------------------------------------------------------------------

// transform.page.js
import { escapeHtml } from '../../viewer-common-src/sanitize.js';
import { sic_codes } from './const.js';

/**
 * Convert any absolute URL (http/https/localhost/IP/IPv6) to a root-relative path.
 * Keeps query + hash. Leaves non-URL inputs as-is.
 */
export function toRootRelative(input) {
  try {
    // Resolve relative inputs against current origin
    const u = new URL(String(input));
    return u.pathname + u.search + u.hash;
  } catch {
    // Not a valid URL: probably already a path or a local filesystem string
    return input;
  }
}



/**
 * Returns a COMPLETE HTML document string.
 * Updates include ARIA landmarks, skip link, accessible controls, and inlined RFV logic.
 */
export function renderPage({
  accessionNumber, // dashed for SECWS transform, un-dashed for server use
  fsParsed,
  aliasPath = '',
  mode = '',
  title = null,
  menuHtml,
  transformedHtmlReports = null,
  filer_data = null,
  log_debug = null,
  secws = false,              // use SECWS DisplayDocument.do query
  errors = [],
  noindex = false
}) {
  if (!title) {
    title = 'View Filing Data'; // override title for Arelle EDGAR render GUI viewer tabs
  }

  // Accordion + report pane
  const jQuery = (mode === 'server') ? '/js/third-party/jquery-3.7.1.min.js' : 
                 (secws) ? '/AR/include/jquery-3.7.1.min.js' :
                 '/include/jquery-3.7.1.min.js';

  // Seed globals for loader; fallback if Show.js isn't present
  const filesByPos = fsParsed.rfvMenu.find(o => 'allReports' in o)?.allReports ?? {};
  const hasReports = Object.keys(filesByPos).length > 0;
  const firstPos = Object.keys(filesByPos).map(n => Number(n)).sort((a, b) => a - b)[0] ?? null;
  const logs = fsParsed?.log ?? null;

  
  // Strip protocol/authority from aliasPath for web-relative fetching
  let aliasDir; // SECWS or authority URL or file path
  if (secws) aliasDir = `DisplayDocument.do?step=docOnly&accessionNumber=${accessionNumber}&interpretedFormat=true&redline=false&filename=`;
  else aliasDir = toRootRelative(aliasPath);
  if (aliasPath.startsWith('https://s3.amazonaws.com/'))
    aliasDir = aliasDir.replace(/^\/[^\/]+\/(.*)$/, '/Archives/$1');  // replace s3 bucket with Archives

  // HEAD assets - NOTE: accordionMenu.js is intentionally NOT included (now inlined in bootstrap)
  let head = `
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${escapeHtml(title)}</title>
    <script type="text/javascript" src="${jQuery}"></script>
  `;
  if (noindex) head += `<meta name="robots" content="noindex" />`;
    //<script type="text/javascript" src="/include/Show.js"></script>

  const stylesheets = (mode === 'server') ? [
    ['/include/interactive2.css', 'text/css', null],
    ['/edgar/search/global/css/bootstrap/bootstrap.min.css', 'text/css', null],
    //['/include/report.css', 'text/css', null],
    //['/include/print.css', 'text/css', 'print'],
    //['/include/xbrlViewerStyle.css', 'text/css', null]
  ] : [
    //['/include/interactive.css', 'text/css', null],
    //['/include/report.css', 'text/css', null],
    //['/include/print.css', 'text/css', 'print']
  ];

  for (const [href, typ, media] of stylesheets) {
    head += `
    <link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'"`;
    if (media) {
      head += ` media=${media}`;
    }
    head += `>`;
  }

  if (mode === 'server')
    head += `<noscript><link rel="stylesheet" href="/edgar/search/global/css/bootstrap/bootstrap.min.css"></noscript>`;

  // Inline adjustments for focus and selected states (non-color cues)
  head += `
    <style>
        /* Make main content the scrollable region (for keyboard and screen readers, etc) */
        html, body {
          height: 100%;
        }

        .rf_viewer, .accordion-toggle, .doc-type, .all_reports, .rendering_logs {
        font-size: 11px;
      }

      /* --- MENU BASE STYLES (deduped) ---------------------------------------- */

      /* Lists: no bullets, no margins/padding */
      #menu,
      #menu ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
      }

      /* Buttons: full width, no UA decoration */
      #menu button {
        width: 100%;
        box-sizing: border-box;
        border: none;
        background: #F7F7F7;
        text-align: left;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: none !important;
      }

      /* Category toggles */
      #menu > li > .accordion-toggle {
        display: block;
        padding: 0.5em;
        background: #F7F7F7;
        color: black;
      }

      /* Sub-report buttons */
      #menu li ul li .rf_viewer {
        display: block;
        width: 100%;
        background: #FFFFFF;
        color: #0071EB;
        padding: 0.5em 0.5em 0.5em 20px;
        border: none;
        text-align: left;
        cursor: pointer;
      }

      /* Hover */
      #menu button:hover {
        background: #aaa;
      }

      /* Special buttons (All Reports / Rendering Log / IX viewer): base state */
      #menu .ix_viewer,
      #menu .all_reports,
      #menu .rendering_logs {
        display: block;
        width: 100%;
        background-color: #0C213A;  /* no !important */
        color: #FFFFFF;
        padding: 0.5em;
        border: none;
      }

    /* --- Selection (current report) ------------------------------------------- */
    /* Use programmatic state already set by JS: aria-current="page" */
    #menu button[aria-current="page"] {
      border-left: 4px solid #005A9C;       /* persistent selection cue */
      background-color: #F0F7FF;            /* subtle fill for non-text contrast */
      font-weight: 600;                      /* secondary non-color cue */
    }

    /* Remove outline from selected so it doesn't duplicate focus ring */
    #menu button.is-selected {
      outline: none;                         /* was: outline: 3px solid #005A9C; */
    }

    /* --- Hover (pointer) ------------------------------------------------------ */
    /* Ensure all actionable items get a consistent hover cue */
    #menu .accordion-toggle:hover,
    #menu .rf_viewer:hover {
      background-color: #E6F0FE;             /* high-contrast hover fill */
      color: #1A1A1A;
      text-decoration: underline;            /* non-color cue: 1.4.1 Use of Color */
    }
    #menu .ix_viewer:hover,
    #menu .all_reports:hover,
    #menu .rendering_logs:hover {
      background-color: #355A8A;   /* lighter navy, high contrast */
      color: #FFFFFF;
      text-decoration: underline;
    }

/* --- Keyboard focus (visible + distinct) --------------------------------- */
    /* Use :focus-visible so the ring appears for keyboard, not for mouse clicks */
    #menu .accordion-toggle:focus-visible,
    #menu .rf_viewer:focus-visible,
    #menu .ix_viewer:focus-visible,
    #menu .all_reports:focus-visible,
    #menu .rendering_logs:focus-visible {
      outline: 3px solid #005A9C;            /* meets 2.4.11 + 1.4.11 */
      outline-offset: 2px;                   /* separates focus ring from component */
      /* Optional: inner inset to maintain contrast on dark hover fills */
      box-shadow: 0 0 0 2px #fff inset;
    }
    #menu .ix_viewer:focus-visible,
    #menu .all_reports:focus-visible,
    #menu .rendering_logs:focus-visible {
      background-color: #064072 !important;
      color: #FFFFFF !important;
    }

    /* When the focused item is also the current selection, keep both cues subtle */
    #menu button[aria-current="page"]:focus-visible {
      border-left-color: #004080;            /* slight deepen */
      background-color: #EAF4FF;             /* slight adjustment so the ring stands out */
    }

    #menu .ix_viewer[aria-current="page"],
    #menu .all_reports[aria-current="page"],
    #menu .rendering_logs[aria-current="page"] {
      border-left: 4px solid #4DA3FF;
      background-color: #132B4F;   /* slightly lighter than base */
      font-weight: 600;
    }

    /* Improve focus visibility without interfering with selection */
    #menu button:focus-visible:not([aria-current="page"]) {
      background-color: #DCEBFA;  /* subtle blue-gray that contrasts with both white and dark items */
    }      

    /* Doc-type pill */
    .doc-type {
      display: inline-block;
      padding: .16rem .4rem;
      border-radius: 6px;
      color: #212529;
      background: #ffc107;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
    }

    /* Wrapping: preserve 170px col width, allow multi-line */
    #menu {
      max-width: 170px;
    }
    #menu button {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      word-break: break-word;
    }

    #print-btn {
      background-color: #fbfbfb;
      color : black;
      text-decoration: none;
      font-size: 11px;
      font-weight: bold;
      border: none;
      padding: 0;
    }

    #print-btn:Hover {
      text-decoration: underline;
    }

    /* Default popup styling (applies to cloned or sibling panels) */
    .rfv-popup {
      background-color: #def;        /* light blue background */
      border: 2px solid #2F4497;
      border-radius: 4px;               /* subtle rounding */
      padding: 0;
      margin: 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);  /* softer lift */
      z-index: 1000;                    /* above surrounding text */
    }

    /* Optional: a tighter “definition” look for nested sections  */
    .rfv-popup .rfv-section {
      border-top: 1px solid #E0E0E0;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
    }

    .rfv-popup a {
    }
    .rfv-popup a:hover {
      background-color: #94a3dc;
    }

    /* Plus/minus for inner popup expanders using ARIA */
    .rfv-popup [aria-expanded="false"]::before { content: "+ "; }
    .rfv-popup [aria-expanded="true"]::before  { content: "- "; }

    /* Respect the 'hidden' attribute for panels */
    .rfv-popup[hidden] { display: none !important; }

    /* No inline visibility overrides; let hidden/display control visibility */
    .rfv-popup { visibility: visible; }

    /* === Report host pane (light DOM) === */
    #reportDiv {
      /* Layout */
      display: block;
      width: 100%;
      /* Keep dynamic height tight like SEC site; remove large min-height that adds whitespace */
      min-height: 0;             /* or omit entirely */
      overflow: visible;
      contain: none !important;

      /* Visual baseline */
      position: relative;
      background: #fff;
      will-change: contents;
      opacity: 1;
    }

    /* Page content wrapper: gutters + width clamp (legacy look without full-bleed) */
    main#main-content { padding: 0 0 0 0; }
    .rfv-page {
      width: 100%;
      max-width: none;       /* allow full-page stretch like original */
      margin: 0;             /* no centering */
      padding: 0;            /* no side padding */
    }

    /* Prevent flashing: opacity fade instead of visibility hidden */

    #reportDiv.rfv-pending {
      opacity: 0.35;
      transition: opacity 140ms ease-out;
      will-change: opacity;
      filter: blur(0.6px) saturate(0.9);
    }
      
    /* Prevent FOUC but preserve layout rectangle */
    #reportDiv.rfv-hide-until-styled {
        visibility: hidden !important;   /* visually hidden */
        opacity: 0 !important;           /* optional: fade it out */
        display: block !important;       /* DO NOT collapse; header/footer won't jump */
    }

    
    /* Overlay should cover only the report pane, not the whole viewport */
    .rfv-loading-overlay {
      position: absolute;
      inset: 0;                 /* cover the pane’s content box */
      z-index: 999999;          /* MUST be above the Shadow DOM */
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      background: rgba(255,255,255,0.45);
    }

    .rfv-loading-overlay .rfv-spinner {
      width: 32px;
      height: 32px;
      border: 4px solid #ccc;
      border-top-color: #005A9C;
      border-radius: 50%;
      animation: rfv-spin 0.8s linear infinite;
    }

    @keyframes rfv-spin { to { transform: rotate(360deg); } }

    /* 1) Fixed table layout so <col> widths are respected */
    table[role="presentation"] {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    /* 2) Authoritative column widths come from <colgroup> */
    col.rfv-menu-col    { width: 170px !important; }
    col.rfv-content-col { width: auto !important; }

    /* 3) Keep menu from “forcing” wider than 170px via long tokens */

    /* Keep the column at 170px (from <colgroup>), let labels wrap naturally */
    #menu { max-width: 170px; }
    #menu button {
      white-space: normal;     /* allow multi-line wrap */
      overflow: visible;       /* no clipping */
      text-overflow: clip;     /* disable ellipsis */
      word-break: break-word;  /* wrap long tokens */
    }
    /* Doc-type pill can stay constrained to avoid overflow */
    #menu .doc-type { white-space: nowrap; }

    /* 4) Ensure the report host fills the content column */
    .rfv-content-cell > #reportDiv { width: 100%; display: block; }

    .rfv-content-cell {
      padding-right: 20px;                              /* ensures inner 100% has a gutter */
      box-sizing: border-box;
    }

    /* Let the content column and host grow naturally */
    td[style*="vertical-align: top;"]:nth-child(2),
    .rfv-content-cell {
      height: auto;
    }

    /* Presentation table fills page; columns won’t collapse */
    table[role="presentation"] {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    /* Shadow content should never exceed the column */
    :where(#reportDiv) :host {
      display: block;
      width: auto;           /* allow natural sizing */
      max-width: 100%;       /* never exceed the content cell */
      visibility: visible;
    }

    :where(#reportDiv) #rfv-shadow-host {
      display: block;
      width: auto;
      max-width: 100%;
      overflow: visible;
    }

    /* Prevent FOUC only inside reportDiv, not the whole page */
    html.rfv-loading #reportDiv {
        visibility: hidden;
        opacity: 0;
    }

    html.rfv-ready #reportDiv {
        visibility: visible;
        opacity: 1;
    }

    /* Ensure skip link stays off-screen until focused */
    .skip-link {
      position: absolute !important;
      top: 0 !important;
      left: -999px !important;
      z-index: 10000; /* ensures visibility when focused */
    }
    .skip-link:focus {
      left: 0 !important;
      width: auto !important;
      height: auto !important;
      padding: 0.5rem 1rem;
      background: #fff;
      border: 2px solid #005A9C;
    }
    .skip-link:focus {
      position: absolute !important;
    }

  `;

  head += `
      </style>
  `;

  const filers = Array.isArray(filer_data) ? filer_data : [filer_data];
  const filer0 = filers[0];
  log_debug(`Filer[0] for header ${JSON.stringify(filer0)}`);

  // Header + breadcrumbs, now with landmarks and skip link
  let heading = `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <noscript><div style="color:red; font-weight:bold; text-align:center;">
      This page uses Javascript. Your browser either doesn't support Javascript or you have it turned off.
      To see this page as it is meant to appear please use a Javascript enabled browser.
    </div></noscript>`;

  if (mode === 'server') {
  	/** Note that the H1 does not use title, which is only for GUI tab to distinguish
  		between public and private renderings of the same display when there is either
  		redline or redacted content.  The "View Filing Data" H1 header is the same in
  		either case to match what the public webpage shows"
  	*/
    heading += `
    <!-- BEGIN BANNER -->
    <header id="header" style="text-align: center;">
      <nav id="main-navbar" class="navbar navbar-expand" role="navigation" aria-label="Primary navigation">
        <ul class="navbar-nav">
          <li class="nav-item">
                <a class="nav__sec_link" href="https://www.sec.gov">
                    <img src="/edgar/search/images/edgar-logo-2x.png" alt="U.S. Securities and Exchange Commission logo" style="height:6.25rem">
                </a>
          </li>
          <li class="nav-item">
                <a class="nav__sec_link" href="https://www.sec.gov">
                    <span class="link-text d-inline">SEC.gov</span>
                </a>
          </li>
          <li class="nav-item">
                <a class="nav__link" href="https://www.sec.gov/submit-filings/about-edgar" id="edgar-short-form"><span class="link-text">EDGAR</span></a>
          </li>
        </ul>

        <ul class="navbar-nav ml-auto">
          <li class="nav-item">
            <a href="https://www.sec.gov/edgar/search/efts-faq.html" class="nav__link" target="_blank" rel="noopener noreferrer">FAQ</a>
          </li>
          <li class="nav-item">
            <a href="https://www.sec.gov/edgar/search-and-access" class="nav__link">Filings search tools</a>
          </li>
        </ul>
      </nav>
    <h1 style="position: relative; top: -40px;">View Filing Data</h1>
    </header>
    <!-- END BANNER -->

    <!-- BEGIN BREADCRUMBS -->
    <nav id="breadCrumbs" aria-label="Breadcrumb">
      <ul>
        <li><a href="/">SEC Home</a> &#187;</li>
        <li><a href="/edgar/searchedgar/companysearch.html">Company Search</a> &#187;</li>
        <li class="last">Current Page</li>
      </ul>
    </nav>
    <hr>
    <!-- END BREADCRUMBS -->
  `;

  if (filer0)
    heading += `
      <!-- START COMPANY HEADERS DIV -->
      <section id="company-info" aria-label="Company info" style="margin: 5px 20px 0 20px; padding-top: 5px; padding-left: 5px;">
        <div class="companyInfo">
          <span class="companyName">${escapeHtml(filer0.conformed_name)}
            <acronym title="Central Index Key">CIK</acronym>: ${escapeHtml(filer0.cik)}
          </span>
        </div>
        <div class="clear"></div>
      </section>
      <!-- END COMPANY HEADERS DIV -->
    `;
  }

  heading += `
    <!-- START CONTENT DIV -->
    <main id="main-content" tabindex="-1">
  `;

  let table = '';

  // Use role="presentation" to avoid table semantics)
  // if only ALL REPORTS in filesByPosition skip
  if (hasReports) {
    table += `
    <div id="rfv-status" role="status" aria-live="polite" aria-atomic="true" style="position:absolute;left:-9999px;top:-9999px;"></div>
    <div class="rfv-page">
      <table role="presentation">
        <colgroup>
          <col class="rfv-menu-col" style="width:170px">
          <col class="rfv-content-col" style="width:auto">
        </colgroup>
        <tr>
          <td colspan="2">
            <button id="print-btn" type="button" class="rf_viewer" onclick="window.print();" aria-label="Print document">
              Print Document
            </button>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top; width: 170px; margin-right: 5px;">
            ${menuHtml}
          </td>
          <td class="rfv-content-cell" style="vertical-align: top;">
            <!-- Accessible live region for dynamic report content -->
            <div id="reportDiv" aria-live="polite" role="region" aria-label="Report content" tabindex="-1"></div>
          </td>
        </tr>
      </table>
    </div>
  `;
  } else if (mode !== 'server' || aliasPath) {
    // If there are no reports, show a message *but keep the pane visible*
    table += `
      <div style="margin-top: 15px; margin: 15px 20px 10px 20px; color: red; text-align: center;">
        No rendered XBRL documents were found at
        <a href="${escapeHtml(aliasDir)}">${escapeHtml(aliasDir)}</a> for this filing.
      </div>
    `;
  }

  // Footer
  let footer = `
      </main>
      <!-- END CONTENT DIV -->`;

  if (mode === 'server') {
    footer += `

      <!-- START FILER DIV -->
      <div id="contentDiv"  role="contentinfo">`;

    for (const filer of filers) {
        log_debug(`Footer filer ${JSON.stringify(filer)}`);
        let filingInfo0 = filer?.filing_info?.[0]
        footer += `
	   <div class="filerDiv">
	      <div class="mailer">Mailing Address`;
    if (filer.m_street1)
      footer += `
	         <span class="mailerAddress">${escapeHtml(filer.m_street1)}</span>`;
    if (filer.m_street2)
      footer += `
    	     <span class="mailerAddress">${escapeHtml(filer.m_street2)}</span>`;
    let ctyStZp = [filer.m_city, filer.m_state, filer.m_zip].filter(Boolean).join(' ');
    if (ctyStZp)
      footer += `
        	 <span class="mailerAddress">${escapeHtml(ctyStZp)}</span>`;
      footer += `
	      </div>
	      <div class="mailer">Business Address`;
      if (filer.street1)
        footer += `
	         <span class="mailerAddress">${escapeHtml(filer.street1)}</span>`;
      if (filer.street2)
        footer += `
	         <span class="mailerAddress">${escapeHtml(filer.street2)}</span>`;
      ctyStZp = [filer.city, filer.state, filer.zip].filter(Boolean).join(' ');
      if (ctyStZp)
        footer += `
	         <span class="mailerAddress">${ctyStZp}</span>`;
      if (filer.phone)
        footer += `
	         <span class="mailerAddress">${escapeHtml(filer.phone)}</span>`;
      let sic_code = sic_codes[filer.assigned_sic];
      footer += `
	      </div>`;
      footer += `
	      <div class="companyInfo">
    	      <span class="companyName">${escapeHtml(filer.conformed_name)} (Filer) <acronym title="Central Index Key">CIK</acronym>: <a href="/cgi-bin/browse-edgar?CIK=${escapeHtml(filer.cik)}&amp;action=getcompany">${escapeHtml(filer.cik)} (see all company filings)</a></span> <p class="identInfo"><acronym title="Internal Revenue Service Number">IRS No.</acronym>: <strong>${escapeHtml(filer.irs_number)}</strong> | State of Incorp.: <strong>${escapeHtml(filer.state_of_incorporation)}</strong> | Fiscal Year End: <strong>${escapeHtml(filer.fiscal_year_end)}</strong>`;
      if (filingInfo0) {
            footer += "<br />";
          if (filingInfo0.form_type)
            footer += ` Type: <strong>${escapeHtml(filingInfo0.form_type)}</strong>`;
          if (filingInfo0.act)
            footer += ` | Act: <strong>${escapeHtml(filingInfo0.act)}</strong>`;
          if (filingInfo0.file_number)
            footer += ` | File No.: <a href="/cgi-bin/browse-edgar?filenum=${escapeHtml(filingInfo0.file_number)}&amp;action=getcompany"><strong>${escapeHtml(filingInfo0.file_number)}</strong></a>`;
          if (filingInfo0.film_number)
            footer += ` | Film No.: <strong>${escapeHtml(filingInfo0.film_number)}</strong>`;
      }
      if (filer.assigned_sic)
        footer += `
            <br /><acronym title="Standard Industrial Code">SIC</acronym>: <b><a href="/cgi-bin/browse-edgar?action=getcompany&amp;SIC=${escapeHtml(filer.assigned_sic)}&amp;owner=include">${escapeHtml(filer.assigned_sic)}</a></b> ${sic_code}`;
      if (filer.owner_org)
        footer += `
            <br />(CF Office: ${escapeHtml(filer.owner_org)})`;
      footer += `
            </p>
	      </div>
	      <div class="clear"></div>
	   </div>`;
      }
    footer += `
      </div>
      <!-- END FILER DIV -->

      <!-- END FOOTER DIV -->
      <footer id="footer" role="contentinfo">
		  <div class="currentURL">https://www.sec.gov/cgi-bin/viewer</div>
		  <div class="links"><a href="/index.htm">Home</a> | <a href="/edgar/searchedgar/webusers.htm">Search the Next-Generation EDGAR System</a> | <a href="javascript:history.back()">Previous Page</a></div>
		  <div class="modified">Modified 11/14/2022</div>
      </footer>
      <!-- END FOOTER DIV -->
    `;
  }

  const errorsHtml = errors.length
    ? `<div style="margin: 15px 20px 10px 20px; color: red; text-align: center;">${errors.map(e => `<p>${escapeHtml(String(e))}</p>`).join('')}</div>`
    : '';

  let bootstrap = `
    <script type="text/javascript">
      // Globals used by SEC loader (Show.js)
      window.SEC_ALIAS_DIR = ${JSON.stringify(aliasDir)};
      window.RFV_MENU = ${JSON.stringify(fsParsed.rfvMenu)};
      window.R_FILES_BY_POS = RFV_MENU.find(o => 'allReports' in o)?.allReports;`;
  
  // --- SERVER-INJECTED TRANSFORMS ---------------------------------------------
  // In server mode, renderPage() embeds a constant:
  //
  //   window.TRANSFORMED_HTML_REPORTS = { [position]: "<html...>", If present, loadReport(n) renders from this map and never attempts client-side
  // XSLT. In transform (Arelle) mode, this constant is not present; the page
  // fetches .htm reports via URL and renders them into ShadowRoot.
  // ----------------------------------------------------------------------------

  if (mode === 'server' && transformedHtmlReports && Object.keys(transformedHtmlReports).length) {
    bootstrap += `
      // Pre-transformed HTML, keyed by report position (server path only)
      // in base64 to avoid html escaping issues within the strings
      window.TRANSFORMED_HTML_REPORTS = ${JSON.stringify(transformedHtmlReports)};
    `;
  }
    
  bootstrap += `
      function scrollMainContentToTop() {
        // Scroll to company info instead of top of page header
        const anchor = document.getElementById('company-info');
        if (anchor) {
          anchor.scrollIntoView({
            block: 'start',   // top-align it
            behavior: 'auto'  // no animation unless desired
          });
        }
      }
      
      `;

  if (logs) {
    bootstrap += `
      window.RENDERING_LOGS = RFV_MENU.find(o => 'renderingLogs' in o)?.renderingLogs;
      // Log viewer renders selected log into #reportDiv
      window.showRenderingLog = function () {
        const root = ensureShadow();
        clearShadow();

        let baseDir = (typeof window.SEC_ALIAS_DIR === 'string' && window.SEC_ALIAS_DIR.length)
          ? window.SEC_ALIAS_DIR.replace(/\\/$/, '')
          : (location.pathname.replace(/\\/[^/]*$/, '') || '/');`;
      if (!secws) {
        bootstrap += `
        if (!baseDir.endsWith('/')) baseDir += '/';`;
      }
      bootstrap += `

        const reportCssHref = \`\${baseDir}report.css\`; // same folder as R1.htm

        const logEntries = window.RENDERING_LOGS || [];
        const rows = logEntries.map(entry => {
          const type = entry?.type || 'Info';
          const text = (entry?.text || '').replace(/\\r\\n|\\r|\\n/g, '<br>');
          const cls  = type.slice(0,4).toLowerCase(); // 'erro', 'warn', 'info', etc.
          return \`<tr class="ro"><td class="text \${cls}">\${type}: \${text}</td></tr>\`;
        }).join('');

        const container = document.createElement('div');
        container.id = 'rfv-shadow-host';
        container.innerHTML = \`
          <style>
            /* Pull in full report stylesheet for consistent table look */
            @import url("\${reportCssHref}");

            /* Minimal extras for log highlighting */
            .info { }
            .erro { background-color: pink; }
            .inco { background-color: peachpuff; }
            .warn { background-color: lemonchiffon; }

            table.report { width: auto; max-width: 100%; border-collapse: separate; }`;
    if (mode === 'transform') bootstrap += `
        h2 { font-family: sans-serif; }`;
    bootstrap += `
          </style>
          <h2>Rendering Log</h2>
          <table class="report" border="0" cellspacing="2" role="table">
            <tbody>
              <tr><th class="Info">The rendering log information below will not appear on the EDGAR web site.</th></tr>
              \${rows}
            </tbody>
          </table>
        \`;
        root.appendChild(container);
        scrollMainContentToTop();
      };`;

    }

      // Fallbacks if Show.js isn't present (offline harness):`;

    bootstrap += `
      function decodeHtmlEntities(s) {
        // safest cross-browser decode
        const t = document.createElement('textarea');
        t.innerHTML = s;
        return t.value;
      }

      function decodeBase64Utf8(b64) {
        const bin = atob(b64);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder("utf-8").decode(bytes);
      }

      function sanitizeId(id) {
        return id.replace(/[^a-zA-Z0-9\\._-]/g, '_'); // Replace invalid chars with underscore
      }

      /**
       * Normalize raw report HTML for extraction across contexts:
       * - SECWS: decode entity-escaped HTML (&lt;html&gt; → <html>)
       * - sec.gov SGML: keep full <head> and <body>, unwrap <TEXT>…</TEXT> safely
       * - Arelle/plain: pass through unchanged
       */
      function normalizeReportHtml(raw) {
        let src = String(raw || '');

        // If looks entity-escaped (e.g., &lt;html>, &lt;TEXT>, etc.), decode first
        const looksEscaped = /&lt;\\/?(?:html|head|body|TEXT)\\b/i.test(src) || /&lt;[a-z]/i.test(src);
        if (looksEscaped) {
          try { src = decodeHtmlEntities(src); } catch (_) {}
        }

        // If wrapped in SGML <TEXT>…</TEXT>, unwrap while preserving <head>
        const hasSGML = /<TEXT>/i.test(src) && /<\\/TEXT>/i.test(src);
        if (hasSGML) {
          const start = src.search(/<TEXT>/i);
          const end   = src.search(/<\\/TEXT>/i);
          if (start !== -1 && end !== -1 && end > start) {
            src = src.slice(start + '<TEXT>'.length, end);
          }
        }

        return src;
      }

      function ensureShadow() {
        const pane = document.getElementById('reportDiv');
        if (!pane) return null;
        if (!pane.shadowRoot) pane.attachShadow({ mode: 'open' });
        // mirror for any legacy code still reading _shadowRoot
        pane._shadowRoot = pane.shadowRoot;
        // make sure host is visible and not contained
        pane.hidden = false;
        pane.style.display = 'block';
        pane.style.visibility = 'visible';
        pane.style.contain = 'none';
        return pane.shadowRoot;
      }

      function clearShadow() {
        const root = ensureShadow();
        if (root) root.innerHTML = '';
      }

      function renderIntoShadow(bodyHtml, links, inlineStyles, baseDir) {
        const root = ensureShadow();
        if (!root) return;

        // Always clear previous report
        clearShadow();


        // pane fades via .rfv-pending; do not change visibility to avoid header repaint
        const pane = document.getElementById('reportDiv');

        // 1) Inline styles FIRST for immediate styling
        if (Array.isArray(inlineStyles)) {
          for (const css of inlineStyles) {
            if (css) {
              const styleEl = document.createElement('style');
              styleEl.textContent = css;
              root.appendChild(styleEl);
            }
          }
        }

        // 2) Safety constraints (layout)
        const safety = document.createElement('style');
        safety.textContent = \`
          :host { display:block; width:auto; max-width:100%; }
          #rfv-shadow-host { display:block; width:auto; max-width:100%; overflow:visible; }
          table.report { width:auto; max-width:100%; border-collapse: separate; }
          img { max-width:100%; height:auto; }

          /* Unbeatable forced ring (wins against report CSS with !important resets) */
          .rfv-force-focus,
          .rfv-focus-ring {
            outline: 3px solid #005A9C !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 2px #fff inset !important;
          }
          :focus-visible {
            outline: 3px solid #005A9C !important;
            outline-offset: 2px !important;
          }
          \`;
        root.appendChild(safety);

        // 3) Report body
        const container = document.createElement('div');
        container.id = 'rfv-shadow-host';
        container.innerHTML = bodyHtml;        
        container.setAttribute('tabindex', '-1');       // make container focusable
        container.setAttribute('role', 'region');       // semantic region
        container.setAttribute('aria-label', 'All reports content'); // accessible name
        root.appendChild(container);

        // 4) External CSS: fetch-and-prepend, with <link> fallback
        const loadExternalCss = () => {
          if (!Array.isArray(links) || !links.length) return Promise.resolve();
          // some old R files have css includes to include/report.css but there is no include subdirectory
          const absHrefs = links.map(h =>
            h.startsWith('/')                 // absolute → leave unchanged
              ? h
              : h.startsWith('include/')      // legacy relative include/
                ? \`\${baseDir}\${h.slice(8)}\`
                : \`\${baseDir}\${h}\`           // standard relative report.css, etc.
          );

          return Promise.allSettled(
            absHrefs.map(h => fetch(h).then(r => (r.ok ? r.text() : '')))
          ).then(results => {
            const cssText = results
              .filter(r => r.status === 'fulfilled' && r.value)
              .map(r => normalizeReportHtml(r.value))
              .join('\\n');
            const styles = document.createElement('style');
            styles.textContent =
              cssText && cssText.length
                ? cssText
                : absHrefs.map(h => \`@import url("\${h}");\`).join('\\n');
            root.insertBefore(styles, root.firstChild);
          });
        };

        // Resolve after external CSS is ready (if any)
        return loadExternalCss();

      }

      // Cache of styles we've already loaded
      const RFV_LOADED_STYLES = new Set();

      function extractLinksAndBody(fullHtml) {
        const doc = new DOMParser().parseFromString(fullHtml, 'text/html');

        // External CSS links (e.g., <link rel="stylesheet" href="report.css">)
        const links = Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'))
          .map(link => (link.getAttribute('href') || '').trim())
          .filter(Boolean);

        // Inline <style> blocks (Arelle & some SEC variants)
        const inlineStyles = Array.from(doc.querySelectorAll('style'))
          .map(style => style.textContent || '')
          .filter(Boolean);

        // Body HTML
        const bodyHtml = doc.body ? doc.body.innerHTML : fullHtml;

        return { links, inlineStyles, bodyHtml };
      }

      window.loadReport = async function (n, scrollToMainContent=true) {
        const files = window.R_FILES_BY_POS || {};
        const file = files[n];
        const pane = document.getElementById('reportDiv');
        if (!pane) return;

        pane.setAttribute('aria-busy', 'true');
        pane.classList.add('rfv-pending');
        pane.classList.add('rfv-hide-until-styled'); // hide now, before Shadow DOM is touched
        if (window.RFV && RFV.showLoadingOverlay) {
          window.RFV_SPINNER_TIMER = setTimeout(() => {
            if (window.RFV && RFV.showLoadingOverlay)
              RFV.showLoadingOverlay();
          }, 150);
        }

        if (!file) {
          pane.classList.remove('rfv-pending');
          pane.classList.remove('rfv-hide-until-styled');
          pane.removeAttribute('aria-busy');
          return;
        }

        let baseDir = (typeof window.SEC_ALIAS_DIR === 'string' && window.SEC_ALIAS_DIR.length)
          ? window.SEC_ALIAS_DIR.replace(/\\/$/, '')
          : (location.pathname.replace(/\\/[^/]*$/, '/') || '/');`;
      if (!secws) {
        bootstrap += `
        if (!baseDir.endsWith('/')) baseDir += '/';`;
      }
      bootstrap += `
        const rXtoH = (window.TRANSFORMED_HTML_REPORTS || {}); // present only for Xml R files transformed to html by server

        // --- Synthetic "All Reports": render all into shadow, no light-DOM writes ---
        if (file === 'ALL_REPORTS_SYNTHETIC') {
          const keys = Object.keys(files).map(Number).sort((a, b) => a - b);
          clearShadow();
          const root = ensureShadow();

          // SAFETY STYLES (same as single-report path): ensures forced ring + keyboard ring
          const safety = document.createElement('style');
          safety.textContent = \`
            :host { display:block; width:auto; max-width:100%; }
            #rfv-shadow-host { display:block; width:auto; max-width:100%; overflow:visible; }
            table.report { width:auto; max-width:100%; border-collapse: separate; }
            img { max-width:100%; height:auto; }

            /* Unbeatable forced ring (wins against report CSS with !important resets) */
            .rfv-force-focus,
            .rfv-focus-ring {
              outline: 3px solid #005A9C !important;
              outline-offset: 2px !important;
              box-shadow: 0 0 0 2px #fff inset !important;
            }
            /* Keyboard ring inside Shadow DOM (helpful when not forcing) */
            :focus-visible {
              outline: 3px solid #005A9C !important;
              outline-offset: 2px !important;
            }
          \`;
          root.appendChild(safety);

          const container = document.createElement('div');
          container.id = 'rfv-shadow-host';
          container.setAttribute('tabindex', '-1');            // focusable region in Shadow DOM
          container.setAttribute('role', 'region');            // semantics for SRs
          container.setAttribute('aria-label', 'All reports content');
          root.appendChild(container);

          (async function fetchAll(i) {
            if (i >= keys.length) {
              pane.classList.remove('rfv-pending');
              pane.removeAttribute('aria-busy');
              // Clear ARIA status now that all reports have loaded
              if (RFV.announceStatus)
                RFV.announceStatus("");
              if (window.RFV && RFV.hideLoadingOverlay) {
                clearTimeout(window.RFV_SPINNER_TIMER);
                RFV.hideLoadingOverlay();
              }
              requestAnimationFrame(() => {
                if (window.RFV && typeof RFV.focusContentFirst === "function") {
                    RFV.focusContentFirst({ forceVisible: true });
                    setTimeout(() => RFV.focusContentFirst({ forceVisible: true }), 0);
                }
              });
              __rfvRevealWhenFirstReportDone();
              return;
            }
            const k = keys[i], f2 = files[k];
            if (f2 === 'ALL_REPORTS_SYNTHETIC') return fetchAll(i + 1);

            try {
              let rHtml;
              if (rXtoH && typeof rXtoH[k] === 'string' && rXtoH[k].length) {
                rHtml = decodeBase64Utf8(rXtoH[k]); // use server-transformed HTML
              } else {
                const url = \`\${baseDir}\${f2}\`;
                const rawHtml = await fetch(url).then(r => r.text());
                rHtml = normalizeReportHtml(rawHtml);
              }
              ({ links, inlineStyles, bodyHtml } = extractLinksAndBody(rHtml));
              const bodyHtmlImgsFixed = rewriteRelativeImgSrcsAndIdsInHtml(bodyHtml, baseDir);

              // Immediately style this section with its inline <style> blocks
              if (inlineStyles && inlineStyles.length) {
                const inline = document.createElement('style');
                inline.textContent = inlineStyles.join('\\n');
                root.insertBefore(inline, root.firstChild);
              }

              const section = document.createElement('section');
              section.innerHTML = bodyHtmlImgsFixed;
              container.appendChild(section);
              if (i < keys.length - 2) // horiz rule after all but last report
                container.appendChild(document.createElement('hr'));

              // External CSS for the section
              if (links && links.length) {
                const abs = links.map(h => 
                    h.startsWith('/')                 // absolute → leave unchanged
                      ? h
                      : h.startsWith('include/')      // legacy relative include/
                        ? \`\${baseDir}\${h.slice(8)}\`
                        : \`\${baseDir}\${h}\`           // standard relative report.css, etc.
                );
                Promise.allSettled(abs.map(h => fetch(h).then(r => r.ok ? r.text() : ''))).then(res => {
                  const cssText = res.filter(r => r.status === 'fulfilled' && r.value)
                                    .map(r => normalizeReportHtml(r.value)).join('\\n');
                  if (cssText) {
                    const styleEl = document.createElement('style');
                    styleEl.textContent = cssText;
                    root.insertBefore(styleEl, root.firstChild); // prepend at root for cascade
                  } else {
                    // Fallback: load external CSS via @import inside a <style> (works in ShadowRoot)
                    const importStyle = document.createElement('style');
                    importStyle.textContent = \`@import url("\${abs[0]}");\`;
                    root.insertBefore(importStyle, root.firstChild);
                  }
                  pane.classList.remove('rfv-hide-until-styled');

                });
              }
            } catch (e) {
              const err = document.createElement('div');
              err.setAttribute('role', 'alert');
              err.style.color = 'red';
              err.textContent = \`Failed to load \${url}\`;
              container.appendChild(err);
            }
            fetchAll(i + 1);
          })(0);

          return; // done
        }

        // --- Single report: render shadow first, then css ---

        try {
          // rXtoH: map of Base64-encoded HTML for transformed XML reports, e.g. window.TRANSFORMED_HTML_REPORTS_BASE64
          // files: map of position -> filename (e.g. R1.htm or R2.xml)
          // n: position (number), file: files[n], baseDir: previously computed

          let rHtml;                      // unified HTML string, regardless of source
          let links = [];                 // collect <link rel="stylesheet"> hrefs
          let inlineStyles = [];          // collect inline <style> blocks
          let bodyHtml = '';              // extracted body innerHTML

          // 1) Resolve HTML: prefer server-transformed XML (Base64), otherwise fetch .htm
          const isServerTransformed = !!(rXtoH && typeof rXtoH[n] === 'string' && rXtoH[n].length);
          if (isServerTransformed) {
            // Decode UTF‑8 Base64 safely to avoid mojibake
            rHtml = decodeBase64Utf8(rXtoH[n]);
          } else {
            const url = \`\${baseDir}\${file}\`;
            const rawHtml = await fetch(url).then(r => r.text());
            rHtml = normalizeReportHtml(rawHtml); // unwrap SGML <TEXT>…</TEXT> etc.
          }

          // 2) Extract CSS links, inline styles, and body HTML
          ({ links, inlineStyles, bodyHtml } = extractLinksAndBody(rHtml));

          // 3) Pre‑rewrite relative <img src> BEFORE insertion to prevent early 404s
          const bodyHtmlImgsFixed = rewriteRelativeImgSrcsAndIdsInHtml(bodyHtml, baseDir);

          // 4) Single-report render into ShadowRoot (uniform for XML and HTM)
          await renderIntoShadow(bodyHtmlImgsFixed, links, inlineStyles, baseDir);

          // CSS is applied; reveal pane and clear pending state
          pane.classList.remove('rfv-hide-until-styled');
          pane.classList.remove('rfv-pending');
          pane.removeAttribute('aria-busy');
        } catch (e) {
          pane.innerHTML = '<div role="alert" style="color:red;">Failed to load report.</div>';

          // Ensure we still clear pending on error
          pane.classList.remove('rfv-hide-until-styled');
          pane.classList.remove('rfv-pending');
          pane.removeAttribute('aria-busy');
        } finally {
          pane.classList.remove('rfv-pending');
          pane.removeAttribute('aria-busy');

          const byMouse = !!window.RFV_FORCE_VISIBLE_ON_OPEN;

          // Only scroll when it was mouse‑initiated AND caller asked to scroll
          if (scrollToMainContent && byMouse) {
            window.scrollTo(0,0);   // Prior PERL behavior, or scrollMainContentToTop(); to scroll to top of content area
          }

          // Move focus into content; force visible ring only if opening was mouse-initiated
          const forceVisible = !!window.RFV_FORCE_VISIBLE_ON_OPEN;
          window.RFV_FORCE_VISIBLE_ON_OPEN = false;

          if (window.RFV && typeof RFV.focusContentFirst === 'function') {
            RFV.focusContentFirst({ forceVisible });
          }

          // Clear ARIA status once single report finishes loading
          if (RFV.announceStatus)
            RFV.announceStatus("");
          if (window.RFV && RFV.hideLoadingOverlay) {
            clearTimeout(window.RFV_SPINNER_TIMER);
            RFV.hideLoadingOverlay();
          }
          __rfvRevealWhenFirstReportDone();
        }
        return; // done

      };


      // Page readiness toggles to prevent FOUC
      function __rfvSetReady() {
        const doc = document.documentElement;
        doc.classList.remove('rfv-loading');
        doc.classList.add('rfv-ready');
      }

      function __rfvRevealWhenFirstReportDone() {
        // called after report has rendered and external CSS (if any) is processed
        __rfvSetReady();
      }

      // --- XML detection & transformation helpers ---

      function looksXmlContent(txt) {
        const s = String(txt || '').trim();
        // conservative sniff: XML declaration OR presence of '<xbrl' or '<Report' without '<html'
        return /^<\\?xml/i.test(s) || (/<xbrl\\b/i.test(s) || /<Report\\b/i.test(s)) && !/<html\\b/i.test(s);
      }

      function isXmlFileName(name) {
        return typeof name === 'string' && /\.xml$/i.test(name);
      }

      async function fetchXslt(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error('XSLT fetch failed');
        return await r.text();
      }

      function parseXml(text) {
        return new DOMParser().parseFromString(text, 'text/xml');
      }

      // Port of legacy fixSrcAttr, adapted to ShadowRoot
      function fixImageSrcsInside(root, baseDir) {
        const imgs = root.querySelectorAll('img[src]');
        imgs.forEach(img => {
          const src = (img.getAttribute('src') || '').trim();
          if (!src || src.startsWith('data:')) return;
          if (src.startsWith('https://s3.amazonaws.com/')) return;
          // Take basename and prefix with baseDir
          const idx = src.lastIndexOf('/');
          const basename = idx >= 0 ? src.slice(idx + 1) : src;
          img.setAttribute('src', \`\${baseDir}\${basename}\`);
        });
      }

      // Port of FixNotesForGeckoWebkit
      function fixNotesForGeckoWebkit(container) {
        const tables = container.querySelectorAll('table');
        tables.forEach(t => {
          const cells = t.querySelectorAll('td.text');
          cells.forEach(td => {
            // If the cell is basically text that looks like HTML, turn it into HTML
            if (!td.querySelector('*')) {
              const text = td.textContent || '';
              if (/<\\/?[a-zA-Z]\\w*[^>]*>/.test(text)) {
                td.innerHTML = text;
              }
            }
          });
        });
      }

      function rewriteRelativeImgSrcsAndIdsInHtml(html, baseDir) {
        // Parse as HTML so we can adjust <img src> and ids before insertion
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // 1. Fix up the src path (existing behavior)
        doc.querySelectorAll('img[src]').forEach(img => {
          const src = (img.getAttribute('src') || '').trim();

          // Leave already-absolute or data URLs untouched
          if (!src || src.startsWith('data:') || /^https?:\\/\\//i.test(src) || src.startsWith('/')) return;

          // Preserve existing "include/" behavior if needed:
          // (old filings may have "include/report.css" for CSS; for images it is typically filename only)
          // For images that include a path, fold to basename:
          const idx = src.lastIndexOf('/');
          const basename = idx >= 0 ? src.slice(idx + 1) : src;

          // Rewrite to filing directory
          img.setAttribute('src', \`\${baseDir}\${basename}\`);

          // 2. Evaluate accessibility attributes
          const alt = (img.getAttribute('alt') || '').trim();
          const ariaLabel    = (img.getAttribute('aria-label') || '').trim();
          const ariaLabelled = (img.getAttribute('aria-labelledby') || '').trim();
          const title        = (img.getAttribute('title') || '').trim();

          // 3. Determine if this image is "non-informative" per accessibility rules
          const hasUsefulAlt =
            alt.length > 0 &&
            !/^(image|img|graphic|photo|picture)$/i.test(alt); // ignores meaningless alt values

          const hasAria = ariaLabel.length > 0 || ariaLabelled.length > 0;

          const hasTextAlternative =
            hasUsefulAlt ||
            hasAria ||
            title.length > 0;

          // 4. If *no* text alternative, treat as decorative
          if (!hasTextAlternative) {
            img.setAttribute('role', 'presentation');
            // Optionally ensure empty alt to comply with WCAG:
            if (!alt) img.setAttribute('alt', '');
          }
        });
        // 5. fix up table ids        
        doc.querySelectorAll('table[id]').forEach(table => {
          table.id = sanitizeId(table.id); // Implement sanitizeId as needed
        });
        

        // Return the body’s innerHTML to feed into ShadowRoot
        return doc.body ? doc.body.innerHTML : html;
      }

      // ---- R File Viewer (RFV) namespaced helpers ----
      // Accessible accordion + selection behavior, centralized here to avoid external includes.
      (function (win) {
        const RFV = win.RFV || (win.RFV = {});

        // Initialize the accordion menu (buttons with aria-expanded/aria-controls).
        RFV.initMenu = function () {
          const $menu = $('#menu');
          if (!$menu.length) return;

          // Hide panels and ensure ARIA state
          $menu.find('ul[data-accordion-panel]').each(function () {
            const $panel = $(this);
            if (!$panel.attr('id')) return;
            $panel.attr('hidden', true);
          });

          // Toggle (mouse)
          $menu.off('click.rfv').on('click.rfv', '.accordion-toggle', function () {
            const $btn = $(this);
            const panelId = $btn.attr('aria-controls');
            if (!panelId) return;
            const $panel = $('#' + panelId);
            const expanded = $btn.attr('aria-expanded') === 'true';
            $btn.attr('aria-expanded', String(!expanded));
            $panel.attr('hidden', expanded);
          });

          $menu.off('click.rfv.report').on('click.rfv.report', '.rf_viewer, .ix_viewer, .all_reports, .rendering_logs', function (e) {
            const $items = $menu.find('.rf_viewer, .ix_viewer, .all_reports, .rendering_logs');
            $items.removeClass('is-selected').attr('aria-current', null);
            $(this).addClass('is-selected').attr('aria-current', 'page');

            // Detect input modality: keyboard-triggered clicks (Enter/Space) vs mouse
            const byKeyboard = !!(e && e.originalEvent && (e.originalEvent instanceof KeyboardEvent));
            window.RFV_FORCE_VISIBLE_ON_OPEN = !byKeyboard; // true for mouse, false for keyboard

            // If this is an All Reports / Logs button, call the appropriate handler;
            // otherwise call loadReport() with its position.
            // If user clicked "All Reports", announce loading
            if (this.classList.contains('all_reports')) {
              if (window.RFV && RFV.announceStatus)
                RFV.announceStatus("Loading all reports… this may take several seconds.");
            }
          });

          // Keyboard support
          $menu.off('keydown.rfv').on('keydown.rfv', '.accordion-toggle', function (e) {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              $(this).trigger('click');
            }
          });

          // Auto-open first category on load
          const $firstToggle = $menu.find('.accordion-toggle').first();
          if ($firstToggle.length) {
            $firstToggle.attr('aria-expanded', 'true');
            const panelId = $firstToggle.attr('aria-controls');
            $('#' + panelId).attr('hidden', false);
          }
        };

        // Single, canonical highlight
        RFV.highlight = function (el) {
          const parent = document.getElementById('menu');
          if (!parent) return;
          const items = parent.querySelectorAll('.rf_viewer, .ix_viewer, .all_reports, .rendering_logs');
          items.forEach(function (node) {
            node.classList.remove('is-selected');
            node.removeAttribute('aria-current');
          });
          el.classList.add('is-selected');
          el.setAttribute('aria-current', 'page');
        };

        RFV.announceStatus = function (msg) {
          const el = document.getElementById('rfv-status');
          if (el) el.textContent = msg;
        };
        
        RFV.focusContentFirst = function (opts = {}) {
          const { forceVisible = false } = opts;
          const pane = document.getElementById('reportDiv');
          if (!pane) return;

          const sr = pane.shadowRoot || pane._shadowRoot || null;
          const CANDIDATE_A_ELTS = 'button, [role="button"], a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

          let target = null;
          if (sr) {
            // step 1: query all focusable elements
            let focusables = [...sr.querySelectorAll(CANDIDATE_A_ELTS)];

            // step 2: filter by onclick containing "showAR"
            focusables = focusables.filter(el => {
              // onclick as attribute
              const onclickAttr = el.getAttribute('onclick') || '';
              if (onclickAttr.includes('showAR')) return true;

              // onclick as DOM property (JS-bound handlers)
              const onclickProp = el.onclick ? el.onclick.toString() : '';
              if (onclickProp.includes('showAR')) return true;

              return false;
            });
            // focus on the first matching one
            target = focusables[0];
          }
          
          if (!target && sr) {
            // 2) Shadow DOM fallback: the content container itself
            target = sr.getElementById('rfv-shadow-host');
            if (target && !target.hasAttribute('tabindex')) {
              target.setAttribute('tabindex', '-1');
            }
          }
          if (!target) {
            // 3) Light DOM fallback *only* if Shadow DOM isn’t available (rare)
            target = pane;
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          }

          if (target) {
            try {
              target.focus({ preventScroll: false });

              // If we want a visible ring for mouse users, add the temporary class.
              if (forceVisible) {
                target.classList.add('rfv-force-focus');
                // Remove the forced ring once the element loses focus.
                const cleanup = () => {
                  target.classList.remove('rfv-force-focus');
                  target.removeEventListener('blur', cleanup, true);
                };
                target.addEventListener('blur', cleanup, true);
              }
            } catch (_) {}
          }
        };

        RFV.showLoadingOverlay = function () {
          if (document.getElementById('rfv-loading-overlay')) return;
          const pane = document.getElementById('reportDiv');
          if (!pane) return;

          // Create overlay INSIDE the report pane
          const overlay = document.createElement('div');
          overlay.id = 'rfv-loading-overlay';
          overlay.className = 'rfv-loading-overlay';
          overlay.setAttribute('aria-hidden', 'true');
          overlay.innerHTML = '<div class="rfv-spinner" aria-hidden="true"></div>';

          // Ensure the pane defines a positioning context
          if (getComputedStyle(pane).position === 'static') {
            pane.style.position = 'relative';
          }
          pane.appendChild(overlay);
        };

        RFV.hideLoadingOverlay = function () {
          const overlay = document.getElementById('rfv-loading-overlay');
          if (overlay) overlay.remove();
        };

        // Publish Show into RFV namespace and as legacy global for backwards compatibility
        RFV.Show = win.Show = {
          lastAR: null,

          /**
           * Reveal a definition/reference popup:
           * 1) Find the next sibling panel OR
           * 2) Clone '#r' and insert just after 'a'.
           * Ensures visibility with 'hidden=false' and removes any 'display:none'.
           * Adds ARIA semantics, moves focus optionally.
           */
          showAR(a, r, w, opts = {}) {
            const {
              focus = true,
              label = 'Definition',
              selector = 'TABLE, DIV[data-def-panel], DIV.rfv-popup'
            } = opts;

            // Determine the host/root where the trigger lives
            const isShadow = !!a.getRootNode && a.getRootNode() instanceof ShadowRoot;
            const rootNode = isShadow ? a.getRootNode() : document;

            // Hide any previously shown panel
            if (Show.lastAR) Show.hideAR();

            // 1) Try to find an existing sibling panel within the same tree
            let panel = (function findNext(node, selector) {
              let e = node && node.nextSibling;
              while (e) {
                if (e.nodeType === Node.ELEMENT_NODE && e.matches && e.matches(selector)) return e;
                e = e.nextSibling;
              }
              return null;
            })(a, selector);

            // 2) Fallback: find referenced panel by id *inside the same tree* and clone it
            if (!panel && r) {
              let ref = null;
              const sanR = sanitizeId(r);
              try {
                if (isShadow) {
                  ref = rootNode.querySelector('#' + sanR);                // ShadowRoot lookup
                } else {
                  ref = rootNode.getElementById ? rootNode.getElementById(sanR) : document.getElementById(sanR);
                }
              } catch (e) {
                //console.log(\`showAR ID not found: \${r}\`);
                //console.log(\`sanitized ID not found: \${sanR}\`);
              }
              if (ref) {
                panel = ref.cloneNode(true);
                panel.removeAttribute('id');
                panel.classList.add('rfv-popup');
                // Insert the clone *after* the trigger, inside the same tree
                a.parentNode.insertBefore(panel, a.nextSibling);

                // Ensure popup CSS exists inside ShadowRoot if needed
                if (isShadow) {
                  const hasPopupCss = !!rootNode.querySelector('style[data-rfv-popup]');
                  if (!hasPopupCss) {
                    const styleEl = document.createElement('style');
                    styleEl.setAttribute('data-rfv-popup', 'true');
                    styleEl.textContent = \`
                      .rfv-popup {
                        background-color: #def;
                        border: 2px solid #2F4497;
                        border-radius: 4px;
                        padding: 0;
                        margin: 0;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        z-index: 1000;
                      }
                      .rfv-popup [aria-expanded="false"]::before { content: "+ "; }
                      .rfv-popup [aria-expanded="true"]::before  { content: "- "; }
                      .rfv-popup[hidden] { display: none !important; }
                    \`;
                    rootNode.appendChild(styleEl);
                  }
                }
              } else {
                console.log(\`showAR reference not found: \${r}\`);
              }
            }

            if (!panel) return;

            // Normalize AR labels (+/-)
            panel.querySelectorAll('a, button').forEach(el => {
              if (el.textContent && /^[+-]\\s*/.test(el.textContent)) {
                el.textContent = el.textContent.replace(/^[+-]\\s*/, '');
              }
            });

            // Initialize expanders for toggleNext
            panel.querySelectorAll('a[onclick*="toggleNext"], button[onclick*="toggleNext"]').forEach(el => {
              const controlled = (function findNextOfType(node, tagName) {
                let e = node && node.nextSibling;
                while (e) {
                  if (e.nodeType === Node.ELEMENT_NODE && e.nodeName === tagName) return e;
                  e = e.nextSibling;
                }
                return null;
              })(el, "DIV");
              if (controlled) {
                if (!controlled.id) controlled.id = (function genId(prefix = 'rfv-panel') {
                  const s = Date.now().toString(36);
                  return \`\${prefix}-\${s}-\${Math.floor(Math.random()*1e6)}\`;
                })();
                el.setAttribute('role', 'button');
                el.setAttribute('aria-controls', controlled.id);
                const isHidden = controlled.hidden || controlled.style.display === 'none';
                el.setAttribute('aria-expanded', String(!isHidden));
              }
            });

            // ARIA + visibility
            panel.hidden = false;
            panel.style.display = '';
            panel.style.visibility = 'visible';
            panel.setAttribute('role', panel.getAttribute('role') || 'region');
            panel.setAttribute('aria-label', panel.getAttribute('aria-label') || label);
            panel.setAttribute('aria-hidden', 'false');
            if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
            if (!panel.hasAttribute('aria-live')) panel.setAttribute('aria-live', 'polite');

            // Link trigger ↔ panel
            if (!panel.id) panel.id = (function genId(prefix = 'rfv-def') {
              const s = Date.now().toString(36);
              return \`\${prefix}-\${s}-\${Math.floor(Math.random()*1e6)}\`;
            })();
            a.setAttribute('aria-controls', panel.id);
            a.setAttribute('aria-expanded', 'true');
            a.setAttribute('aria-describedby', panel.id);

            // Focus and remember
            if (focus) {
              try {
                if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
                panel.focus({ preventScroll: false });
              } catch (_) {}
            }
            Show.lastAR = panel;
            Show.lastTrigger = a;

            // ESC-to-dismiss popup (Shadow DOM–safe, removes listener)
            const whichRoot = (rootNode && typeof rootNode.addEventListener === 'function') ? rootNode : document;

            const escHandler = (e) => {
              if (e.key !== 'Escape') return;

              // Only dismiss if ESC originated from within the same tree/panel
              const path = e.composedPath ? e.composedPath() : [];
              const insidePanel = path.includes(panel) || (panel.contains && panel.contains(path[0]));

              if (!insidePanel) return;

              // Restore focus to trigger (accessibility)
              try { Show.lastTrigger && Show.lastTrigger.focus({ preventScroll: true }); } catch {}

              // Hide/remove the popup
              if (panel && panel.parentNode) {
                panel.parentNode.removeChild(panel);
              }

              // Cleanup listener and state
              whichRoot.removeEventListener('keydown', escHandler, true);
              Show.lastAR = null;
              Show.lastTrigger = null;

              e.stopPropagation();
              e.preventDefault();
            }
            // Register the listener in the *same tree* as the popup
            whichRoot.addEventListener('keydown', escHandler, true);

            // Store it on the panel so hideAR() can detach later
            panel.__rfvEscHandler = escHandler;
          },

          /** Hide last panel and update ARIA */
          hideAR() {
            const panel = Show.lastAR;
            if (!panel) return;

            // Determine the correct active element (Shadow DOM vs Document)
            let active = null;
            const root = (panel.getRootNode && panel.getRootNode() instanceof ShadowRoot)
              ? panel.getRootNode()
              : document;

            try {
              active = root.activeElement || document.activeElement;
            } catch (_) {
              active = document.activeElement;
            }

            // If focus is inside panel, move it away
            if (active && panel.contains(active)) {
              const fallback =
                Show.lastTrigger ||
                document.getElementById('main-content') ||
                panel.parentElement;

              if (fallback && typeof fallback.focus === 'function') {
                try { fallback.focus({ preventScroll: true }); } catch (_) {}
              }
            }

            // --- Clean up the ESC listener installed in showAR() ---
            if (panel.__rfvEscHandler) {
              try {
                const trigger = Show.lastTrigger;
                let escRoot = null;

                if (trigger && trigger.getRootNode && trigger.getRootNode() instanceof ShadowRoot) {
                  escRoot = trigger.getRootNode();
                } else if (panel.getRootNode && panel.getRootNode() instanceof ShadowRoot) {
                  escRoot = panel.getRootNode();
                } else {
                  escRoot = document;
                }

                escRoot.removeEventListener('keydown', panel.__rfvEscHandler, true);
              } catch (_) {}

              delete panel.__rfvEscHandler;
            }


            // REMOVE PANEL ENTIRELY (instead of hiding it) ---
            if (panel && panel.parentNode) {
                panel.parentNode.removeChild(panel);
            }

            // Reflect collapsed state on the trigger
            if (Show.lastTrigger) {
              try {
                Show.lastTrigger.setAttribute('aria-expanded', 'false');
                Show.lastTrigger.removeAttribute('aria-describedby');
              } catch (_) {}
            }

            // Reset state
            Show.lastAR = null;
            Show.lastTrigger = null;
          },

          /**
           * Toggle the next DIV after 'a'.
           * Keeps 'aria-expanded' in sync; uses 'hidden' for visibility.
           */
          toggleNext(a, opts = {}) {
            const {
              labelExpanded = null,
              labelCollapsed = null,
              focus = false,
              selector = 'DIV' // default panel tag
            } = opts;

            const panel = findNextMatching(a, selector);
            if (!panel) return;

            normalizeTriggerAndPanel(a, panel);

            const wasHidden = panel.hidden || panel.style.display === 'none';
            // If collapsing and the panel contains focus, return focus to the trigger
            if (!wasHidden /* about to collapse */) {
              const active = document.activeElement;
              if (panel.contains(active)) {
                try { a.focus(); } catch (_) { /* ignore */ }
              }
            }
            panel.hidden = !wasHidden;
            panel.style.display = ''; // clear legacy displays
            a.setAttribute('aria-expanded', String(wasHidden));
            panel.setAttribute('aria-hidden', String(!wasHidden));

            // If expanded, remove inert; if collapsed, add inert
            try {
              if (wasHidden) panel.removeAttribute('inert');  // expanded
              else           panel.setAttribute('inert', ''); // collapsed
            } catch (_) { /* ignore */ }

            if (labelExpanded && labelCollapsed) {
              a.setAttribute('aria-label', wasHidden ? labelExpanded : labelCollapsed);
            }
            if (focus && wasHidden) safeFocus(panel);
          },
        };

        // ------- helpers ----------
        function findNextMatching(node, selector) {
          let e = node && node.nextSibling;
          while (e) {
            if (e.nodeType === Node.ELEMENT_NODE && e.matches && e.matches(selector)) return e;
            e = e.nextSibling;
          }
          return null;
        }

        // Find the next sibling element with a specific tag name (e.g., "DIV", "TABLE")
        function findNextOfType(node, tagName) {
          let e = node && node.nextSibling;
          while (e) {
            if (e.nodeType === Node.ELEMENT_NODE && e.nodeName === tagName) return e;
            e = e.nextSibling;
          }
          return null;
        }

        function insertAfter(newNode, referenceNode) {
          referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }
        function normalizeTriggerAndPanel(trigger, panel) {
          if (!panel.id) panel.id = generateId('rfv-panel');
          if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
          panel.setAttribute('aria-hidden', String(panel.hidden));
          if (trigger.tagName !== 'BUTTON') trigger.setAttribute('role', 'button');
          trigger.setAttribute('aria-controls', panel.id);
          if (!trigger.hasAttribute('aria-expanded')) {
            const expanded = !(panel.hidden || panel.style.display === 'none');
            trigger.setAttribute('aria-expanded', String(expanded));
          }
        }
        function safeFocus(el) {
          try {
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
            el.focus({ preventScroll: false });
          } catch (_) {}
        }
        let __id = 0;
        function generateId(prefix = 'rfv') {
          __id += 1;
          return \`\${prefix}-\${Date.now().toString(36)}-\${__id}\`;
        }
        // Escape id for querySelector
        function cssEscape(id) {
          return (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/([ #.;?+*~\\':"!^\$[\\]()=>|\\/@])/g, '\\\\$1');
        }

        // Initialize after DOM ready (menu exists in assembled HTML)
        $(function () {
          RFV.initMenu();
        });
      })(window);

      // Legacy shim so existing onclick="highlight(this)" still works
      window.highlight = function (el) { window.RFV && window.RFV.highlight(el); };

      var isRedline = (location.href.indexOf("&redline=true") >= 0 || location.href.indexOf("?redline=true") >= 0);
      function applyRedline(url) { return isRedline ? (url + "&redline=true") : url; }
`;
    if (secws){
      bootstrap += `
      function ix_viewer_url(report_file) {
        // provide URL to initiate inline XBRL viewer for report_file.  Note SECWS does not expect any escaping in query parameters
        return applyRedline(\`ixviewer-plus/ix.xhtml?doc=../DisplayDocument.do?step=docOnly&accessionNumber=${accessionNumber}&interpretedFormat=true&redline=false&filename=\${report_file}&xbrl=true&metalinks=../DisplayDocument.do?step=docOnly&accessionNumber=${accessionNumber}&interpretedFormat=true&redline=false&filename=MetaLinks.json\`);
      }`;
    } else { // not SECWS
      bootstrap += `
      var url_filing_dir = (window.SEC_ALIAS_DIR || (location.pathname.replace(/\\/[^/]*$/, '/') || '/'))
            .replace(/\\/\$/,'');  // remove any trailing '/' for ix_viewer_url
      function ix_viewer_url(report_file) {
        // provide URL to initiate inline XBRL viewer for report_file
        return applyRedline(\`/ix?doc=\${url_filing_dir}/\${report_file}&xbrl=true\`);
      }`;
    }
    bootstrap += `

      // Auto-load the first report if available (SEC site behavior)
      (function () {
        var n = ${firstPos !== null ? firstPos : 'null'};
        if (typeof n === 'number') {
          try { window.loadReport(n, scrollToMainContent=false); } catch (e) { /* ignore */ }
        } else {
          __rfvSetReady(); // make visible anyway, to show any error messages
        }
      }());

      requestAnimationFrame(() => {
        setTimeout(() => {
          const btn = document.getElementById(\`menu_r${firstPos}\`);
          if (btn) {
            btn.classList.add('is-selected');
            btn.setAttribute('aria-current', 'page');
          }
        }, 200); // wait until first report is drawn to highlight initial button
      });

      // --- Enhanced Keyboard Shortcuts for Pane Navigation (WCAG-compliant) ---
      (function () {
        const MENU_EL = document.getElementById('menu');
        const CONTENT_EL = document.getElementById('reportDiv');

        // Candidate elements that can be focusable
        const CANDIDATE_SEL = 'button, [role="button"], a[href], input, select, textarea, [tabindex]';

        function isFocusable(el) {
          if (!el) return false;
          // Not focusable when disabled
          if (el.hasAttribute('disabled')) return false;
          // Respect aria-hidden
          if (el.getAttribute('aria-hidden') === 'true') return false;
          // Skip tabindex="-1"
          const ti = el.getAttribute('tabindex');
          if (ti !== null && Number(ti) < 0) return false;
          // Links must have href
          if (el.tagName.toLowerCase() === 'a' && !el.hasAttribute('href')) return false;
          // Must be visible (rough check)
          const styles = window.getComputedStyle(el);
          if (styles.visibility === 'hidden' || styles.display === 'none') return false;
          // If not fixed, ensure it has layout rects
          const rects = el.getClientRects();
          if (!rects || rects.length === 0) {
            const pos = styles.position;
            if (pos !== 'fixed') return false;
          }
          return true;
        }

        // Find the first focusable descendant in a given root (Element, DocumentFragment, ShadowRoot)
        function firstFocusable(root) {
          if (!root) return null;
          try {
            const list = root.querySelectorAll(CANDIDATE_SEL);
            for (const el of list) {
              if (isFocusable(el)) return el;
            }
          } catch (_) { /* ignore */ }
          return null;
        }

        function pickMenuTarget(menu) {
          if (!menu) return null;
          // Prefer currently selected entry
          const selected = menu.querySelector('.is-selected');
          if (selected && isFocusable(selected)) return selected;
          // Else first focusable in the menu
          return firstFocusable(menu);
        }

        function pickContentTarget(pane) {
          if (!pane) return null;
          // 1) Shadow DOM first
          const sr = pane.shadowRoot || pane._shadowRoot || null;
          const shadowTarget = sr ? firstFocusable(sr) : null;
          if (shadowTarget) return shadowTarget;

          // 2) Light DOM fallback
          const lightTarget = firstFocusable(pane);
          if (lightTarget) return lightTarget;

          // 3) Region fallback (ensure pane can receive focus)
          if (!pane.hasAttribute('tabindex')) pane.setAttribute('tabindex', '-1');
          return pane;
        }

        function safeFocus(el) {
          if (!el) return;
          try { el.focus({ preventScroll: false }); } catch (_) { /* ignore */ }
        }

        function announce(msg) {
          const status = document.getElementById('rfv-status');
          if (status) status.textContent = msg || '';
        }

        document.addEventListener('keydown', function (e) {
          // Alt+M, Alt+Left → menu
          if (e.altKey && (e.key === 'm' || e.key === 'M' || e.key === 'ArrowLeft')) {
            e.preventDefault();
            safeFocus(pickMenuTarget(MENU_EL));
            
            return;
          }
          // Alt+C, Alt+Right → content (first actionable)
          if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'ArrowRight')) {
            e.preventDefault();
            safeFocus(pickContentTarget(CONTENT_EL));
            announce('Moved to report content');
            return;
          }
          // A simple overlay (or inline help at the top) that appears with Alt+/ (or Alt+?) to reduce user questions.
          if (e.altKey && (e.key === '/' || e.key === '?')) {
            e.preventDefault();
            alert(
              'Keyboard shortcuts:\\n' +
              'Alt+M / Alt+←  → Menu (selected item or first actionable)\\n' +
              'Alt+C / Alt+→  → Report content (first actionable element)\\n' +
              'Tab / Shift+Tab → Normal navigation in DOM order\\n' +
              'Esc → Close definition pop‑ups'
            );
            return;
          }

        });

      })();

      </script>
  `;

  return `<!DOCTYPE html>
<html lang="en">
  <head>${head}</head>
  <body style="margin: 0" onload="document.documentElement.classList.add('rfv-loading')">
    ${heading}
    ${errorsHtml}
    ${table}
    ${footer}
    ${bootstrap}
  </body>
</html>`;
}