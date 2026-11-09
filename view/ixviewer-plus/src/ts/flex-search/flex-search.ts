import { Document as FlexSearchDocument } from "flexsearch";
import { FactMap } from "../facts/map";
import { SingleFact } from "../interface/fact";
import { Logger, ILogObj } from "tslog";
import { Constants } from "../constants/constants";
import { ReferenceAsArray } from "../interface/facts"

/*
    Flex Search version: 0.7.31
    Flex search docs: https://www.npmjs.com/package/flexsearch/v/0.7.31 
*/

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
    options: (number | null)[],
    clauses: string[][],
}
interface Index {
    id: string,
    field: string | undefined,
    search?: (searchObject: SearchObject) => SearchResult[]
}

function intersect(sets: Set<string>[]) {
    if (sets.length === 0) return new Set()
    const sorted = [...sets].sort((a, b) => a.size - b.size)

    return sorted.slice(1).reduce((acc, curr) => {
        const next: Set<string> = new Set()
        acc.forEach(id => { if (curr.has(id)) next.add(id) })
        return next
    }, new Set(sorted[0]))
}

function getDimensionCounts(): void {
    const axis = FactMap.getAllAxis();
    Constants.axesCount = axis.length;
    const members = FactMap.getAllMembers();
    Constants.membersCount = members.length;
}

function addId(map: Map<string, Set<string>>, key: string, id: string) {
    let set = map.get(key);
    if (!set) {
        set = new Set();
        map.set(key, set);
    }
    set.add(id);
}

export class FlexSearch { // maybe this should be ixFlexSearch and we need to use new FlexSearch to init class
    // https://github.com/nextapps-de/flexsearch?tab=readme-ov-file
    // We have added a LOT of our own code to make filters work as expected.  Might be easier not to use a library at all...
    // Maybe look into https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

    // Exact-match lookups (value -> ids of facts having that value).
    // Used for axis / member FILTERS. FlexSearch (below) is used for free-text SEARCH.
    static axisIds: Map<string, Set<string>> = new Map();
    static memberIds: Map<string, Set<string>> = new Map();

    static index: Index = {
        id: '',
        field: undefined,
    }
    static indexCount: number;
    static standardProps = [
        'content', 'raw', 'factname', 'contextRef', 'labels', 'definitions', 'period', 'measure', 
        'axis', 'member', 
        'scale', 'balance', 'custom', 'amount',
        'text', 'calculation', 'negative', 'additional', 'dimensions'
    ];
    static referenceProps = [
        'refTopic', 'refSubtopic', 'refParagraph', 'refPublisher', 'refSection', 'refNumber'
    ];

    public static init(mapOfFacts: Map<string, SingleFact>): Promise<any> {
        this.index = new FlexSearchDocument({
            tokenize: mapOfFacts.size > 5000 ? 'strict' : 'full', // strict is very fast, reverse slower
            // resolution: 1,
            // depth: 1,
            document: {
                id: 'id',
                index: [...FlexSearch.standardProps, ...FlexSearch.referenceProps],
            },
        });

        FlexSearch.indexCount = mapOfFacts.size;
        FactMap.init(mapOfFacts); // not totally sure why we have to run this, but if we don't some filters tests break.
        getDimensionCounts();

        // reset so reloading a filing doesn't accumulate stale ids
        FlexSearch.axisIds = new Map();
        FlexSearch.memberIds = new Map();

        const getSearchableRefDataByProp = (refs: ReferenceAsArray[] | null, propName: string) => {
            // could improve perf by iterating through fact refs just once... instead of for each propName
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

        mapOfFacts.forEach((fact, factIndex) => {
            // segment may be an object, an array, or nested arrays
            const segs = ([] as any[]).concat(fact?.segment ?? []).flat();

            // exact lookups for filtering
            for (const s of segs) {
                if (s?.axis) addId(FlexSearch.axisIds, s.axis, factIndex);
                if (s?.member) addId(FlexSearch.memberIds, s.member, factIndex);
            }

            // text for free-text search
            const axisTexts = segs.map(s => s?.axis).filter(Boolean);
            const memberTexts = segs.map(s => s?.member).filter(Boolean);

            const searchable = {
                'id': factIndex,
                'content': fact?.filterContent?.content,
                'raw': fact?.format ? `${fact?.raw.toString()}` : null,
                'factname': fact?.name,
                'contextRef': fact?.contextRef,
                'labels': fact.filterContent?.labels,
                'definitions': fact?.filterContent?.definitions,
                'period': fact.period,
                'measure': fact.measure,
                'axis': axisTexts.length ? axisTexts : null,
                'member': memberTexts.length ? memberTexts : null,
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

        return new Promise(resolve => {
            resolve({ msg: "search init complete" });
        })
    }

    /**
     * Description
     * @param {any} searchParams.options -> {} array of numbers corresponding to search fields checkboxes (name, conent, labels, definitions, dimensions, references) 
     * @param {any} searchParams.value -> text search value
     * @returns {any}
     */
    // { options, value }

    static searchTerm(term: string, options: (number | null)[]) {
        const optionFields: (string | null)[] = [
            null,
            'factname',
            'content',
            'labels',
            'definitions',
            'dimensions',
            'references',
        ];
        const searchObject: SearchObject[] = options?.reduce((acc: Array<SearchObject>, curr) => {
            if (curr === null) return acc
            if (optionFields[curr]) {
                if (optionFields[curr] === 'content') {
                    acc.push({
                        field: 'raw',
                        query: term,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                    }, {
                        field: 'content',
                        query: term,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                    });
                } else if (optionFields[curr] === 'dimensions') {
                    // dimensions search = text of axes and members
                    ['axis', 'member'].forEach(dimField => {
                        acc.push({
                            field: dimField,
                            query: term,
                            bool: 'or',
                            limit: FlexSearch.indexCount,
                        });
                    });
                } else if (optionFields[curr] === 'references') {
                    // we add multiple
                    FlexSearch.referenceProps.forEach(refProp => {
                        acc.push({
                            field: refProp,
                            query: term,
                            bool: 'or',
                            limit: FlexSearch.indexCount,
                        });
                    })
                } else {
                    // we add just oneuuu
                    acc.push({
                        field: optionFields[curr],
                        query: term,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                    });
                }
            }
            return acc;
        }, []);

        const ids: Set<string> = new Set()
        this.index.search?.(searchObject).forEach(({ result }) => result.forEach((id) => ids.add(id)))
        return ids
    }

    static searchFacts(searchParams: SearchParams) {
        const finalIds = new Set();

        // "cat and dog or mouse and sheep" -> [["cat", "dog"],["mouse","sheep"]] -> (clauses)
        // ["cat", "dog"]     => clause 1
        // ["mouse","sheep"]  => clause 2
        searchParams.clauses?.forEach((clause: string[]) => {
            const termSets: Set<string>[] = clause.map((term: string) => this.searchTerm(term, searchParams.options))
            // termSet = [{set of fact ids for facts containg "cat"}, {set of fact ids for facts containg "cat"}]
            intersect(termSets).forEach(id => finalIds.add(id))
        })

        return finalIds
    }

    static filterFacts(dataFields: any, filterState: any) {
        const startPerf = performance.now();

        let dataFilterActive = null;
        let tagFilterActive = null;

        // Exact-match sets for axis / member (union of selected values within each field)
        const exactSets: Set<string>[] = [];

        const filterObject = Object.keys(filterState).reduce((accumulator: Array<SearchObject>, filterKey: string | number | string[]) => {
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
            } else if (filterKey === 'axis' || filterKey === 'member') {
                // exact match via Maps, NOT FlexSearch (tokenized/ranked, loses or adds facts)
                const selected: string[] = filterState[filterKey] ?? [];
                if (selected.length > 0) {
                    const lookup = filterKey === 'axis' ? FlexSearch.axisIds : FlexSearch.memberIds;
                    const combined = new Set<string>();
                    selected.forEach(val => {
                        lookup.get(String(val))?.forEach(id => combined.add(id));
                    });
                    exactSets.push(combined);
                }
            } else {
                accumulator.push(filterState[filterKey].map((currentFilterVal: string | number | string[]) => {

                    // have to manually figure out how many facts have the prop / val to set the limit of the search, which flexsearch is 
                    // smart enough to choose the most correct matches.
                    // On it's own flexsearch returns too many results due to partial matches.
                    const matchCount = FactMap.asArray().filter(f => f[filterKey] == currentFilterVal).length;

                    return {
                        field: filterKey,
                        query: currentFilterVal,
                        bool: 'or',
                        // never pass 0: FlexSearch would fall back to its default limit of 100
                        limit: matchCount > 0 ? matchCount : FlexSearch.indexCount,
                        key: filterKey,
                    };
                }));
            }
            return accumulator;
        }, []).flat();

        if (filterObject.length > 0 || exactSets.length > 0) {

            // APPLY FILTER
            const queryResultObjs: SearchResult[] = filterObject.length > 0
                ? this.index.search(filterObject)
                : [];

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

            // .union all "more" data sets (FlexSearch-based fields plus exact axis/member sets)
            const moreDataResults = resultsWithSets.filter(res => {
                return !dataFields.slice(1).includes(res.field) && res.field !== "custom";
            })
            const moreSets: Set<string>[] = [
                ...moreDataResults.map(res => res.resultSet as Set<string>),
                ...exactSets,
            ];
            const moreDataCombined = moreSets.reduce((a: Set<string> | null, c) => {
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
            let finalSet: Set<string> | null = null;
            if ((dataFilterActive || tagFilterActive) && !dataTagsIntersection) {
                finalSet = null;
            } else if (!dataTagsIntersection || !moreDataCombined) {
                finalSet = dataTagsIntersection || moreDataCombined;
            } else if (dataTagsIntersection && moreDataCombined) {
                finalSet = dataTagsIntersection.intersection(moreDataCombined);
            }

            if (LOGPERFORMANCE || Constants.logPerfParam) {
                const endPerf = performance.now();
                const log: Logger<ILogObj> = new Logger();
                log.debug(`FlexSearch Filter completed in: ${(endPerf - startPerf).toFixed(2)}ms`);
            }

            if (finalSet) {
                const filteredArray: string[] = Array.from(finalSet);

                // FactMap.setEnabledFacts(filteredArray);
                return filteredArray;
            } else {
                // FactMap.setEnabledFacts([]);
                return []; // no facts match applied filters, no facts should be enabled
            }
        } else {
            return null; // no filter applied, all facts should be enabled
        }
    }
}