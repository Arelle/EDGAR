/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Reference } from "../interface/fact";
import { FormInformation } from "../interface/form-information";
import { InlineFileMeta, InstanceFile } from "../interface/instance-file";
import { Section } from "../interface/meta";

//Not really used (see comment below)
type MetaDocument = any;

export const Constants =
{
	version: "25.2",
	featureSet: "plus",

	appWindow: (() => {
		if (typeof window == 'undefined') return {} as Window;
		// redirect iframe
		if (!!window.frameElement && window.frameElement.id === "ixvFrame") {
			return window.parent;
		}
		// Note: workstation iframe has id "dispDocFrame", I don't think we need to handle it though since the iframe
		// in that cases seems intended to work as "subwindow" and links should open in the iframe (?)
		return window;
	})(),

	loadedViaRedirect: (() => {
		if (typeof window == 'undefined') return false;
		// redirect iframe
		if (!!window.frameElement && window.frameElement.id === "ixvFrame") {
			return true;
		}
	})(),

	isNcsr: false,

	scrollPosition: typeof window !== 'undefined' && window.localStorage.getItem("scrollPosition") || "start",

	hoverOption: typeof window !== 'undefined' && window.localStorage.getItem("hoverOption") === "true" || false,

	getHTMLAttributes: {} as Record<any, unknown>,

	getPaginationPerPage: 10,

	getHtmlOverallFactsCount: null as string | null,

	getMetaSourceDocuments: [] as string[],

	getMetaTags: [] as unknown[],

	getInstances: [] as InstanceFile[],

	getCurrentInstance: () => {
		return Constants.getInstances.find(inst => inst.current);
	},

	getInlineFiles: [] as InlineFileMeta[],

	sections: [] as Section[],

	setSections: (sections: Array<Section>): void => {
		if (sections) {
			Constants.sections = sections;
			sessionStorage.setItem('sections', JSON.stringify(sections));
		}
	},

	getSectionsFromSessionStorage: (): Section[] => {
		const sectionsFromLocal = sessionStorage.getItem('sections');
		return JSON.parse(sectionsFromLocal || '[]') as Section[];
	},

	getStdRef: {} as Record<string, Reference>,

	getFormInformation: {} as FormInformation,

	getMetaCustomPrefix: null as string | null,

	//These are never accessed outside of old unit tests
	getMetaDts: null as MetaDocument | null,
	getMetaDocuments: (input: string): MetaDocument | null => {
		if (input && typeof input === "string") {
			return Constants.getMetaDts && Constants.getMetaDts[input]
				? Constants.getMetaDts[input]
				: null;
		}

		return null;
	},

	getScrollPosition: (): number => {
		const currentScrollPosition = document.getElementById('dynamic-xbrl-form')!.scrollTop as number;
		return currentScrollPosition;
	},

	getNavBarsHeight: (): number => {
		return document.querySelector<HTMLElement>('div[id="topNavs"]')?.offsetHeight || 0;
	},

	sideBarPaginationState: {pageNumber: 0, totalPages: 0},

};
