import { selectors } from "../../utils/selectors"
import { readFilingDataAccNum } from '../../dataPlus/filingsFunnel.js'


describe(`Fact Hash`, () => {
    it('should navigate to clicked fact id and verify the URL hash', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.get("#fact-identifier-11").click()
        cy.hash().should('eq', '#fact-identifier-11')
        cy.get("#fact-identifier-16").click()
        cy.hash().should('eq', '#fact-identifier-16')
        cy.get("#fact-identifier-39").click()
        cy.hash().should('eq', '#fact-identifier-39')
    })

    it('should navigate to clicked display/open the fact sidebar', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.get("#fact-identifier-11").click()
        cy.hash().should('eq', '#fact-identifier-11')
        cy.get('#fact-identifier-11').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.factSidebar).should('be.visible')
        cy.get(selectors.factSidebar).should('have.class', 'show')
    })

    it('should load the page with the hash id and verify the URL hash and open fact sidebar', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm#fact-identifier-40',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.hash().should('eq', '#fact-identifier-40')
        cy.get('#fact-identifier-40').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.factSidebar).should('be.visible')
        cy.get(selectors.factSidebar).should('have.class', 'show')

    })

    it('should navigate to the previous/next hash and open fact sidebar with browser backward/forward', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.get("#fact-identifier-26").click()
        cy.hash().should('eq', '#fact-identifier-26')
        cy.get("#fact-identifier-53").click()
        cy.hash().should('eq', '#fact-identifier-53')
        cy.go('back')
        cy.hash().should('eq', '#fact-identifier-26')
        cy.get(selectors.factSidebar).should('be.visible')
        cy.get(selectors.factSidebar).should('have.class', 'show')
        cy.get('#fact-identifier-26').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.go('forward')
        cy.hash().should('eq', '#fact-identifier-53')
        cy.get('#fact-identifier-53').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.factSidebar).should('be.visible')
        cy.get(selectors.factSidebar).should('have.class', 'show')
    })

    it('should not open fact sidebar if the hash fact does not exist', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm#fact-identifier-2244242',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.hash().should('eq', '#fact-identifier-2244242')
        cy.get(selectors.factSidebar).should('not.be.visible')
        cy.get(selectors.factSidebar).should('not.have.class', 'show')
    })

    it('should not open fact sidebar when there is no hash in url', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.get(selectors.factSidebar).should('not.be.visible')
        cy.get(selectors.factSidebar).should('not.have.class', 'show')
    })

    it("Selected fact should remain selected after refresh", () => {
        cy.loadByAccessionNum('000121390021056659-991')
        cy.get('[ix="fact-identifier-569"]').click()
            .then(() => {
                cy.visibleOnScreen('[ix="fact-identifier-569"]')
                    .then(() => {
                        cy.reload()
                            .then(() => {
                                cy.waitForAppReady()
                                    .then(() => {
                                        cy.hash().should('eq', '#fact-identifier-569')
                                        cy.wait(1000); // wait for scroll to fact
                                        cy.visibleOnScreen('[ix="fact-identifier-569"]')
                                        cy.visibleOnScreen('[id="facts-menu"]')
                                    })
                            })
                    })
            })
    })

    it("Selected fact should remain selected after refresh (No Cache)", () => {
        cy.loadByAccessionNum('000121390021056659-991')
        cy.get('[ix="fact-identifier-569"]').click().then(() => {
            cy.visibleOnScreen('[ix="fact-identifier-569"]').then(() => {
                cy.reload(true).then(() => {
                    cy.waitForAppReady().then(() => {
                        cy.hash().should('eq', '#fact-identifier-569')
                        cy.wait(2000); // wait for scroll to fact
                        cy.visibleOnScreen('[ix="fact-identifier-569"]')
                        cy.visibleOnScreen('[id="facts-menu"]')
                    })
                })
            })
        })
    })

    it("Selectd single nested open to parent Fact hash", () => {
         let filing = {
            docPath: '/Archives/edgar/data/1669811/000119312526054586/dfin-20251231.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)

        cy.get("#fact-identifier-490").click()
        cy.hash().should('eq', '#fact-identifier-489')
    })

    it("Selectd nested a[href] element should open to href hash", () => {
        let filing = {
            docPath: '/Archives/edgar/data/no-cik/hyperlinks-text-block/ssti-20200930.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)

        cy.get("#fact-identifier-413").click()
        cy.hash().should('eq', '#fact-identifier-413')
    })
})