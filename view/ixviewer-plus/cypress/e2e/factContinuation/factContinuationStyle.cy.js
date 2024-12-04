import { selectors } from "../../utils/selectors"
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel";

describe(`Fact Continuation`, () => {
    it('should have correct style to show left/right outline on load', () => {
        cy.get(selectors.factCountClock).should('not.exist')
        cy.loadByAccessionNum('000089418923007993');
        cy.get("#fact-identifier-29").click()
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'enabled-fact')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'text-block-fact')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'continued-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.css', 'box-shadow')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.dataAllFilter).click()
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'enabled-fact')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'text-block-fact')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'continued-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.css', 'box-shadow')
    })    

    it('should have correct style to show left/right outline after Data Filter Amounts Only and All are selected', () => {
        cy.get(selectors.factCountClock).should('not.exist')
        cy.loadByAccessionNum('000089418923007993');

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.dataAllFilter).click()

        cy.get("#fact-identifier-29").click()
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'enabled-fact')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'text-block-fact')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.attr', 'continued-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-29']").should('have.css', 'box-shadow')
    })    

    it('should not be visibile after Data Filter Amounts Only is selected', () => {
        cy.get(selectors.factCountClock).should('not.exist')
        cy.loadByAccessionNum('000089418923007993');

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()

        cy.get("#fact-identifier-29").click({force: true})
        cy.get("[continued-main-fact-id='fact-identifier-29']", {force: true}).should('not.exist')
    })  
    it('should select all parts of a continued fact, if any of the continued facts is clicked', () => {
        let filing = readFilingDataAccNum('000101376223000425')
        cy.loadFiling(filing)

        // fact 1
        cy.get('#fact-identifier-200', { timeout: Number(filing.timeout) }).click()
        cy.get('#fact-identifier-200').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-200']").should('have.attr', 'selected-fact', 'true').should('have.attr', 'hover-fact', 'true')

        cy.get('#fact-identifier-199', { timeout: Number(filing.timeout) }).click()
        cy.get('#fact-identifier-199').should('be.visible').should('have.attr', 'selected-fact', 'true').should('have.attr', 'hover-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-200']").should('have.attr', 'selected-fact', 'false').should('have.attr', 'hover-fact', 'false')
        cy.get("[continued-main-fact-id='fact-identifier-199']").should('have.attr', 'selected-fact', 'true').should('have.attr', 'hover-fact', 'true')

        //clicked on one of the continued facts and expect all continied fact and main continued fact to be selected
        cy.get("[id='iinn_ScheduleOfFinancialLiabilities-c0_cont_3']", { timeout: Number(filing.timeout) }).click()
        cy.get('#fact-identifier-200').should('be.visible').should('have.attr', 'selected-fact', 'true').should('have.attr', 'hover-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-200']").should('have.attr', 'selected-fact', 'true').should('have.attr', 'hover-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-199']").should('have.attr', 'selected-fact', 'false').should('have.attr', 'hover-fact', 'false')
 
    })  

    it('should select all parts of a continued fact, if any of the continued facts is selected on url', () => {
        let filing = {
            docPath : '/Archives/edgar/data/1837493/000101376223000425/ea185980ex99-1_inspiratech.htm#fact-identifier-168',
            timeout : 16000
        }
       cy.loadFiling(filing)
        // fact 2
        cy.get('#fact-identifier-168').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-168']").should('have.attr', 'selected-fact', 'true')
    })
    it('should hover parts of a continued fact, if any of the continued facts is hoverd', () => {
        let filing = {
            docPath : '/Archives/edgar/data/1837493/000101376223000425/ea185980ex99-1_inspiratech.htm#fact-identifier-168',
            timeout : 16000
        }
       cy.loadFiling(filing)
        // fact 2
        cy.get('[id="fact-identifier-168"]').first().trigger('mouseover')
        cy.get('#fact-identifier-168').should('have.attr', 'hover-fact', 'true')
        cy.get("[continued-main-fact-id='fact-identifier-168']").should('have.attr', 'hover-fact', 'true')
    })
})