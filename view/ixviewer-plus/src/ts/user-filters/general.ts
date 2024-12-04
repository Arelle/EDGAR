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
};
