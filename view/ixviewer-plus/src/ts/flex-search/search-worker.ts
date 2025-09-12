/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FlexSearch } from './flex-search';

self.onmessage = (e) => {
    const { type, data } = e.data;

    if (type === 'init') {
        FlexSearch.init(data.factMap);
        self.postMessage({type: 'initComplete'});
    }

    if (type === 'search') {
        const results = FlexSearch.searchFacts(data.query, data.suggest);
        self.postMessage({type: 'searchComplete', results});
    }

    if (type === 'filter') {
        const filteredArray = FlexSearch.filterFacts(data.dataFields, data.filterState);
        self.postMessage({type: 'filterComplete', filteredArray});
    }
}
