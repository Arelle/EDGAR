import "../styles.scss";
import { Constants } from "./constants/constants";
import { Errors } from "./errors/errors";
import { ErrorsMajor } from "./errors/major";
import { Listeners } from "./listeners";
import { SetCustomCSS } from "./settings";
import { App } from "./app/app";
import { addToJsPerfTable } from "./helpers/ixPerformance";
import { HelpersUrl } from "./helpers/url";
import { FactMap } from "./facts/map";
import { initSearch } from "./flex-search/search-worker-interface";

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

    App.init(false).then((formLoaded) => {
        if (formLoaded) {
            console.log(`Version: ${Constants.version} (${Constants.featureSet})`);
            console.log(`CSS Mode: ${(document.compatMode == "CSS1Compat" ? "Standards 🎉" : "Quirks 😢")}`);

            Errors.updateMainContainerHeight(false);
            App.initialSetup();
            removeHideClassFromSidebars();

            HelpersUrl.addHashChangeListener();
            HelpersUrl.handleHash();

            initSearch(FactMap.map)

            if (DEBUGCSS) {
                ErrorsMajor.debug();
            }
            if (LOGPERFORMANCE || Constants.logPerfParam ) {
                const endPerformance = performance.now();
                addToJsPerfTable('AppInit.init()', Constants.appStart, endPerformance);
            }
        } else {
            ErrorsMajor.formNotLoaded();
        }
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
