import { selectors } from "../../utils/selectors"
import { readFilingDataAccNum } from '../../dataPlus/filingsFunnel.js'


describe(`Fact Hash`, () => {
    it('should navigate to clicked fact id and verify the URL hash and display the valid modal', () => {
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

    it('should navigate to clicked display/open the valid modal', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.get("#fact-identifier-11").click()
        cy.hash().should('eq', '#fact-identifier-11')
        cy.get('#fact-identifier-11').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.factModal).should('be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'block')
        cy.get(selectors.nestedFactModal).should('not.be.visible')
    })

    it('should load the page with the hash id and verify the URL hash and display the valid modal', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm#fact-identifier-40',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.hash().should('eq', '#fact-identifier-40')
        cy.get('#fact-identifier-40').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.factModal).should('be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'block')
        cy.get(selectors.nestedFactModal).should('not.be.visible')
    })

    it('should navigate to the previous/next hash and show the valid modal with browser backward/forward', () => {
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
        cy.get(selectors.factModal).should('be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'block')
        cy.get('#fact-identifier-26').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.go('forward')
        cy.hash().should('eq', '#fact-identifier-53')
        cy.get('#fact-identifier-53').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.factModal).should('be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'block')
    })

    it('should not open modal if the hash fact does not exist', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm#fact-identifier-2244242',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.hash().should('eq', '#fact-identifier-2244242')
        cy.get(selectors.factModal).should('not.be.visible')
        cy.get(selectors.nestedFactModal).should('not.be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'none')
    })

    it('should not open modal when there is no hash in url', () => {
        let filing = {
            docPath: '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout: 12000
        }
        cy.loadFiling(filing)
        cy.get(selectors.factModal).should('not.be.visible')
        cy.get(selectors.nestedFactModal).should('not.be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'none')
    })

    it("Selected fact should remain selected after refresh", () => {
        cy.loadByAccessionNum('000121390021056659-991')
        cy.get('[ix="fact-identifier-569"]').click()
            .then(() => {
                cy.visibleOnScreen('[ix="fact-identifier-569"]')
                    .then(() => {
                        cy.reload()
                            .then(() => {
                                cy.get('div[id="loading-animation"]').should('not.be.visible')
                                    .then(() => {
                                        cy.hash().should('eq', '#fact-identifier-569')
                                        cy.wait(1000); // wait for scroll to fact
                                        cy.visibleOnScreen('[ix="fact-identifier-569"]')
                                        cy.visibleOnScreen('[id="fact-modal"]')
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
                    cy.get('div[id="loading-animation"]').should('not.be.visible').then(() => {
                        cy.hash().should('eq', '#fact-identifier-569')
                        cy.wait(2000); // wait for scroll to fact
                        cy.visibleOnScreen('[ix="fact-identifier-569"]')
                        cy.visibleOnScreen('[id="fact-modal"]')
                    })
                })
            })
        })
    })
})