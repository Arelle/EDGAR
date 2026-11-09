/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import * as bootstrap from "bootstrap";

export const FactsDock = {

	isDocked: () => !document.getElementById('fact-details-dock')?.classList.contains('d-none'),

	dock: () => {
		const dock = document.getElementById('fact-details-dock');
		const dockBody = document.getElementById('fact-details-dock-body');
		const panelData = document.getElementById('fact-details-panel-data');
		if (!dock || !dockBody || !panelData || FactsDock.isDocked()) return;

		const toolbar = document.getElementById('fact-details-panel-toolbar');
		if (toolbar) document.getElementById('fact-details-dock-toolbar')?.appendChild(toolbar);

		panelData.querySelectorAll(':scope > [data-dockable]').forEach((el) => dockBody.appendChild(el));

		document.getElementById('fact-details-docked-msg')?.classList.remove('d-none');
		dock.classList.remove('d-none');
	},

	undock: () => {
		const dock = document.getElementById('fact-details-dock');
		const dockBody = document.getElementById('fact-details-dock-body');
		const dockedMsg = document.getElementById('fact-details-docked-msg');
		if (!dock || !dockBody || !dockedMsg || !FactsDock.isDocked()) return;

		const toolbar = document.getElementById('fact-details-panel-toolbar');
		if (toolbar) dockedMsg.before(toolbar);

		dockedMsg.after(...Array.from(dockBody.children));

		dockedMsg.classList.add('d-none');
		dock.classList.add('d-none');

		const factsMenu = document.getElementById('facts-menu');
		if (factsMenu && !factsMenu.classList.contains('show')) {
			bootstrap.Collapse.getOrCreateInstance(factsMenu, { toggle: false }).show();
		}
	},
};
