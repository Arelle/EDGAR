export type FactsView = 'detail' | 'split' | 'dock';

const KEY = 'ixv.factsView';

export const FactsViewPreference = {
	load(): FactsView {
		try {
			const v = localStorage.getItem(KEY);
			return v === 'split' || v === 'dock' ? v : 'detail';
		} catch {
			return 'detail';
		}
	},

	save(view: FactsView) {
		try {
			if (view === 'split' || view === 'dock') localStorage.setItem(KEY, view);
			else localStorage.removeItem(KEY);
		} catch { /* ignore */ }
	},
};