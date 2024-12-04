import { Logger, ILogObj } from "tslog";
import { Constants } from "../constants/constants";
import { ConstantsFunctions } from "../constants/functions";
import { ErrorsMajor } from "../errors/major";
import { ErrorsMinor } from "../errors/minor";
import { Facts } from "../facts/facts";
import { FetchAndMerge } from "../fetch-merge/fetch-merge";
import { FlexSearch } from "../flex-search/flex-search";
import { FactIdAllocator } from "../helpers/fact-id-allocator";
import { HelpersUrl } from "../helpers/url";
import { Reference, SingleFact } from "../interface/fact";
import { ErrorResponse, FetchMergeArgs, FMResponse } from "../interface/fetch-merge";
import { Section } from "../interface/meta";
import { InstanceFile } from "../interface/instance-file";
import { buildInlineDocPagination, addPaginationListeners } from "../pagination/inlineDocPagination";
import { Sections } from "../sections/sections";
import { Tabs } from "../tabs/tabs";
import { excludeFacts, fixImages, fixLinks, hiddenFacts, redLineFacts } from "./app-helper";
import { hideLoadingUi, incrementProgress, resetProgress } from "./loading-progress";


/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


//this seems to be necessary for webpack to correctly include the sourceMaps for FetchAndMerge
const fetchAndMerge = new FetchAndMerge({} as any); // eslint-disable-line

const DEFAULT_ERROR_MSG = "An error occurred during load.";

export const App = {
    //TODO: make this return a Promise instead?
    /** called to *load* the app or a new instance */
    init: (changeInstance = true, callback: (arg0: boolean) => void) => {
        let docUrl = '';
        if (changeInstance) {
            ConstantsFunctions.emptyHTMLByID('dynamic-xbrl-form');
            document.getElementById('html-pagination')?.classList.toggle('d-none');
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

                            const stdRef = !changeInstance ? event.data.all.std_ref : undefined;
                            storeData(instance || null, event.data.all.sections, event.data.all.instance, stdRef);

                            handleFetchAndMerge(instance || null);
                            callback(true);
                            Facts.addHashChangeListener();
                            Facts.handleFactHash();
                            incrementProgress();
                        }
                        else if ("xhtml" in event.data)
                        {
                            //Leave sidebars alone if this is not the initial load
                            if (!changeInstance) closeSidebars();
                            Constants.isNcsr = event.data.isNcsr
                            progressiveLoadDoc(event.data.xhtml);
                            
                            incrementProgress();
                        }
                        else if ("facts" in event.data)
                        {
                            const now = performance.now();
                            
                            // purpose: make facts get attributes like highlights during load
                            // watch for performace
                            addAttributesToInlineFacts(event.data.facts);
                            
                            incrementProgress();
                            if (LOGPERFORMANCE)
                            {
                                const log: Logger<ILogObj> = new Logger();
                                log.debug(`attributeFacts took ${Date.now() - now}ms`);
                            }
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
        addAttributesToInlineFacts(activeInstance.map, true);
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
        Facts.addEventAttributes();
        Facts.updateFactCount();
    },

    enableNavsEtc: () =>
    {
        const disabledNavsArray = Array.from(document.querySelectorAll(".navbar .disabled, [disabled]"));
        disabledNavsArray.forEach((current) =>
        {
            current.classList.remove("disabled");
            current.removeAttribute("disabled");
        });
    },

    /**
     * Updates tabs, instance facts, fact count, global-search-form;
     * runs every time a new instance is loaded
     * @returns {void}
     */
    additionalSetup: (): void =>
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
        
    addAttributesToInlineFacts(activeInstance.map, false);
    addPagination();

    const endPerformance = performance.now();
    if (LOGPERFORMANCE)
    {
        const log: Logger<ILogObj> = new Logger();
        log.debug(`Final fetch-merge handling completed in: ${(endPerformance - startPerformance).toFixed(2)}ms`);
    }

    return true;
}

function storeData(activeInstance: InstanceFile | null, sections: Section[] = [], allInstances?: InstanceFile[], stdRef?: Record<string, Reference>): void
{
    //TODO: set sections in WebWorker cb instead
    if (sections.length > 0)
    {
        Constants.setSections(sections);
    }
    
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
    const htmlDoc = parser.parseFromString(xhtml, "text/html");

    //Each .htm file (doc) gets its own section element which will be a child of the xbrl-form
    const docSection = document.createElement('section');

    if (current)
    {
        docSection.setAttribute("id", "xbrl-section-current");
        for(const { name, value } of htmlDoc.querySelector('html')!.attributes)
        {
            document.querySelector('html')?.setAttribute(name, value);
        }
    }
    else
    {
        docSection.classList.add('d-none');
        docSection.setAttribute("id", `xbrl-section-${i}`);
    }

    //apply these fixes before elements are added to the DOM
    fixLinks(htmlDoc);
    fixImages(htmlDoc);
    hiddenFacts(htmlDoc);
    redLineFacts(htmlDoc);
    excludeFacts(htmlDoc);

    const body = htmlDoc.querySelector('body');
    if (!body) throw new Error("Error: XBRL document is missing `body` tag");

    //split if doc is larger than 50MB
    if(xhtml.length > 50 * 1024 * 1024)
        splitBodyContents(body);

    docSection.append(body);
    document.getElementById("dynamic-xbrl-form")?.append(docSection);
}

/**
 * Use 2 strategies to combat large files exhausting RAM
 * 1. limit the number of direct children of `body`
 * 2. utilize `content-visibility: auto` to load elements only when necessary
 */
function splitBodyContents(body: HTMLElement): void
{
    ErrorsMinor.message("IX Viewer has detected a very large file.  Performance may be degraded, and some features may not work as expected.");

    const ELEMENTS_PER_GROUP = Math.floor(Math.sqrt(body.childElementCount));
    const groupCount = Math.ceil(body.childElementCount / ELEMENTS_PER_GROUP);
    const fastRenderGroups = new Array(groupCount).fill(null)
        .map(() =>
        {
            const span = document.createElement("span");
            span.setAttribute("style", "content-visibility: auto;");
            return span;
        });

    for(let i=0; i < groupCount; i++)
    {
        const start = i * ELEMENTS_PER_GROUP;
        const end = (i + 1) * ELEMENTS_PER_GROUP;
        fastRenderGroups[i].append(...Array.from(body.children).slice(start, end));
    }

    body.innerHTML = "";
    body.append(...fastRenderGroups);
}



let idAllocator = null as any as FactIdAllocator;

/** Give facts attributes like highlights during load */
function addAttributesToInlineFacts(facts: Map<string, SingleFact>, current = true)
{
    const startPerformance = performance.now();

    //For the facts in the HTML that have no IDs...
    idAllocator = idAllocator || new FactIdAllocator(facts);
    const getByNameAndContextRef = (contextRef: string | null, name: string | null): string | null =>
    {
        let id = idAllocator.getId(contextRef, name);

        //Get a new ID if this one has already been assigned to an element
        while(document.getElementById(id || "DEFAULT_FAKE_ID") != null)
        {
            id = idAllocator.getId(contextRef, name);
        }

        return id;
    };

    const prefix = current ? "" : "> :not(#xbrl-section-current)";
    const foundElements = Array.from(document.querySelectorAll(`#dynamic-xbrl-form ${prefix} [contextref]`));

    for(const element of foundElements)
    {
        element.setAttribute("enabled-fact", "true");
        element.setAttribute("selected-fact", "false");
        element.setAttribute("hover-fact", "false");
        element.setAttribute("continued-fact", "false");
        element.setAttribute("inside-table", `${!!element.closest("table")}`);

        if (!element.getAttribute("tagName")?.toLowerCase().endsWith("continuation") && element.getAttribute("continuedat"))
        {
            element.setAttribute("continued-main-fact", "true");
        }

        const name = element.getAttribute("name");
        const contextref = element.getAttribute("contextref");

        const ix = element.getAttribute("id") || getByNameAndContextRef(contextref, name) || "";
        const id = facts.get(ix)?.id;

        if (ix && id)
        {
            element.setAttribute("ix", ix);
            element.setAttribute("id", id);
        }
        else
        {
            console.warn(`Fact [name: ${name}] & [contextRef: ${contextref}] could not be located in the Map.`);
        }
    }

    for(let e of document.querySelectorAll(`#dynamic-xbrl-form ${prefix} ix\\:hidden [contextref]`))
    {
        if(e.id && document.querySelectorAll(`#${e.id}`).length != 1)
            e.id += "-hidden";
    }

    const endPerformance = performance.now();
    if (LOGPERFORMANCE)
    {
        const items = foundElements.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`app.attributeFacts() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

function addPagination(): void
{
    // maybe remove
    document.getElementById('html-pagination')?.classList.toggle('d-none');

    const currentInstance = Constants.getInstanceFiles.find(element => element.current);
    const currentXHTML = currentInstance?.docs.find(element => element.current);

    const currentDocElem = document.querySelector(`section[filing-url="${currentXHTML?.slug}"]`);
    const numPageBreaks = currentDocElem?.querySelectorAll(`[style*="break-after"], [style*="break-before"]`)?.length || 0;
    
    if (numPageBreaks > 0) {
        const inlineDocPaginationUI = buildInlineDocPagination();
        document.getElementById('dynamic-xbrl-form')?.append(inlineDocPaginationUI);
        addPaginationListeners();
    } else {
        document.getElementById('html-pagination')?.classList.add('d-none');
    }
}

function handleFetchError(loadingError: ErrorResponse): false
{
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
