import { ILogObj, Logger } from "tslog";
import { HelpersUrl } from "../helpers/url";

export function fixImages(): void
{
    const startPerformance = performance.now();
    const foundImagesArray = Array.from(document.querySelectorAll('img'));

    if (HelpersUrl.isWorkstation())
    {
        // example MetaLinks path: '../DisplayDocument.do?step=docOnly&accessionNumber=0001314610-24-800735&interpretedFormat=false&redline=true&filename=MetaLinks.json'
        
        const [docName, searchParams] = HelpersUrl.getAllParams?.doc.split('?') || [];
        let imgParams = new URLSearchParams(searchParams);

        imgParams.set("step", "docOnly");
        imgParams.set("interpretedFormat", "false");
        imgParams.delete("redline");
        imgParams.delete("status");
        imgParams.delete("sequenceNumber");

        foundImagesArray.forEach((imgElem) =>
        {
            // Not sure how to handle Herm's suggestion: 'And if src is a local file (foo.jpg, not /include or http://archives.sec.xxx)'
            // const imgIsLocal = !$(imgElem).attr('src')?.startsWith('/include');
            // const imgIsFileNameOnly = $(imgElem).attr('src') && (!$(imgElem).attr('src')?.startsWith('/') || !$(imgElem).attr('src')?.includes('/', 1));
                    
            const imgSrc = imgElem.getAttribute('src');
            if (!imgSrc) return;

            const imgFileName = imgSrc.includes('/') ? imgSrc.substring(imgSrc.lastIndexOf('/') + 1) : imgSrc;
            imgParams.set("filename", imgFileName);

            console.log('params', imgParams.toString());

            imgElem.setAttribute('src', `${docName}?${imgParams.toString()}`);
            imgElem.setAttribute('loading', 'lazy');
        });
    }
    else 
    {
        foundImagesArray.forEach((imgElem) =>
        {
            const imgSrc = imgElem.getAttribute('src');
            if (!imgSrc?.startsWith('data:'))
            {
                const imageSlug = imgSrc?.substring(imgSrc.lastIndexOf('/') + 1);
                imgElem.setAttribute('src', `${HelpersUrl.getFormAbsoluteURL}${imageSlug}`);
                imgElem.setAttribute('loading', 'lazy');
            }
        })
    }

    const endPerformance = performance.now();
    if (LOGPERFORMANCE)
    {
        const items = foundImagesArray.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`FetchAndMerge.fixImages() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

export function fixLinks(): void
{
    const startPerformance = performance.now();
    const foundLinksArray = Array.from(document.querySelectorAll('[data-link],[href]'));
    foundLinksArray.forEach((current) =>
    {
        const href = current.getAttribute("href")
        if (href)
        {
            if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#'))
            {
                // already an absolute url, just add tabindex=18
                current.setAttribute('tabindex', '18');

                // this anchor tag does not exsist in the current XHTML file
                if (href.startsWith('#') && href.slice(1) && document.getElementById(href.slice(1)))
                {
                    current.setAttribute('xhtml-change', 'true');
                }
            }
            else
            {
                // create an absolute url, add tabindex=18
                current.setAttribute('tabindex', '18');
                current.setAttribute('href', `${HelpersUrl.getFormAbsoluteURL}${href}`);
            }
        }

        if (current.getAttribute('data-link'))
        {
            current.setAttribute('tabindex', '18');
        }
    });

    const endPerformance = performance.now();
    if (LOGPERFORMANCE) {
        const items = foundLinksArray.length;
        const log: Logger<ILogObj> = new Logger();
        log.debug(`FetchAndMerge.fixLinks() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
    }
}

//TODO: these functions could not be easily converted from Cheerio APIs to DOM counterparts
// export function hiddenFacts()
// {
//     const startPerformance = performance.now();
//     const foundElements = Array.from(document.querySelectorAll('[style*="-ix-hidden"]')).slice(0, 1000);

//     foundElements.forEach((current) =>
//     {
//         Object.values(current.classList(["-sec-ix-hidden", "-esef-ix-hidden"]) || {}).filter(Boolean);
//         const [updatedStyle] = Array.from(current.classList).filter((e) => ["-sec-ix-hidden", "-esef-ix-hidden"].includes(e))
//         const hiddenElement = document.querySelector(`#${updatedStyle}`);
//         if (hiddenElement)
//         {
//             // console.log($(hiddenElement));
//             // we now create an entirely new element based on the innerHTML
//             // of current, and the attributes of hiddenElement
//             const cheerioElement = document.querySelector(`<${hiddenElement.getAttribute('tagName')?.toLowerCase().replace(`:`, `\\:`)}>`);
//             //const id = $(hiddenElement).attr('id');

//             for(let { name, value } of Array.from(hiddenElement.attributes))
//             {
//                 cheerioElement?.setAttribute(name, hiddenElement.getAttribute(value) || "");
//             }

//             cheerioElement?.setAttribute('isadditionalitemsonly', 'true');
//             cheerioElement?.setAttribute('ishiddenelement', 'true');
//             if (cheerioElement) cheerioElement.innerHTML = current.outerHTML;

//             hiddenElement.removeAttribute('id');
//             hiddenElement.removeAttribute('contextref');
//             hiddenElement.removeAttribute('name');

//             current.html($(cheerioElement));
//         }
//         else
//         {
//             const log: Logger<ILogObj> = new Logger();
//             log.debug('empty!');
//         }
//     });

//     const endPerformance = performance.now();
//     if (LOGPERFORMANCE) {
//         const items = foundElements.length
//         const log: Logger<ILogObj> = new Logger();
//         log.debug(`FetchAndMerge.hiddenFacts() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
//     }
// }

// export function redLineFacts()
// {
//     const startPerformance = performance.now();
//     let foundElements = [];
    
//     ['redline', 'redact'].forEach((r) =>
//     {
//         foundElements = Array.from(document.querySelectorAll('[style*="-ix-' + r + '"]'));
        
//         if (HelpersUrl.getAllParams?.redline)
//         {
//             foundElements.forEach((current) =>
//             {
//                 const updatedStyle = Array.from(current.classList).some((e) => ["-sec-ix-" + r, "-esef-ix-" + r].includes(e));
//                 if (updatedStyle)
//                 {
//                     current.setAttribute(r, 'true');
//                 }
//             });
//         }
//     });

//     const endPerformance = performance.now();
//     if (LOGPERFORMANCE)
//     {
//         const items = foundElements?.length;
//         const log: Logger<ILogObj> = new Logger();
//         log.debug(`FetchAndMerge.redLineFacts() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
//     }
// }

export function excludeFacts(): void
{
    Array.from(document.querySelectorAll('[style*=":exclude"]'))
        .forEach((element) => element.classList.add('no-hover'));
}
