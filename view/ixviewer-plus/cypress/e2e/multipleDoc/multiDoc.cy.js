import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

let filingsSample = getFilingsSample(Cypress.env);

describe(`Multi Doc ${filingsSample.length} filings`, () =>
{
    it("should show the doc that was clicked", () =>
    {
        //a multi-doc filing
        cy.visitFiling("1517396", "000121390021056659", "stratasys-991.htm");

        //should have 2 buttons for the 2 docs
        cy.get(`a[data-link="stratasys-6k.htm"]`).should("exist");
        cy.get(`a.nav-link.active[data-cy^="inlineDocTab-"]`).should("exist");

        //one doc should be visible and the other should not
        cy.get(`section[filing-url="stratasys-6k.htm"]`).should("have.class", "d-none");
        cy.get(`section[filing-url="stratasys-991.htm"]`).should("not.have.class", "d-none");


        //click the btn for the invisible doc
        cy.get(`a[data-link="stratasys-6k.htm"]`).click();

        //invisible doc should now be visible
        cy.get(`section[filing-url="stratasys-6k.htm"]`).should("not.have.class", "d-none");
        cy.get(`section[filing-url="stratasys-991.htm"]`).should("have.class", "d-none");
        
        //a btn for the now-invisible doc should exist
        cy.get(`a.nav-link.active[data-cy^="inlineDocTab-"]`).should("exist");
        cy.get(`a[data-link="stratasys-991.htm"]`).should("exist");


        //click the btn for the originally visible doc; it should become visible again
        cy.get(`a[data-link="stratasys-991.htm"]`).click();
        cy.get(`section[filing-url="stratasys-6k.htm"]`).should("have.class", "d-none");
        cy.get(`section[filing-url="stratasys-991.htm"]`).should("not.have.class", "d-none");
    });

})
