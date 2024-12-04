/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */
import * as bootstrap from "bootstrap";
import { Constants } from "../constants/constants";
import { FactMap } from "../facts/map";
import { ModalsCommon } from "../modals/common";
import { ModalsNested } from "../modals/nested";

import { FactsMenu } from "./menu";
// import { FactsTable } from "./table";
import { SingleFact } from "../interface/fact";
import { Logger, ILogObj } from "tslog";
import { ConstantsFunctions } from "../constants/functions";
import { ixScrollTo } from "../helpers/utils";

export const Facts = {
	updateFactCount: () => {
		const factCount = FactMap.getFactCount();
		// FactsTable.update();
		const instanceFactCountElems = Array.from(document.querySelectorAll(".fact-total-count"));

		Constants.getHtmlOverallFactsCount = factCount;

		instanceFactCountElems.forEach((instanceFactCntElem) => {
			if (Constants.getHtmlOverallFactsCount === "0") {
				document.getElementById("facts-menu")?.setAttribute("disabled", 'true');
				document.getElementById("facts-menu")?.classList.add("disabled");
			} else {
				document.getElementById("facts-menu")?.removeAttribute("disabled");
				document.getElementById("facts-menu")?.classList.remove("disabled");
			}
			instanceFactCntElem.textContent = Constants.getHtmlOverallFactsCount;
		});

		// do the slugs too:
		const docTabsFactsCounts = Array.from<HTMLElement>(document.querySelectorAll("[doc-slug]"));
		docTabsFactsCounts.forEach((docFactCountElem) => {
			if (docFactCountElem) {
				const filingLoaded = Constants.getInlineFiles.find(element => {
					if (element.slug === docFactCountElem.getAttribute('doc-slug')) {
						return element;
					}
				});
				if (filingLoaded?.loaded) {
					const fileName = docFactCountElem.getAttribute('doc-slug') || "";
					docFactCountElem.innerText = FactMap.getFactCountForFile(fileName);
				}
			}
		});

		if (document.getElementById('facts-menu')?.classList.contains('show')) {
			FactsMenu.prepareForPagination();
		}
		return factCount;
	},

	fixStyleString: (input: string) => {
		return input.split(";").reduce((accumulator: { [x: string]: string; }, currentValue: string) => {
			const rulePair = currentValue.split(":");
			if (rulePair[0] && rulePair[1]) {
				accumulator[rulePair[0].trim()] = rulePair[1].trim();
			}
			return accumulator;
		}, {});
	},

	addEventAttributes: () => {
		const startPerformance = performance.now();
		Facts.inViewPort();
		const endPerformance = performance.now();
		if (LOGPERFORMANCE) {
			const log: Logger<ILogObj> = new Logger();
			log.debug(`Facts.addEventAttributes() completed in: ${(endPerformance - startPerformance).toFixed(2)}ms`);
		}
	},

	handleFactHash: (event = new Event("click")) => {
		if (Constants.appWindow.location.hash.startsWith('#fact-identifier')) {
			event.stopPropagation();
			event.preventDefault();
			const id = Constants.appWindow.location.hash;
			const element = document.querySelector(id);
			if (element instanceof HTMLElement) {
				Facts.clickEvent(event, element);
				// element.scrollIntoView(false); // keeping as comment to remember alternative function
				ixScrollTo(element);
			}
		}
	},

	addHashChangeListener: () => {
		Constants.appWindow.addEventListener("hashchange", (event) => {
			Facts.handleFactHash(event)
		});
	},

	setListeners(element: HTMLElement) {
		element.addEventListener("click", (event: MouseEvent) => {
			event.stopPropagation();
			event.preventDefault();
			if (element instanceof HTMLElement) {
				const id = element.hasAttribute('continued-main-fact-id') ? element.getAttribute('continued-main-fact-id') : element.getAttribute('id');
				Facts.addURLHash(id as string);
				Facts.clickEvent(event, element);
			}
		});

		element.addEventListener("keyup", (event: KeyboardEvent) => {
			event.stopPropagation();
			event.preventDefault();
			if (element instanceof HTMLElement) {
				const id = element.hasAttribute('continued-main-fact-id') ? element.getAttribute('continued-main-fact-id') : element.getAttribute('id');
				Facts.addURLHash(id as string);
				Facts.clickEvent(event, element);
			}
		});

		element.addEventListener("mouseover", (event: MouseEvent) => {
			Facts.enterElement(event, element);
		});

		element.addEventListener("mouseleave", (event: MouseEvent) => {
			Facts.leaveElement(event, element);
		});

		element.setAttribute('listeners', 'true');
	},

	inViewPort: (unobserveAfter = false) => {
		const factSelector = '[id^=fact-identifier-], [continued-main-fact-id], [data-link], [xhtml-change]';
		const allFactIdentifiers = Array.from(document?.getElementById('dynamic-xbrl-form')?.querySelectorAll(factSelector) || []);

		const observer = new IntersectionObserver(entries => {
			entries.forEach(({ target, isIntersecting }) => {
				if (isIntersecting) {
					if (target.hasAttribute('xhtml-change')) {
						const file = (href: string) => {
							return document.getElementById(href.slice(1))?.closest(`[filing-url]`);
						}
						const fileToChangeTo = file(target.getAttribute('href') as string);
						if (fileToChangeTo?.getAttribute('filing-url')) {
							target.addEventListener('click', () => {
								ConstantsFunctions.switchDoc(fileToChangeTo.getAttribute('filing-url') || "");
							});
							target.addEventListener('keyup', () => {
								ConstantsFunctions.switchDoc(fileToChangeTo.getAttribute('filing-url') || "");
							});
						}

					} else if (target.hasAttribute('data-link')) {
						target.addEventListener('click', () => {
							ConstantsFunctions.switchDoc(target.getAttribute('data-link') || "");
						});
						target.addEventListener('keyup', () => {
							ConstantsFunctions.switchDoc(target.getAttribute('data-link') || "");
						});
					} else {
						if (!target.getAttribute('listeners')) {
							Facts.setListeners(target as HTMLElement);
						}
						const fact = FactMap.getByID(target.getAttribute('continued-main-fact-id') || target.getAttribute('id') as string) as unknown as SingleFact;

						target.setAttribute('tabindex', `18`);
						target.setAttribute('enabled-fact', `${fact.isEnabled}`);
						target.setAttribute('highlight-fact', `${fact.isHighlight}`);
						target.setAttribute("text-block-fact", 'false');

						if (fact.xbrltype === 'textBlockItemType') {
							// text block fact is on the screen
							target.setAttribute("text-block-fact", 'true');
						}

						if (target.hasAttribute("continued-main-fact")) {
							const getContinuedIDs = (continuedAtId: string, mainID: string) => {
								// let's ensure we haven't already added the necessary html attributes to the element
								if (fact.continuedIDs && !fact.continuedIDs.includes(continuedAtId)) {
									Facts.setListeners(document.querySelector(`[id="${continuedAtId}"]`) as HTMLElement);
									document.querySelector(`[id="${continuedAtId}"]`)?.setAttribute("continued-main-fact-id", mainID);
									document.querySelector(`[id="${continuedAtId}"]`)?.setAttribute("continued-fact", "true");
									document.querySelector(`[id="${continuedAtId}"]`)?.setAttribute("enabled-fact", `${fact.isEnabled}`);	
									document.querySelector(`[id="${continuedAtId}"]`)?.setAttribute("selected-fact", `${fact.isSelected}`);					
									document.querySelector(`[id="${continuedAtId}"]`)?.setAttribute("text-block-fact", "true");		
													
									document.querySelector(`[id="${continuedAtId}"]`)?.setAttribute("highlight-fact", `${fact.isHighlight}`);						
									target.setAttribute('highlight-fact', `${fact.isHighlight}`);
									fact.continuedIDs.push(continuedAtId);
									if (document.querySelector(`[id="${continuedAtId}"]`)?.hasAttribute("continuedat")) {
										getContinuedIDs(document.querySelector(`[id="${continuedAtId}"]`)?.getAttribute("continuedat") as string, mainID);
									}
								}
							};
							getContinuedIDs(target.getAttribute("continuedat") as string, target.getAttribute("id") as string);
						}
					}
				}
				unobserveAfter ? observer.unobserve(target) : null;
			});
		});

		allFactIdentifiers.forEach((current) => {
			observer.observe(current);
		});
	},

	isElementContinued: (element: HTMLElement | null) =>
	{
		return element?.getAttribute("continued-fact") === "true" || element?.getAttribute("continued-main-fact") === "true";
	},

	isElementNested: (element: HTMLElement) => {
		ModalsNested.getAllElementIDs = [];
		ModalsNested.getAllNestedFacts(element);

		return ModalsNested.getAllElementIDs.length > 1;
	},

	clickEvent: (event: Event, element: HTMLElement) => {
		event.stopPropagation();
		event.preventDefault();
		if (event instanceof KeyboardEvent && !(event.key === 'Enter' || event.key === 'Space'))
			return;

		document.getElementById("fact-modal")?.classList.add("d-none");
		document.getElementById("fact-nested-modal")?.classList.add("d-none");
		const elementRecursion = (element: HTMLElement): { href: string, _target: string } | null => {
			if (typeof element.hasAttribute == "function" && element.hasAttribute('href')) {
				return {
					href: element.getAttribute('href') as string,
					_target: element.getAttribute('target') as string
				};
			}
			if (!element.parentElement) {
				return null;
			} else {
				return elementRecursion(element.parentElement)
			}
		}
		const isLink = event.target && elementRecursion(event.target as HTMLElement);
		if (isLink) {
			window.open(
				isLink.href,
				isLink._target === '_blank' ? '_blank' : '_self'
			);
			return false;
		} else {
			const id = element.getAttribute('continued-main-fact-id') || element.getAttribute('id');
			if (id == null) return;
			FactMap.setIsSelected(id as string);
			if (Facts.isElementNested(element)) {
				ModalsNested.nestedClickEvent(event, element);
			} else {
				ModalsCommon.clickEvent(event, element);
			}
		}
	},

	enterElement: (event: MouseEvent, element: HTMLElement) => {
		event.stopPropagation();
		event.preventDefault();
		Facts.resetAllPopups(() => {
			Facts.resetAllHoverAttributes();
			element.setAttribute("hover-fact", 'true');
			if (Constants.hoverOption) {
				if (Facts.isElementContinued(element)) {
					if (element.hasAttribute("continued-main-fact")) {
						Facts.addPopover(element);
					}
				} else {
					Facts.addPopover(element);
				}
			} else {
				if (Facts.isElementContinued(element)) {
					// get this facts info
					const fact: any = FactMap.getByID(element.getAttribute('continued-main-fact-id') || element.getAttribute('id') as string);
					if (fact) {
						fact.continuedIDs.forEach((current: any) => {
							document.getElementById(current)?.setAttribute('hover-fact', 'true');
							document.querySelector(`[continuedat="${current}"]`)?.setAttribute('hover-fact', 'true');
						});
					}
				}
			}
		});
	},

	addPopover: (element: HTMLElement) => {
		const fact: any = FactMap.getByID(element.getAttribute('id') as string);
		if (fact) {
			element.parentElement?.setAttribute("data-bs-toggle", "popover");
			element.parentElement?.setAttribute("data-bs-placement", "auto");
			// element.parentElement?.setAttribute("data-bs-title", ConstantsFunctions.getFactLabel(fact.labels) as string);
			element.parentElement?.setAttribute("data-bs-content", fact.isHTML ? `Click to see Fact.\n${fact.period}` : ` ${fact.value}\n${fact.period}`);
			element.parentElement?.setAttribute("data-bs-trigger", "focus");
			element.classList.add('elevated');
			const popoverHTML = document.createElement('div');
			popoverHTML.classList.add('m-1');
			popoverHTML.classList.add('text-center');
			const value = document.createElement('div');
			const labelAndValue = `${ConstantsFunctions.getFactLabel(fact.labels) as string}: ${(fact.value as unknown as string)}`;
			const valueText = document.createTextNode(fact.isHTML ? 'Click to see Fact.' : labelAndValue);
			value.append(valueText);
			popoverHTML.append(value);
			const period = document.createElement('div');
			const periodText = document.createTextNode(fact.period);
			period.append(periodText);
			popoverHTML.append(period);
			const info = document.createElement('div');
			popoverHTML.append(info);
			const popover = new bootstrap.Popover(element.parentElement as HTMLElement, { html: true, content: popoverHTML });
			popover.show();
		}
	},

	leaveElement: (event: MouseEvent, element: HTMLElement) => {
		event.stopPropagation();
		event.preventDefault();
		// hide them all!
		const thisCarousel = bootstrap.Popover.getInstance(element as HTMLElement);
		thisCarousel?.hide();
		Facts.resetAllPopups(() => {
			Facts.resetAllHoverAttributes();
		});
	},

	resetAllPopups: (callback: () => void) => {
		const foundPopupClassesArray = Array.from(document.querySelectorAll(".popover"));
		foundPopupClassesArray.forEach((current) => {
			current.parentNode?.removeChild(current);
		});

		callback();
	},

	resetAllHoverAttributes: () => {
		const foundHoverClasses = document.getElementById("dynamic-xbrl-form")?.querySelectorAll('[hover-fact="true"]');

		const foundHoverClassesArray = Array.prototype.slice.call(foundHoverClasses);

		foundHoverClassesArray.forEach((current) => {
			current.setAttribute("hover-fact", "false");
		});
	},

	addURLHash: (factId: string) => {
		if (Constants.appWindow.history.pushState) {
			Constants.appWindow.history.pushState(null, "", `#${factId}`);
		}
		else {
			Constants.appWindow.location.hash = `#${factId}`;
		}
	},
};
