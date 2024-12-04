/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Errors } from "./errors";

export const ErrorsMinor = {
	unknownError: () => {

		const content = document.createTextNode('An Error has occured within the Inline XBRL Viewer.');

		const element = document.createElement('div');
		element.setAttribute('class', 'alert-height alert alert-warning show mb-0');
		element.appendChild(content);

		const closeBtn = Errors.createBsCloseBtn();
		element.appendChild(closeBtn);

		document.getElementById('error-container')?.appendChild(element);

		Errors.updateMainContainerHeight();
	},

	factNotFound: () => {
		console.log('factNotFound')
		const content = document.createTextNode('Inline XBRL cannot locate the requested fact.');

		const element = document.createElement('div');
		element.setAttribute('class', 'alert-height alert alert-warning show mb-0');
		element.appendChild(content);
		
		const closeBtn = Errors.createBsCloseBtn();
		element.appendChild(closeBtn);

		document.getElementById('error-container')?.appendChild(element);

		Errors.updateMainContainerHeight();
	},


	factNotInSearch: () => {
		console.log('factNotInSearch')
		const content = document.createTextNode('Fact not found in current search and filter results.');

		const element = document.createElement('div');
		element.setAttribute('class', 'alert-height alert alert-warning show mb-0');
		element.appendChild(content);
		
		const closeBtn = Errors.createBsCloseBtn();
		element.appendChild(closeBtn);

		document.getElementById('error-container')?.appendChild(element);

		Errors.updateMainContainerHeight();
	},

	message: (input: string) => {
		const content = document.createTextNode(input);

		const errorDiv = document.createElement('div');
		errorDiv.setAttribute('class', 'alert alert-height alert-warning show mb-0');
		errorDiv.appendChild(content);
		
		const closeBtn = Errors.createBsCloseBtn();
		errorDiv.appendChild(closeBtn);

		document.getElementById('error-container')?.appendChild(errorDiv);

		Errors.updateMainContainerHeight();
	},
};
