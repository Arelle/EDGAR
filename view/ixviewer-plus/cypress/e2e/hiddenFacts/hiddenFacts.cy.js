import { selectors } from "../../utils/selectors.mjs";
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel.js";

let nmexfiling = readFilingDataAccNum('000143774923034166');

describe(`Hidden Facts`, () =>
{
    it('Hidden Fact should have file location', () =>
    {
        cy.loadFiling(nmexfiling);
        cy.get(selectors.factSidebarToggleBtn).click();

        //this one is regular-hidden
        cy.get(selectors.sidebarPaginationLast).click();
        cy.get('a[data-id="fact-identifier-6"] small')
            .should('have.text', 'nmex20231031_10q.htm')
            .click();

        cy.get('div.alert-warning').should('not.exist');
        cy.get(selectors.factModal).should('be.visible');
    });

    it('Hidden within Hidden Fact', () =>
    {
        cy.loadFiling(nmexfiling);

        cy.get('[id="fact-identifier-195"]').click();
        cy.get(selectors.nestedCount).should('have.text', '3');
        
        cy.get('[id="fact-identifier-6"]').click();
        cy.get(selectors.factModal).should('be.visible');
        cy.get(selectors.factModalClose).click();
        cy.get('[id="fact-identifier-5"]').click();
        cy.get(selectors.factModal).should('be.visible');
    });

    it('Normal fact within Hidden Fact', () =>
    {
        cy.loadByAccessionNum('000121390021056659');
        // switch docs
        cy.get('[data-cy="inlineDocTab-1"]').click();

        // hidden fact ref
        cy.get('[id="fact-identifier-27"]').click();
        cy.get(selectors.nestedFactModal).should('be.visible');
        cy.get(selectors.nestedCount).should('have.text', '2');
        cy.get(selectors.nestedFactModalClose).click();

        // nested normal fact
        cy.get('#fact-identifier-25').click();
        cy.get(selectors.factModal).should('be.visible');
    });

    it('Hidden Fact should have file location (2)', () =>
    {
        cy.loadByAccessionNum('000121390021056659');
        cy.get(selectors.factSidebarToggleBtn).click();

        //this one is nested-hidden
        cy.get('a[data-id="fact-identifier-25"] small')
            .should('have.text', 'stratasys-991.htm')
            .click();
        
        cy.get('div.alert-warning').should('not.exist');
        cy.get(selectors.factModal).should('be.visible');
    });

    it('Nested Hidden Fact is scrolled to and highlighted', () =>
    {
        cy.loadByAccessionNum('000121390021056659');
        cy.get(selectors.factSidebarToggleBtn).click();

        cy.get('a[data-id="fact-identifier-25"]')
            .click();

        //we need to make sure we're selecting the right fact
        cy.get('#fact-identifier-25')
            .should('have.attr', "name", "dei:DocumentFiscalYearFocus")
            .should('have.attr', "contextref", "c0")
            .should('have.text', "2021")
            .should('have.attr', 'selected-fact', 'true')
            .should('be.visible');
    });
});
