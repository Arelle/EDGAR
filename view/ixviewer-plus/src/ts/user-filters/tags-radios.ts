/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { callFilter } from "../flex-search/search-worker-interface";
import { UserFiltersState } from "./state";

export const UserFiltersTagsRadios = {
    clickEvent: (event: Event) => {
        // 0 = All
        // 1 = Standard Only
        // 2 = Custom Only

        const radioValue = parseInt((event.target as HTMLInputElement).value) || 0;
        UserFiltersState.getTagsRadios = radioValue;
        // FlexSearch.filterFacts();
        callFilter();
    }
};
