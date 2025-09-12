/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { callFilter } from "../flex-search/search-worker-interface";
import { UserFiltersState } from "./state";

export const UserFiltersMoreFiltersScale = {

    clickEvent: (input: string) => {
        const tempSet = new Set(UserFiltersState.getScale);
        if (tempSet.has(input)) {
            (document.querySelector(`#user-filters-scales [name='${input}']`) as HTMLInputElement).checked = false;
            tempSet.delete(input)
        } else {
            (document.querySelector(`#user-filters-scales [name='${input}']`) as HTMLInputElement).checked = true;
            tempSet.add(input);
        }
        UserFiltersState.getScale = [...tempSet];
        
        // FlexSearch.filterFacts();
        callFilter();
    },

};
