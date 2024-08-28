import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);

describe(`Load and section click results in no error overlay`, () => {
    it(`Doc with space in name should create valid selectors`, () => {
        cy.visitFiling("1045609", "000119312523079100", "d412709ddef14a.htm");
        cy.get(selectors.sectionsHeader).click()
        cy.get(selectors.webpackOverlay).should('not.exist');

        cy.get(selectors.sectionsLinks).first((sectionLink) => {                    
            cy.get(sectionLink).click();
            cy.get(selectors.webpackOverlay).should('not.exist');
        });
    });

    filingsSample.forEach((filing) => {
        it(`Sections - no error overlay | ${filing?.ticker || filing.docName} ${filing.formType || filing.submissionType}`, () => {
            cy.visitHost(filing);
            cy.get(selectors.sectionsHeader, { timeout: filing.timeout }).click({ timeout: filing.timeout });

            cy.get(selectors.sectionsLinks).first((sectionLink) => {                    
                cy.get(sectionLink).click();
                cy.get(selectors.webpackOverlay).should('not.exist');
            });
        });
    });
});