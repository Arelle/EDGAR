import { selectors } from "../../utils/selectors.mjs";
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel.js";

function distFromBtmOfViewportToBtmOfPage() {
    // Get the height of the viewport.
    const viewportHeight = window.innerHeight;
    // Get the offset of the bottom of the page from the top of the viewport.
    const pageBottomOffset = document.documentElement.scrollHeight - window.pageYOffset;
    // Calculate the distance from the bottom of the viewport to the bottom of the page.
    const distToBtmOfPage= pageBottomOffset - viewportHeight;
    return distToBtmOfPage;
}

describe(`Fact sidebar | fact attributes`, () => {
    it('prev/next fact nav should work', () => {
        let filing = readFilingDataAccNum('000121390023047204')
        cy.loadFiling(filing)
        // click first fact
        cy.get('#fact-identifier-2', { timeout: Number(filing.timeout) }).first().click()
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

    it('should show hash ID on the URL when clicking on the fact', () => {
        let filing = {
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
        }
        cy.loadFiling(filing)
        cy.get("#fact-identifier-9").click()
        cy.get(selectors.showFactInSidebar).click() 
        cy.get(selectors.factSidebar).should('be.visible')      
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-9"]').click()
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-9"]')
            .should('have.attr', 'selected-fact', 'true')
        cy.get("#fact-identifier-9").should('be.visible');
        cy.hash().should('eq', '#fact-identifier-9') 
        cy.get('div[id="dynamic-xbrl-form"]').then($viewerElem => {
            cy.expect($viewerElem.scrollTop()).to.equal(0)
        })

    
        cy.get(selectors.nextFact).click()
        cy.wait(300)
        // first fact should not longer be focused
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-9"]')
            .should('have.attr', 'selected-fact', 'false')
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-10"]', {force: true}).click()
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-10"]', {force: true})
            .should('have.attr', 'selected-fact', 'true')
        cy.get("#fact-identifier-9").should('be.visible');
        cy.hash().should('eq', '#fact-identifier-10') 

        cy.get(selectors.sidebarPaginationLast).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 6')

        cy.get(selectors.sidebarPaginationPrev).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 5')
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-56"]', {force: true}).click()
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-56"]', {force: true})
            .should('have.attr', 'selected-fact', 'true').should('be.visible')
        cy.get(selectors.factModal).should('be.visible') 
        cy.expect(distFromBtmOfViewportToBtmOfPage()).to.equal(0)
    })

    it('pagination should work', () => {
        let filing = readFilingDataAccNum('000121390023047204')
        cy.loadFiling(filing)

        // click first fact (doc type 10-k)
        cy.get('#fact-identifier-2', { timeout: Number(filing.timeout) }).first().click()  // should bring up sidebar
        cy.get(selectors.showFactInSidebar).click()
        
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of')
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 1')

        cy.get(selectors.sidebarPaginationNext).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 2')

        cy.get(selectors.sidebarPaginationSelect).select('Page 3')
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 3')

        cy.get(selectors.sidebarPaginationPrev).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 2')

        cy.get(selectors.sidebarPaginationFirst).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 1')

        cy.get(selectors.sidebarPaginationLast).click() 
        cy.get(selectors.sidebarPaginationInfo).should('contain.text', ' of') 
        cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 5')
    });


    it("should open the Fact Modal and highlight the selected fact in the viewer", () =>
    {
        let filing = readFilingDataAccNum('000121390023047204')
        cy.loadFiling(filing)

        //When the page loads, the Facts button is disabled
        //Cypress will wait until the text matches, then continue
        cy.get(selectors.factCountBadge, { timeout: Number(filing.timeout) }).invoke("text").should("match", /[a-z0-9,]+/);
        cy.get(selectors.factSidebarToggleBtn).click();

        cy.get(".pagination .pagination-info.text-body").invoke("text").then((text) =>
        {
            expect(/of [0-9,]+/.test(text)).to.eq(true);
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

    it("should open the Fact Modal and highlight the selected fact in the viewer after hitting next button", () =>
    {
        let filing = readFilingDataAccNum('000121390023047204')
        cy.loadFiling(filing)

        //When the page loads, the Facts button is disabled
        //Cypress will wait until the text matches, then continue
        cy.get(selectors.factCountBadge, { timeout: filing.timeout }).invoke("text").should("match", /[a-z0-9,]+/);
        cy.get(selectors.factSidebarToggleBtn).click();

        cy.get(selectors.nextFact).click();
        cy.get('div[id="facts-menu"] a[data-id="fact-identifier-0"]', {force: true})
            .should('have.attr', 'selected-fact', 'true')
    });

    it("verify values in prev and next button", () =>
    {
        let filing = readFilingDataAccNum('000121390023047204')
        cy.loadFiling(filing)

        //When the page loads, the Facts button is disabled
        //Cypress will wait until the text matches, then continue
        cy.get(selectors.factCountBadge, { timeout: filing.timeout }).invoke("text").should("match", /[a-z0-9,]+/);
        cy.get(selectors.factSidebarToggleBtn).click();

        cy.get(selectors.prevFact).invoke("text").then((text) =>
        {
            expect(/Prev+/.test(text)).to.eq(true);
        });
        cy.get(selectors.nextFact).invoke("text").then((text) =>
        {
                expect(/Next+/.test(text)).to.eq(true);
        });
    });
});
