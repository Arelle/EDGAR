import { selectors } from "../../utils/selectors.mjs";
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel.js";

const filing = readFilingDataAccNum('000121390023047204');

function openFactDetails() {
    cy.loadFiling(filing);
    cy.get('#fact-identifier-2', { timeout: Number(filing.timeout) }).first().click();
    cy.get(selectors.factListDisplayBtn).click();
    cy.get('div[id="facts-menu"] a[data-id="fact-identifier-2"]').click();
    cy.get(selectors.factDetailDisplayBtn).click();
    cy.get('#fact-details-panel-toolbar').should('be.visible');
}

describe('Fact sidebar docking', () => {
    it('moves the fact toolbar and details into the dock, then restores them on undock', () => {
        openFactDetails();

        cy.get(selectors.factDetailsDockBtn).click();
        cy.get('[data-cy="fact-details-dock"]').should('be.visible');
        cy.get('#fact-details-docked-msg')
            .should('be.visible')
            .and('contain.text', 'Fact details are displayed below inline document');
        cy.get('#fact-details-panel-toolbar')
            .should('have.length', 1)
            .parent()
            .should('have.id', 'fact-details-dock-toolbar');
        cy.get('#fact-details-dock-body #fact-details-panel').should('be.visible');
        cy.get('#prevFact').should('have.length', 1);
        cy.get('#nextFact').should('have.length', 1);

        cy.get('[data-cy="fact-details-undock-btn"]').click();
        cy.get('[data-cy="fact-details-dock"]').should('not.be.visible');
        cy.get('#fact-details-docked-msg').should('not.be.visible');
        cy.get('#fact-details-panel-toolbar')
            .should('have.length', 1)
            .parent()
            .should('have.id', 'fact-details-panel-data');
        cy.get('#fact-details-panel').should('be.visible');
    });

    it('keeps pagination and the copy control working while docked', () => {
        openFactDetails();
        cy.get(selectors.factDetailsDockBtn).click();

        cy.get(selectors.nextFact).click();
        cy.hash().should('eq', '#fact-identifier-3');
        cy.get(selectors.prevFact).click();
        cy.hash().should('eq', '#fact-identifier-2');

        cy.get('#fact-modal-copy-content').click();
        cy.get('#fact-copy-content').should('be.visible');
        cy.get('#fact-copy-content-textarea').should(($textarea) => {
            expect($textarea.val()).to.be.a('string').and.not.be.empty;
        });
        cy.get('#fact-details-dock-body #fact-copy-content').should('be.visible');

        cy.get('[data-cy="fact-details-undock-btn"]').click();
        cy.get('#fact-copy-content').should('be.visible');
        cy.get('#fact-details-panel-data #fact-copy-content').should('be.visible');
    });

    it('keeps the fact sidebar closed when activating inline facts while docked', () => {
        openFactDetails();
        cy.get(selectors.factDetailsDockBtn).click();
        cy.get(selectors.factSideBarClose).click();
        cy.get(selectors.factSidebar).should('not.be.visible');
        cy.get('[data-cy="fact-details-dock"]').should('be.visible');

        cy.get('#fact-identifier-3').first().click();
        cy.get(selectors.factSidebar).should('not.be.visible');

        cy.get('#fact-identifier-2').first().trigger('keyup', { key: 'Enter' });
        cy.get(selectors.factSidebar).should('not.be.visible');
        cy.get('[data-cy="fact-details-dock"]').should('be.visible');
    });

    it('keeps the fact sidebar closed when navigating docked facts by click or keyboard', () => {
        openFactDetails();
        cy.get(selectors.factDetailsDockBtn).click();
        cy.get(selectors.factSideBarClose).click();
        cy.get(selectors.factSidebar).should('not.be.visible');
        cy.get('[data-cy="fact-details-dock"]').should('be.visible');

        cy.get('#fact-details-dock #nextFact').click();
        cy.hash().should('eq', '#fact-identifier-3');
        cy.get(selectors.factSidebar).should('not.be.visible');
        cy.get('#fact-details-dock #prevFact').click();
        cy.hash().should('eq', '#fact-identifier-2');
        cy.get(selectors.factSidebar).should('not.be.visible');

        cy.get('#fact-details-dock #nextFact').trigger('keyup', { key: 'Enter' });
        cy.hash().should('eq', '#fact-identifier-3');
        cy.get(selectors.factSidebar).should('not.be.visible');
        cy.get('#fact-details-dock #prevFact').trigger('keyup', { key: 'Enter' });
        cy.hash().should('eq', '#fact-identifier-2');
        cy.get(selectors.factSidebar).should('not.be.visible');
        cy.get('[data-cy="fact-details-dock"]').should('be.visible');
    });

    it('undocks when switching back to Detail or Split view', () => {
        openFactDetails();
        cy.get(selectors.factDetailsDockBtn).click();

        cy.get(selectors.factDetailsSplitBtn).click();
        cy.get('[data-cy="fact-details-dock"]').should('not.be.visible');
        cy.get('#fact-details-panel-toolbar').parent().should('have.id', 'fact-details-panel-data');
        cy.get(selectors.factDetailsSplitBtn).should('have.class', 'active');

        cy.get(selectors.factDetailsDockBtn).click();
        cy.get(selectors.factDetailsDetailBtn).click();
        cy.get('[data-cy="fact-details-dock"]').should('not.be.visible');
        cy.get(selectors.factDetailsDetailBtn).should('have.class', 'active');
        cy.get(selectors.factDetailsSplitBtn).should('not.have.class', 'active');
    });

    const undockButtons = [
        { name: 'Undock', selector: '[data-cy="fact-details-undock-btn"]' },
        { name: 'Detail', selector: selectors.factDetailsDetailBtn },
        { name: 'Split', selector: selectors.factDetailsSplitBtn },
    ];
    const activations = [
        { method: 'click', activate: ($btn) => cy.wrap($btn).click() },
        { method: 'Enter key', activate: ($btn) => cy.wrap($btn).trigger('keyup', { key: 'Enter' }) },
    ];

    undockButtons.forEach(({ name, selector }) => {
        activations.forEach(({ method, activate }) => {
            it(`reopens a closed fact sidebar when undocking via ${name} button ${method}`, () => {
                openFactDetails();
                cy.get(selectors.factDetailsDockBtn).click();
                cy.get(selectors.factSideBarClose).click();
                cy.get(selectors.factSidebar).should('not.be.visible');

                cy.get(`#fact-details-dock ${selector}`).then(activate);

                cy.get('[data-cy="fact-details-dock"]').should('not.be.visible');
                cy.get(selectors.factSidebar).should('be.visible').and('have.class', 'show');
            });
        });
    });

    it('resizes the dock vertically', () => {
        openFactDetails();
        cy.get(selectors.factDetailsDockBtn).click();

        cy.get('[data-cy="fact-details-dock"]').then(($dock) => {
            const initialHeight = $dock[0].getBoundingClientRect().height;

            cy.get('#fact-details-dock .dock-resizer').trigger('mousedown', { clientY: 500 });
            cy.document().trigger('mousemove', { clientY: 450 });
            cy.document().trigger('mouseup');

            cy.get('[data-cy="fact-details-dock"]').should(($resizedDock) => {
                expect($resizedDock[0].getBoundingClientRect().height).to.be.greaterThan(initialHeight);
            });
        });
    });
});
