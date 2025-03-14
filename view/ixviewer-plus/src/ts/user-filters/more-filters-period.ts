/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FlexSearch } from "../flex-search/flex-search";
import { UserFiltersState } from "./state";

export const UserFiltersMoreFiltersPeriod = {

    parentClick: (event: MouseEvent | KeyboardEvent, parentIndex: number | string, inputs: Array<string>) => {
        const addIfTrue = UserFiltersMoreFiltersPeriod.checkToggleAll(event, parentIndex);
        const tempSet = new Set(UserFiltersState.getPeriod);
        inputs.forEach((periodInput) => {
            addIfTrue ? tempSet.add(periodInput) : tempSet.delete(periodInput);
        });
        UserFiltersState.getPeriod = [...tempSet];
        FlexSearch.filterFacts();
    },

    childClick: (input: string) => {
        const tempSet = new Set(UserFiltersState.getPeriod);
        if (tempSet.has(input)) {
            (document.querySelector(`#user-filters-periods [name='${input}']`) as HTMLInputElement).checked = false;
            tempSet.delete(input)
        } else {
            (document.querySelector(`#user-filters-periods [name='${input}']`) as HTMLInputElement).checked = true;
            tempSet.add(input);
        }
        UserFiltersState.getPeriod = [...tempSet];
        FlexSearch.filterFacts();
    },

    checkToggleAll: (event: MouseEvent | KeyboardEvent, parentIndex: number | string) => {
        const foundInputs = document.querySelectorAll(`#period-filters-accordion-${parentIndex} input[type=checkbox]`);
        const foundInputsArray = Array.prototype.slice.call(foundInputs);
        if ((event.target as HTMLInputElement).checked) {
            // check all of the children
            foundInputsArray.forEach((current) => {
                current.checked = true;
            });
            return true;
        } else {
            // uncheck all of the children
            foundInputsArray.forEach((current) => {
                current.checked = false;
            });
            return false;
        }
    },
};
