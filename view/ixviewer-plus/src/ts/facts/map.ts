import { ErrorsMinor } from "../errors/minor";
import { isTruthy } from "../helpers/utils";
import { SingleFact } from "../interface/fact";
import { UserFiltersState } from "../user-filters/state";

export const FactMap: {
    map: Map<string, SingleFact>,
    init: (mapOfFacts: Map<string, unknown>) => void,
    asArray: () => Array<SingleFact>,
    setHighlightedFacts: (arrayOfIDs: Array<string>) => void,
    setEnabledFacts: (arrayOfIDs: Array<string>) => void,
    resetEnabledFacts: () => void,
    getAllMeasures: () => Array<string>,
    getAllAxis: () => Array<string>,
    getByID: (id: string) => SingleFact | null,
    getEnabledFacts: () => Array<{ id: string, isAdditional: boolean }>,
    getEnabledHighlightedFacts: () => Array<{ id: string, isAdditional: boolean }>,
    getFactCountForFile: (fileName: string) => string,
    getFactCount: () => string,
    getTextFactCount: () => number,
    getNumberFactCount: () => number,
    getFullFacts: () => Array<SingleFact>,
    getByNameContextRef: (name: string, contextRef: string) => SingleFact | null,
    getByName: (name: string) => string,
    getAllScales: () => Array<string>,
    getAllMembers: () => Array<string>,
    getAllPeriods: () => { [key: string]: [] },
    getTagLine: () => any[],
    setIsSelected: (input: string | null) => void,
} = {

    map: new Map<string, SingleFact>(),

    init: (mapOfFacts: Map<string, unknown>): void => {
        FactMap.map.clear();

        Array.from(new Map([...mapOfFacts]), (entry: any) => {
            if (entry[1].id) {
                FactMap.map.delete(entry[0]);
                FactMap.map.set(entry[1].id, entry[1]);
            }
        });
    },

    asArray: (): SingleFact[] =>
    {
        return [...FactMap.map.values()];
    },

    setHighlightedFacts: (arrayOfIDs) =>
    {
        const setOfIDs = new Set(arrayOfIDs);
        for(let [key, current] of FactMap.map)
        {
            current.isHighlight = setOfIDs.has(current.id);
        }
    },

    setEnabledFacts: (arrayOfIDs) =>
    {
        const setOfIDs = new Set(arrayOfIDs);
        for(let [key, current] of FactMap.map)
        {
            current.isEnabled = setOfIDs.has(current.id);
        }
    },

    resetEnabledFacts: () => {
        FactMap.map.forEach((currentValue) => {
            currentValue.isEnabled = true;
        });
    },

    getAllPeriods: () => {
        const periods = Array.from(new Map([...FactMap.map]), (entry) => {
            return entry[1].period;
        }).filter(Boolean).sort((first: any, second: any) => {
            return second.slice(-4) - first.slice(-4);
        });

        return [...new Set(periods)].reduce((acc: any, current: any) => {
            if (Object.prototype.hasOwnProperty.call(acc, current.slice(-4))) {
                acc[current.slice(-4)].values.push(current);
            } else {
                acc[current.slice(-4)] = {
                    values: [current]
                };
            }
            return acc;
        }, {});
    },

    getAllMeasures: () => {
        const measures = [...FactMap.map]
            .map(([_, entry]) => entry.measure)
            .filter(isTruthy)
            .sort();

        return [...new Set(measures)];
    },

    getAllAxis: () => {
        const axis = Array.from(new Map([...FactMap.map]), (entry: any) => {
            return entry[1].segment ? entry[1].segment.map((current: any) => {
                if (current.type) {
                    return { type: current.type, value: current.axis };
                } else if (Array.isArray(current)) {
                    return current.map((nestedCurrent) => {
                        return { type: nestedCurrent.type, value: nestedCurrent.axis };
                    });
                }
            }).flat().filter(Boolean) : null;
        }).filter(Boolean);

        const unique = [...new Map(axis.flat().map(item => [item['value'], item])).values()].sort((a, b) => {
            if (a.value.split(':')[1] < b.value.split(':')[1]) return -1;
            if (a.value.split(':')[1] > b.value.split(':')[1]) return 1;
            return 0;
        });

        return unique;
    },

    getAllMembers: () => {
        const members = Array.from(new Map([...FactMap.map]), (entry: any) => {
            return entry[1].segment ? entry[1].segment.map((current: any) => {
                if (current.dimension) {
                    return { type: current.type, value: current.dimension };
                } else if (Array.isArray(current)) {
                    return current.map((nestedCurrent) => {
                        return { type: nestedCurrent.type, value: nestedCurrent.dimension };
                    });
                }
            }).flat().filter(Boolean) : null;
        }).filter(Boolean);
        const unique = [...new Map(members.flat().map(item => [item['value'], item])).values()].sort((a, b) => {
            if (a.value.split(':')[1] < b.value.split(':')[1]) return -1;
            if (a.value.split(':')[1] > b.value.split(':')[1]) return 1;
            return 0;
        });
        return unique;
    },

    getAllScales: () => {
        const scalesOrder = [
            "Trillions",
            "Hundred Billions",
            "Ten Billions",
            "Billions",
            "Hundred Millions",
            "Ten Millions",
            "Millions",
            "Hundred Thousands",
            "Ten Thousands",
            "Thousands",
            "Hundreds",
            "Tens",
            "Zero",
            "Tenths",
            "Hundredths",
            "Thousandths",
            "Ten Thousandths",
            "Hundred Thousandths",
            "Millionths"
        ];

        const uniqueScales = [...new Set(Array.from(new Map([...FactMap.map]), (entry) => {
            return entry[1].scale;
        }).filter(isTruthy))].sort((a, b) => {
            return scalesOrder.indexOf(a) - scalesOrder.indexOf(b);
        });
        return uniqueScales;
    },

    getByID: (id: string) => {
        if (FactMap.map.has(id)) {
            return FactMap.map.get(id) || null;
        } else {
            ErrorsMinor.factNotFound();
            return null;
        }
    },

    getByName: (firstName: string, secondName: string | boolean = false) => {
        const names: any = Array.from(new Map([...FactMap.map]), (entry: any) => {
            if (entry[1].name === firstName) {
                return entry[1].value;
            }
        }).filter(Boolean);
        if (secondName) {
            return names.length ? `${names[0]} / ${FactMap.getByName(secondName as any)}` : 'Not Available.'
        }
        return names.length ? names[0] : 'Not Available.'
    },

    getByNameContextRef: (name: string, contextRef: string) => {
        // console.log('getByNameContextRef', name, contextRef)
        // console.log('FactMap.map', FactMap.map)
        const fact: any = Array.from(new Map([...FactMap.map]), (entry) => {
            if (entry[1].name === name && entry[1].contextRef === contextRef) {
                return entry[1];
            }
        }).filter(Boolean);

        return fact.length ? fact[0] : null;
    },

    getEnabledFacts: () => {
        return Array.from(new Map([...FactMap.map]), (entry: any) => {
            if (entry[1].isEnabled) {
                return {
                    id: entry[1].id,
                    isAdditional: entry[1].isAdditional,
                };
            }
        }).filter(Boolean) as any;
    },

    getEnabledHighlightedFacts: () => {
        return Array.from(new Map([...FactMap.map]), (entry: any) => {
            if (entry[1].isEnabled && entry[1].isHighlight) {
                return {
                    id: entry[1].id,
                    isAdditional: entry[1].isAdditional,
                };
            }
        }).filter(Boolean) as any;
    },

    getFullFacts: () => {
        const includeHighlights = Object.keys(UserFiltersState.getUserSearch).length !== 0;
        return Array.from(new Map([...FactMap.map]), (entry: any) => {
            if (includeHighlights) {
                if (entry[1].isEnabled && entry[1].isHighlight) {
                    return entry[1];
                }
            } else {
                if (entry[1].isEnabled) {
                    return entry[1];
                }
            }
        }).filter(Boolean) as any;
    },

    /** Returns the number of facts as a string with "," inserted as appropriate */
    getFactCount: (): string => {
        const includeHighlights = Object.keys(UserFiltersState.getUserSearch).length !== 0;
        const count = [...FactMap.map.values()]
            .filter((fact) => fact.isEnabled && (!includeHighlights || fact.isHighlight))
            .length;

        return count.toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    getTextFactCount: () => {
        const textFacts = FactMap.asArray().filter((fact) => {
            return fact.isTextOnly;
        })
        return textFacts.length;
    },

    getNumberFactCount: () => {
        const numFacts = FactMap.asArray().filter((fact) => {
            return fact.isAmountsOnly;
        })
        return numFacts.length;
    },

    getFactCountForFile: (docSlug: string): string => {
        const includeHighlights = Object.keys(UserFiltersState.getUserSearch).length !== 0;
        const count = [...FactMap.map.values()]
            .filter((fact) => fact.file == docSlug)
            .filter((fact) => fact.isEnabled && (!includeHighlights || fact.isHighlight))
            .length;

        return count.toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    setIsSelected: (input: string | null) => {
        FactMap.map.forEach((currentFact) => {
            const inlineFactElem = document.getElementById(currentFact.id);
            if (input === currentFact.id) {
                currentFact.isSelected = true;
                inlineFactElem?.setAttribute('selected-fact', 'true')
                currentFact.continuedIDs?.forEach((continuationId: string) => {
                    document.getElementById(continuationId)?.setAttribute('selected-fact', 'true');
                });
            } else {
                currentFact.isSelected = false;
                inlineFactElem?.setAttribute('selected-fact', 'false')
                currentFact.continuedIDs?.forEach((continuationId: string) => {
                    document.getElementById(continuationId)?.setAttribute('selected-fact', 'false');
                });

            }
        });
    },

    getTagLine: () => {
        return [...FactMap.map].map((entry: [string, SingleFact]) => {
            if (entry[1].isAmountsOnly) {
                return {
                    name: entry[1].name,
                    periodDates: entry[1].periodDates,
                    value: +(entry[1].value || 0),
                };
            }
        }).filter(isTruthy).reduce((
            acc: Array<{ name: string, data: Array<{ periodDates?: string[], value: number }> }> = [],
            current: { name: string, periodDates?: string[], value: number }
        ) => {
            const index = acc.findIndex(element => element.name === current.name);
            if (index > -1) {
                acc[index].data.push({ periodDates: current.periodDates, value: current.value });
            } else {
                acc.push({ name: current.name, data: [{ periodDates: current.periodDates, value: current.value }] });
            }
            return acc;
        }, [])?.filter(element => {
            element.data = element.data.map(nestedElement => {
                const data = new Set();

                //TODO: this logic doesn't "work" because `finalElement` is a string... 
                nestedElement.periodDates?.filter((finalElement) => {
                    if (data.has((finalElement as any).periodDates)) {
                        return false;
                    }

                    data.add((finalElement as any).periodDates);
                    return true;
                });
                return nestedElement.periodDates!.length > 1 ? nestedElement : null;
            }).filter(isTruthy);
            return element.data.length > 1;
        }).sort((first, second) => {
            return first.name.localeCompare(second.name);
        });

    },

};

