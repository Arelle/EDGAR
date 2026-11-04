/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { UserFiltersMoreFiltersAxesSetUp } from "./more-filters-axes-set-up";
import { UserFiltersMoreFiltersMeasureSetUp } from "./more-filters-measure-set-up";
import { UserFiltersMoreFiltersMembersSetUp } from "./more-filters-members-set-up";
import { UserFiltersMoreFiltersPeriodSetUp } from "./more-filters-period-set-up";
import { UserFiltersMoreFiltersScaleSetUp } from "./more-filters-scale-set-up";

export const UserFiltersGeneral =
{
    setupComplete: false,

    moreFiltersClickEvent: () =>
    {
        if (!UserFiltersGeneral.setupComplete)
        {
            UserFiltersMoreFiltersPeriodSetUp.setPeriods();
            UserFiltersMoreFiltersMeasureSetUp.setMeasures();
            UserFiltersMoreFiltersAxesSetUp.setAxes();
            UserFiltersMoreFiltersMembersSetUp.setMembers();
            UserFiltersMoreFiltersScaleSetUp.setScales();
            UserFiltersGeneral.setupComplete = true;
        }
    },

    resetMoreFiltersOptions: () => {
        UserFiltersGeneral.setupComplete = false;

        const periodsList = document.querySelector('#user-filters-periods .list-group');
        if (periodsList) periodsList.textContent = '';

        document.querySelectorAll('#user-filters-measures > :not(.list-group), #user-filters-scales > :not(.list-group)')
            .forEach(row => row.remove());

        document.querySelectorAll('[id^="axes-filters-accordion-"], [id^="members-filters-accordion-"]')
            .forEach(accordion => accordion.remove());
        document.querySelectorAll('#user-filters-axis > .list-group, #user-filters-members > .list-group')
            .forEach(group => group.classList.add('d-none'));

        ['axes-all-0', 'axes-all-1', 'members-all-0', 'members-all-1'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.replaceWith(checkbox.cloneNode(true));
        });

        const membersMenu = document.getElementById('more-filters-menu-members');
        membersMenu?.classList.remove('disabled');
        membersMenu?.removeAttribute('disabled');

        ['axis-explicit-count', 'axis-typed-count', 'members-explicit-count', 'members-typed-count'].forEach(id => {
            const count = document.getElementById(id);
            if (count) count.textContent = '';
        });

        ['filters-periods-count', 'filters-measures-count', 'filters-axis-count', 'filters-members-count', 'filters-scales-count'].forEach(id => {
            const badge = document.getElementById(id);
            if (!badge) return;
            const clock = document.createElement('i');
            clock.className = 'fa fa-regular fa-clock';
            badge.textContent = '';
            badge.appendChild(clock);
        });
    },
};
