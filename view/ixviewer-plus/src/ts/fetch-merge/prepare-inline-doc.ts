import * as c from "cheerio";
import { Cheerio, load } from "cheerio";
import { ILogObj, Logger } from "tslog";
import { FactIdAllocator } from "../helpers/fact-id-allocator";
import { XhtmlFileMeta } from "../interface/instance-file";
import { SingleFact } from "../interface/fact";
import { setScaleInfo } from "./merge-data-utils";


/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


export type XhtmlPrepData =
{
    docs: XhtmlFileMeta[];
    facts: Map<string, SingleFact>;
    customPrefix: string
}

export type XhtmlPrepResponse =
{
    facts: Map<string, SingleFact>;
    xhtml: string;
}

//TODO: rename this class
export class XhtmlPrepper
{
    private docs: XhtmlFileMeta[];
    private facts: Map<string, SingleFact>;
    private readonly customPrefix: string;
    private readonly idAllocator: FactIdAllocator;
    
    constructor({ docs, facts, customPrefix }: XhtmlPrepData)
    {
        this.docs = docs;
        this.facts = facts;
        this.customPrefix = customPrefix;

        this.idAllocator = new FactIdAllocator(this.facts);
    }

    public doWork()
    {
        const promises = [...this.docs]
            .sort((a, b) => +b.current - +a.current)
            .map((doc) =>
                new Promise<void>((resolve) =>
                {
                    this.applyElementDataToFact(doc);
                    resolve();
                }));

        return Promise.all(promises);
    }

    private applyElementDataToFact(current: XhtmlFileMeta)
    {
        const startPerformance = performance.now();

        let $ = load(current.xhtml, {});

        const factElements = Array.from($(`[contextRef]`));

        for(let factElem of factElements)
        {
            const id = $(factElem).attr("id") || this.idAllocator.getId($(factElem).attr('contextref'), $(factElem).attr('name'));
            if(id)
            {
                this.updateMap(id, $(factElem), current.slug);
            }
            else
            {
                const log: Logger<ILogObj> = new Logger();
                log.error(`Fact [name] && [contextRef] could not be located in the Map Object.`);
            }
        }

        const endPerformance = performance.now();
        if (LOGPERFORMANCE)
        {
            const items = factElements.length;
            const log: Logger<ILogObj> = new Logger();
            log.debug(`FetchAndMerge.doWork() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms - ${items} items`);
        }
    }

    private updateMap(id: string, element: Cheerio<c.Element>, docSlug: string): string
    {
        const fact = this.facts.get(id);
        if (!fact)
        {
            console.error("Cannot update map -- missing key:", id);
            return "";
        }

        this.facts.set(id,
        {
            ...fact,
            raw: element.text(),
            format: element.attr('format') ? element.attr('format') : null,
            isAdditional: element.parents().prop('tagName').toLowerCase().endsWith(':hidden'),
            isCustom: element.attr('name')?.split(':')[0].toLowerCase() === this.customPrefix,
            isAmountsOnly: element.prop('tagName')?.split(':')[1].toLowerCase() === 'nonfraction',
            isTextOnly: element.prop('tagName')?.split(':')[1].toLowerCase() === 'nonnumeric',
            isNegativeOnly: element.attr('sign') === '-',
            sign: (element.attr('sign') === '-') ? "Negative" : null,
            file: docSlug,
            scale: setScaleInfo(element.attr('scale')) || "",
            continuedIDs: [],
        });

        return fact.id;
    }
}
