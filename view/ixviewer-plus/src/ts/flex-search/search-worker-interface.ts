import { UserFiltersState } from "../user-filters/state";
import { FactMap } from "../facts/map";
import { Facts } from "../facts/facts";
import { UserFiltersDropdown } from "../user-filters/dropdown";
import { addToJsPerfTable } from "../helpers/ixPerformance";
import { hideSearchingHourglass } from "./flex-search-ui";
import { Constants } from "../constants/constants";

let worker: Worker;

export const initSearch = (factMap: any) => {
    console.log('initSearch')
    if (typeof window !== 'undefined' && window.Worker) {
        const searchStart = performance.now();
        worker = new Worker(
            new URL('./search-worker.ts', import.meta.url),
            { type: "module" }
        );

        window.addEventListener('beforeunload', () => {
            worker.terminate(); // else memory leak on reload ?
        });
        window.addEventListener('pagehide', () => {
            worker.terminate(); // else memory leak on reload ?
        });

        return new Promise<void>((resolve) => {
            const listener = (e: MessageEvent) => {
                if (e.data.type === 'initComplete') {
                    worker.removeEventListener('message', listener);
                    hideSearchingHourglass();
                    if (LOGPERFORMANCE || Constants.logPerfParam ) {
                        const endPerformance = performance.now();
                        addToJsPerfTable('initSearch() complete', searchStart, endPerformance);
                    }
                    resolve();
                }
            }
            worker.addEventListener('message', listener);
            worker.postMessage({ type: 'init', data: { factMap } });
        })
    }
}

export const callSearch = (query: { value: string[]; options: any[]; }, suggest = false) => {
    return new Promise<void>((resolve) => {
        const listener = (e: MessageEvent) => {
            if (e.data.type === 'searchComplete') {
                worker.removeEventListener('message', listener);
                resolve(e.data.results);
            }
        }
        worker.addEventListener('message', listener);
        worker.postMessage({ type: 'search', data: { query, suggest } })
    })
}

export const callFilter = () => {
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
    return new Promise<void>((resolve) => {
        const listener = (e: MessageEvent) => {
            if (e.data.type === 'filterComplete') {
                worker.removeEventListener('message', listener);

                if (e.data.filteredArray && e.data.filteredArray.length > 0) {
                    FactMap.setEnabledFacts(e.data.filteredArray);
                } else if (e.data.filteredArray && e.data.filteredArray.length == 0) {
                    FactMap.setEnabledFacts([]);
                } else if (e.data.filteredArray == null) {
                    FactMap.resetEnabledFacts();
                }
                Facts.inViewPort(true); // to hightlight only facts that match current filter
                UserFiltersDropdown.init();
                Facts.updateFactCounts();

                resolve();
            }
        }
        worker.addEventListener('message', listener);
        worker.postMessage({ type: 'filter', data: { dataFields, filterState } });
    })
}