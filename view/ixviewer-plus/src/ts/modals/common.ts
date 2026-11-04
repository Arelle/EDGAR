/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import * as bootstrap from "bootstrap";
import { Modals } from "./modals";
import { FactPages } from "./fact-pages";
import { FactMap } from "../facts/map";
import { ConstantsFunctions } from "../constants/functions";
import { ErrorsMinor } from "../errors/minor";
import { actionKeyHandler } from "../helpers/utils";
import { FactsDock } from "../facts/dock";

export const ModalsCommon = {
	currentDetailTab: 0,
	getAttributes: null,

	clickEvent: (event: Event, element: HTMLElement) => {
		if (event instanceof KeyboardEvent && !(event.key === 'Enter' || event.key === 'Space' || event.key === ' '))
			return;

		event.preventDefault();
		event.stopPropagation();
		
		const id = element.getAttribute('continued-main-fact-id') || element.getAttribute('id');
		if (!id) {
			ErrorsMinor.factNotFound();
			return;
		}

		ModalsCommon.renderFactDetailData(element);
		ModalsCommon.createTitles(id);
		// ModalsCommon.listeners();

		// Open fact sidebar
		const sidebar = document.getElementById('facts-menu')
		if (sidebar && !sidebar.classList.contains("show") && !FactsDock.isDocked()) {
			bootstrap.Collapse.getOrCreateInstance(sidebar).show();
		}

		// Pagination.findFactAndGoTo(id);
		Modals.clearAndCloseCopy('fact-copy-content')
	},

	listeners: () => {
		document.getElementById('fact-modal-copy-content')?.addEventListener('click', (event: MouseEvent) => {
			Modals.copyContent(event, 'fact-details-panel', 'fact-copy-content');
		});
		document.getElementById('fact-modal-copy-content')?.addEventListener('keyup', (event: KeyboardEvent) => {
			if (!actionKeyHandler(event)) return;
			Modals.copyContent(event, 'fact-details-panel', 'fact-copy-content');
		});
	},

	createTitles: (id: string) => {

		const factInfo = FactMap.getByID(id);

		const span1 = document.createElement('span');
		const dialogSubTitle = document.createTextNode(`${ConstantsFunctions.getFactLabel(factInfo?.labels || [])}`);
		span1.appendChild(dialogSubTitle);
		document.getElementById('fact-detail-label')?.firstElementChild?.replaceWith(span1);
	},

	renderFactDetailData: (element: HTMLElement) => {

		const id = element.hasAttribute('continued-main-fact-id') ? element.getAttribute('continued-main-fact-id') : element.getAttribute('id');
		const factInfo = FactMap.getByID(id as string);
		if (factInfo) {

			// we now render one slide at a time!
			FactPages.firstPage(factInfo, 'fact-details-attributes');
			FactPages.secondPage(factInfo, 'fact-details-labels');
			FactPages.thirdPage(factInfo, 'fact-details-references');
			FactPages.fourthPage(factInfo, 'fact-details-calculations');
			ConstantsFunctions.getCollapseToFactValue();
		}
	},
};
