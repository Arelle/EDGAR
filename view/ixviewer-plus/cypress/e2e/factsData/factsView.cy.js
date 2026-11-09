import { selectors } from "../../utils/selectors.mjs";
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel.js";

const KEY = 'ixv.factsView';
const FILING_ACC = '000143774923034166';
const OTHER_FILING_ACC = '000143774923027411';

const getPref = () => cy.window().then(win => win.localStorage.getItem(KEY));
const setPref = (value) => cy.window().then(win => win.localStorage.setItem(KEY, value));

const isSplit = () =>
    cy.get(selectors.factMenu).then($m => $m.attr('data-fact-menu-display') === 'fact-split-display');

const openListTab = () => {
    cy.get(selectors.factListDisplayBtn).click();
    cy.get(selectors.sidebarFact(7)).should('be.visible');
};

// The view toggle buttons only exist/are usable once the Details tab is open.
const openDetailsTab = () => {
    cy.get(selectors.factDetailsTab).click();
    cy.get(selectors.factDetailsDetailBtn).should('be.visible');
};

// Opens the sidebar only if it is not already open (a hash in the URL can open it).
const ensureSidebarOpen = () => {
    cy.get('body').then($body => {
        if ($body.find(`${selectors.factMenu}:visible`).length === 0) {
            cy.get(selectors.factSidebarToggleBtn).click();
        }
    });
    cy.get(selectors.factMenu).should('be.visible');
};

// Always ends with: sidebar open, fact 7 selected, Details tab showing.
// In split mode both panes are visible, so tab clicks are skipped.
const openSidebarWithFact = () => {
    cy.get(selectors.appReady).should('exist');
    ensureSidebarOpen();
    isSplit().then(split => { if (!split) openListTab(); });
    cy.get(selectors.sidebarFact(7)).should('be.visible').click();
    isSplit().then(split => { if (!split) openDetailsTab(); });
    cy.get(selectors.factDetailsDetailBtn).should('be.visible');
};

const loadAndOpen = () => {
    cy.loadFiling(readFilingDataAccNum(FILING_ACC));
    openSidebarWithFact();
};

// Simulates a fresh app load while keeping localStorage.
// Used instead of cy.reload(), which keeps the #fact-identifier hash.
const freshLoad = () => {
    cy.loadFiling(readFilingDataAccNum(FILING_ACC));
    cy.get(selectors.appReady).should('exist');
};

const viewButtons = {
    detail: selectors.factDetailsDetailBtn,
    split: selectors.factDetailsSplitBtn,
    dock: selectors.factDetailsDockBtn,
};

const assertActiveView = (view) => {
    Object.entries(viewButtons).forEach(([name, sel]) => {
        cy.get(sel).should(name === view ? 'have.class' : 'not.have.class', 'active');
    });
};

const assertLayout = (view) => {
    assertActiveView(view);
    if (view === 'split') {
        cy.get(selectors.factSidebarSplitDisplay).should('exist');
        cy.get(selectors.factViewUndockBtn).should('not.be.visible');
    } else if (view === 'dock') {
        // ASSUMPTION: the undock button is visible only while docked.
        cy.get(selectors.factViewUndockBtn).should('be.visible');
    } else {
        cy.get(selectors.factSidebarDetailDisplay).should('exist');
        cy.get(selectors.factViewUndockBtn).should('not.be.visible');
    }
};

describe('Fact Data | Facts View Preference', () => {

    beforeEach(() => {
        cy.viewport(1280, 800);
    });

    describe('defaults', () => {
        it('uses the detail view and stores nothing when no preference exists', () => {
            loadAndOpen();
            assertLayout('detail');
            getPref().should('be.null');
        });
    });

    describe('saving on user action', () => {
        beforeEach(loadAndOpen);

        it('saves "split" when the split button is clicked', () => {
            cy.get(selectors.factDetailsSplitBtn).click();
            assertLayout('split');
            getPref().should('eq', 'split');
        });

        it('saves "dock" when the dock button is clicked', () => {
            cy.get(selectors.factDetailsDockBtn).click();
            assertLayout('dock');
            getPref().should('eq', 'dock');
        });

        it('removes the key when the detail button is clicked after split', () => {
            cy.get(selectors.factDetailsSplitBtn).click();
            getPref().should('eq', 'split');
            cy.get(selectors.factDetailsDetailBtn).click();
            assertLayout('detail');
            getPref().should('be.null');
        });

        it('removes the key when the undock button is clicked', () => {
            cy.get(selectors.factDetailsDockBtn).click();
            getPref().should('eq', 'dock');
            cy.get(selectors.factViewUndockBtn).click();
            assertLayout('detail');
            getPref().should('be.null');
        });

        it('overwrites the stored value when switching between split and dock', () => {
            cy.get(selectors.factDetailsSplitBtn).click();
            getPref().should('eq', 'split');
            cy.get(selectors.factDetailsDockBtn).click();
            getPref().should('eq', 'dock');
            cy.get(selectors.factDetailsSplitBtn).click();
            getPref().should('eq', 'split');
        });
    });

    describe('restoring on load', () => {
        it('restores split on a fresh load', () => {
            loadAndOpen();
            cy.get(selectors.factDetailsSplitBtn).click();
            getPref().should('eq', 'split');
            freshLoad();
            openSidebarWithFact();
            assertLayout('split');
            getPref().should('eq', 'split');
        });

        it('restores dock on a fresh load', () => {
            loadAndOpen();
            cy.get(selectors.factDetailsDockBtn).click();
            getPref().should('eq', 'dock');
            freshLoad();
            openSidebarWithFact();
            assertLayout('dock');
            getPref().should('eq', 'dock');
        });

        it('stays in detail on a fresh load when the user returned to detail', () => {
            loadAndOpen();
            cy.get(selectors.factDetailsSplitBtn).click();
            cy.get(selectors.factDetailsDetailBtn).click();
            getPref().should('be.null');
            freshLoad();
            openSidebarWithFact();
            assertLayout('detail');
            getPref().should('be.null');
        });

        it('applies a preference set in localStorage before a fresh load', () => {
            loadAndOpen();
            setPref('split');
            freshLoad();
            openSidebarWithFact();
            assertLayout('split');
        });

        it('applies the saved preference when a different filing is loaded', () => {
            loadAndOpen();
            cy.get(selectors.factDetailsSplitBtn).click();
            getPref().should('eq', 'split');
            cy.loadByAccessionNum(OTHER_FILING_ACC);
            cy.get(selectors.appReady).should('exist');
            openSidebarWithFact();
            assertLayout('split');
        });

        it('does not rewrite localStorage just by loading', () => {
            loadAndOpen();
            setPref('dock');
            freshLoad();
            openSidebarWithFact();
            getPref().should('eq', 'dock');
        });
    });

});