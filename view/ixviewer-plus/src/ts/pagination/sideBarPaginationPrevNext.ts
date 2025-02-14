/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Constants } from "../constants/constants";
import { ConstantsFunctions } from "../constants/functions";
import { FactsGeneral } from "../facts/general";
import { Pagination } from "./sideBarPagination";
import { defaultKeyUpHandler } from "../helpers/utils";

export class SideBarPaginationPrevNext {

	private enabledFactIds: Array<string>;
	private selectorForPaginationControls: string; 
	private selectorForPaginationContent: string;
	private modalAction: boolean;
	private getArray: any[] = [];
	private getPaginationControlsSelector = "";
	private getPaginationSelector = ""; 

	constructor(enabledFactIds: Array<string>, selectorForPaginationControls: string, selectorForPaginationContent: string, modalAction: boolean)
    {
		this.enabledFactIds = enabledFactIds;
		this.selectorForPaginationControls = selectorForPaginationControls;
		this.selectorForPaginationContent = selectorForPaginationContent;
		this.getArray = enabledFactIds;
		this.reset();
		this.modalAction = modalAction;
		this.getPaginationControlsSelector = selectorForPaginationControls;
		this.getPaginationSelector = selectorForPaginationContent;
		this.renderPage(Constants.sideBarPaginationState.pageNumber);
    }

	private reset() 
	{
		this.modalAction = false;
		this.getPaginationControlsSelector = '';
		this.getPaginationControlsSelector = '';
		this.getPaginationSelector = '';
		Constants.sideBarPaginationState.pageNumber = 1;
		Constants.sideBarPaginationState.totalPages = Math.ceil(this.getArray.length / Constants.getPaginationPerPage);
	}

	private renderPage() 
	{
		// Runs each time user navs to new page of facts in facts sidebar pagination
		ConstantsFunctions.emptyHTML(this.getPaginationControlsSelector);

		const divElement = document.createElement('div');
		divElement.setAttribute('class', 'w-100 d-flex justify-content-between py-2 px-1');
		divElement.appendChild(this.getPrevNextControls());
		document.querySelector(this.getPaginationControlsSelector)?.appendChild(divElement);
	}

	private previousFact(event: MouseEvent | KeyboardEvent, element: HTMLElement) 
	{
		const beginAt = ((Constants.sideBarPaginationState.pageNumber - 1) * Constants.getPaginationPerPage);
		const endAt = beginAt + Constants.getPaginationPerPage;

		const currentFacts = this.getArray.slice(beginAt, endAt);

		const selectedFactIndex = currentFacts.findIndex((current) =>
		{
			const element = FactsGeneral.getMenuFactByDataID(current);
			return element?.getAttribute("selected-fact") === "true";
		});
	
		if (selectedFactIndex === -1) {
			const element = FactsGeneral.getMenuFactByDataID(currentFacts[currentFacts.length - 1])!;
			FactsGeneral.goToInlineFact(event, element as HTMLElement);
		} else {
			if ((selectedFactIndex - 1) < 0) {
				if (Constants.sideBarPaginationState.pageNumber - 1 > 0) {
					Pagination.previousPage(true);
					this.previousFact(event, element);
				}
			} else {
				const element = FactsGeneral.getMenuFactByDataID(currentFacts[(selectedFactIndex - 1)]);
				FactsGeneral.goToInlineFact(event, element as HTMLElement);
			}
		}
	}

	private nextFact(event: MouseEvent | KeyboardEvent, element: HTMLElement) 
	{
		const beginAt = Math.max(((Constants.sideBarPaginationState.pageNumber - 1) * Constants.getPaginationPerPage), 0);
		const endAt = Math.min(beginAt + Constants.getPaginationPerPage, this.getArray.length);
		const currentFacts = this.getArray.slice(beginAt, endAt);
		const selectedFactIndex = currentFacts.findIndex((current) =>
		{
			const element = FactsGeneral.getMenuFactByDataID(current);
			return element?.getAttribute("selected-fact") === "true";
		});	
	
		if (selectedFactIndex === -1) {
			const element = FactsGeneral.getMenuFactByDataID(currentFacts[0]);
			FactsGeneral.goToInlineFact(event, element as HTMLElement);
		} else {
			if ((selectedFactIndex + 1) >= currentFacts.length) {
				if ((Constants.sideBarPaginationState.pageNumber - 1) !== (Constants.sideBarPaginationState.totalPages - 1)) {
					Pagination.nextPage(true);
					this.nextFact(event, element);
				}
			} else {
				const element = FactsGeneral.getMenuFactByDataID(currentFacts[selectedFactIndex + 1]);
				FactsGeneral.goToInlineFact(event, element as HTMLElement);
			}
		}
	}

	private getPrevNextControls() 
	{
		const btnGroupHtmlString = 
			`<ul class="pagination pagination-sm mb-0">
				<li class="page-item">
					<a class="page-link text-body" tabindex="13" id="prevFact">
					Previous Fact
					</a>
				</li>
				<li class="page-item">
					<a class="page-link text-body" tabindex="13" id="nextFact">
					Next Fact
					</a>
				</li>
			</ul>`;
		const parser = new DOMParser();
		const prevdoc = parser.parseFromString(btnGroupHtmlString, 'text/html');
		const prevNextBtnGroup = prevdoc.querySelector('body > ul') as HTMLElement

		const prevFactBtn = prevNextBtnGroup.querySelector('#prevFact') as HTMLElement
		prevFactBtn.addEventListener('click', (e) => {			
			e.stopPropagation();
			e.preventDefault();
			this.previousFact(e, prevFactBtn);			
		});
		prevFactBtn.addEventListener('keyup', (e: KeyboardEvent) => {
			if (!defaultKeyUpHandler(e)) return;
			this.previousFact(e, prevFactBtn);
		});

		const nextFactBtn = prevNextBtnGroup.querySelector('#nextFact') as HTMLElement
		nextFactBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();
			this.nextFact(e, nextFactBtn);			
		});
		nextFactBtn.addEventListener('keyup', (e: KeyboardEvent) => {
			if (!defaultKeyUpHandler(e)) return;
			this.nextFact(e, nextFactBtn);
		});
				
		const elementToReturn = document.createDocumentFragment();
		elementToReturn.appendChild(prevNextBtnGroup);
		
		return elementToReturn;
	}
}