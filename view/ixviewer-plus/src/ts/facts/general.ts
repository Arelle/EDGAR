/* Created by staff of the U.S. Securities and Exchange Commission.ParsedUrl
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { ErrorsMinor } from "../errors/minor";
import { FactMap } from "../facts/map";
import { ModalsCommon } from "../modals/common";
import { ConstantsFunctions } from "../constants/functions";
import { Pagination } from "../pagination/sideBarPagination";
import { Constants } from "../constants/constants";
import { Facts } from "../facts/facts";

export const FactsGeneral = {
	getElementByNameContextref: (name: string, contextref: string) => {
		return document.getElementById('dynamic-xbrl-form')?.querySelector(
			'[name="' + name + '"][contextref="' + contextref + '"]');
	},

	getMenuFactByDataID: (dataId: string) => {
		return document.getElementById('facts-menu-list-pagination')?.querySelector('[data-id="' + dataId + '"]');
	},

	/**
	 * Description
	 * @info handles clickevent from fact sidebar
	 * @param {any} event:MouseEvent|KeyboardEvent|Event
	 * @param {any} element:HTMLElement
	 * @returns {any} => 
	 */
	goToInlineFact: (event: MouseEvent | KeyboardEvent | Event, element: HTMLElement) =>
	{
		if (event instanceof KeyboardEvent && !((event).key === 'Enter' || (event).key === 'Space'))
			return;
		
		const fact = FactMap.getByID(element.getAttribute('data-id') as string);
		if (!fact?.file)
		{
			ErrorsMinor.factNotFound();
			return;
		}

		FactMap.setIsSelected(fact.id);
		const currentInstance = Constants.getInstanceFiles.find(element => element.current);
		const currentXHTML = currentInstance?.docs.find(element => element.current);

		const afterLoad = () =>
		{
			const tempDiv = document.createElement('div');
			tempDiv.setAttribute('id', fact.id);
			ModalsCommon.clickEvent(event, tempDiv);

			Facts.addURLHash(fact.id);
			// element.scrollIntoView(false);
			Pagination.setSelectedFact(element, fact);
		}

		if (currentXHTML?.slug !== fact.file)
		{
			ConstantsFunctions.switchDoc(fact.file)
				.then(() => afterLoad());
		}
		else
		{
			afterLoad();
		}
	},

	//TODO factmap.getbyid is used a lot
	// fact in fact sidebar
	renderFactElem: (elementID: string): Node => {
		const factInfo = FactMap.getByID(elementID);
		const factElem = document.createDocumentFragment();

		const aElement = document.createElement('a');
		aElement.setAttribute(
			'class',
			'text-body sidebar-fact border-bottom click text-decoration-none click list-group-item list-group-item-action p-1'
		);
		aElement.setAttribute('selected-fact', `${factInfo?.isSelected}`);
		if (factInfo?.id) {
			aElement.setAttribute('data-id', factInfo?.id);
			aElement.setAttribute('data-href', factInfo?.file || "");
		}
		aElement.setAttribute('tabindex', '13');

		aElement.addEventListener('click', (e) => {
			FactsGeneral.goToInlineFact(e, aElement);
		});
		aElement.addEventListener('keyup', (e) => {
			FactsGeneral.goToInlineFact(e, aElement);
		});

		const conceptWrapper = document.createElement('div');
		conceptWrapper.setAttribute('class', 'd-flex w-100 justify-content-between');
		const conceptElem = document.createElement('p');
		conceptElem.setAttribute('class', 'mb-0 font-weight-bold word-break');
		conceptElem.setAttribute('data-cy', 'concept');
		const pElementContent = document.createTextNode(ConstantsFunctions.getFactLabel(factInfo?.labels || []));
		conceptElem.appendChild(pElementContent);
		const badge = FactsGeneral.getFactBadge(factInfo);
		badge.setAttribute('data-cy', 'badge');
		conceptWrapper.appendChild(conceptElem);
		conceptWrapper.appendChild(badge);

		const factValElem = document.createElement('p');
		factValElem.setAttribute('class', 'mb-0');
		factValElem.setAttribute('data-cy', 'factVal');

		const factValue = (factInfo?.value && factInfo.isAmountsOnly) ? Number(factInfo.value).toLocaleString("en-US", { "maximumFractionDigits": 10 }) : factInfo?.value  || "nil";
		const p3Text = factInfo?.isHTML || factInfo?.isContinued ? 'Click to see Fact.' : factValue;
		const pElement3Content = document.createTextNode(p3Text);
		factValElem.appendChild(pElement3Content);

		const periodElem = document.createElement('p');
		periodElem.setAttribute('class', 'mb-0 lighter-text');
		periodElem.setAttribute('data-cy', 'factPeriod');
		const pElementContent2 = document.createTextNode(factInfo?.period as string);
		periodElem.appendChild(pElementContent2);

		const docNameElem = document.createElement('small');
		const currentInstance = Constants.getInstanceFiles.find(element => element.current);
		const currentXHTML = currentInstance?.docs.find(element => element.current);
		docNameElem.setAttribute('class', `${currentXHTML?.slug === factInfo?.file ? 'text-primary' : 'text-success'}`);
		docNameElem.setAttribute('data-cy', 'factFile');
		const docNameText = document.createTextNode(factInfo?.file ? factInfo.file : 'Unknown Location');
		docNameElem.appendChild(docNameText);

		aElement.appendChild(conceptWrapper);
		aElement.appendChild(factValElem);
		aElement.appendChild(periodElem);
		aElement.appendChild(docNameElem);
		factElem.appendChild(aElement);

		return factElem;
	},

	getFactBadge: (factInfo: any) => {
		const dimensions = factInfo.segment?.some((element: any) => element.dimension);

		const spanElement = document.createElement('span');
		const nestedSpanElement = document.createElement('span');

		const title = `${factInfo.isAdditional ? ' Additional' : ''}${factInfo.isCustom ? ' Custom' : ''}${dimensions ? ' Dimension' : ''}`.trim();
		const label = `${factInfo.isAdditional ? ' A' : ''}${factInfo.isCustom ? ' C' : ''}${dimensions ? ' D' : ''}`.trim();
		nestedSpanElement.setAttribute('title', title.split(' ').join(' & '));
		nestedSpanElement.setAttribute('class', 'mx-1 my-0 badge text-bg-dark');

		const spanNestedElementContent = document.createTextNode(label.split(' ').join(' & '));

		nestedSpanElement.appendChild(spanNestedElementContent);
		spanElement.appendChild(nestedSpanElement);
		return spanElement;
	},

	specialSort: (unsortedArray: Array<{ id: string, isAdditional: boolean }>): string[] =>
	{
		return [...unsortedArray].sort((a, b) => +a.isAdditional - +b.isAdditional)
			.map(({ id }) => id);
	}
};
