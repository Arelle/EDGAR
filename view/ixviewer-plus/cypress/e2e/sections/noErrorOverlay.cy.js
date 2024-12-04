import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env).slice(1); // first filing has collapsed first section

describe(`Section - No Error Overlay`, () => {
    it(`Doc with space in name should create valid selectors`, () => {
        cy.loadByAccessionNum('000119312523079100');
        cy.get(selectors.sectionsHeader).click()
        cy.get(selectors.webpackOverlay).should('not.exist');

        cy.get(selectors.sectionsLinks).first().click();
        cy.get(selectors.webpackOverlay).should('not.exist');
    });


    filingsSample.forEach((filing) => {
        it(`for Acc Num ${filing.accessionNum}`, () => {
            cy.loadFiling(filing);
            cy.get(selectors.sectionsHeader, { timeout: Number(filing.timeout) }).click({ timeout: filing.timeout });

            cy.get(selectors.sectionsLinks).first().click();
            cy.get(selectors.webpackOverlay).should('not.exist');
        });
    });
});