import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample, getByAccessionNum } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);
let filing = getByAccessionNum('000121390023047204');

describe(`Fact sidebar features`, () => {
    it('prev/next fact nav should work', () => {
        cy.visitHost(filing)

        // click first fact
        cy.get('#fact-identifier-2', { timeout: filing.timeout }).first().click()  // should bring up sidebar
        cy.get(selectors.showFactInSidebar).click() 
        cy.get(selectors.factSidebar).should('be.visible') 
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-2"]').click()
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-2"]')
            .should('have.attr', 'selected-fact', 'true')

        cy.get(selectors.nextFact).click()
        // first fact should not longer be foucsed
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-2"]')
            .should('have.attr', 'selected-fact', 'false')
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-3"]', {force: true}).click()
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-3"]', {force: true})
            .should('have.attr', 'selected-fact', 'true')

        cy.get(selectors.prevFact).click()
        // first fact should be focused again
        cy.wait(300)
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-2"]', {force: true})
            .should('have.attr', 'selected-fact', 'true')
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-3"]', {force: true})
            .should('have.attr', 'selected-fact', 'false')

        cy.get(selectors.factSideBarClose).click()
        cy.get(selectors.factSidebar).should('not.be.visible')
    })

    it('pagination should work', () => {
        cy.visitHost(filing)

        // click first fact (doc type 10-k)
        cy.get('#fact-identifier-2', { timeout: filing.timeout }).first().click()  // should bring up sidebar
        cy.get(selectors.showFactInSidebar).click()
        
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', '1 of')
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 1')

        cy.get(selectors.sidebarPaginationNext).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', '2 of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 2')

        cy.get(selectors.sidebarPaginationSelect).select('Page 3')
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', '3 of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 3')

        cy.get(selectors.sidebarPaginationPrev).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', '2 of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 2')

        cy.get(selectors.sidebarPaginationFirst).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', '1 of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 1')

        cy.get(selectors.sidebarPaginationLast).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', '5 of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 5')
    });


    it("should open the Fact Modal and highlight the selected fact in the viewer", () =>
    {
        cy.visitFiling(null, "0000071691-23-000025", "nyt-20230928.htm");

        //When the page loads, the Facts button is disabled
        //Cypress will wait until the text matches, then continue
        cy.get(selectors.factCountBadge, { timeout: filing.timeout }).invoke("text").should("match", /[a-z0-9,]+/);
        cy.get(selectors.factSidebarToggleBtn).click();

        cy.get(".pagination .pagination-info.text-body").invoke("text").then((text) =>
        {
            expect(/[0-9,]+ of [0-9,]+/.test(text)).to.eq(true);
            let [_, max] = text.split(" of ");

            //Iterate over the pages of facts
            for(let i=1; i<=max; i++)
            {
                //Iterate over each fact on the current page
                cy.get(".facts-scrollable a.sidebar-fact").each((fact) =>
                {
                    cy.get(fact).click();
                    cy.get(fact).should("exist");

                    cy.get(selectors.factModal).should("satisfy", Cypress.dom.isVisible);

                    //TODO: check that the titles of the fact and the modal are the same??

                    //Close the modal
                    cy.get(selectors.factModalClose).click();

                    cy.get(fact).invoke("attr", "data-id").then((id) =>
                    {
                        //The fact should be highlighted unless it's in an ix:hidden element
                        if (Cypress.$(`ix\\:hidden #${id}`).length == 0)
                        {
                            cy.get(`#${id}`).should("satisfy", Cypress.dom.isVisible);
                        }
                    });
                });

                if (i != max)
                {
                    //Click to the next page of facts
                    cy.get("#facts-menu-list-pagination .pagination a.page-link > .fas.fa-angle-right").click();
                }
            }
        });
    });
});
