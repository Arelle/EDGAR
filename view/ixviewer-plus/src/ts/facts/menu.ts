/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { ConstantsFunctions } from "../constants/functions";
import { Pagination } from "../pagination/sideBarPagination";
import { FactsDock } from "./dock";
import { FactsView, FactsViewPreference } from "./factsViewPreference";

const toFactsView = (dataView?: string): FactsView =>
	dataView === 'split' || dataView === 'dock' ? dataView : 'detail';

export const FactsMenu = {

	toggle: (event: MouseEvent | KeyboardEvent) => {

		if (
			Object.prototype.hasOwnProperty.call(event, 'key') &&
			!((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === 'Space' || (event as KeyboardEvent).key === ' ')
		) {
			return;
		}

		if (event.target && (event.target as HTMLElement).classList && (event.target as HTMLElement).classList.contains('disabled')) {
			return;
		}
		FactsMenu.prepareForPagination();

	},

	updateFactMenuState: (newState: string) => {
		const navElement = document.getElementById('fact-display-nav') as HTMLElement
		const menuElement = navElement?.closest('.fact-menu-container') as HTMLElement | null;

		if (!menuElement) return;

		navElement.querySelectorAll('button.tab').forEach(btn => {
			btn.classList.remove('active')
		})

		const selectedFactId = ConstantsFunctions.getSelectedFactId()
		const isSplit = menuElement.dataset.factMenuDisplay === "fact-split-display";

		switch (newState) {
			case "fact-detail-display":
				menuElement.querySelector('#fact-detail-display-btn')?.classList.add('active')

				if (FactsDock.isDocked()) {
					menuElement.dataset.factMenuDisplay = newState;
				} else if (!isSplit) {
					menuElement.querySelectorAll('#fact-details-panel-toolbar .view-btn[data-view]').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === "detail"));
					menuElement.dataset.factMenuDisplay = newState;
				}

				break;
			case "fact-list-display":
				if (isSplit) {
					// Split is sticky: list and details are both visible, so stay in split.
					menuElement.querySelector('#fact-detail-display-btn')?.classList.add('active')
				} else {
					menuElement.querySelector('#fact-list-display-btn')?.classList.add('active')
					menuElement.dataset.factMenuDisplay = newState;
				}

				if (selectedFactId) {
					Pagination.findFactAndGoTo(selectedFactId, false);
				}
				break;
			case "fact-split-display":
				menuElement.querySelector('#fact-detail-display-btn')?.classList.add('active')
				menuElement.dataset.factMenuDisplay = newState;
				if (selectedFactId) {
					Pagination.findFactAndGoTo(selectedFactId, false);
				}

				break;
			default:
				menuElement.dataset.factMenuDisplay = newState;
				break;
		}
	},
	updateFactMenuDisplay: (event: Event, target: EventTarget | null = event.target) => {
		if (event instanceof KeyboardEvent && !(event.key === "Enter" || event.key === "Space" || event.key === " ")) {
			return;
		}
		if (!(target instanceof Element)) return;

		const btnElement = target.closest('.tab') as HTMLElement | null;
		const iconElement = target.closest('.detail-icon')
		const factElment = target.closest('[selected-fact]')


		if (btnElement?.id === 'fact-detail-display-btn' || iconElement || factElment) FactsMenu.updateFactMenuState('fact-detail-display');
		if (btnElement?.id === 'fact-list-display-btn') FactsMenu.updateFactMenuState('fact-list-display');
	},

	/**
	 * @Description Applies a facts view (detail, split, dock) to the UI.
	 * Does NOT save the preference. Shared by user clicks, undock, and load.
	 */
	setFactsView: (view: FactsView) => {
		const menuElement = document.getElementById('facts-menu');
		if (!menuElement) return;

		document
			.querySelectorAll<HTMLElement>('#fact-details-panel-toolbar .view-btn[data-view]')
			.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));

		const newState = view === 'split' ? 'fact-split-display' : 'fact-detail-display';

		if (view === 'dock') FactsDock.dock();
		else FactsDock.undock();

		menuElement.dataset.factMenuDisplay = newState;
		FactsMenu.updateFactMenuState(newState);
	},

	/**
	 * @Description Handles user clicks on the view toggle. Applies and saves the preference.
	 */
	updateFactDetailDisplay: (event: MouseEvent | KeyboardEvent) => {
		if ("key" in event && !(event.key === "Enter" || event.key === "Space" || event.key === " ")) {
			return;
		}
		const viewBtn = (event.target as HTMLElement)?.closest<HTMLElement>('.view-btn[data-view]');
		if (!viewBtn) return;

		const view = toFactsView(viewBtn.dataset.view);
		FactsMenu.setFactsView(view);
		FactsViewPreference.save(view);
	},

	/**
	 * @Description Applies the stored facts view on load. Never saves.
	 * Call once during init, after the menu DOM and FactsDock are ready.
	 */
	applySavedView: () => {
		const view = FactsViewPreference.load();
		if (view === 'detail') return;
		FactsMenu.setFactsView(view);
	},

	/**
	 * @Description passes filtered fact set to Pagination.init()
	 */
	prepareForPagination: () => {
		ConstantsFunctions.setPagination();
	}
};