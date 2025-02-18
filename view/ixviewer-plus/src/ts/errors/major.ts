/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Errors } from "./errors";
import { HelpersUrl } from "../helpers/url";
import { Logger, ILogObj } from 'tslog';
import { Constants } from "../constants/constants";

export const ErrorsMajor: {
	debug: (msg?: string) => void,
	formNotLoaded: () => void,
	formLinksNotFound: () => void,
	urlParams: () => void,
	cors: (doc: { host: string; }) => void,
	message: (input: string) => void,
} = {

	debug: (msg?: string) => {
		if (!PRODUCTION && DEBUGCSS) {
			const content = 
			`<div class="alert-height alert alert-danger show mb-0">
				${msg ? msg : 'Showing major errors container for debugging'}
			</div>`;

			const parser = new DOMParser();
			const labelDoc = parser.parseFromString(content,'text/html');

			const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
			const closeBtn = Errors.createBsCloseBtn();
			instanceHeader.appendChild(closeBtn);
			document.getElementById('error-container')?.appendChild(instanceHeader);

			Errors.updateMainContainerHeight();
		}
	},

	formNotLoaded: () => {
		const content = 
						`<div class="alert-height alert alert-danger show mb-0">
							'Inline XBRL is not usable in this state.'
						</div>`;
		
		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);

		Errors.updateMainContainerHeight();

		if (!PRODUCTION) {
			const log: Logger<ILogObj> = new Logger();
			log.debug(`inactive`);
		}
	},

	formLinksNotFound: () => {
		const content = 
				`<div class="alert-height alert alert-danger show mb-0">
					<a href="${HelpersUrl.getFolderAbsUrl}">"${HelpersUrl.getFolderAbsUrl! + HelpersUrl.getHTMLFileName}"</a>
				</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);

		Errors.updateMainContainerHeight();

		if (!PRODUCTION) {
			const log: Logger<ILogObj> = new Logger();
			log.debug(`formLinksNotFound`);
		}
	},

	urlParams: () => {
		const content = 
				`<div class="alert-height alert alert-danger show mb-0">
					Inline XBRL requires a URL param (doc | file) that correlates to a Financial Report.
				</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);

		Errors.updateMainContainerHeight();

		if (!PRODUCTION) {
			const log: Logger<ILogObj> = new Logger();
			log.debug(`urlParams`);
		}
	},

	cors: (doc) => {
		const host = Constants.appWindow.location.protocol + '//' + Constants.appWindow.location.host;

		const textContent = `The protocol, host name, and port number of the "doc" field (${doc.host}), if provided, must be identical to that of the Inline XBRL viewer(${host})`;

		const content = 
				`<div class="alert-height alert alert-danger show mb-0">
					${textContent}
				</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);
		Errors.updateMainContainerHeight();

		if (!PRODUCTION) {
			const log: Logger<ILogObj> = new Logger();
			log.debug(`cors`);
		}
	},

	message: (input) => {
		const content = 
		`<div class="alert-height alert alert-danger show mb-0">
			${input}
		</div>`;

		const parser = new DOMParser();
		const labelDoc = parser.parseFromString(content,'text/html');

		const instanceHeader = labelDoc.querySelector('body > div') as HTMLElement;
		const closeBtn = Errors.createBsCloseBtn();
		instanceHeader.appendChild(closeBtn);
		document.getElementById('error-container')?.appendChild(instanceHeader);
		
		Errors.updateMainContainerHeight();

		if (!PRODUCTION) {
			const log: Logger<ILogObj> = new Logger();
			log.debug(`message`);
		}
	},
};
