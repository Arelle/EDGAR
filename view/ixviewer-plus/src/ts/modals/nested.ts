/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */
import * as bootstrap from "bootstrap";
import { ConstantsFunctions } from "../constants/functions";
import { FactMap } from "../facts/map";
import { ixScrollTo } from "../helpers/utils";
import { Pagination } from "../pagination/sideBarPagination";
import { ModalsCommon } from "./common";
import { FactPages } from "./fact-pages";
import { Modals } from "./modals";
import { Facts } from "../facts/facts";

export const ModalsNested = {

	currentSlide: 0,

	carouselInformation: [{
		'dialog-title': 'Attributes'
	}, {
		'dialog-title': 'Labels'
	}, {
		'dialog-title': 'References'
	}, {
		'dialog-title': 'Calculation'
	}],

	dynamicallyFindContinuedFacts: (element: HTMLElement | null, elementsInArray: HTMLElement[]): HTMLElement[] =>
	{
		if (element)
		{
			elementsInArray.push(element);
			const continuedId = element.getAttribute('continuedat');

			if (continuedId)
			{
				const continuedElement = document.querySelector<HTMLElement>(`#dynamic-xbrl-form [id="${continuedId}"]`);
				return ModalsNested.dynamicallyFindContinuedFacts(continuedElement, elementsInArray);
			}
		}
		
		return elementsInArray;
	},

	getAllElementIDs: [] as Element[],
	getAllNestedFacts: (element: HTMLElement) => {
		//assume `element` is the "main" fact
		const getContinuedNestedElemIDs = (element: HTMLElement) => {
			if (element?.getAttribute('continued-main-fact') !== 'true') {
				console.warn("Not a parent fact!");
				const nestedFacts = Array.from(element.querySelectorAll('[id^="fact-identifier-"]')) as Array<HTMLElement>;
				ModalsNested.getAllElementIDs = [element, ...nestedFacts];
				return;
			}

			const nestedFacts = element.querySelectorAll('[id^="fact-identifier-"]');
			const continuedNestedFacts = ModalsNested.getOnlyContinuedFacts(element as HTMLElement, [])
				.flatMap((el: Element) => Array.from(el.querySelectorAll('[id^="fact-identifier-"]')));

			ModalsNested.getAllElementIDs = [element, ...nestedFacts, ...continuedNestedFacts];
		}

		if (element.getAttribute('continued-main-fact') === "true") {
			getContinuedNestedElemIDs(element);
		}
		else if (element.getAttribute("continued-main-fact-id")) {
			const parentId = element.getAttribute("continued-main-fact-id") || "";
			const parent = document.getElementById(parentId)!;
			getContinuedNestedElemIDs(parent);
		} else {
			ModalsNested.getAllElementIDs = [element, ...element.querySelectorAll('[id^="fact-identifier-"]')];
		}
	},
	
	getOnlyContinuedFacts: (element: Element, continuedElementsArray: Element[]): Element[] =>
	{
		const continuedId = element.getAttribute("continuedat");
		const continuedElement = document.querySelector(`#dynamic-xbrl-form [id="${continuedId}"]`);

		if (continuedElement)
		{
			continuedElementsArray.push(continuedElement);
			return ModalsNested.getOnlyContinuedFacts(continuedElement, continuedElementsArray);
		}

		return continuedElementsArray;
	},

	getElementById: (id: string): HTMLElement | HTMLElement[] | null =>
	{
		const element = document.querySelector<HTMLElement>(`#dynamic-xbrl-form [id="${id}"]`);
		if (element?.getAttribute('continued-main-fact') === 'true')
		{
			return ModalsNested.dynamicallyFindContinuedFacts(element, []);
		}

		return element;
	},

	createLabelCarousel: () => {
		const carousel = document.querySelector('#modal-fact-nested-label-carousel');
		if(carousel == null) return;

		// reset 
		carousel.innerHTML = "";

		// make "Nested Facts 1/18" label for modal title
		// create numator part
		const titleCarousel = document.createDocumentFragment();
		const currentFactNumSpan = document.createElement('span');
		const dialogTitle = document.createTextNode(`1`);
		currentFactNumSpan.appendChild(dialogTitle);
		document.getElementById('nested-page')?.firstElementChild?.replaceWith(currentFactNumSpan);
		
		// create denominator part
		const span1 = document.createElement('span');
		const dialogTitle1 = document.createTextNode(ModalsNested.getAllElementIDs.length.toString());
		span1.appendChild(dialogTitle1);
		document.getElementById('nested-count')?.firstElementChild?.replaceWith(span1);

		ModalsNested.getAllElementIDs.forEach((current) => {
			const factID = current.getAttribute('continued-main-fact-id') ? current.getAttribute('continued-main-fact-id') : current.getAttribute('id');
			const factInfo = FactMap.getByID(factID || "");

			const nestedFactName = ConstantsFunctions.getFactLabel(factInfo?.labels || []);

			const divTitleElement = document.createElement('div');
			divTitleElement.setAttribute('class', 'carousel-item nested-carousel');

			const divTitleNestedElement = document.createElement('div');
			divTitleNestedElement.setAttribute('class', 'carousel-content');

			const pTitleElement = document.createElement('p');
			pTitleElement.setAttribute('class', 'text-center font-weight-bold');
			const conceptNameContent = document.createTextNode(nestedFactName as string);
			pTitleElement.appendChild(conceptNameContent);
			divTitleNestedElement.appendChild(pTitleElement);
			divTitleElement.appendChild(divTitleNestedElement);
			titleCarousel.appendChild(divTitleElement);
		});

		carousel.appendChild(titleCarousel);
		carousel.querySelector('.carousel-item')?.classList.add('active');
	},

	createContentCarousel: (index: number) => {
		const element = ModalsNested.getElementById((ModalsNested.getAllElementIDs[index].id));
		ModalsNested.carouselData(element);
	},

	nestedClickEvent: (event: Event, element: HTMLElement) => {
		if (event instanceof KeyboardEvent && !(event.key === 'Enter' || event.key === 'Space'))
			return;

		event.preventDefault();
		event.stopPropagation();

		document.getElementById('fact-nested-modal')?.classList.remove('d-none');

		document.getElementById('fact-nested-modal-drag')?.focus();
		// we empty the ID Array
		ModalsNested.getAllElementIDs = [];
		// we load the ID Array
		ModalsNested.getAllNestedFacts(element);

		ModalsNested.createLabelCarousel();

		ModalsNested.createContentCarousel(0);

		ModalsNested.listeners();

		document.getElementById('nested-fact-modal-jump')?.setAttribute('data-id', (ModalsNested.getAllElementIDs[0] as HTMLElement).id);

		Modals.renderCarouselIndicators('modal-fact-nested-content-carousel',
			'fact-nested-modal-carousel-indicators', ModalsNested.carouselInformation);


		new bootstrap.Carousel(document.getElementById('modal-nested-fact-labels') as HTMLElement, {});
		const thisLabelCarousel = document.getElementById('modal-nested-fact-labels');

		new bootstrap.Carousel(document.getElementById('modal-fact-nested-content-carousel') as HTMLElement, {});
		const thisContentCarousel = document.getElementById('modal-fact-nested-content-carousel');

		thisLabelCarousel?.addEventListener('slide.bs.carousel' as any, (event: CarouselEvent) => {
			const span = document.createElement('span');
			const dialogTitle = document.createTextNode(`${event.to + 1}`);
			span.appendChild(dialogTitle);
			document.getElementById('nested-page')?.firstElementChild?.replaceWith(span);

			ModalsNested.currentSlide = ModalsCommon.currentDetailTab;

			// we add something...
			document.getElementById('nested-fact-modal-jump')?.setAttribute('data-id', ModalsNested.getAllElementIDs[event.to].id);

			// we hide the copy & paste area
			document.getElementById('fact-nested-copy-paste')?.classList.add('d-none');

			let selectedElement = ModalsNested.getElementById((ModalsNested.getAllElementIDs[event.to]).id);

			if (selectedElement instanceof Array)
			{
				selectedElement = selectedElement[0];
			}

			if (selectedElement == null) return;

			// selectedElement.scrollIntoView(false);    // keeping as comment to remember alternative function
			Facts.addURLHash(selectedElement.id);
			FactMap.setIsSelected(selectedElement.id);
			ixScrollTo(selectedElement);

			ModalsNested.createContentCarousel(event.to);

			bootstrap.Carousel.getInstance(document.getElementById('modal-fact-nested-content-carousel')!)?.to(ModalsNested.currentSlide);

			ModalsCommon.currentDetailTab = ModalsNested.currentSlide;
		});


		thisContentCarousel?.addEventListener('slide.bs.carousel' as any, (event: CarouselEvent) => {

			ModalsNested.currentSlide = event.to + 1;
			const previousActiveIndicator = event.from;
			const newActiveIndicator = event.to;
			document.getElementById('fact-nested-modal-carousel-indicators')?.querySelector(
				'[data-bs-slide-to="' + previousActiveIndicator + '"]')?.classList.remove('active');
			document.getElementById('fact-nested-modal-carousel-indicators')?.querySelector(
				'[data-bs-slide-to="' + newActiveIndicator + '"]')?.classList.add('active');
			ModalsCommon.currentDetailTab = newActiveIndicator;
		});
		bootstrap.Carousel.getInstance(document.getElementById('modal-fact-nested-content-carousel')!)?.to(0);
		ModalsCommon.currentDetailTab = ModalsNested.currentSlide;
	},

	listeners: () => {
		const oldActions = document.querySelector('#fact-nested-modal .dialog-header-actions');
		const newActions = (oldActions as HTMLElement).cloneNode(true);
		oldActions?.parentNode?.replaceChild(newActions, oldActions);

		// we add draggable
		Modals.initDrag(document.getElementById('fact-nested-modal-drag') as HTMLElement);

		document.getElementById('nested-fact-modal-jump')?.addEventListener('click', (event: MouseEvent) => {
			Pagination.goToFactInSidebar(event);
		});
		document.getElementById('nested-fact-modal-jump')?.addEventListener('keyup', (event: KeyboardEvent) => {
			Pagination.goToFactInSidebar(event);
		});

		document.getElementById('fact-nested-modal-copy-content')?.addEventListener('click', (event: MouseEvent) => {
			Modals.copyContent(event, 'modal-fact-nested-content-carousel', 'fact-nested-copy-paste');
		});
		document.getElementById('fact-nested-modal-copy-content')?.addEventListener('keyup', (event: KeyboardEvent) => {
			Modals.copyContent(event, 'modal-fact-nested-content-carousel', 'fact-nested-copy-paste');
		});

		document.getElementById('fact-nested-modal-compress')?.addEventListener('click', (event: MouseEvent) => {
			Modals.expandToggle(event, 'fact-nested-modal', 'fact-nested-modal-expand', 'fact-nested-modal-compress');
		});
		document.getElementById('fact-nested-modal-compress')?.addEventListener('keyup', (event: KeyboardEvent) => {
			Modals.expandToggle(event, 'fact-nested-modal', 'fact-nested-modal-expand', 'fact-nested-modal-compress');
		});

		document.getElementById('fact-nested-modal-expand')?.addEventListener('click', (event: MouseEvent) => {
			Modals.expandToggle(event, 'fact-nested-modal', 'fact-nested-modal-expand', 'fact-nested-modal-compress');
		});
		document.getElementById('fact-nested-modal-expand')?.addEventListener('keyup', (event: KeyboardEvent) => {
			Modals.expandToggle(event, 'fact-nested-modal', 'fact-nested-modal-expand', 'fact-nested-modal-compress');
		});

		document.getElementById('fact-nested-modal-close')?.addEventListener('click', (event: MouseEvent) => {
			Modals.close(event);
		});
		document.getElementById('fact-nested-modal-close')?.addEventListener('keyup', (event: KeyboardEvent) => {
			Modals.close(event);
		});

		window.addEventListener("keyup", ModalsNested.keyboardEvents);
	},

	keyboardEvents: (event: KeyboardEvent) => {
		const thisCarousel = bootstrap.Carousel.getInstance(document.getElementById('modal-fact-nested-content-carousel') as HTMLElement);

		if (event.key === '1') {
			thisCarousel?.to(0);
			ModalsNested.focusOnContent();
			return false;
		}
		if (event.key === '2') {
			thisCarousel?.to(1);
			ModalsNested.focusOnContent();
			return false;
		}
		if (event.key === '3') {
			thisCarousel?.to(2);
			ModalsNested.focusOnContent();
			return false;
		}
		if (event.key === '4') {
			thisCarousel?.to(3);
			ModalsNested.focusOnContent();
			return false;
		}
		if (event.key === 'ArrowLeft') {
			thisCarousel?.prev();
			ModalsNested.focusOnContent();
			return false;
		}
		if (event.key === 'ArrowRight') {
			thisCarousel?.next();
			ModalsNested.focusOnContent();
			return false;
		}
	},

	focusOnContent: () => {
		document.getElementById(`modal-fact-nested-content-carousel-page-${ModalsNested.currentSlide}`)?.focus();
	},

	carouselData: (element: HTMLElement | HTMLElement[] | null) => {
		let factID: string;
		if (Array.isArray(element)) {
			factID = element[0].getAttribute('continued-main-fact-id') || element[0].getAttribute('id') || "";
		} else {
			factID = element?.getAttribute('continued-main-fact-id') || element?.getAttribute('id') || "";
		}

		const factInfo = FactMap.getByID(factID);
		if(!factInfo) return;

		FactPages.firstPage(factInfo, 'modal-fact-nested-content-carousel-page-1');
		FactPages.secondPage(factInfo, 'modal-fact-nested-content-carousel-page-2');
		FactPages.thirdPage(factInfo, 'modal-fact-nested-content-carousel-page-3');
		FactPages.fourthPage(factInfo, 'modal-fact-nested-content-carousel-page-4');
		ConstantsFunctions.getCollapseToFactValue();
	},

	dynamicallyAddControls: () => {
		Modals.renderCarouselIndicators('modal-fact-nested-content-carousel',
			'fact-nested-modal-carousel-indicators', ModalsNested.carouselInformation);
	}
};
