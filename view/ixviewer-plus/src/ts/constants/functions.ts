/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import * as bootstrap from "bootstrap";
import * as DOMPurify from "dompurify";

import { App } from "../app/app";
import { FactMap } from "../facts/map";
import { FactsTable } from "../facts/table";
import { HelpersUrl } from "../helpers/url";
import { Modals } from "../modals/modals";
import { Constants } from "./constants";
import { InstanceFile } from "../interface/instance-file";
import { Reference } from "../interface/fact";
import { FormInformation } from "../interface/form-information";
import { FactsGeneral } from "../facts/general";
import { Pagination } from "../pagination/sideBarPagination";
import { SideBarPaginationPrevNext } from "../pagination/sideBarPaginationPrevNext";
import { UserFiltersState } from "../user-filters/state";
import { Facts } from "../facts/facts";
import { incrementProgress, resetProgress, showLoadingUi } from "../app/loading-progress";


export const ConstantsFunctions = {

	setTitle: () => {
		const name = FactMap.getByName('dei:EntityRegistrantName') || '';
		const form = FactMap.getByName('dei:DocumentType') || '';
		const date = FactMap.getByName('dei:DocumentPeriodEndDate') || '';
		let viewType = 'Inline Viewer';
		const searchParams = HelpersUrl.returnURLParamsAsObject(Constants.appWindow.location.search);
		// need to test on arelle local gui...
		const iframes = document.querySelectorAll('iframe').length;
		const appIsInIframe = (window.parent.document == document) && iframes;
		if (appIsInIframe && searchParams.title) {
			viewType = searchParams.title;
		}
		window.parent.document.title = `${viewType}: ${name} ${form} ${date}`;
	},

	emptyHTMLByID: (id: string) =>
	{
		ConstantsFunctions.emptyHTML(`#${id}`);
	},
	
	emptyHTML: (selector: string) =>
	{
		const element = document.querySelector(selector);
		if (element)
		{
			while (element.firstChild)
			{
				element.firstChild?.remove();
			}
		}
	},

	setInstanceFiles: (input: InstanceFile[]) => {
		Constants.getInstanceFiles = input;
	},

	setInlineFiles: (input: Array<{ current: boolean, loaded: boolean, slug: string, table?: boolean, dropdown?: boolean }>) => {
		Constants.getInlineFiles = input;
	},

	setStdRef: (input: Record<string, Reference>) => {
		Constants.getStdRef = input;
	},

	setFormInformation: (input: FormInformation) => {
		Constants.getFormInformation = input
	},

	getFactLabel: (labels: Array<{ Label?: string | null}>): string => {
		const label = labels.find((e): e is { Label: string } => !!e.Label);
		return label ? label.Label : 'Not Available.';
	},

	getCollapseToFactValue: () => {
		const factValueModals = Array.from(document.querySelectorAll('.fact-value-modal'));
		factValueModals.forEach((current) => {
			if ((current as HTMLElement)?.offsetHeight && (current as HTMLElement)?.offsetHeight as number > 33 && current.parentNode?.parentNode?.querySelector('.fact-collapse')) {

				const a = document.createElement('a');
				a.classList.add('ms-1')
				a.setAttribute('aria-expanded', 'false');
				a.setAttribute('aria-controls', 'fact-value-modal');
				a.setAttribute('data-bs-toggle', 'collapse');
				a.setAttribute('data-bs-target', '.fact-value-modal');
				a.setAttribute('data-cy', 'factExpandMoreLess');
				a.setAttribute('href', '#');
				const aText = document.createTextNode(`More/Less`);
				a.append(aText);
				current.parentNode?.parentNode?.querySelector('.fact-collapse')?.append(a);
				current?.classList.add('collapse');
			}
		});
	},

	changeInstance: (
		instanceIndex: number,
		targetInstanceFile: string | null,
		callback: (arg0: boolean) => void
	) => {
		Modals.close(new Event(''));

		Constants.getInstanceFiles.forEach((instanceFile) => {
			instanceFile.current = instanceFile.instance === instanceIndex ? true : false;
			instanceFile.docs.forEach((xhtml, index) => {
				if (targetInstanceFile) {
					if (instanceFile.instance === instanceIndex && targetInstanceFile === xhtml.slug) {
						xhtml.current = true;
					} else {
						xhtml.current = false;
					}
				} else {
					xhtml.current = index === 0 ? true : false;
				}
			});
		});

		const needToLoadInstance = Constants.getInstanceFiles[instanceIndex].docs.some(element => !element.loaded);
		if (needToLoadInstance) {
			// not loaded, go get the requested instance
			App.init(true, (success: boolean) => {
				if (success) App.additionalSetup();
				callback(success);
			});
		} else {
			// already loaded, just update the DOM and update FlexSearch
			const activeInstance = Constants.getInstanceFiles.find(element => element.current);
			const inlineFileSlug = activeInstance?.docs.find(element => element.current)?.slug;
			if (inlineFileSlug == null || activeInstance == null) return;

			HelpersUrl.init(inlineFileSlug, () =>
			{
				App.loadFromMemory(activeInstance);
				return callback(true);
			});
		}
	},

	hideFactTable: () => {
		const offCanvasElement = document.getElementById('fact-table-container');
		const offCanvas = bootstrap.Offcanvas.getInstance(offCanvasElement as HTMLElement);
		offCanvasElement?.removeEventListener('hidden.bs.offcanvas', () => FactsTable.toggle(false));
		offCanvas?.hide();
		offCanvasElement?.addEventListener('hidden.bs.offcanvas', () => FactsTable.toggle(false));
	},

	switchDoc: (fileToChangeTo: string): Promise<void> =>
	{
		if(Constants.appWindow.location.href.includes(fileToChangeTo)) return Promise.resolve();

		resetProgress();
		incrementProgress();
		showLoadingUi();

		ConstantsFunctions.hideFactTable();

		const switchTabs = () =>
		{
			//requires setTimeout, otherwise the Loading UI doesn't show
			return new Promise<void>((resolve) => setTimeout(() =>
			{
				//remove the fact from the URL
				Facts.addURLHash("");

				for(let inlineFile of Constants.getInlineFiles)
				{
					inlineFile.current = inlineFile.slug === fileToChangeTo;
				}

				for(let e of document.querySelectorAll("#tabs-container a.nav-link.active"))
				{
					//set the tab as inactive
					e.classList.remove("active");

					//hide the section containing the doc HTML
					const slug = e.querySelector("[doc-slug]")?.getAttribute("doc-slug");
					document.querySelector(`section[filing-url="${slug}"]`)?.classList.add("d-none");
				}

				//set the new tab as active
				const element = document.querySelector(`#tabs-container a.nav-link[data-link="${fileToChangeTo}"]`);
				element?.classList.add("active");

				//show the relevant section containing the doc HTML
				document.querySelector(`section[filing-url="${fileToChangeTo}"]`)?.classList.remove("d-none");

				incrementProgress();
				incrementProgress();
				incrementProgress();

				resolve();
			}));
		};

		return HelpersUrl.initPromise(fileToChangeTo)
			.then(() => switchTabs())
			.then(() => incrementProgress());
	},

	runNestedAccordionTest: () => {
		const nested = `<div class="accordion" id="accordionExample">
        <div class="accordion-item">
            <h2 class="accordion-header" id="headingOne">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                    Accordion Item #1
                </button>
            </h2>
            <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne">
                <div class="accordion-body">

                    <div class="accordion" id="sub-accordionExample">
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="sub-headingOne">
                                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#sub-collapseOne" aria-expanded="true" aria-controls="collapseOne">
                                    Accordion Item #1
                                </button>
                            </h2>
                            <div id="sub-collapseOne" class="accordion-collapse collapse show" aria-labelledby="sub-headingOne">
                                <div class="accordion-body">
                                    <strong>This is the first item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="sub-headingTwo">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sub-collapseTwo" aria-expanded="false" aria-controls="sub-collapseTwo">
                                    Accordion Item #2
                                </button>
                            </h2>
                            <div id="sub-collapseTwo" class="accordion-collapse collapse" aria-labelledby="sub-headingTwo">
                                <div class="accordion-body">
                                    <strong>This is the second item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
    </div>
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingTwo">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                Accordion Item #2
            </button>
        </h2>
        <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo">
            <div class="accordion-body">
                <strong>This is the second item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
            </div>
        </div>
    </div>
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingThree">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                Accordion Item #3
            </button>
        </h2>
        <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree">
            <div class="accordion-body">
                <strong>This is the third item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
            </div>
        </div>
    </div>
    </div>`
		const accDomParser = new DOMParser();
		const accDoc = accDomParser.parseFromString(nested, 'text/html')
		const acc = accDoc.querySelector('body > div') as HTMLElement
		document.querySelector(`#dynamic-xbrl-form`)?.appendChild(acc);

	},

	runBsAnimationTest: () => {
		const accTest = `<div class="accordion" id="accordionExample">
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingOne">
          <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
            Accordion Item #1
          </button>
        </h2>
        <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
          <div class="accordion-body">
            <strong>This is the first item's accordion body.</strong> It is shown by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
          </div>
        </div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingTwo">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
            Accordion Item #2
          </button>
        </h2>
        <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#accordionExample">
          <div class="accordion-body">
            <strong>This is the second item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
          </div>
        </div>
      </div>
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingThree">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
            Accordion Item #3
          </button>
        </h2>
        <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#accordionExample">
          <div class="accordion-body">
            <strong>This is the third item's accordion body.</strong> It is hidden by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
          </div>
        </div>
      </div>
    </div>`
		const accDomParser = new DOMParser();
		const accDoc = accDomParser.parseFromString(accTest, 'text/html')
		const acc = accDoc.querySelector('body > div') as HTMLElement
		document.querySelector(`#dynamic-xbrl-form`)?.appendChild(acc);
	},

	sanitizeHtml: (unsafeHtml: string) => {
		return DOMPurify.sanitize(unsafeHtml);
	},

	setPagination: () => {
		let enabledFacts;
		if (Object.keys(UserFiltersState.getUserSearch).length === 0) {
			enabledFacts = FactMap.getEnabledFacts();
		} else {
			enabledFacts = FactMap.getEnabledHighlightedFacts();
		}
		const enabledFactsArray = FactsGeneral.specialSort(enabledFacts);
		Pagination.init(
			enabledFactsArray,
			('#facts-menu-list-pagination .pagination'),
			('#facts-menu-list-pagination .list-group'),
			true
		);
		new SideBarPaginationPrevNext(enabledFactsArray,
			('.paginationprevnext'),
			('#facts-menu-list-pagination .list-group'),
			true);
	}
}