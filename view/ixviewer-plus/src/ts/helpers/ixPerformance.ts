/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Constants } from "../constants/constants";

export const addToJsPerfTable = (perfMetric: string, modStart: number, modEnd: number, fromInit = false) => {
    const elapsedTime = Number((modEnd - (fromInit ? Constants.appStart : Constants.loadPhaseComplete)).toFixed(0));
    const moduleTime = Number((modEnd - modStart).toFixed(0));
    Constants.perfTableJs.push({perfMetric, moduleTime, elapsedTime});
    if (perfMetric.includes('initSearch')) {
        // print performance tables
        console.log("Performance for " + Constants.appWindow.location.href);
        console.table(Constants.perfTableJs);
    }
}

export const addToDomPerfTable = (perfMetric: string, modStart: number, modEnd: number, fromInit = false) => {
    /*
    Example Table
    Fetches time is negative as '0' on our time line is when fetches are complete. 
    This makes it so the remaining numbers represent actual JS performane times and 
    not loading times, which can vary widely due to servers internet speeds.
    Total time includes load time.

        perfMetric              moduleTime  elapsedTime
    0	'All Fetches Complete'	-317	    -317
    1	'Doc Visible'	        200	        201
    2	'Facts Ready'	        197	        397
    3	'Search Ready'	        803	        1201
    4	'Total Time'	        1517	    1517

    */

    // fromInit will start timer when app first loads (sooner)
    // if false will start timer after all fetched docs are loaded (later)

    // moduleTime is not reliable - commenting out for now.
    // TODO: since we want to start a module timer when the previous one ends, when 1st tested elem becomes visible
    // it should kick of the timer for the next one.  We could create a wrapper func that interates over an array of elems/selectors.
    const moduleTime = Number((modEnd - modStart).toFixed(0));
    const elapsedTime = Number((modEnd - (fromInit ? Constants.appStart : Constants.loadPhaseComplete)).toFixed(0));
    Constants.perfTableDom.push({perfMetric, moduleTime, elapsedTime});
    // Constants.perfTableDom.push({perfMetric, elapsedTime});
}

export function timeUiCheckpoints() {
    /* starts when all fetches complete then times when:
        - doc in dom (loading wheel gone)
        - facts ready  (marked in doc)
        - search ready
    */
    const checkPointElems = [
        {
            perfLabel: 'Doc Visible',
            elemId: 'loading-animation',
            onDisappear: true,
        },
        {
            perfLabel: 'Facts Ready',
            elemId: 'factClock',
            onDisappear: true
        },
        {
            perfLabel: 'Search Ready',
            elemId: 'search-submit-icon',
            onDisappear: false,
        }
    ];
    // log loading time
    addToDomPerfTable('All Fetches Complete', Constants.loadPhaseComplete, Constants.appStart);

    // then iterate through dom checkpoints
    elementsRenderTimer(checkPointElems);
}

function elementsRenderTimer(checkpoints : any[]) {
    const checkpoint = checkpoints.shift();
    if (!checkpoint) return;
    const moduleStart = performance.now();

    const checkForElem = window.setInterval(() => {
        const elem = document.getElementById(checkpoint.elemId);
        if (checkpoint.onDisappear) {
            if (!elem || elem.classList.contains('d-none')) {
                clearInterval(checkForElem);
                const elemDisappearTime = performance.now();
                addToDomPerfTable(checkpoint.perfLabel, moduleStart, elemDisappearTime);
                elementsRenderTimer(checkpoints);
            }
        } else {
            if (elem && elem.offsetParent !== null && !elem.classList.contains('d-none')) {
                clearInterval(checkForElem);
                const elemVisible = performance.now()
                addToDomPerfTable(checkpoint.perfLabel, moduleStart, elemVisible);
                elementsRenderTimer(checkpoints);       

                if (checkpoint.elemId == 'search-submit-icon') {
                    addToDomPerfTable('Total Time (Loading + Processing)', Constants.appStart, elemVisible, true);

                    // print performance tables
                    console.log("DOM Timeline");
                    console.table(Constants.perfTableDom);
                }
            }
        }
    }, 50)
}