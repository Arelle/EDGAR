import { readFilingData, readFilingDataAccNum } from "../../dataPlus/filingsFunnel";
import { selectors } from "../../utils/selectors.mjs";



describe(`Multi Doc filings`, () => {
    it("should show the doc that was clicked", () => {
        let filing = readFilingDataAccNum('000121390021056659');
        //a multi-doc filing
        cy.loadFiling(filing);

        //should have 2 buttons for the 2 docs
        cy.get(`a[data-link="stratasys-991.htm"]`).should("exist");
        cy.get(`a.nav-link.active[data-cy^="inlineDocTab-"]`).should("exist");

        //one doc should be visible and the other should not
        cy.get(`section[filing-url="stratasys-6k.htm"]`).should("not.have.class", "d-none");
        cy.get(`section[filing-url="stratasys-991.htm"]`).should("have.class", "d-none");


        //click the btn for the invisible doc
        cy.get(`a[data-link="stratasys-991.htm"]`).click();


        //invisible doc should now be visible
        cy.get(`section[filing-url="stratasys-6k.htm"]`).should("have.class", "d-none");
        cy.get(`section[filing-url="stratasys-991.htm"]`).should("not.have.class", "d-none");

        //a btn for the now-invisible doc should exist
        cy.get(`a.nav-link.active[data-cy^="inlineDocTab-"]`).should("exist");
        cy.get(`a[data-link="stratasys-6k.htm"]`).should("exist");


        //click the btn for the originally visible doc; it should become visible again
        cy.get(`a[data-link="stratasys-6k.htm"]`).click();
        cy.get(`section[filing-url="stratasys-6k.htm"]`).should("not.have.class", "d-none");
        cy.get(`section[filing-url="stratasys-991.htm"]`).should("have.class", "d-none");
    });
    it("should select and show the fact click on the side bar while switching to the rigth doc", () => {
        //a multi-doc filing
        let filing = readFilingDataAccNum('000101376223000425');
        //a multi-doc filing
        cy.loadFiling(filing);

        //should have 2 buttons for the 2 docs
        cy.get(`a[data-link="ea185980-6k_inspiratech.htm"]`).should("exist");
        cy.get(`a.nav-link.active[data-cy^="inlineDocTab-"]`).should("exist");

        //one doc should be visible and the other should not
        cy.get(`section[filing-url="ea185980ex99-1_inspiratech.htm"]`).should("not.have.class", "d-none");
        cy.get(`section[filing-url="ea185980-6k_inspiratech.htm"]`).should("have.class", "d-none");

        //click on the fact on side bar, fact is in doc tab which is not active           
        cy.get(selectors.factSidebarToggleBtn).click();

        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-0"]', { force: true }).click()
        //making sure switch to the tab doc which has the clicked fact
        cy.get(`section[filing-url="ea185980-6k_inspiratech.htm"]`).should("not.have.class", "d-none");
        cy.get(`section[filing-url="ea185980ex99-1_inspiratech.htm"]`).should("have.class", "d-none");

        //checking if fact is selected and visible
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-0"]', { force: true })
            .should('have.attr', 'selected-fact', 'true').should('be.visible')
        cy.hash().should('eq', '#fact-identifier-0')

        cy.get(selectors.sidebarPaginationNext).click()
        //now click on fact on the other doc
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-10"]', { force: true }).click()

        //making sure the doc is switched to the tab which has the fact
        cy.get(`section[filing-url="ea185980ex99-1_inspiratech.htm"]`).should("not.have.class", "d-none");
        cy.get(`section[filing-url="ea185980-6k_inspiratech.htm"]`).should("have.class", "d-none");
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-10"]', { force: true })
            .should('have.attr', 'selected-fact', 'true').should('be.visible')
        cy.hash().should('eq', '#fact-identifier-10')
    });

})
