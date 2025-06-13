import { Document as FlexSearchDocument } from "flexsearch";
import { FactMap } from "../facts/map";
import { Facts } from "../facts/facts";
import { UserFiltersDropdown } from "../user-filters/dropdown";
import { UserFiltersState } from "../user-filters/state";
import { SingleFact, ReferenceAsArray, SegmentClass } from "../interface/fact";
import { Logger, ILogObj } from "tslog";

interface SearchObject {
    field: string,
    query: string,
    bool: string,
    limit: number,
    key?: string
}

interface SearchResult {
    field: string,
    result: string[],
    resultSet?: Set<string>,
}
interface SearchParams {
    options: (number|null)[],
    value: string,
}

interface SearchFacts { // eslint-disable-line
    (searchParams:SearchParams): void
}

interface index {
    id: string,
    field: string | undefined,
    search?: (searchObject:SearchObject) => SearchResult[]
}

// interface filterState {
//     data?: string,
//     tags?: number,
//     period?: string[],
//     measure?: string[],
//     axis?: string[],
//     member?: string[],
//     scale?: string[],
//     balance?: string[],
//     type?: string[],
// };

export class FlexSearch { // maybe this should be ixFlexSearch and we need to use new FlexSearch to init class
    // https://github.com/nextapps-de/flexsearch?tab=readme-ov-file
    // We have added a LOT of our own code to make filters work as expected.  Might be easier not to use a library at all...
    // Maybe look into https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

    static index:index = {
        id: '',
        field: undefined,
    }
    static indexCount: number;

    static standardProps = [
        'content', 'raw', 'factname', 'contextRef', 'labels', 'definitions', 'period',
        'measure', 'axis', 'member', 'scale', 'balance', 'custom', 'amount',
        'text', 'calculation', 'negative', 'additional', 'dimensions'
    ];
    static referenceProps = ['refTopic', 'refSubtopic', 'refParagraph', 'refPublisher', 'refSection', 'refNumber'];

    static init(mapOfFacts: Map<string, SingleFact>): void {
        const startPerf = performance.now();
        this.index = new FlexSearchDocument({
            tokenize: 'full',
            document: {
                id: 'id',
                index: [...FlexSearch.standardProps, ...FlexSearch.referenceProps]
            }
        });

        FlexSearch.indexCount = mapOfFacts.size;
        FactMap.init(mapOfFacts);

        const getSearchableRefDataByProp = (refs: ReferenceAsArray[], propName: string) => {
            if (refs) {
                const combinedValsPerRefProp = refs.reduce((combinedVals, ref) => {
                    return ref.reduce((combinedVals: string, refPropObject:{string: string}) => {
                        return (`${combinedVals} ${(refPropObject && refPropObject[propName]) ? refPropObject[propName] : ''}`).trim()
                    }, combinedVals)
                }, '')
                return combinedValsPerRefProp.length === 0 ? null : combinedValsPerRefProp;
            }
            return null;
        };

        const getAxes = (segments: Array<SegmentClass[] | SegmentClass>) => {
            if (!segments) return;
            return segments.map(seg => {
                if (Array.isArray(seg)) {
                    return seg.map(segItem => segItem.axis);
                } else {
                    return seg.axis;
                }
            })
        }

        const getMembers = (segments: Array<SegmentClass[] | SegmentClass>) => {
            if (!segments) return;
            return segments.map(seg => {
                if (Array.isArray(seg)) {
                    return seg.map(segItem => segItem.dimension);
                } else {
                    return seg.dimension;
                }
            })
        }

        FactMap.map.forEach((fact, factIndex) => {
            const searchable = {
                'id': factIndex,
                'content': `${fact?.filterContent?.content}`,
                'raw': fact?.format ? `${fact?.raw.toString()}` : null,
                'factname': fact?.name,
                'contextRef': fact?.contextRef,
                'labels': fact.filterContent?.labels,
                'definitions': fact?.filterContent?.definitions,
                'period': fact.period,
                'measure': fact.measure,
                'axis': fact?.segment ? getAxes(fact?.segment) : null,
                'member': fact?.segment ? getMembers(fact?.segment) : null,
                'scale': fact.scale,
                'balance': fact.balance,
                // tags
                'custom': fact.isCustom?.toString(),
                // data
                'amount': fact.isAmountsOnly?.toString(),
                'text': fact.isTextOnly?.toString(),
                'calculation': ((fact?.calculations?.length > 0) && (!fact?.segment?.map(element => element.dimension).length)).toString(),
                'negative': fact.isNegativeOnly ? fact.isNegativeOnly.toString() : null,
                'additional': fact.isAdditional ? fact.isAdditional.toString() : null,
                // references
                'refTopic': getSearchableRefDataByProp(fact.references, 'Topic'),
                'refSubtopic': getSearchableRefDataByProp(fact.references, 'SubTopic'),
                'refParagraph': getSearchableRefDataByProp(fact.references, 'Paragraph'),
                'refPublisher': getSearchableRefDataByProp(fact.references, 'Publisher'),
                'refSection': getSearchableRefDataByProp(fact.references, 'Section'),
                'refNumber': getSearchableRefDataByProp(fact.references, 'Number'),
            };
            this.index.add(searchable);
        });
        const endPerf = performance.now();
        if (LOGPERFORMANCE) {
            const log: Logger<ILogObj> = new Logger();
            log.debug(`FlexSearch init() completed in: ${(endPerf - startPerf).toFixed(2)}ms`);
        }
    }

    /**
     * Description
     * @param {any} searchParams.options -> {} array of numbers corresponding to search fields checkboxes (name, conent, labels, definitions, dimensions, references) 
     * @param {any} searchParams.value -> text search value
     * @param {any} suggest=false
     * @returns {any}
     */
    // { options, value }
    static searchFacts(searchParams: SearchParams, suggest = false) {
        const optionFields: (string|null)[] = [
            null,
            'factname',
            'content',
            'labels',
            'definitions',
            'dimensions',
            'references',
        ];
        const searchObject = searchParams.options?.reduce((acc: Array<SearchObject>, current) => {
            if (optionFields[current]) {
                if (optionFields[current] === 'content') {
                    acc.push({
                        field: 'raw',
                        query: searchParams.value as string,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                    });
                    acc.push({
                        field: 'content',
                        query: searchParams.value as string,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                    });
                } else if (optionFields[current] === 'references') {
                    // we add multiple
                    FlexSearch.referenceProps.forEach(refProp => {
                        acc.push({
                            field: refProp,
                            query: searchParams.value as string,
                            bool: 'or',
                            limit: FlexSearch.indexCount,
                        });
                    })
                } else {
                    // we add just one
                    acc.push({
                        field: optionFields[current] as string,
                        query: searchParams.value as string,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                    });
                }
            }
            return acc;
        }, []);
        const ids = this.index.search(searchObject);
        const uniqueArray = [...new Set([].concat(...ids.map(current => current.result)))];
        if (suggest) {
            return uniqueArray;
        }
        FactMap.setHighlightedFacts(uniqueArray);
        Facts.inViewPort(true);
        Facts.updateFactCount();
    }

    static filterFacts() {
        const startPerf = performance.now();
        const dataFields = [
            null,
            'amount',
            'text',
            'calculation',
            'negative',
            'additional'
        ];

        const filterState = {
            data: dataFields[UserFiltersState.getDataRadios],
            tags: UserFiltersState.getTagsRadios,
            period: UserFiltersState.getPeriod,
            measure: UserFiltersState.getMeasure,
            axis: UserFiltersState.getAxes,
            member: UserFiltersState.getMembers,
            scale: UserFiltersState.getScale,
            balance: UserFiltersState.getBalance,
            type: UserFiltersState.getType,
        };

        let dataFilterActive = null;
        let tagFilterActive = null;

        const filterObject = Object.keys(filterState).reduce((accumulator: Array<SearchObject>, filterKey: string|number|string[]) => {
            if (filterKey === 'data') {
                if (filterState[filterKey]) {
                    dataFilterActive = true;
                    accumulator.push({
                        field: filterState[filterKey] as string,
                        query: 'true',
                        bool: 'and',
                        limit: FlexSearch.indexCount,
                        key: filterKey
                    });
                }
            } else if (filterKey === 'tags') {
                // standard tags '1' or custom tags '2'
                if (filterState[filterKey] === 1 || filterState[filterKey] === 2) {
                    tagFilterActive = true;
                    accumulator.push({
                        field: 'custom',
                        query: filterState[filterKey] === 1 ? 'false' : 'true',
                        bool: 'and',
                        limit: FlexSearch.indexCount,
                        key: filterKey
                    });
                }
            } else {
                accumulator.push(filterState[filterKey].map((currentFilterVal:string|number|string[]) => {

                    // have to manually figure out how many facts have the prop / val to set the limit of the search, which flexsearch is 
                    // smart enough to choose the most correct matches.
                    // On it's own flexsearch returns too many results due to partial matches.
                    const matchCount = FactMap.asArray().filter(fact => fact[filterKey] == currentFilterVal).length
                    // seems to increase filter time by only ~5%

                    return {
                        field: filterKey,
                        query: currentFilterVal,
                        bool: 'or',
                        // limit: FlexSearch.indexCount,
                        limit: matchCount,
                        key: filterKey,
                        tokenize: 'strict', // does nothing; 'exact' also does nothing;
                    };
                }));
            }
            return accumulator;
        }, []).flat();

        if (filterObject.length > 0) {

            // APPLY FILTER
            const queryResultObjs = this.index.search(filterObject);

            const resultsWithSets = queryResultObjs.map((res: SearchResult) => {
                res.resultSet = new Set(res.result);
                return res;
            })

            // find intersection with data and tags sets
            const dataResults = resultsWithSets.filter((res: SearchResult) => {
                return dataFields.slice(1).includes(res.field)
            }).map((r: SearchResult) => r.resultSet)[0];

            const tagsResults = resultsWithSets.filter((res: SearchResult) => res.field == "custom").map((r: SearchResult) => r.resultSet)[0];

            let dataTagsIntersection = undefined
            if ((dataFilterActive && !dataResults) || (tagFilterActive && !tagsResults)) {
                dataTagsIntersection = null;
            }
            else if (!dataResults || !tagsResults) {
                dataTagsIntersection = dataResults || tagsResults;
            }
            else if (dataResults && tagsResults) {
                dataTagsIntersection = dataResults.intersection(tagsResults);
            }

            // .union all "more" data sets
            const moreDataResults = resultsWithSets.filter(res => {
                return !dataFields.slice(1).includes(res.field) && res.field !== "custom";
            })
            const moreDataCombined = moreDataResults.map(res => {
                return res.resultSet
            }).reduce((a, c) => {
                if (!a || !c) {
                    if (!a && !c) {
                        return null;
                    }
                    return a || c;
                } else {
                    return a.union(c);
                }
            }, null);
            
            // find intersection of data/tags & more
            let finalSet: string[] | null = null;
            if ((dataFilterActive || tagFilterActive) && !dataTagsIntersection) {
                finalSet = null;
            } else if (!dataTagsIntersection || !moreDataCombined) {
                finalSet = dataTagsIntersection || moreDataCombined;
            } else if (dataTagsIntersection && moreDataCombined) {
                finalSet = dataTagsIntersection.intersection(moreDataCombined);
            }

            if (finalSet) {
                const filteredArray: string[] = Array.from(finalSet);
                FactMap.setEnabledFacts(filteredArray);
            } else {
                FactMap.setEnabledFacts([]);
            }
        } else {
            FactMap.resetEnabledFacts();
        }
        Facts.inViewPort(true);
        UserFiltersDropdown.init();
        Facts.updateFactCount();
        const endPerf = performance.now();
        if (LOGPERFORMANCE) {
            const log: Logger<ILogObj> = new Logger();
            log.debug(`FlexSearch Filter completed in: ${(endPerf - startPerf).toFixed(2)}ms`);
        }
    }
}
