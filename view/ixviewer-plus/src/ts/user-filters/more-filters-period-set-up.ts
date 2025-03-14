/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FactMap } from "../facts/map";
import { UserFiltersMoreFiltersPeriod } from "./more-filters-period";
import { stopPropPrevDefault } from "../helpers/utils";

export const UserFiltersMoreFiltersPeriodSetUp = {

    periodsOptions: [],

    setPeriods: () => {
        const periods = FactMap.getAllPeriods();
        const totalPeriods = Object.keys(periods).reduce((acc, current) => { return acc += periods[current].values.length }, 0);
        document.getElementById('filters-periods-count')!.innerText = `${totalPeriods}`;
        UserFiltersMoreFiltersPeriodSetUp.populateCollapse('user-filters-periods', periods as any);
    },

    populateCollapse: (parentId: string, periodsDataByYear: Record<string, { values: string[] }>) => {
        const parentDiv = document.querySelector(`#${parentId} .list-group`);
        Object.keys(periodsDataByYear).reverse().forEach((year, index) => {
            const yearCollapseHeaderHtml = 
                `<div class="foo d-flex justify-content-between align-items-center w-100 px-1">
                    <div class="form-check">
                        <label class="form-check-label mb-0">
                            <input class="form-check-input" type="checkbox" tabindex="9" title="Select/Deselect all options below." name="${year.toString()}" />
                            <button 
                                data-bs-target="#period-filters-accordion-${index}"
                                data-bs-toggle="collapse"
                                class="click btn btn-link ix-btn-link btn-sm p-0 no-border"
                                type="button"
                                tabindex="9"
                            >
                                ${year.toString()}
                            </button>
                        </label>
                    </div>
                    <span class="badge float-end text-bg-secondary">${periodsDataByYear[year].values.length.toString()}</span>
                </div>`
            const parser = new DOMParser();
            const yearCollapseHeaderDoc = parser.parseFromString(yearCollapseHeaderHtml,'text/html');
            const yearCollapseHeader = yearCollapseHeaderDoc.querySelector('body > div') as HTMLElement;
            const yearCollapseInput = yearCollapseHeaderDoc.querySelector('input') as HTMLElement;

            yearCollapseInput.addEventListener('click', (event: MouseEvent) => {
                UserFiltersMoreFiltersPeriod.parentClick(event, index, periodsDataByYear[year].values)
            });
            yearCollapseInput.addEventListener('keyup', (event: KeyboardEvent) => {
                if (event instanceof KeyboardEvent && (event.key === 'Space' || event.key === ' ')) {
                    yearCollapseInput?.click();
                    UserFiltersMoreFiltersPeriod.parentClick(event, index, periodsDataByYear[year].values)
                }
            });

            const div3 = document.createElement('div');
            div3.classList.add('collapse');
            div3.setAttribute('data-bs-parent', '#user-filters-periods');
            div3.setAttribute('id', `period-filters-accordion-${index}`);

            periodsDataByYear[year].values.forEach((specificPeriod) => {
                const div4 = document.createElement('div');
                div4.classList.add('d-flex');
                div4.classList.add('justify-content-between');
                div4.classList.add('align-items-center');
                div4.classList.add('w-100');
                div4.classList.add('px-2');

                const div5 = document.createElement('div');
                div5.classList.add('form-check');

                const label2 = document.createElement('label');
                label2.classList.add('form-check-label');
                label2.classList.add('mb-0');

                const input2 = document.createElement('input');
                input2.classList.add('form-check-input');
                input2.type = 'checkbox';
                input2.tabIndex = 9;
                input2.title = 'Select/Deselect this option.';
                input2.setAttribute('name', specificPeriod);

                input2.addEventListener('click', () => {
                    UserFiltersMoreFiltersPeriod.childClick(specificPeriod);
                });
                input2.addEventListener('keyup', (event: KeyboardEvent) => {
                    if (event instanceof KeyboardEvent && (event.key === 'Space' || event.key === ' ')) {
                        stopPropPrevDefault(event);
                        UserFiltersMoreFiltersPeriod.childClick(specificPeriod);
                    }
                });

                label2.appendChild(input2);

                const labelText = document.createTextNode(specificPeriod);

                label2.appendChild(labelText);

                div5.appendChild(label2);
                div4.appendChild(div5);

                div3.appendChild(div4);
            });
            parentDiv?.appendChild(yearCollapseHeader);
            parentDiv?.appendChild(div3);
        })
    },
};
