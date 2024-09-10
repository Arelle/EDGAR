import { Logger, ILogObj } from "tslog";
import { Constants } from "../constants/constants";
import { ConstantsFunctions } from "../constants/functions";
import { ErrorsMajor } from "../errors/major";
import { Facts } from "../facts/facts";
import { FetchAndMerge } from "../fetch-merge/fetch-merge";
import { ErrorResponse, FetchMergeArgs, FMFinalResponse, FMResponse } from "../interface/fetch-merge";
import { FlexSearch } from "../flex-search/flex-search";
import { HelpersUrl } from "../helpers/url";
import { Reference, SingleFact } from "../interface/fact";
import { Section } from "../interface/meta";
import { InstanceFile } from "../interface/instance-file";
import { buildInlineDocPagination, addPaginationListeners } from "../pagination/inlineDocPagination";
import { Sections } from "../sections/sections";
import { Tabs } from "../tabs/tabs";
import { fixImages } from "./app-helper";


/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


/* eslint-disable @typescript-eslint/ban-types */

//this seems to be necessary for webpack to correctly include the sourceMaps for FetchAndMerge
const fetchAndMerge = new FetchAndMerge({} as any);

const DEFAULT_ERROR_MSG = "An error occurred during load.";

export const App = {
    //TODO: make this return a Promise instead?
    /** called to *load* the app or a new instance */
    init: (changeInstance = true, callback: (arg0: boolean) => void) => {
        let docUrl = '';
        if (changeInstance) {
            ConstantsFunctions.emptyHTMLByID('dynamic-xbrl-form');
            document.getElementById('html-pagination')?.classList.toggle('d-none');
            document.getElementById('xbrl-form-loading')!.classList.remove('d-none');
            const activeInstance = Constants.getInstanceFiles.find(element => element.current);
            docUrl = activeInstance?.docs.find(element => element.current)?.slug as string;
        }

        HelpersUrl.init(docUrl, () => {
            if (HelpersUrl.getAllParams && 
                HelpersUrl.getAllParams!["metalinks"] &&
                HelpersUrl.getAllParams!["doc"] &&
                HelpersUrl.getFormAbsoluteURL)
            {
                //reset the progress bar and then increment it
                resetProgress();
                incrementProgress();

                const fetchAndMergeArgs: FetchMergeArgs = {
                    params: HelpersUrl.getAllParams,
                    absolute: HelpersUrl.getFormAbsoluteURL,
                    instance: changeInstance ? Constants.getInstanceFiles : null,
                    std_ref: Constants.getStdRef,
                };

                if (typeof window !== 'undefined' && window.Worker)
                {
                    const worker = new Worker(
                        new URL('../workers/workers.ts', import.meta.url), { name: 'fetch-merge' });
                    worker.postMessage(fetchAndMergeArgs);
                    worker.onmessage = (event: MessageEvent<FMResponse>) =>
                    {
                        if ("all" in event.data)
                        {
                            incrementProgress();
                            worker.terminate();
                            const instance = event.data.all.instance.find(i => i.current);
                            const docString = instance?.docs.find(x => x.current)?.xhtml || "";
                            ConstantsFunctions.emptyHTMLByID('dynamic-xbrl-form');
                            loadDoc(docString, true);

                            const stdRef = !changeInstance ? event.data.all.std_ref : undefined;
                            storeData(instance || null, event.data.all.sections, event.data.all.instance, stdRef);

                            handleFetchAndMerge(instance || null);
                            callback(true);
                            incrementProgress();
                        }
                        else if ("xhtml" in event.data)
                        {
                            //Leave sidebars alone if this is not the initial load
                            if (!changeInstance) closeSidebars();
                            progressiveLoadDoc(event.data.xhtml);
                            fixImages();
                            incrementProgress();
                        }
                        else if ("facts" in event.data)
                        {
                            let now=Date.now();
                            addAttributesToInlineFacts(event.data["facts"]);
                            incrementProgress();
                            console.warn(`attributeFacts took ${Date.now() - now}ms`);
                        }
                    };
                    worker.onerror = (errorEvent) =>
                    {
                        const errLoc = `${errorEvent.filename} ${errorEvent.lineno}:${errorEvent.colno}`;
                        console.error(errLoc, errorEvent.message);

                        handleFetchError({ error: true, messages: [DEFAULT_ERROR_MSG] });
                        hideLoadingUi();
                        callback(false);
                        worker.terminate();
                    };
                }
                else
                {
                    //Browser does not support WebWorkers
                    console.error(`WebWorkers NOT available.  Stopping.`);

                    const messages =
                    [
                        "Error: WebWorkers not available.",
                        "Only the latest versions of Chrome and Edge are supported.",
                    ];
                    handleFetchError({ error: true, messages });
                    hideLoadingUi();
                    callback(false);
                }
            }
            else
            {
                document.getElementById('xbrl-form-loading')?.classList.add('d-none');
                Facts.updateFactCount();
                ErrorsMajor.urlParams();
                hideLoadingUi();
                callback(false);

                if (!PRODUCTION)
                    import('../development/index.development').then(module => new module.Development());
            }
        });
    },

    /** perform all the steps run post-load, using data that's been loaded already */
    loadFromMemory(activeInstance: InstanceFile)
    {
        const xhtml = activeInstance.docs.filter(doc => doc.current)[0].xhtml;

        progressiveLoadDoc(xhtml);
        //skip attributeFacts -- this has already been done during the orig load
        storeData(activeInstance);
        handleFetchAndMerge(activeInstance);
        App.additionalSetup();
    },

    initialSetup: () =>
    {
        // runs once on startup
        Tabs.init();
        Sections.init();
        App.enableNavsEtc();
        Facts.updateFactCount();
    },

    enableNavsEtc: () =>
    {
        Facts.addEventAttributes();
        const disabledNavsArray = Array.from(document.querySelectorAll(".navbar .disabled, [disabled]"));
        disabledNavsArray.forEach((current) =>
        {
            current.classList.remove("disabled");
            current.removeAttribute("disabled");
        });
    },

    /**
     * Description => updates tabs, instance facts, factCount, global-search-form
     * @returns {void}
     */
    additionalSetup: () =>
    {
        Tabs.updateTabs();
        Facts.addEventAttributes();
        Facts.updateFactCount();
        (document.getElementById('global-search-form') as HTMLFormElement)?.reset();
    },

    emptySidebars: () =>
    {
        document.querySelector("#facts-menu-list-pagination *")!.innerHTML = "";
    },
};



/** called when ALL data has been loaded and processed, and when swapping to a new instance that's already loaded */
// function handleFetchAndMerge(filingData: FMFinalResponse, multiInstanceLoad: boolean): true
function handleFetchAndMerge(activeInstance: InstanceFile | null): true | never
{
    if (activeInstance == null) throw new Error("Error: no active instance was found!");

    const startPerformance = performance.now();

    FlexSearch.init(activeInstance.map);
    ConstantsFunctions.setTitle();

    const [{ slug }] = activeInstance.docs.filter(x => x.current);
    document.querySelector("#xbrl-section-current")?.setAttribute('filing-url', slug);

    activeInstance.docs
        .filter(({ xhtml, current }) => !current && !!xhtml)
        .forEach(({ xhtml, current, slug }, i) =>
        {
            loadDoc(xhtml, current, i);
            document.querySelector(`#xbrl-section-${i}`)?.setAttribute('filing-url', slug);
        });
        
    addPagination();

    const endPerformance = performance.now();
    if (LOGPERFORMANCE)
    {
        const log: Logger<ILogObj> = new Logger();
        log.debug(`Final fetch-merge handling completed in: ${(endPerformance - startPerformance).toFixed(2)}ms`);
    }

    return true;
}

// function storeData(filingData: FMFinalResponse, newLoad: boolean, multiInstanceLoad: boolean): void
function storeData(activeInstance: InstanceFile | null, sections: Section[] = [], allInstances?: InstanceFile[], stdRef?: Record<string, Reference>): void
{
    //TODO: call this in WebWorker cb instead
    processSections(sections);
    
    if (activeInstance)
    {
        ConstantsFunctions.setInlineFiles(activeInstance.docs);
        ConstantsFunctions.setFormInformation(activeInstance.formInformation);
    }

    if (allInstances?.length)
    {
        ConstantsFunctions.setInstanceFiles(allInstances);
    }

    if (stdRef)
    {
        ConstantsFunctions.setStdRef(stdRef);
    }
}


function closeSidebars(): void
{
    //The sidebars are open (but empty); close them so the XBRL doc content becomes visible
    document.getElementById('sections-menu')?.classList.remove('show');
    document.getElementById('facts-menu')?.classList.remove('show');
}


function progressiveLoadDoc(xhtml: string): void
{
    if (!xhtml) return;
    const startPerformance = performance.now();

    ConstantsFunctions.emptyHTMLByID('dynamic-xbrl-form');
    loadDoc(xhtml, true);
    
    //TODO: this can be added once FlexSearch gets moved to a WebWorker
    //It will allow the user to browse a bit more before loading is 100% complete
    // Errors.updateMainContainerHeight(false);
    
    const endPerformance = performance.now();
    if (LOGPERFORMANCE)
    {
        const log: Logger<ILogObj> = new Logger();
        log.debug(`Adding XHTML completed in: ${(endPerformance - startPerformance).toFixed(2)}ms`);
    }
}

function loadDoc(xhtml: string, current: boolean, i?: number): void
{
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(xhtml, 'text/html');

    document.getElementById('xbrl-form-loading')!.classList.add('d-none');

    //Each .htm file (doc) gets its own section element which will be a child of the xbrl-form
    const docSection = document.createElement('section');

    if (current)
    {
        docSection.setAttribute("id", "xbrl-section-current");
        for(let { name, value } of htmlDoc.querySelector('html')!.attributes)
        {
            document.querySelector('html')?.setAttribute(name, value);
        }
    }
    else
    {
        docSection.classList.add('d-none');
        docSection.setAttribute("id", `xbrl-section-${i}`);
    }

    let body = htmlDoc.querySelector('body');
    if (!body) throw new Error("Error: XBRL document is missing `body` tag");

    docSection.append(body);
    document.getElementById('dynamic-xbrl-form')?.append(docSection);
}

function addAttributesToInlineFacts(facts: Map<string, SingleFact>)
{
    const startPerformance = performance.now();

    //For the facts in the html that have no IDs...
    let noIdFactMap: Map<string, string> | null = null;
    const getByNameAndContextRef = (searchContextref: string | null, searchName: string | null): string | null =>
    {
        if (noIdFactMap == null)
        {
            //Stringify the { name: string, contextRef: string } obj because Map keys are by-reference
            noIdFactMap = new Map([...facts.entries()].map(([k, { name, contextRef}]) => [JSON.stringify({ name, contextRef }), k]));
        }

        const key = JSON.stringify({ name: searchName || "", contextRef: searchContextref || "" });
        return noIdFactMap.get(key) || null;
    };


    const foundElements = Array.from(document.querySelectorAll("[contextref]"));
    for(let element of foundElements)
    {
        element.setAttribute("selected-fact", "false");
        element.setAttribute("hover-fact", "false");
        element.setAttribute("continued-fact", "false");
        element.setAttribute("inside-table", `${!!element.closest("table")}`);

        if (!element.getAttribute("tagName")?.toLowerCase().endsWith("continuation") && element.getAttribute("continuedat"))
        {
            element.setAttribute("continued-main-fact", "true");
        }

        const id = element.getAttribute("id");
        if (id && (element).getAttribute("contextref"))
        {
            element.setAttribute("ix", id);
            element.setAttribute("id", facts.get(id)?.id || `ERROR_NO_FACT-${id}`);
        }

        if (!id && element.getAttribute("contextref"))
        {
            const mapKey = getByNameAndContextRef(element.getAttribute("contextref"), element.getAttribute("name"));
            if (mapKey)
            {
                element.setAttribute("ix", mapKey);
                element.setAttribute("id", mapKey);
            }
            else
            {
                const log: Logger<ILogObj> = new Logger();
                log.error("Fact [name] && [contextRef] could not be located in the Map Object.");
            }
        }
    }

    const endPerformance = performance.now();
    if (LOGPERFORMANCE)
    {
        const items = foundElements.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`FetchAndMerge.attributeFacts() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

function processSections(sections: Section[])
{
    if (sections.length > 0)
    {
        Constants.setSections(sections);
    }
}

function addPagination(): void
{
    // maybe remove
    document.getElementById('html-pagination')?.classList.toggle('d-none');
    
    const inlineDocPaginationUI = buildInlineDocPagination();
    document.getElementById('dynamic-xbrl-form')?.append(inlineDocPaginationUI);
    addPaginationListeners();
}


//TODO: maybe move these to their own module?
let progress = 0;
const MAX_PROGRESS = 5;
function resetProgress()
{
    progress = 0;
    document.querySelector("#loading-animation")?.classList.remove("d-none");
    document.querySelector("#loading")?.classList.remove("d-none");
}
function incrementProgress(): void
{
    progress++;
    (document.querySelector("#loading div.progress-bar") as HTMLElement)
        .style.width = `${progress / MAX_PROGRESS * 100}%`;

    if (progress > MAX_PROGRESS/2)
    document.getElementById("loading")!.style.color = "white";

    if (progress >= MAX_PROGRESS)
    {
        setTimeout(() => hideLoadingUi(), 500);
    }
}
function hideLoadingUi()
{
    document.querySelector("#loading-animation")?.classList.add("d-none");
    document.querySelector("#loading")?.classList.add("d-none");
}

function handleFetchError(loadingError: ErrorResponse): false
{
    document.getElementById('xbrl-form-loading')!.classList.add('d-none');
    Constants.getInlineFiles = [];

    if (loadingError.error && loadingError.messages)
    {
        loadingError.messages
            .forEach((current: string) => ErrorsMajor.message(current));
    }
    else
    {
        ErrorsMajor.message(DEFAULT_ERROR_MSG);
        console.error(loadingError);
    }

    return false;
}
