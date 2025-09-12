/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import * as bootstrap from "bootstrap";
import { Constants } from "../constants/constants";
import { ErrorsMinor } from "../errors/minor";
import { FactsGeneral } from "../facts/general";
import { SingleFact } from "../interface/fact";
import { ConstantsFunctions } from "../constants/functions";
import { actionKeyHandler } from "../helpers/utils";

export const Pagination = {

	init: (enabledFactIds: Array<string>, selectorForPaginationControls: string, selectorForPaginationContent: string, modalAction: boolean) => {
		Pagination.reset();
		Pagination.getModalAction = modalAction;
		Pagination.getPaginationControlsSelector = selectorForPaginationControls;
		Pagination.getPaginationSelector = selectorForPaginationContent;
		Pagination.setArray(enabledFactIds);
		Constants.sideBarPaginationState.pageNumber = 1;
		Constants.sideBarPaginationState.totalPages = Math.ceil(Pagination.getArray.length / Constants.getPaginationPerPage);
		Pagination.renderPage(Constants.sideBarPaginationState.pageNumber);
		Pagination.addEscListener();

		if (enabledFactIds.length === 0) {
			document.getElementById('facts-menu-list-pagination')?.classList.add('d-none');
			document.getElementById('noFactsMsg')?.classList.remove('d-none');
		} else {
			document.getElementById('facts-menu-list-pagination')?.classList.remove('d-none');
			document.getElementById('noFactsMsg')?.classList.add('d-none');
		}
	},

	reset: () => {
		Pagination.getModalAction = false;
		Pagination.setArray([]);
		Pagination.getPaginationControlsSelector = '';
		Pagination.getPaginationSelector = '';
		Constants.sideBarPaginationState.pageNumber = 1;
		Constants.sideBarPaginationState.totalPages = 0;
	},

	getModalAction: false,

	getArray: [] as string[],

	setArray: (input: string[]) => {
		Pagination.getArray = input;
	},

	getPaginationControlsSelector: '',

	getPaginationSelector: '',

	getCurrentPage: 1,

	getTotalPages: 0,

	renderPage: (currentPage: number) => {
		// Runs each time user navs to new page of facts in facts sidebar pagination
		ConstantsFunctions.emptyHTML(Pagination.getPaginationControlsSelector);

		const divElement = document.createElement('div');
		divElement.setAttribute('class', 'w-100 d-flex justify-content-between py-dot-7 px-3 center-align-items');
		const subDivElement = document.createElement('div');
		subDivElement.setAttribute('id', 'sidebar-page-select');
		subDivElement.appendChild(Pagination.setPageSelect());
		subDivElement.appendChild(Pagination.getPaginationInfo());
		subDivElement.setAttribute("class", "center-align-items");

		divElement.appendChild(subDivElement);
		divElement.appendChild(Pagination.getPageControls());
		document.querySelector(Pagination.getPaginationControlsSelector)?.appendChild(divElement);

		const factElemsList = document.createDocumentFragment();
		const beginAt = ((currentPage - 1) * Constants.getPaginationPerPage);
		const endAt = beginAt + Constants.getPaginationPerPage;

		const factsForPage = Pagination.getArray.slice(beginAt, endAt);
		factsForPage.forEach((factId) => {
			factElemsList.appendChild(FactsGeneral.renderFactElem(factId));
		});

		ConstantsFunctions.emptyHTML(Pagination.getPaginationSelector);

		document.querySelector(Pagination.getPaginationSelector)?.appendChild(factElemsList);
	},

	firstPage: () => {
		Constants.sideBarPaginationState.pageNumber = 1;
		Pagination.renderPage(Constants.sideBarPaginationState.pageNumber);
		document.getElementById('firstFactPage')?.focus();
	},

	previousPage: (calledFromPrevFact = false) => {
		Constants.sideBarPaginationState.pageNumber = Constants.sideBarPaginationState.pageNumber - 1;
		Pagination.renderPage(Constants.sideBarPaginationState.pageNumber);
		if (calledFromPrevFact) {
			document.getElementById('prevFact')?.focus();
		} else {
			document.getElementById('prevFactPage')?.focus();
		}
	},

	nextPage: (calledFromNextFact = false) => {
		Constants.sideBarPaginationState.pageNumber = Constants.sideBarPaginationState.pageNumber + 1;
		Pagination.renderPage(Constants.sideBarPaginationState.pageNumber);
		if (calledFromNextFact) {
			document.getElementById('nextFact')?.focus();
		} else {
			document.getElementById('nextFactPage')?.focus();
		}
	},

	lastPage: () => {
		Constants.sideBarPaginationState.pageNumber = Constants.sideBarPaginationState.totalPages;
		Pagination.renderPage(Constants.sideBarPaginationState.pageNumber);
		document.getElementById('lastFactPage')?.focus();
	},

	getPaginationInfo: () => {
		const elementToReturn = document.createDocumentFragment();

		const paginationInfoDivElement = document.createElement('div');
		paginationInfoDivElement.setAttribute('class', 'pagination-info text-body ms-1');
		const paginationInfoDivContent = document.createTextNode(' of '
			+ Constants.sideBarPaginationState.totalPages);
		paginationInfoDivElement.appendChild(paginationInfoDivContent);

		elementToReturn.appendChild(paginationInfoDivElement);

		return elementToReturn;
	},

	getPageControls: () => {
		const firstPageDisabled = (Constants.sideBarPaginationState.pageNumber === 1) ? 'disabled' : '';
		const previousPageDisabled = (Constants.sideBarPaginationState.pageNumber - 1 <= 0) ? 'disabled' : '';
		const nextPageDisabled = (Constants.sideBarPaginationState.pageNumber + 1 > Constants.sideBarPaginationState.totalPages) ? 'disabled' : '';
		const lastPageDisabled = (Constants.sideBarPaginationState.pageNumber === Constants.sideBarPaginationState.totalPages) ? 'disabled' : '';

		const elementToReturn = document.createDocumentFragment();

		const navElement = document.createElement('nav');

		const ulElement = document.createElement('ul');
		ulElement.setAttribute('class', 'pagination pagination-sm mb-0');

		// todo later... use this template (needs edits)
		// const paginationMarkupTemplateString = 
		// 	`<nav xmlns="http://www.w3.org/1999/xhtml">
		// 		<ul class="pagination pagination-sm mb-0">
		// 			<li class="page-item ">
		// 				<a class="page-link text-body" tabindex="13">
		// 					<i class="fas fa-lg fa-angle-double-left"></i>
		// 				</a>
		// 			</li>
		// 			<li class="page-item ">
		// 				<a class="page-link text-body" tabindex="13">
		// 					<i class="fas fa-lg fa-angle-left"></i>
		// 				</a>
		// 			</li>
		// 			<li class="page-item ">
		// 				<a class="page-link text-body" tabindex="13">
		// 					<i class="fas fa-lg fa-angle-right"></i>
		// 				</a>
		// 			</li>
		// 			<li class="page-item ">
		// 				<a class="page-link text-body" tabindex="13">
		// 					<i class="fas fa-lg fa-angle-double-right"></i>
		// 				</a>
		// 			</li>
		// 		</ul>
		// 	</nav>`
		
		// first page
		const firstPageLiElement = document.createElement('li');
		firstPageLiElement.setAttribute('class', `page-item ${firstPageDisabled}`);

		const firstPageAElement = document.createElement('a');
		firstPageAElement.setAttribute('class', 'page-link text-body');
		firstPageAElement.setAttribute('tabindex', '13');
		firstPageAElement.setAttribute('id', 'firstFactPage');
		firstPageAElement.addEventListener('click', () => { Pagination.firstPage(); });
		firstPageAElement.addEventListener('keyup', (event: KeyboardEvent) => {
			if (!actionKeyHandler(event)) return;
			Pagination.firstPage();
		});

		const firstPageContent = document.createElement('i');
		firstPageContent.setAttribute('class', 'fas fa-lg fa-angle-double-left');

		firstPageAElement.appendChild(firstPageContent);
		firstPageLiElement.appendChild(firstPageAElement);
		ulElement.appendChild(firstPageLiElement);

		// prev page
		const previousPageLiElement = document.createElement('li');
		previousPageLiElement.setAttribute('class', `page-item ${previousPageDisabled}`);

		const previousPageAElement = document.createElement('a');
		previousPageAElement.setAttribute('class', 'page-link text-body');
		previousPageAElement.setAttribute('tabindex', '13');
		previousPageAElement.setAttribute('id', 'prevFactPage');
		previousPageAElement.addEventListener('click', () => { Pagination.previousPage(); });
		previousPageAElement.addEventListener('keyup', (event: KeyboardEvent) => {
			if (!actionKeyHandler(event)) return;
			Pagination.previousPage();
		});

		const previousPageContent = document.createElement('i');
		previousPageContent.setAttribute('class', 'fas fa-lg fa-angle-left');

		previousPageAElement.appendChild(previousPageContent);
		previousPageLiElement.appendChild(previousPageAElement);
		ulElement.appendChild(previousPageLiElement);

		// next page
		const nextPageLiElement = document.createElement('li');
		nextPageLiElement.setAttribute('class', `page-item ${nextPageDisabled}`);

		const nextPageAElement = document.createElement('a');
		nextPageAElement.setAttribute('class', 'page-link text-body');
		nextPageAElement.setAttribute('tabindex', '13');
		nextPageAElement.setAttribute('id', 'nextFactPage');
		nextPageAElement.addEventListener('click', () => { Pagination.nextPage(); });
		nextPageAElement.addEventListener('keyup', (event: KeyboardEvent) => {
			if (!actionKeyHandler(event)) return;
			Pagination.nextPage();
		});

		const nextPageContent = document.createElement('i');
		nextPageContent.setAttribute('class', 'fas fa-lg fa-angle-right');

		nextPageAElement.appendChild(nextPageContent);
		nextPageLiElement.appendChild(nextPageAElement);
		ulElement.appendChild(nextPageLiElement);

		// last page
		const lastPageLiElement = document.createElement('li');
		lastPageLiElement.setAttribute('class', `page-item ${lastPageDisabled}`);

		const lastPageAElement = document.createElement('a');
		lastPageAElement.setAttribute('class', 'page-link text-body');
		lastPageAElement.setAttribute('tabindex', '13');
		lastPageAElement.setAttribute('id', 'lastFactPage');
		lastPageAElement.addEventListener('click', () => { Pagination.lastPage(); });
		lastPageAElement.addEventListener('keyup', (event: KeyboardEvent) => {
			if (!actionKeyHandler(event)) return;
			Pagination.lastPage();
		});

		const lastPageContent = document.createElement('i');
		lastPageContent.setAttribute('class', 'fas fa-lg fa-angle-double-right');

		lastPageAElement.appendChild(lastPageContent);
		lastPageLiElement.appendChild(lastPageAElement);
		ulElement.appendChild(lastPageLiElement);

		navElement.appendChild(ulElement);
		elementToReturn.appendChild(navElement);
		return elementToReturn;
	},

	setPageSelect: () => {
		const select = document.createElement('select');
		select.setAttribute('id', 'facts-menu-page-select');
		select.setAttribute('class', 'pagination-border ix-focus');
		select.setAttribute('tabindex', '13');
		const option = document.createElement('option');
		option.setAttribute('value', 'null');
		const optionText = document.createTextNode('Select a Page');
		option.append(optionText);
		for (let i = 0; i < Constants.sideBarPaginationState.totalPages; i++) {
			const option = document.createElement('option');
			option.setAttribute('value', `${i + 1}`);
			const optionText = document.createTextNode(`Page ${i + 1}`);
			option.append(optionText);
			if ((i + 1) === Constants.sideBarPaginationState.pageNumber) {
				option.setAttribute('selected', 'true');
			}
			select!.append(option);
		}
		if (!select?.hasAttribute('listener')) {
			select.setAttribute('listener', 'true');
			select.addEventListener('change', () => 
				Pagination.goToPage(+select.value));
		}
		return select;
	},

	goToPage: (pageNumber: number) => {
		if (!isNaN(pageNumber)) {
			Constants.sideBarPaginationState.pageNumber = +pageNumber;

			Pagination.renderPage(Constants.sideBarPaginationState.pageNumber);
		}
	},

	goToFactInSidebar: (event: MouseEvent | KeyboardEvent) => {
		if (
			Object.prototype.hasOwnProperty.call(event, 'key') &&
			!((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === 'Space' || (event as KeyboardEvent).key === ' ')
		) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		if ((event.target as HTMLElement) && (event.target as HTMLElement).hasAttribute('data-id')) {
			if (document.getElementById('facts-menu')?.classList.contains('show')) {
				Pagination.findFactAndGoTo((event.target as HTMLElement).getAttribute('data-id') as string);
			} else {
				// TODO: not tested - not sure how to get here
				const factsMenuElem = document.getElementById('facts-menu');
				const collapse = new bootstrap.Collapse('#facts-menu');
				collapse.toggle();
				factsMenuElem?.addEventListener('shown.bs.collapse', () => {
					Pagination.findFactAndGoTo((event.target as HTMLElement).getAttribute('data-id') as string)
				});
			}
		}
	},

	findFactAndGoTo: (elementID: string) => {
		let index = -1;
		for (let i = 0; i < Pagination.getArray.length; i++) {
			if (Pagination.getArray[i] === elementID) {
				index = i;
				break;
			}
		}
		if (index >= 0) {
			const pageToGoTo = Math.ceil((index + 1) / Constants.getPaginationPerPage);
			Constants.sideBarPaginationState.pageNumber = pageToGoTo;
			Pagination.renderPage(pageToGoTo);
			Pagination.scrollToSelectedFactInSidebar();
		} else {
			ErrorsMinor.factNotInSearch();
		}
	},

	setSelectedFact: (element: HTMLElement, fact: SingleFact) => {
		const allFactsInMenu = Array.from(document.querySelectorAll(`#facts-menu-list-pagination .list-group-item`));
		allFactsInMenu.forEach(current => {
			current.setAttribute('selected-fact', 'false');
		});
		element.setAttribute('selected-fact', 'true');

		const selectedFactElem = document.querySelector(`#dynamic-xbrl-form [filing-url="${fact.file}"] #${fact.id}`);
		const allInlineFacts = Array.from(document.querySelectorAll('[name][contextref]'));
		allInlineFacts.forEach((factElem: Element) => {
			if (factElem == selectedFactElem) {
				factElem.setAttribute('selected-fact', 'true');
			} else {
				factElem.setAttribute('selected-fact', 'false');
			}
		})
	
		selectedFactElem?.setAttribute('selected-fact', 'true');
		selectedFactElem?.scrollIntoView({
			behavior: 'smooth',
			// block: "start", fixes
			block: "nearest", // previously set to Constants.scrollPosition - not sure why.
			inline: "start"
		});
	},

	scrollToSelectedFactInSidebar: () => {
		const elementToScrollTo = document.getElementById('facts-menu-list-pagination')?.querySelector(
			'[selected-fact="true"]');
		if (elementToScrollTo) {
			elementToScrollTo.scrollIntoView({
				// block: "nearest" is needed to prevent content from shifting out of viewport.
				block: "nearest", // if item is above viewport resolves to start or top, if below resolves to end or bottom
				inline: "start"
			});
		}
	},

	addEscListener: () => {
		document.querySelectorAll('#facts-menu-button, #facts-menu')?.forEach(elem => {
			elem.addEventListener("keyup", (event) => {
				if (event instanceof KeyboardEvent && event.key === 'Escape') {
					(document.querySelector('#factSidebarCloseX') as HTMLElement)?.click();
				}
			});
		})
	}

};
