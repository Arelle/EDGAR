/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { UserFiltersState } from "./state";
import { callFilter } from "../flex-search/search-worker-interface";

export const UserFiltersMoreFiltersBalances = {
    clickEvent: (_event: MouseEvent | KeyboardEvent, balanceType: string): void => {
        // debit = 0
        // credit = 1
        const tempSet = new Set(UserFiltersState.getBalance);
        if (tempSet.has(balanceType)) {
            (document.querySelector(`#user-filters-balances [id='user-filters-balances-${balanceType}']`) as HTMLInputElement).checked = false;
            tempSet.delete(balanceType);
        } else {
            (document.querySelector(`#user-filters-balances [id='user-filters-balances-${balanceType}']`) as HTMLInputElement).checked = true;
            tempSet.add(balanceType);
        }
        UserFiltersState.getBalance = [...tempSet];
        // FlexSearch.filterFacts();
        callFilter();
    },
};
