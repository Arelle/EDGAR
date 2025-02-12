/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

export const Errors =
{
	updateMainContainerHeight: (removingWarning = false): void => {
		let numOfErrors = document.getElementById('error-container')?.children?.length || 0;

		if (removingWarning) 
			numOfErrors = Math.max(numOfErrors - 1, 0);

		const dynamicXbrlForm: HTMLElement | null = document.querySelector('#dynamic-xbrl-form');

		if (dynamicXbrlForm) {
			dynamicXbrlForm.style.height = 'calc(100vh - ' + ((numOfErrors * 41.6) + 86) + 'px)';
		}
	},

	createBsCloseBtn: (): HTMLElement => {
		const button = document.createElement('button');
		button.setAttribute('type', 'button');
		button.setAttribute('class', 'btn-close float-end');
		button.setAttribute('data-bs-dismiss', 'alert');
		button.setAttribute('aria-label', 'Close');
		button.addEventListener('click', () => { Errors.updateMainContainerHeight(true); });
		return button;
	}
};
