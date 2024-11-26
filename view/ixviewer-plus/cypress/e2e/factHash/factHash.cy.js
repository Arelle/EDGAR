import { selectors } from "../../utils/selectors"
import { readFilingDataAccNum } from '../../dataPlus/filingsFunnel.js'


describe(`Fact Hash`, () => {
    it('should navigate to clicked fact id and verify the URL hash and display the valid modal', () => {
        let filing = {
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
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
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
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
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm#fact-identifier-40',
            timeout : 12000
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
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
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
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm#fact-identifier-2244242',
            timeout : 12000
        }
        cy.loadFiling(filing)
        cy.hash().should('eq', '#fact-identifier-2244242')
        cy.get(selectors.factModal).should('not.be.visible')
        cy.get(selectors.nestedFactModal).should('not.be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'none')
    })  

    it('should not open modal when there is no hash in url', () => {
        let filing = {
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
        }
        cy.loadFiling(filing)
        cy.get(selectors.factModal).should('not.be.visible') 
        cy.get(selectors.nestedFactModal).should('not.be.visible')
        cy.get(selectors.factModal).should('have.css', 'display', 'none')
    }) 
   
    it(`Match for Data, NO match for Tags for shelton filing`, () => {
        let filing = {
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
        }
        cy.loadFiling(filing)
        cy.get(selectors.factCountClock).should('not.exist')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAdditionalOnlyFilter).click()
        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
        cy.get(selectors.customTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '0')
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
        cy.get(selectors.axisFilterTagDrawer).click()
        cy.get(selectors.axis1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
        cy.get(selectors.membersFilterTagDrawer).click()
        cy.get(selectors.membersFilter1).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
    }) 
    it(`Match for Data, NO match for Tags for shelton filing`, () => {
        let filing = {
            docPath : '/Archives/edgar/data/778206/000138713122012642/shelton-497_122222.htm',
            timeout : 12000
        }
        cy.loadFiling(filing)
        cy.get(selectors.factCountClock).should('not.exist')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAdditionalOnlyFilter).click()
        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
        cy.get(selectors.customTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '0')
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
        cy.get(selectors.axisFilterTagDrawer).click()
        cy.get(selectors.axis1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
        cy.get(selectors.membersFilterTagDrawer).click()
        cy.get(selectors.membersFilter1).click()
        cy.get(selectors.factCountBadge).should('have.text', '9')
    }) 
})