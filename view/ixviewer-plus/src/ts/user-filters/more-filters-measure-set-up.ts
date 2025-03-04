/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FactMap } from "../facts/map";
import { UserFiltersMoreFiltersMeasure } from "./more-filters-measure";
import { stopPropPrevDefault } from "../helpers/utils";


export const UserFiltersMoreFiltersMeasureSetUp = {

    filtersSet: false,

    //measuresOptions: [],

    setMeasures: () => {
        const measures = FactMap.getAllMeasures();
        document.getElementById('filters-measures-count')!.innerText = measures.length.toString();
        UserFiltersMoreFiltersMeasureSetUp.populateCollapse(measures);
    },

    populateCollapse: (measures: Array<string>) => {
        measures.forEach((measure: string) => {
            const inputRow = document.createElement('div');
            inputRow.classList.add('d-flex');
            inputRow.classList.add('justify-content-between');
            inputRow.classList.add('align-items-center');
            inputRow.classList.add('w-100');
            inputRow.classList.add('px-2');

            const inputDiv = document.createElement('div');
            inputDiv.classList.add('form-check');

            const label = document.createElement('label');
            label.classList.add('form-check-label');
            label.classList.add('mb-0');

            const input = document.createElement('input');
            input.classList.add('form-check-input');
            input.type = 'checkbox';
            input.tabIndex = 9;
            input.title = 'Select/Deselect this option.';
            input.setAttribute('name', measure);
            input.addEventListener('click', () => {
                UserFiltersMoreFiltersMeasure.clickEvent(measure);
            });
            input.addEventListener('keyup', (event: KeyboardEvent) => {
                if (event instanceof KeyboardEvent && (event.key === 'Space' || event.key === ' ')) {
                    stopPropPrevDefault(event)
                    UserFiltersMoreFiltersMeasure.clickEvent(measure);
                }
            });

            const labelText = document.createTextNode(measure);
            label.appendChild(input);
            label.appendChild(labelText);
            inputDiv.appendChild(label);
            inputRow.appendChild(inputDiv);

            document.getElementById('user-filters-measures')?.appendChild(inputRow);
        });
    }
};
