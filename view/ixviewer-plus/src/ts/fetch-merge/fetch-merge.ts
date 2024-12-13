import * as cheerio from 'cheerio';
import { Logger, ILogObj } from 'tslog';
import * as convert from 'xml-js';
import { cleanSubstring, isTruthy } from '../helpers/utils';
import { Decimals, Reference, SegmentClass, SingleFact } from '../interface/fact';
import { All, ErrorResponse, FMResponse, FetchMergeArgs } from '../interface/fetch-merge';
import { FilingSummary } from '../interface/filing-summary';
import { FormInformation } from '../interface/form-information';
import { UnitsAdditional } from '../interface/instance';
import { Context, DeiAmendmentFlagAttributes, Instance, LinkFootnote, LinkFootnoteArc, LinkLOC, Units } from '../interface/instance';
import { InstanceFile, MetaLinks, MetaLinksResponse, XhtmlFileMeta } from '../interface/instance-file';
import { Calculation, Meta, Section } from '../interface/meta';
import { UrlParams } from '../interface/url-params';
import { XhtmlPrepData, XhtmlPrepper } from './prepare-inline-doc';
import { buildSectionsArrayFlatter, fetchJson, fetchText, setScaleInfo } from './merge-data-utils';

/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


/* eslint-disable @typescript-eslint/ban-types */

export class FetchAndMerge
{
    private absolute: string;
    private params: UrlParams;
    private customPrefix: string | null;
    private activeInstance: InstanceFile = {} as any;
    private std_ref;
    private sections: Array<Section> = [];
    private metaVersion: string | null = null;
    private instances: InstanceFile[];


    constructor(input: FetchMergeArgs)
    {
        this.absolute = input.absolute;
        this.params = input.params;
        this.customPrefix = input.customPrefix || null;
        this.instances = input.instance ?? [];
        this.std_ref = input.std_ref;
    }

    public async fetch(): Promise<FMResponse>
    {
        const docsAndInstance = () => {
            return Promise.all([this.fetchDocs(), this.fetchInstanceXml()]).then(async ([docs, instXml]) => {
                const errors = [...docs, instXml].filter((element): element is ErrorResponse =>
                    element ? Object.prototype.hasOwnProperty.call(element, 'error') : false);

                if (errors.length) {
                    const errorMessages = errors.map(current => current.messages);
                    throw { all: { error: true, messages: errorMessages.flat() } };
                }

                //At this point, neither of the responses had errors, so we can safely cast them
                docs = docs as Array<{ xhtml: string }>;
                instXml = instXml as Instance;

                docs.filter((doc): doc is { xhtml: string } => "xhtml" in doc)
                    .forEach((doc, index) => {
                        this.activeInstance.docs[index].loaded = true;
                        this.activeInstance.docs[index].xhtml = doc.xhtml;
                    });

                this.activeInstance.xml = instXml;
            });
        };

        const metaAndSummary = () => {
            return Promise.all([this.fetchMeta(), this.fetchSummary()])
                .then(([ml, fs]) =>
                {
                    let error = false;
                    const messages = [];
                    for(const response of [ml, fs])
                    {
                        if ("error" in response && response.error)
                        {
                            messages.push(response.messages);
                            error = true;
                        }
                    }
                    if (error)
                    {
                        throw { all: { error, messages: messages.flat() } };
                    }

                    //At this point, neither of the responses had errors, so we can safely cast them
                    const metalinks = ml as MetaLinks & { instances: InstanceFile[] };
                    const filingSummary = fs as FilingSummary;
                    
                    this.metaVersion = metalinks.version || null;
                    this.std_ref = metalinks.std_ref || {} as any;
                    
                    this.activeInstance = metalinks.instance;

                    return [metalinks, filingSummary] as const;
                });
        };

        /** Sets each instance's `xmlUrl` to the correct value  */
        const getInstanceXmlUrlFromFilingSummary = (filingSummary: FilingSummary, instances: InstanceFile[]) => {
            const filingSummaryReports = filingSummary.MyReports.Report;
        
            //track which HTML slugs we've seen already
            const instanceHtmSlugs = new Set<string>();  // stored in filing summary as foo.htm
            filingSummaryReports.forEach((r) => {
                const reportInstanceHtmSlug = r._attributes?.instance;
                if (reportInstanceHtmSlug && !instanceHtmSlugs.has(reportInstanceHtmSlug)) {
                    instanceHtmSlugs.add(reportInstanceHtmSlug);

                    // add xmlUrls to instances
                    const [metaInstanceModel] = instances.filter((inst) => inst.instanceHtm.includes(reportInstanceHtmSlug));
                    metaInstanceModel.xmlUrl = this.params.metalinks.replace('MetaLinks.json', reportInstanceHtmSlug.replace('.htm', '_htm.xml'));
                }
            });

            //At this point, if the active instance has an invalid `xmlUrl`, we cannot continue
            if (!this.activeInstance?.xmlUrl) {
                throw new Error('Could not determine instance URL of active instance.');
            }
        }


        try
        {
            let metalinks: (MetaLinks & { instances: InstanceFile[]}) | null = null;
            this.activeInstance = this.instances.filter((element) => element.current)[0];
            const initialLoad = this.activeInstance == null;
            let isNcsr = false;

            if (initialLoad)
            {
                const [meta, summ] = await metaAndSummary();
                getInstanceXmlUrlFromFilingSummary(summ, meta.instances);
                
                // iterate over FilingSummary.xml Reports to build sections, adding data from metalinks
                this.sections = buildSectionsArrayFlatter(summ, Object.values(meta.sections), this.metaVersion || "");
                this.setSectionGroupType(this.sections);

                metalinks = meta;
                this.instances = metalinks.instances;

                if (!Array.isArray(summ.InputFiles?.File)) 
                    summ.InputFiles.File = [summ.InputFiles?.File]
                
                isNcsr = summ.InputFiles?.File?.reduce((acc, { _attributes }) =>
                {
                    return acc || _attributes?.isNcsr == "true";
                }, isNcsr);
            }

            await docsAndInstance();

            return { xhtml: this.activeInstance.docs.find((x) => x.current)?.xhtml || "", isNcsr };
        }
        catch(e) { this.errorHandling(e) }
    }

    public async facts(): Promise<FMResponse>
    {
        try
        {
            return { facts: this.buildFactMap() };
        }
        catch(e) { this.errorHandling(e) }
    }

    public async merge(): Promise<All>
    {
        try
        {
            await this.mergeAllResponses();

            const all =
            {
                instance: this.instances,
                sections: this.sections,
                std_ref: this.std_ref,
            };

            return { all };
        }
        catch(e) { this.errorHandling(e) }
    }

    private errorHandling(e: unknown): never
    {  
        console.error(e);

        if (!!e && typeof e == "object" && "all" in e)
            throw e as All;
        else if (e instanceof Error)
            throw { all: { error: true, messages: [e.message] } };
        else
            throw { all: { error: true, messages: [JSON.stringify(e)] } };
    }

    private decodeWorkstationXmlInHtml(isWorkstation: boolean, html: string, closingXml: string) {
        if (!isWorkstation) return html; // not running on SEC EDGAR workstation which encodes xml in HTML

        if (!html.substring(0,100).toLowerCase().includes("<html><head>")) {
            if (html.includes("<title>EDGAR SEC Workstation Login</title>")) {
                console.error("Workstation requires logging in");
                window.alert("Workstation requires logging in");
                return "";
            }
            return html; // it's xml, not html
        }

        // snip extraneous html from beginning and end of response which is present in versions of files on workstation
        // only 5 encodings are used in xml
        html = html.replaceAll('&lt;', '<');
        html = html.replaceAll('&gt;', '>');
        html = html.replaceAll('&quot;', '"');
        html = html.replaceAll('&apos;', '\'');
        html = html.replaceAll('&amp;', '&');
        return html.substring(html.indexOf("<?xml version="), html.indexOf(closingXml) + closingXml.length)
    }

    /**
     * Description
     * @returns {any} => current .htm file (xhtml file) || "Doc"
     */
    private fetchDocs(): Promise<Array<{ xhtml: string } | ErrorResponse>> {
        const promises = this.activeInstance?.docs?.map((doc: { url: string }) => {
            return new Promise<{ xhtml: string } | ErrorResponse>((resolve) => {
                //TODO: use `HelpersUrl.isWorkstation` instead
                const isWorkstation = doc.url.includes("DisplayDocument.do?");
                let ixvUrl = doc.url;
                if (isWorkstation) {
                    if (Object.prototype.hasOwnProperty.call(this.params, 'redline') && this.params.redline) {
                        ixvUrl = ixvUrl.replace('.htm', '_ix2.htm');
                    } else {
                        ixvUrl = ixvUrl.replace('.htm', '_ix1.htm');
                    }
                }

                const params: RequestInit =
                {
                    headers: { "Content-Type": "application/xhtml+xml" },
                    mode: 'no-cors',
                    credentials: 'include',
                };

                fetchText(ixvUrl, params)
                    .then((text) =>
                    {
                        // on SEC EDGAR workstation xhtml is encoded like this: <HTML><HEAD><TITLE> ... &lt;?xml ...
                        const xhtmlData = this.decodeWorkstationXmlInHtml(isWorkstation, text, "</html>");
                        resolve({ xhtml: xhtmlData });
                    })
                    .catch((error) =>
                    {
                        resolve({ error: true, messages: [`${error}; could not find "${this.params.doc}"`] });
                    });
            });
        });

        if (!promises)
            return Promise.resolve([{ error: true, messages: ["Issue fetching XHTMLs"] }]);
        else
            return Promise.all(promises);
    }

    private fetchMeta(): Promise<ErrorResponse | (MetaLinks & { instances: InstanceFile[] })>
    {
        //TODO: use async/await to simplify this logic
        return new Promise<(MetaLinks & { instances: InstanceFile[] }) | ErrorResponse>((resolve) => {
            let jsonUrl = this.params.metalinks;
            //TODO: use `HelpersUrl.isWorkstation` instead
            const isWorkstation = jsonUrl.includes("DisplayDocument.do?");
            if (isWorkstation) {
                if (Object.prototype.hasOwnProperty.call(this.params, 'redline') && this.params.redline) {
                    jsonUrl = jsonUrl.replace('MetaLinks.json', 'PrivateMetaLinks.json');
                }
            }

            return fetchJson(jsonUrl, { credentials: 'include' })
                .then((data: MetaLinksResponse) => {
                    let XHTMLSlug = this.params.doc.substring(this.params.doc.lastIndexOf('/') + 1);
                    if (XHTMLSlug.startsWith("DisplayDocument.do") || XHTMLSlug.startsWith("view.html")) {
                        XHTMLSlug = this.params.doc.substring(this.params.doc.lastIndexOf('filename=') + 9);
                    }

                    const instanceFileNames = Object.keys(data.instance).join().split(/[ ,]+/);
                    let sections = {};
                    if (instanceFileNames.includes(XHTMLSlug)) {
                        const instanceObjects: InstanceFile[] = Object.entries(data.instance).map(([currentInstance, instData], instanceIndex) => {
                            // Sections
                            //TODO: combine these using `Object.entries`
                            Object.keys(instData.report).forEach((report) => {
                                instData.report[report].instanceIndex = instanceIndex; // why?
                            });
                            Object.values(instData.report).forEach(report => {
                                report.instanceHtm = currentInstance;
                            });

                            //NOTE: `sections` get reassigned at every step of this loop, is unused in the rest of the logic
                            //  per loop step, and gets returned (the last value to which it's assigned) once the loop ends
                            sections = Object.assign(sections, instData.report);

                            /* 
                                if instance key has space, e.g. 
                                    "doc1.htm doc2.htm": {...}, 
                                it is known as multi doc.
                            */
                            const xhtmls: XhtmlFileMeta[] = currentInstance.split(' ').map((element) => {
                                return {
                                    slug: element,
                                    url: this.params.doc.replace(this.params['doc-file'], element),
                                    xhtml: null as any,
                                    current: currentInstance.split(' ').includes(XHTMLSlug) && element === this.params['doc-file'],
                                    loaded: false,
                                };
                            });

                            const instFile: InstanceFile =
                            {
                                current: currentInstance.split(' ').includes(XHTMLSlug),
                                instance: instanceIndex, // Why?
                                map: new Map<string, SingleFact>(),
                                metaInstance: Object.assign(instData),
                                instanceHtm: currentInstance,
                                xmlUrl: null as any,
                                docs: xhtmls,
                                formInformation: {} as FormInformation,
                                xmlSlugs: [],
                            };

                            return instFile;
                        });

                        const [instance] = instanceObjects.filter(({ current }) => current);
                        const meta: MetaLinks = { ...data, instance, sections, version: data.version, meta: {} as Meta, inlineFiles: [] };
                        resolve(Object.assign(meta, { instances: instanceObjects }));
                    } else {
                        // this may occur when transferring a filing from one domain to another.  Not sure how to fix...
                        if (!PRODUCTION) {
                            console.log('instanceFileNames does not include XHTMLSlug. fetch-merge > fetchMeta())')
                        }
                        throw new Error('Incorrect MetaLinks.json Instance');
                    }
                })
                .catch((error) => resolve({ error: true, messages: [`${error}; could not find "${this.params.metalinks}"`] }));
        });
    }

    private fetchSummary(): Promise<FilingSummary | ErrorResponse>
    {
        let filingSummXmlUrl = this.params.summary;

        //TODO: use the new `isWorkstation` func in HelpersUrl instead
        const isWorkstation = filingSummXmlUrl.includes("DisplayDocument.do?");
        if (isWorkstation && this.params.redline)
        {
            filingSummXmlUrl = filingSummXmlUrl.replace('FilingSummary.xml', 'PrivateFilingSummary.xml');
        }

        return fetchText(filingSummXmlUrl, { credentials: 'include' })
            .then((data) =>
            {
                const xmlData = this.decodeWorkstationXmlInHtml(isWorkstation, data, "</FilingSummary>");
                const convertedXml = convert.xml2json(xmlData, { compact: true });
                return JSON.parse(convertedXml).FilingSummary as FilingSummary;
            })
            .catch((error) =>
            {
                return ({ error: true, messages: [`${error}; could not find "${this.params.summary}"`] })
            });
    }

    private fetchInstanceXml(): Promise<Instance | ErrorResponse> {
        let xmlUrl = this.activeInstance?.xmlUrl;
        if (!xmlUrl) return Promise.reject({ error: true, messages: ["Issue fetching XML URLs"] });
        
        const isWorkstation = xmlUrl.includes("DisplayDocument.do?");
        if (isWorkstation) {
            // If methods from HelpersUrl are used here some very strange bugs occur, such as window and localStorage undefined.
            if (Object.prototype.hasOwnProperty.call(this.params, 'redline') && this.params.redline) {
                xmlUrl = xmlUrl.replace('_htm.xml', '_ht2.xml')
            } else {
                xmlUrl = xmlUrl.replace('_htm.xml', '_ht1.xml')
            }
        }

        //TODO: we used to pass `{ credentials: 'include' }` to `.then()` (which is wrong);
        //  should we be passing it to `fetchText`??
        return fetchText(xmlUrl)
            .then((text) => {
                const fetchedXMlString = this.decodeWorkstationXmlInHtml(isWorkstation, text, "</xbrl>");

                /*
                    Parsing with arg {compact: true} results in json being in different order and no longer flat
                */
                const instanceXmlAsJsonCompact: Instance = JSON.parse(convert.xml2json(fetchedXMlString, { compact: true }));

                if (instanceXmlAsJsonCompact.xbrl["link:footnoteLink"] && DEBUGJS) {
                    const footnotesNode = instanceXmlAsJsonCompact.xbrl["link:footnoteLink"];
                    // grab xml data as non compact object so element order is preserved.
                    instanceXmlAsJsonCompact.xbrl["link:footnoteLink"].expanded = JSON.parse(convert.xml2json(fetchedXMlString, { compact: false }));
                    instanceXmlAsJsonCompact.xbrl["link:footnoteLink"].orderedFootnoteDivs = footnotesNode.expanded.elements[0].elements;
                    instanceXmlAsJsonCompact.xbrl["link:footnoteLink"].asXmlString = cleanSubstring(fetchedXMlString, '<link:footnoteLink', '</link:footnoteLink>');
                }

                return instanceXmlAsJsonCompact;
            })
            .catch((error) => ({ error: true, messages: [`${error}; could not find "XML Instance Data"`] }));
    }

    private buildFactMap(): Map<string, SingleFact>
    {
        if (!this?.activeInstance?.xml) throw new Error("Error: Active Instance has no XML data");

        // why set to index [0] ? !!!
        // will this break on multidoc? !!!
        this.activeInstance.map = this.buildInitialFactMap(this.activeInstance.xml);
        this.enrichFactMapWithMetalinksData();

        return this.activeInstance.map;
    }

    private async mergeAllResponses(): Promise<void>
    {
        this.activeInstance.formInformation = this.extractFormInformation(this.activeInstance.metaInstance);
        this.customPrefix = this.activeInstance.metaInstance.nsprefix?.toLowerCase() || null;
        
        const prepperData: XhtmlPrepData =
        {
            docs: this.activeInstance.docs,
            facts: this.activeInstance.map,
            customPrefix: this.customPrefix || "",
        };

        await new XhtmlPrepper(prepperData).doWork();
    }

    private buildInitialFactMap(instanceXml: Instance): Map<string, SingleFact> {
        const getInstancePrefix = (instance: Instance) => {
            const options = Object.keys(instance).filter(element => element.endsWith(':xbrl'))[0];
            return options ? options.split(':')[0] : false;
        };

        const prefix = getInstancePrefix(instanceXml);
        const instance: Record<string, any> = instanceXml;

        const xbrlKey = prefix ? `${prefix}:xbrl` : 'xbrl';
        const contextKey = prefix ? `${prefix}:context` : 'context';
        const unitKey = prefix ? `${prefix}:unit` : 'unit';

        const context = instance[xbrlKey][contextKey];
        const unit = instance[xbrlKey][unitKey] || [];
        const footnote = instance[xbrlKey]['link:footnoteLink'];

        delete instance[xbrlKey][contextKey];
        delete instance[xbrlKey][unitKey];
        delete instance[xbrlKey]._attributes;
        delete instance[xbrlKey]['link:schemaRef'];
        delete instance[xbrlKey]['link:footnoteLink'];

        this.setPeriodText(context);
        this.setSegmentData(context);
        this.setMeasureText(unit);

        const factMap = new Map<string, SingleFact>();

        const addFactToMap = (factElem: { _attributes: DeiAmendmentFlagAttributes; _text: string; }, tagName: string) =>
        {
            const attributes = factElem._attributes;
            const id = `fact-identifier-${factCounter++}`;
            const ix = attributes.id || id ;

            factMap.set(ix,
            {
                ...attributes,
                ix,
                id,
                name: tagName,
                value: this.isFactHTML(factElem._text) ? this.updateValueToRemoveIDs(factElem._text) : factElem._text,
                isNegativeOnly: this.isFactNegativeOnly(factElem._text),
                isHTML: this.isFactHTML(factElem._text),
                period: this.setPeriodInfo(attributes.contextRef, context) || "",
                periodDates: this.setPeriodDatesInfo(attributes.contextRef, context),
                segment: this.setSegmentInfo(attributes.contextRef, context),
                measure: this.setMeasureInfo(attributes.unitRef || "", unit),
                scale: setScaleInfo(attributes.scale),
                decimals: this.setDecimalsInfo(attributes.decimals || ""),
                sign: null, // sign exists as attr in inlineDoc, not instance
                footnote: this.setFootnoteInfo(ix, footnote),
                isEnabled: true,
                isHighlight: false,
                isSelected: false,
                filter: { content: this.getTextFromHTML(factElem._text) },
                file: null,
            });
        }

        let factCounter = 0;
        for (const tagName in instance[xbrlKey]) {
            const factElem = instance[xbrlKey][tagName];
            /* example set of tagNames on instance.xbrl
                _attributes
                link:schemaRef
                context
                unit
                dei:DocumentPeriodEndDate
                dei:DocumentType
                dei:EntityRegistrantName
                dei:EntityCommonStockSharesOutstanding
                i09203gd:Content4
                link:footnoteLink
            */
            if (Array.isArray(factElem)) {
                factElem.forEach((factEl: { _attributes: DeiAmendmentFlagAttributes; _text: string; }) => {
                    addFactToMap(factEl, tagName);
                });
            } else {
                addFactToMap(factElem, tagName);
            }
        }

        return factMap;
    }

    private setSectionGroupType(sections: Section[]): Section[]
    {
        // groupType is used in Metalinks v2.1 (and presumably earlier) and was replaced by menuCat in 2.2
        if (Number(this.metaVersion) < 2.2) return sections;

        this.sections.forEach((section) => section.groupType = section.menuCat);

        return sections;
    }

    private extractFormInformation(meta: Meta): FormInformation {
        const metaCopy = Object.assign({}, meta);
        delete metaCopy.report;
        delete metaCopy.tag;
        return metaCopy as unknown as  FormInformation;
    }

    /**
     * Description
     * @returns {any} => updates instance fact map (this.activeInstance.map) with data from meta (this.activeInstance.metaInstance)
     */
    private enrichFactMapWithMetalinksData() {
        const getRefFromMetalinks = (concept: string): string[] => {
            const mlConcept = concept.replace(':', '_');
            if (this.activeInstance?.metaInstance?.tag && this.activeInstance.metaInstance.tag[mlConcept]) {
                const ref = this.activeInstance.metaInstance.tag[mlConcept].auth_ref;
                return Array.isArray(ref) ? ref : [ref];
            }

            return [];
        }

        this.activeInstance?.map.forEach((currentFact: SingleFact) => {
            /* 
                @Doc: Fact 'tags' in metalinks.json vs fact 'names' in instance and doc files
                facts are stored in metalinks.json under instance[<instanceName>].tags
                Not sure why they are called 'tags'
                Tags in xbrl speak are 'concepts', which are also qNames.
                Some tag names look like: 
                    dei_AmendmentDescription
                They have underscores, but in the instance and doc files they have colons:
                    dei:AmendmentDescription
            */
            const factNameTag = currentFact.name.replace(':', '_');
            const factObjectMl = this.activeInstance && this.activeInstance.metaInstance && this.activeInstance.metaInstance.tag ? this.activeInstance.metaInstance.tag[factNameTag]: null; // Ml being metalinks

            if (factObjectMl) {

                /* add references (if any) to each individual fact
                including references via any dimension [name]
                including references via any member [name] */
                if (factObjectMl.auth_ref) {
                    let referenceKeys = [...factObjectMl.auth_ref];

                    if (currentFact.segment) {
                        const refKeys: string[] = [];

                        currentFact.segment.forEach((seg: any) => {
                            if (Array.isArray(seg)) {
                                seg.forEach((nestedSeg: any) => {
                                    if (nestedSeg.dimension) refKeys.push(...getRefFromMetalinks(nestedSeg.dimension));
                                    if (nestedSeg.axis) refKeys.push(...getRefFromMetalinks(nestedSeg.axis));
                                })
                            } else {
                                if (seg.dimension) refKeys.push(...getRefFromMetalinks(seg.dimension));
                                if (seg.axis) refKeys.push(...getRefFromMetalinks(seg.axis));
                            }
                        })

                        referenceKeys = referenceKeys.concat(refKeys.flat());
                    }

                    const references = [...new Set(referenceKeys)]
                        .map((current) => this.std_ref[current])
                        .filter(Boolean);

                    currentFact.references = references.length > 0 ? references : null;


                    // this order specifically for Fact References
                    // any other key => value will be ignored and not shown to the user
                    const requiredOrder = [
                        `Publisher`,
                        `Name`,
                        `Number`,
                        `IssueDate`, // listed in xbrl book but not sure if I should add
                        `Chapter`,
                        `Article`,
                        `Note`,
                        `Exhibit`,
                        `Section`,
                        `Subsection`,
                        `Topic`,
                        `SubTopic`,
                        `Paragraph`,
                        `Subparagraph`,
                        `Sentence`,
                        `Clause`,
                        `Subclause`,
                        `Example`,
                        `Footnote`,
                        `URI`,
                        `URIDate`,
                        `role`,
                    ];

                    if (currentFact.references) {
                        const refsWithOrderedProps = currentFact.references.map((singleReference: Reference) => {
                            return Object.keys(singleReference)
                                .reduce((accumulator, current) => {
                                    const index = requiredOrder.findIndex(element => element === current);
                                    if (index !== -1) {
                                        const returnObject = {};
                                        returnObject[current] = singleReference[current];
                                        accumulator[index] = returnObject;
                                    }
                                    return accumulator;
                                }, new Array(Object.keys(singleReference).length).fill(null))
                                .filter(Boolean);
                        });
                        currentFact.references = refsWithOrderedProps;
                    }
                }

                // add calculations (if any) to each individual fact
                if (factObjectMl.calculation) {
                    const tempFactCalculation = factObjectMl.calculation;
                    currentFact.calculations = [];
                    for (const factCalculationProp in tempFactCalculation) {
                        const result: Calculation[] = this.sections?.map(sectionElement => {
                            if (sectionElement.role === factCalculationProp) {
                                /*
                                    Walter comment: "Although I traced the root cause to a problem in entry point sbsef-fex, still, 
                                    user actions can cause this.sections to be unbound when switching from one instance to another via the “instance” menu.  
                                    So, this section should probably make sure that this.sections is at least an empty list:"
                                */
                                return [
                                    {
                                        label: 'Section',
                                        value: sectionElement.longName,
                                    },
                                    {
                                        label: 'Weight',
                                        value: this.getCalculationWeight(tempFactCalculation[factCalculationProp].weight || 0),
                                    },
                                    {
                                        label: 'Parent',
                                        value: this.getCalculationParent(tempFactCalculation[factCalculationProp].parentTag || ""),
                                    },
                                ];
                            }
                        })
                        .filter(isTruthy);

                        //As usual, this is pushing the wrong type onto the array, but it's been working so why fix it  :eyeroll:
                        currentFact.calculations.push(...result as any);
                    }
                } else {
                    currentFact.calculations = [];
                }

                // add labels (if any) to each individual fact
                if (factObjectMl.lang) {
                    currentFact.labels = Object.values(factObjectMl.lang).map((lang) => {
                        const oldObject = lang.role;
                        const newObject = {} as LabelElement;
                        for (const property in oldObject) {

                            const result = property.replace(/([A-Z])/g, ' $1');
                            const finalResult = result.charAt(0).toUpperCase() + result.slice(1);
                            Object.assign(newObject, { [finalResult]: oldObject[property] });
                        }
                        return newObject
                    });

                    currentFact.filter.labels = currentFact.labels.reduce((accumulator: string, current) => {
                        const tempCurrent = { ...current };
                        delete tempCurrent.documentation;
                        return `${accumulator} ${Object.values(tempCurrent).join(' ')}`;

                    }, '');

                    currentFact.filter.definitions = currentFact.labels.reduce((accumulator, current: { Documentation: string; }) => {
                        return `${accumulator} ${current.Documentation}`;
                    }, '');
                }

                // add credit / debit
                if (factObjectMl.crdr) {
                    const balance = factObjectMl.crdr;
                    currentFact.balance = `${balance.charAt(0).toUpperCase()}${balance.slice(1)}`;
                }

                // add xbrltype
                if (factObjectMl.xbrltype) {
                    currentFact.xbrltype = factObjectMl.xbrltype;
                }

                // add additional info to each individual fact
                //TODO: why aren't these set to "" instead of null?
                currentFact.localname = factObjectMl.localname || null as any;
                currentFact.nsuri = factObjectMl.nsuri || null as any;
                currentFact.presentation = factObjectMl.presentation || null as any;
                currentFact.xbrltype = factObjectMl.xbrltype || null as any;

                currentFact.isAmountsOnly = this.isFactAmountsOnly((currentFact.value ? currentFact.value : ''), currentFact.scale);
                currentFact.isTextOnly = !this.isFactAmountsOnly((currentFact.value ? currentFact.value : ''), currentFact.scale);

            }
        });
    }

    private updateValueToRemoveIDs(input: string) {
        const $ = cheerio.load(input, { xml: false });
        $('[id]').each(function () {
            $(this).removeAttr('id');
        });
        // we also wrap the entirety of the html in a simple div
        $('body').wrapInner('<div></div>');
        return $.html('body');
    }

    private isFactAmountsOnly(input: string, scale?: string | null | undefined): boolean
    {
        return /^-?\d+\d*$/.test(input) && scale != null;
    }

    private isFactNegativeOnly(input: string) {
        return this.isFactAmountsOnly(input) && input.startsWith('-');
    }

    private isFactHTML(input: string) {
        return /<\/?[a-z][\s\S]*>/i.test(input);
    }

    private getTextFromHTML(input: string) {
        if (this.isFactHTML(input)) {
            const $ = cheerio.load(input);
            return $.text();
        }
        return input;
    }

    private setPeriodText(context: Context[]) {
        context = Array.isArray(context) ? context : [context];
        context?.forEach((current) => {
            if (current.period) {
                if (current.period.instant) {
                    const date = new Date(current.period.instant._text);
                    current.period._array = [`${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`];
                    current.period._text = `As of ${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;

                } else if (current.period.startDate && current.period.endDate) {
                    const startDate = new Date(current.period.startDate._text);
                    const endDate = new Date(current.period.endDate._text);

                    const yearDiff = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12;

                    let monthDiff = (endDate.getUTCMonth() - startDate.getUTCMonth()) + yearDiff;
                    const dayDiff = endDate.getUTCDate() - startDate.getUTCDate();

                    //If the difference in days is more than half a month, round up/down as appropriate
                    if(dayDiff > 15)
                    {
                        monthDiff++;
                    }
                    else if(dayDiff < -15)
                    {
                        monthDiff--;
                    }

                    current.period._array =
                    [
                        `${startDate.getUTCMonth() + 1}/${startDate.getUTCDate()}/${startDate.getUTCFullYear()}`,
                        `${endDate.getUTCMonth() + 1}/${endDate.getUTCDate()}/${endDate.getUTCFullYear()}`,
                    ];

                    if (monthDiff <= 0) {
                        current.period._text = `${startDate.getUTCMonth() + 1}/${startDate.getUTCDate()}/${startDate.getUTCFullYear()} - ${endDate.getUTCMonth() + 1}/${endDate.getUTCDate()}/${endDate.getUTCFullYear()}`;
                    } else {
                        //JS counts Jan = UTCMonth-0, so add 1
                        current.period._text = `${monthDiff} months ending ${endDate.getUTCMonth() + 1}/${endDate.getUTCDate()}/${endDate.getUTCFullYear()}`;
                    }
                } else {
                    const log: Logger<ILogObj> = new Logger();
                    log.error(`\nFact Period is NEITHER Instant nor Start / End`);
                }
            }
        });
    }

    private setPeriodInfo(contextRef: string, context: [Context]) {
        // we go through and find the 'id' in context that equals contextRef
        context = Array.isArray(context) ? context : [context];
        const factContext = context?.find((element) => {
            return element._attributes.id === contextRef;
        });
        if (factContext && factContext.period) {
            return factContext.period._text;
        }
    }

    private setPeriodDatesInfo(contextRef: string, context: [Context]) {
        // we go through and find the 'id' in context that equals contextRef
        context = Array.isArray(context) ? context : [context];
        const factContext = context?.find((element) => {
            return element._attributes.id === contextRef;
        });
        if (factContext && factContext.period) {
            return factContext.period._array;
        }
    }

    private setSegmentData(context: Context | undefined) {
        const context2 = Array.isArray(context) ? context : [context];
        context2.forEach((current) => {
            if (current.entity && current.entity.segment) {
                current.entity.segment.data = Object.keys(current.entity.segment).map((key) => {
                    if (Array.isArray(current.entity.segment[key])) {
                        return current.entity.segment[key].map((segment: { _attributes: { dimension: string; }; _text: string; }) => {
                            return {
                                axis: segment._attributes.dimension,
                                dimension: segment._text,
                                type: key.endsWith('explicitMember') ? 'explicit' : 'implicit'
                            }
                        });
                    } else {
                        return {
                            axis: current.entity.segment[key]._attributes.dimension,
                            dimension: current.entity.segment[key]._text ?
                                current.entity.segment[key]._text :
                                current.entity.segment[key][Object.keys(current.entity.segment[key]).filter(element => !element.startsWith('_'))[0]]?._text,
                            type: key.endsWith('explicitMember') ?
                                'explicit' :
                                'implicit',
                            value: !key.endsWith('explicitMember') ?
                                current.entity.segment[key][Object.keys(current.entity.segment[key])[1]]._text :
                                null
                        };
                    }
                });
            }
        });
    }

    private setSegmentInfo(contextRef: string, context: Context[]): SegmentClass[] | undefined {
        context = Array.isArray(context) ? context : [context];
        const factContext = context?.find((e) => e._attributes.id === contextRef);
        return factContext?.entity?.segment?.data;
    }

    private setMeasureText(unit: Units[]) {
        if (!Array.isArray(unit)) {
            unit = [unit];
        }

        //Note: we need to first trick TS into believing a Units is really a UnitsAdditional
        //TODO: have `setMeasureText` take UnitsAdditional instead
        unit.map(u => u as UnitsAdditional)
            .forEach((current: UnitsAdditional) => {
                if (current && current.measure) {
                    const measure = current.measure._text.includes(':') ?
                        current.measure._text.split(':')[1].toUpperCase() :
                        current.measure._text.toUpperCase();
                    current._text = measure;
                } else if (current && current.divide) {
                    const numerator = current.divide.unitNumerator.measure._text.includes(':') ?
                        current.divide.unitNumerator.measure._text.split(':')[1].toUpperCase() :
                        current.divide.unitNumerator.measure._text.toUpperCase();

                    const denominator = current.divide.unitDenominator.measure._text.includes(':') ?
                        current.divide.unitDenominator.measure._text.split(':')[1].toUpperCase() :
                        current.divide.unitDenominator.measure._text.toUpperCase();

                    current._text = `${numerator} / ${denominator}`;
                }
            });
    }

    private setMeasureInfo(unitRef: string, unit: Units): string | undefined
    {
        if (unit)
        {
            const findMatchingUnit = (unitArray: Units[]) => unitArray.find((element) => element._attributes.id === unitRef);
            const factUnit = Array.isArray(unit) ? findMatchingUnit(unit) : findMatchingUnit([unit]);

            if (factUnit && ("measure" in factUnit || "divide" in factUnit))
            {
                //Note: I suspect that we want factUnit.["measure" || "divide"]._text
                return factUnit._text;
            }
        }
    }

    private setDecimalsInfo(decimals: string): Decimals | null
    {
        const decimalsOptions: Record<string, Decimals> =
        {
            "-1": Decimals.Tens,
            "-2": Decimals.Hundreds,
            "-3": Decimals.Thousands,
            "-4": Decimals.TenThousands,
            "-5": Decimals.HundredThousandths,
            "-6": Decimals.Millions,
            "-7": Decimals.TenMillions,
            "-8": Decimals.HundredMillions,
            "-9":  Decimals.Billions,
            "-10": Decimals.TenBillions,
            "-11": Decimals.HundredBillions,
            "-12": Decimals.Trillions,
            1: Decimals.Tenths,
            2: Decimals.Hundredths,
            3: Decimals.Thousandths,
            4: Decimals.TenThousandths,
            5: Decimals.HundredThousandths,
            6: Decimals.Millionths,
        };

        return decimalsOptions[decimals] || null;
    }

    private setSignInfo(sign: string): string | null {
        const signOptions: Record<string, string> = {
            '-': 'Negative',
            '+': 'Positive',
        };
        
        return signOptions[sign];
    }

    /**
     * Description
     * @param {any} ftObj:object
     * @param {any} result?:string|undefined
     * @returns {any} concatenated text from all footnote nodes, joined by a ' '
     */
    private accumulateFootnote(ftObj: LinkFootnote | Record<string, unknown>, result = "") {
        const truncateFootnoteTo = 100;

        if (result?.length > truncateFootnoteTo) {
            result = result.substring(0, truncateFootnoteTo).substring(0, result.lastIndexOf(" ") + 1);
            return result += ' ...';
        }

        Object.entries(ftObj).forEach(([key, value]) =>
        {
            if (key == "_text") {
                result += String(value);
            }
            else if (Array.isArray(value)) {
                value.forEach(childNode => {
                    result = this.accumulateFootnote(childNode, result);
                })
            }
            else if (key.substring(0,6) == "xhtml:") {
                result = this.accumulateFootnote(value, result);
            }
        });

        return result;
    }

    /**
     * Description
     * @param {any} id:string
     * @param {any} footnotes:{"link:loc":LinkLOC[]
     * @param {any} "link:footnote":LinkFootnote[];"link:footnoteArc":LinkFootnoteArc[];}
     * @param {string} asXmlString footnotes part of fetched xml text
     * @returns {any} renderable footnote text (or xml string) to be displayed in fact modal
     * todo: handle incoming footnotes.asXmlString or footnotes.xmlExpanded to show all content (in order) instead of just text
     * todo: handle images, tables, ...other html elements (currently just concatenating text content)
     * the above todos are WIP and are handled when useFetchedFootnoteXmlStrings is set to true.
     */
    private setFootnoteInfo(id: string, footnotes: {
        "link:loc": LinkLOC[],
        "link:footnote": LinkFootnote[],
        "link:footnoteArc": LinkFootnoteArc[],
        "asXmlString": string,
    }) {
        if (footnotes && footnotes['link:footnoteArc']) {
            const factFootnote = Array.isArray(footnotes['link:footnoteArc']) 
                ? footnotes['link:footnoteArc'].find((element) => element._attributes['xlink:from'] === id ) 
                : [footnotes['link:footnoteArc']].find((element) => element._attributes['xlink:from'] === id )
            if (factFootnote) {
                if (footnotes['link:footnote']) {
                    if (Array.isArray(footnotes['link:footnote'])) {
                        const actualFootnote = footnotes['link:footnote']?.find((element) => {
                            return element._attributes.id === factFootnote._attributes['xlink:to'];
                        });

                        const useFetchedFootnoteXmlStrings = false;
                        const useParsedFootnote = !useFetchedFootnoteXmlStrings;

                        if (useParsedFootnote) {
                            return this.accumulateFootnote(actualFootnote || {} as Record<string, unknown>);
                        }

                        // Rest of this if block is WIP for rendering all div types in footnote cell

                        // GO FIND PART OF footnotes.xmlString that corresponds to actual footnote
                        // return that substring ... so you can render it in fact-pages.ts
                        // we only need '<link:footnote ... > string for each footnote to render
                        // find all <link:footnote ... > xml strings and put in array
                        // then find the one that matches the xlink:to value with its id

                        const startTagRegex = /<link:footnote /gi; 
                        let startTagResults: RegExpExecArray | null = null;
                        const footnoteStartIndices:number[] = [];
                        while(!!(startTagResults = startTagRegex.exec(footnotes.asXmlString))) {
                            footnoteStartIndices.push(startTagResults.index);
                        }

                        const endTagRegex = /<\/link:footnote>/gi; 
                        let endTagResults: RegExpExecArray | null = null;
                        const footnoteEndIndices:number[] = [];
                        while(!!(endTagResults = endTagRegex.exec(footnotes.asXmlString))) {
                            footnoteEndIndices.push(endTagResults.index + ('</link:footnote>').length);
                        }

                        const footnotesAsXmlStrings: string[] = [];

                        footnoteStartIndices.forEach((start, indexInArrayOfStarts) => {
                            const pluckedFootnote = footnotes.asXmlString.substring(start, footnoteEndIndices[indexInArrayOfStarts]);
                            footnotesAsXmlStrings.push(pluckedFootnote);
                        })

                        const relevantFootnoteAsXmlString = footnotesAsXmlStrings.find(fn => {
                            return fn.indexOf(factFootnote._attributes['xlink:to']) != -1;
                        })

                        return relevantFootnoteAsXmlString;
                    } else {
                        // TODO we need way more cases
                        //uhh, no we don't, because the first 2 cases cover EVERYTHING
                        if (!Array.isArray(footnotes['link:footnote']._text)) {
                            return footnotes;
                        } else if (Array.isArray(footnotes['link:footnote']._text)) {
                            return footnotes['link:footnote']._text.join('');
                        } else if (footnotes['link:footnote']['xhtml:span']) {
                            return footnotes['link:footnote']['xhtml:span']._text;
                        }
                    }
                }
            }
        }
        return null;
    }

    private getCalculationWeight(weight: number) {
        if (weight > 0)
            return `Added to parent(${weight.toFixed(2)})`;
        else if (weight < 0)
            return `Substracted from parent(${weight.toFixed(2)})`;
        else
            return 'Not Available.';
    }

    private getCalculationParent(parent: string) {
        if (parent) {
            return parent.replace('_', ':');
        }
        return 'Not Available.';
    }
}
