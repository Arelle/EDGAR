import { selectors } from '../../utils/selectors'
import { readFilingData } from '../../dataPlus/filingsFunnel.js'

describe(`Sections | All instances vs current only filter`, () => {
    it(`should work on multi-instance filing`, () => {
        cy.visit('/Archives/edgar/data/wh-sections/out/sbsef03exc-20231231.htm')

        // open sections sidebar
        cy.get(selectors.sectionsHeader).click();

        // select current instance only filter
        cy.get(selectors.sectionsFilterBtn).click();
        cy.get(selectors.currentInstanceFilter).click();

        // current section should be shown
        cy.get(selectors.getNthSection(1)).should('not.have.class', 'd-none');
        // other sections have d-none class
        cy.get(selectors.getNthSection(2)).should('have.class', 'd-none');
        
        // select show all filter
        // cy.get(selectors.sectionsFilterBtn).click(); // still open for some reason
        cy.get(selectors.allInstnacesFilter).click();
        cy.get(selectors.getNthSection(1)).should('not.have.class', 'd-none');
        cy.get(selectors.getNthSection(2)).should('not.have.class', 'd-none');
    })
    it(`Multi doc, single instance should not have sections instance filter UI`, () => {
        cy.loadByAccessionNum('000101376223000425')

        // open sections sidebar
        cy.get(selectors.sectionsHeader).click();
        cy.get(selectors.sectionsFilterBtn).should('not.be.visible');
    })
});