/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Errors } from "./errors";

export const ErrorsMinor = {
	unknownError: () => {
		const content = 
						`<div class="alert-height alert alert-warning show mb-0">
							An Error has occured within the Inline XBRL Viewer.
						</div>`;
		
		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);

		Errors.updateMainContainerHeight();
	},

	factNotFound: () => {
		console.log('factNotFound')

		const content = 
		`<div class="alert-height alert alert-warning show mb-0">
			Inline XBRL cannot locate the requested fact.
		</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);

		Errors.updateMainContainerHeight();
	},


	factNotInSearch: () => {
		console.log('factNotInSearch')
		const content = 
		`<div class="alert-height alert alert-warning show mb-0">
			Fact not found in current search and filter results.
		</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);


		Errors.updateMainContainerHeight();
	},

	message: (input: string) => {
		const content = 
		`<div class="alert-height alert alert-warning show mb-0">
			${input}
		</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);
		
		Errors.updateMainContainerHeight();
	},
};
