/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import * as bootstrap from "bootstrap";
import { Constants } from "../constants/constants";
import { ConstantsFunctions } from "../constants/functions";
import { FactMap } from "../facts/map";
import { HelpersUrl } from "../helpers/url";
import { Sections } from "../sections/sections";

export const Tabs = {

	init: () => {
		Tabs.populateTabs();
	},

	/**
	 * Description
	 * @returns {any} populates tabs, i.e. instance tab(s), fact table, fact chart
	 */
	populateTabs: () => {
		const container = document.getElementById('tabs-container');
		Constants.getInlineFiles.forEach((currentInlineDoc, inlineDocIndex) => {
			// add Instance dropdown (if it's the first instance)
			if (inlineDocIndex === 0 && Constants.getInstanceFiles.length > 1) {
				const li = document.createElement('li');
				li.classList.add('nav-item');
				const button = document.createElement('button');
				button.classList.add('nav-link');
				button.setAttribute('aria-current', 'page');
				button.classList.add('dropdown-toggle');
				button.setAttribute('data-bs-toggle', 'dropdown');
				button.setAttribute('aria-expanded', 'false');
				button.setAttribute('data-cy', 'instance-dropdown');
				const ul = document.createElement('ul');
				ul.classList.add('dropdown-menu');

				Constants.getInstanceFiles.forEach((instanceFile) =>
				{
					const labels = instanceFile.docs.map(element =>
						!element.dropdown && !element.table ? element.slug : null).filter(Boolean);
					const li = document.createElement('li');
					const a2 = document.createElement('a');
					a2.classList.add('dropdown-item');
					instanceFile.current ? a2.classList.add('active') : null;
					const aText = document.createTextNode(labels.join(', '));
					a2.addEventListener('click', (event: MouseEvent) =>
					{
						Tabs.clickEventInstance(event, instanceFile.instance);
					});
					a2.addEventListener('keyup', (event: KeyboardEvent) =>
					{
						Tabs.clickEventInstance(event, instanceFile.instance);
					});
					a2.append(aText);
					li.append(a2);
					ul.append(li);
				});

				const text = document.createTextNode(`Instance`);
				button.append(text);
				button.append(ul);
				li.append(button);
				container?.append(li);
			}
			// END add Instance dropdown

			// Inline Files / Docs
			const li = document.createElement('li');
			li.classList.add('nav-item');

			const inlineDocTabElem = document.createElement('a');
			inlineDocTabElem.classList.add('nav-link');
			inlineDocTabElem.setAttribute('aria-current', 'page');
			inlineDocTabElem.setAttribute('data-cy', `inlineDocTab-${inlineDocIndex}`);
			inlineDocTabElem.setAttribute('href', currentInlineDoc.slug);
			inlineDocTabElem.setAttribute('data-link', currentInlineDoc.slug);

			if(currentInlineDoc.current === true)
			{
				inlineDocTabElem.classList.add('active');
			}

			const updateTabs = (e: Event) =>
			{
				e.stopPropagation();
				e.preventDefault();
				
				ConstantsFunctions.switchDoc(currentInlineDoc.slug);
			}

			inlineDocTabElem.addEventListener('click', updateTabs, true);
			inlineDocTabElem.addEventListener('keyup', updateTabs, true);
			const text = document.createTextNode(currentInlineDoc.slug);
			inlineDocTabElem.append(text);

			const factCountSpan = document.createElement('span');
			currentInlineDoc.table ? factCountSpan.classList.add('fact-total-count') : factCountSpan.classList.add('fact-file-total-count');

			factCountSpan.classList.add('badge');
			factCountSpan.classList.add('ms-1');
			currentInlineDoc.table ? null : factCountSpan.setAttribute('doc-slug', currentInlineDoc.slug);

			const factText = document.createTextNode(FactMap.getFactCountForFile(currentInlineDoc.slug));

			factCountSpan.setAttribute('data-bs-toggle', 'tooltip');
			factCountSpan.setAttribute('title', 'Filtered Fact Count');

			factCountSpan.append(factText);
			inlineDocTabElem.append(factCountSpan);

			li.append(inlineDocTabElem);
			container?.append(li);
			// END Inline Files

			// Fact Table
			const showFactsTable = false;
			if (showFactsTable && inlineDocIndex === Constants.getInlineFiles.length - 1) {
				const li = document.createElement('li');
				li.classList.add('nav-item');
				const factTableTabElem = document.createElement('a');
				factTableTabElem.classList.add('nav-link');
				factTableTabElem.setAttribute('href', '#');
				factTableTabElem.setAttribute('data-container', '#fact-table-container');
				factTableTabElem.setAttribute('data-cy', `factTableTab`);

				//We don't show Facts Table; these handlers will need to be updated when we do
				// factTableTabElem.addEventListener('click', () => {
				// 	Tabs.updateCurrent(inlineDocIndex + 1);
				// });
				// factTableTabElem.addEventListener('keyup', () => {
				// 	Tabs.updateCurrent(inlineDocIndex + 1);
				// });
				const text = document.createTextNode(`Fact Table`);
				factTableTabElem.append(text);

				const factCountSpan = document.createElement('span');
				factCountSpan.classList.add('fact-total-count');
				factCountSpan.classList.add('badge');
				factCountSpan.classList.add('bg-sec');
				factCountSpan.classList.add('ms-1');
				factCountSpan.setAttribute('data-bs-toggle', 'tooltip');
				factCountSpan.setAttribute('title', 'Filtered Fact Count');
				const factText = document.createTextNode(FactMap.getFactCount());
				factCountSpan.append(factText);
				factTableTabElem.append(factCountSpan);

				li.append(factTableTabElem);
				container?.append(li);
			}
			// END Fact Table

			// Fact Charts
			const showFactsChart = false;
			if (showFactsChart && inlineDocIndex === Constants.getInlineFiles.length - 1)
			{
				const li = document.createElement('li');
				li.classList.add('nav-item');
				const a = document.createElement('a');
				a.classList.add('nav-link');
				a.setAttribute('href', '#');
				a.setAttribute('data-container', '#facts-breakdown-container');

				//We don't show Facts Chart; these handlers will need to be updated when we do
				// a.addEventListener('click', () => {
				// 	Tabs.updateCurrent(inlineDocIndex + 2);
				// });
				// a.addEventListener('keyup', () => {
				// 	Tabs.updateCurrent(inlineDocIndex + 2);
				// });
				const text = document.createTextNode(`Facts Chart`);
				a.append(text);

				li.append(a);
				container?.append(li);
			}
			// END Fact Charts
		});
		const popoverTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="popover"]'))
		popoverTriggerList.forEach(popoverTiggerElement => new bootstrap.Popover(popoverTiggerElement));
	},

	updateTabs: () =>
	{
		ConstantsFunctions.emptyHTMLByID('tabs-container');
		Tabs.populateTabs();
	},

	absoluteLinks: () => {
		const foundLinks = document.getElementById('dynamic-xbrl-form')?.querySelectorAll('[data-link],[href]');
		const foundLinksArray = Array.prototype.slice.call(foundLinks);
		foundLinksArray.forEach((current) => {
			HelpersUrl.addLinkattributes(current);
		});
	},

	clickEventInstance: (event: MouseEvent | KeyboardEvent, instance: number) => {
		event.preventDefault();
		ConstantsFunctions.changeInstance(+instance as number, null, () => {
			Sections.highlightInstanceInSidebar();
			Sections.applyFilterRadios();
		});
	},
};
