import { ILogObj, Logger } from "tslog";
import { HelpersUrl } from "../helpers/url";

export function fixImages(doc = document): void {
    const startPerformance = performance.now();

    if (HelpersUrl.isWorkstation()) {
        // example MetaLinks path: '../DisplayDocument.do?step=docOnly&accessionNumber=0001314610-24-800735&interpretedFormat=false&redline=true&filename=MetaLinks.json'
        
        const [docName, searchParams] = HelpersUrl.getAllParams?.doc.split('?') || [];
        const imgParams = new URLSearchParams(searchParams);

        imgParams.set("step", "docOnly");
        imgParams.set("interpretedFormat", "false");
        imgParams.delete("redline");
        imgParams.delete("status");
        imgParams.delete("sequenceNumber");

        for (let imgElem of doc.querySelectorAll("img")) {
            // Not sure how to handle Herm's suggestion: 'And if src is a local file (foo.jpg, not /include or http://archives.sec.xxx)'
            // const imgIsLocal = !$(imgElem).attr('src')?.startsWith('/include');
            // const imgIsFileNameOnly = $(imgElem).attr('src') && (!$(imgElem).attr('src')?.startsWith('/') || !$(imgElem).attr('src')?.includes('/', 1));
                    
            const imgSrc = imgElem.getAttribute('src');
            if (!imgSrc) return;

            const imgFileName = imgSrc.includes('/') ? imgSrc.substring(imgSrc.lastIndexOf('/') + 1) : imgSrc;
            imgParams.set("filename", imgFileName);

            imgElem.setAttribute('src', `${docName}?${imgParams.toString()}`);
            imgElem.setAttribute('loading', 'lazy');
        }
    } else  {
        const foundImagesArray = doc.querySelectorAll("img:not([src^='data:'])");
        for (let imgElem of foundImagesArray) {
            const imgSrc = imgElem.getAttribute('src');
            const imageSlug = imgSrc?.split('/').pop() || "";
            imgElem.setAttribute("src", `${HelpersUrl.getFolderAbsUrl}${imageSlug}`);
            imgElem.setAttribute("loading", "lazy");
        }
    }

    const endPerformance = performance.now();
    if (LOGPERFORMANCE) {
        const items = doc.querySelectorAll("img").length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`AppHelper.fixImages() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

export function fixLinks(doc = document): void {
    const startPerformance = performance.now();

    const foundLinksArray = Array.from(doc.querySelectorAll("[data-link], :not(link)[href]"));
    foundLinksArray.forEach((linkElem) => {
        linkElem.setAttribute('tabindex', '18');

        const href = linkElem.getAttribute("href");
        if (href) {
            // internal links
            if (href.startsWith('#') && href.length > 1) {
                const linkInCurrentDoc = doc.getElementById(href.slice(1));
                if (!linkInCurrentDoc) {
                    linkElem.setAttribute('xhtml-change', 'true'); // ??? not sure why this is here
                }

                // if (Constants.loadedViaRedirect) {
                //     // works but sets url to ixviewer-plus/ix.xhtml
                //     linkElem.setAttribute('target', '_parent');
                // }

                // works but doesn't work with back / forward
                linkElem.addEventListener('click', () => {
                    HelpersUrl.updateAppWindowHash(href);
                })
            }
            // external links
            else if (href.startsWith('http://') || href.startsWith('https://')) {
                linkElem.setAttribute('target', '_blank'); // new tab
            }
            // relative links to other docs in filing folder
            else if (!href.includes('/')) {
                linkElem.setAttribute('href', `${HelpersUrl.getFolderAbsUrl}${href}`);
                linkElem.setAttribute('target', '_blank'); // new tab
            }
        }
    });

    const endPerformance = performance.now();
    if (LOGPERFORMANCE) {
        const items = foundLinksArray.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`AppHelper.fixLinks() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

function getFirstStyleValue(el: Element, styles: string[]): string {
    //from https://stackoverflow.com/a/33030078
    const regex = /([\w-]*)\s*:\s*([^;]*)/g;
    const elStyle = el.getAttribute("style") || "";
    let properties: Record<string, string> = {};
    let match = regex.exec(elStyle);

    while(match) {
        properties[match[1]] = match[2].trim();
        match = regex.exec(elStyle);
    }

    for(let style of styles) {
        if (properties[style]) return properties[style];
    }

    return "";
}

//Note: this MUST be called before `attributeFacts`
export function hiddenFacts(doc = document) {
    /*
        Requirements
        1. Hidden facts that are displayed inline (style="-sec-ix-hidden:{orignal-id}")
            a. should get H label (maybe asterisk next to H* for referenced inline? "* = referenced inline" could be in popup when hovering H label)
            b. show on H only filter
            c. scroll to inline location when clicked
            d. show file value in sidebar "(Referenced Inline)"
        2. Hidden facts that aren't displayed inline (in ix:hidden only)
            a. should get H label
            b. show on H only filter
            c. not show error when clicked
            d. next to file value show "(No Inline Location)"
    */

    const startPerformance = performance.now();
    const inlineElems = [...doc.querySelectorAll<HTMLElement>('[style*="-ix-hidden"]')].reverse();

    for (let inlineElem of inlineElems) {
        const hiddenElemId = getFirstStyleValue(inlineElem, ["-sec-ix-hidden", "-esef-ix-hidden"]);
        const hiddenElement = hiddenElemId ? doc.getElementById(hiddenElemId) : null;

        if (hiddenElement != null) {
            /**
             * 1. shallow-clone the linked hidden fact
             * 2. put the content of `current` into the clone
             * 3. clear `current`, then insert the clone as its child
             */

            const hiddenFactClone = hiddenElement.cloneNode() as HTMLElement;
            hiddenFactClone.append(...inlineElem.cloneNode(true).childNodes);

            hiddenFactClone.setAttribute("isadditionalitemsonly", "true");
            hiddenFactClone.setAttribute("ishiddenelement", "true");
            inlineElem.innerHTML = "";
            inlineElem.appendChild(hiddenFactClone);
        } else {
            console.warn(`HiddenFacts: Found no element with ID ${hiddenElemId}`);
        }
    }

    const endPerformance = performance.now();
    if (LOGPERFORMANCE) {
        const items = inlineElems.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`AppHelper.hiddenFacts() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

export function redLineFacts(doc = document) {
    if (!HelpersUrl.getAllParams?.redline) return;

    const startPerformance = performance.now();
    let foundElements = [];
    
    for (let r of ["redline", "redact"]) {
        foundElements =[
            ...doc.querySelectorAll(`[style*="-sec-ix-${r}"]`),
            ...doc.querySelectorAll(`[style*="-esef-ix-${r}"]`),
        ];
        
        for (let current of foundElements) {
            current.setAttribute(r, "true");
        }
    }

    const endPerformance = performance.now();
    if (LOGPERFORMANCE) {
        const items = foundElements?.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`AppHelper.redLineFacts() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

export function excludeFacts(doc = document): void {
    Array.from(doc.querySelectorAll('[style*=":exclude"]'))
        .forEach((element) => element.classList.add("no-hover"));
}
