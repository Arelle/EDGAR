import { Document as FlexSearchDocument } from "flexsearch";
import { FactMap } from "../facts/map";
import { Facts } from "../facts/facts";
import { UserFiltersDropdown } from "../user-filters/dropdown";
import { UserFiltersState } from "../user-filters/state";
import { SingleFact, ReferenceAsArray } from "../interface/fact";


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

interface document {
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

export class FlexSearch {
    // Maybe look into https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
    static document:document = {
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
        this.document = new FlexSearchDocument({
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

        FactMap.map.forEach((currentValue, currentIndex) => {
            const searchable = {
                'id': currentIndex,
                'content': `${currentValue?.filter?.content}`,
                'raw': currentValue?.format ? `${currentValue?.raw.toString()}` : null,
                'factname': currentValue?.name,
                'contextRef': currentValue?.contentRef,
                'labels': currentValue.filter?.labels,
                'definitions': currentValue?.filter?.definitions,
                'period': currentValue.period,
                'measure': currentValue.measure,
                'axis': currentValue?.segment?.map(element => element.axis),
                'member': currentValue?.segment?.map(element => element.dimension),
                'scale': currentValue.scale,
                'balance': currentValue.balance,
                // tags
                'custom': currentValue.isCustom?.toString(),
                // data
                'amount': currentValue.isAmountsOnly?.toString(),
                'text': currentValue.isTextOnly?.toString(),
                'calculation': ((currentValue?.calculations?.length > 0) && (!currentValue?.segment?.map(element => element.dimension).length)).toString(),
                'negative': currentValue.isNegativeOnly ? currentValue.isNegativeOnly.toString() : null,
                'additional': currentValue.isAdditional ? currentValue.isAdditional.toString() : null,
                // references
                'refTopic': getSearchableRefDataByProp(currentValue.references, 'Topic'),
                'refSubtopic': getSearchableRefDataByProp(currentValue.references, 'SubTopic'),
                'refParagraph': getSearchableRefDataByProp(currentValue.references, 'Paragraph'),
                'refPublisher': getSearchableRefDataByProp(currentValue.references, 'Publisher'),
                'refSection': getSearchableRefDataByProp(currentValue.references, 'Section'),
                'refNumber': getSearchableRefDataByProp(currentValue.references, 'Number'),
            };
            this.document.add(searchable);
        });
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
        const ids = this.document.search(searchObject);
        const uniqueArray = [...new Set([].concat(...ids.map(current => current.result)))];
        if (suggest) {
            return uniqueArray;
        }
        FactMap.setHighlightedFacts(uniqueArray);
        Facts.inViewPort(true);
        Facts.updateFactCount();
    }

    static filterFacts() {

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

        const searchObject = Object.keys(filterState).reduce((accumulator: Array<SearchObject>, filterKey: string|number|string[]) => {
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
                accumulator.push(filterState[filterKey].map((nested:string|number|string[]) => {
                    return {
                        field: filterKey,
                        query: nested,
                        bool: 'or',
                        limit: FlexSearch.indexCount,
                        key: filterKey
                    };
                }));
            }
            return accumulator;
        }, []).flat();

        if (searchObject.length > 0) {
            const queryResultObjs = this.document.search(searchObject);
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
    }
}
