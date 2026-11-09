import "../styles/styles.scss";
import { Constants } from "./constants/constants";
import { ErrorsMajor } from "./errors/major";
import { Listeners } from "./listeners";
import { SetCustomCSS } from "./settings";
import { App } from "./app/app";
import { addToJsPerfTable } from "./helpers/ixPerformance";
import { HelpersUrl } from "./helpers/url";
import { setAppReady } from "./app/loading-progress";
import { FactsMenu } from "./facts/menu";

/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

(() => {
    // Get start time to compare when other load stages finish
    const appStartPerformance = performance.now();
    Constants.appStart = appStartPerformance;

    let params = new URLSearchParams(document.location.search);
    Constants.logPerfParam = !!params.get('logPerf');
    
    new Listeners();
    new SetCustomCSS();

    /**
     * Description
     * @param {any} false
     * @returns {any(
     *  formLoaded = succfully loaded full app
     *  docsOnly = lite mode, loading only html if filing is too big and likely to crash browser for want of memory
     * )}
     */
    App.init(false).then((formLoaded) => {
        console.log(`Version: ${Constants.version} (${Constants.featureSet})`);
        console.log(`CSS Mode: ${(document.compatMode == "CSS1Compat" ? "Standards 🎉" : "Quirks 😢")}`);
        const liteMode = Constants.sumOfDocsSizes > Constants.docSizeFallbackLimit;
        if (formLoaded && !liteMode) {
            App.initialSetup();
            removeHideClassFromSidebars();

            HelpersUrl.addHashChangeListener();
            HelpersUrl.handleHash();

            FactsMenu.applySavedView()

            if (DEBUGCSS) {
                ErrorsMajor.debug();
            }
            if (LOGPERFORMANCE || Constants.logPerfParam ) {
                const endPerformance = performance.now();
                addToJsPerfTable('AppInit.init()', Constants.appStart, endPerformance);
            }
        } else {
            if (liteMode) {
                console.info('IX Viewer in lite mode due to doc size')
            } else {
                ErrorsMajor.formNotLoaded();
            }
        }
        setAppReady();
    });

    const removeHideClassFromSidebars = () => {
        // fact and sections sidebars must be in DOM to be populated, but we want visibility-none during load.
        document.querySelector('.sidebar-container-right')?.classList.remove('hide'); // Facts Sidebar
        document.querySelector('.help-sidebar')?.classList.remove('hide');
        document.querySelector('.sections-sidebar')?.classList.remove('hide');
        document.getElementById('sections-menu')?.classList.remove('show');
        document.getElementById('facts-menu')?.classList.remove('show');
    };
})();
