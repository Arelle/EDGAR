/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { callFilter } from "../flex-search/search-worker-interface";
import { UserFiltersState } from "./state";

export const UserFiltersMoreFiltersMembers = {

    clickEvent: (input: string) => {
        const tempSet = new Set(UserFiltersState.getMembers);
        if (tempSet.has(input)) {
            (document.getElementById('user-filters-members')?.querySelector(`[name='${input}']`) as HTMLInputElement).checked = false;
            tempSet.delete(input)
        } else {
            (document.getElementById('user-filters-members')?.querySelector(`[name='${input}']`) as HTMLInputElement).checked = true;
            tempSet.add(input);
        }

        UserFiltersState.getMembers = [...tempSet];

        // FlexSearch.filterFacts();
        callFilter();
    },

    parentClick: (memberInputs: Array<{ type: string, value: string }>, element: HTMLInputElement) => {
        const addIfTrue = element.checked;
        const tempSet = new Set(UserFiltersState.getMembers);
        memberInputs.forEach((input) => {
            if (addIfTrue) {
                tempSet.add(input.value);
                (document.getElementById('user-filters-members')?.querySelector(`[name='${input.value}']`) as HTMLInputElement).checked = true;
            } else {
                tempSet.delete(input.value);
                (document.getElementById('user-filters-members')?.querySelector(`[name='${input.value}']`) as HTMLInputElement).checked = false;
            }
        });

        UserFiltersState.getMembers = [...tempSet];

        // FlexSearch.filterFacts();
        callFilter();
    },
};
