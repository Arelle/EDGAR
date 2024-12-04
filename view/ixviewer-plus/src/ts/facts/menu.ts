/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { ConstantsFunctions } from "../constants/functions";

export const FactsMenu = {

	toggle: (event: MouseEvent | KeyboardEvent) => {

		if (
			Object.prototype.hasOwnProperty.call(event, 'key') &&
			!((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === 'Space')
		) {
			return;
		}

		if (event.target && (event.target as HTMLElement).classList && (event.target as HTMLElement).classList.contains('disabled')) {
			return;
		}
		FactsMenu.prepareForPagination();

	},

	/**
	 * @Description passes filtered fact set to Pagination.init()
	 */
	prepareForPagination: () => {
		ConstantsFunctions.setPagination();
	}
};
