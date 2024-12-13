import { selectors } from "../../utils/selectors"

describe(`Fact Display`, () => {
    it('should not have comma when dei:EntityCentralIndexKey', () => {
        //cy.visitFiling(20);
        cy.loadByAccessionNum('000001469323000155');
        cy.get(selectors.factCountClock).should('not.exist')
        cy.get(selectors.factsHeader).click()
        cy.get(selectors.sidebarPaginationNext).click()
        cy.get(selectors.sidebarPaginationNext).click()
        cy.get('a[data-id="fact-identifier-0"]').click()
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(2) > td > div')
            .should('have.text', '0000014693') // not 14,693
    })
    
    it('should not have comma when date or year', () => {
        //cy.visitFiling(null, "GLM4gd-F-SR20081231", "GLM4gd-F-SR20081231.htm#");
        //cy.visitFiling(18);
        cy.loadByAccessionNum('000119312524147598')
        cy.get(selectors.factCountClock).should('not.exist')
        cy.get('[id="fact-identifier-6"]').click()
        cy.get(selectors.factValueInModal)
            .should('have.text', '2024') // not 2,024
    })

    it('should not have comma when zip code', () => {
        //cy.visitFiling(0);
        cy.loadByAccessionNum('000121390021056659')
        cy.get(selectors.factCountClock).should('not.exist')
        cy.get(selectors.factsHeader).click()
        cy.get('a[data-id="fact-identifier-16"]').click()
        cy.get(selectors.factValueInModal)
            .should('have.text', '76124') // not 76,124
    })

    // TODO: Also, need tests to make sure values are getting commas added when they should.

    it('12-month period should show correct (Not off-by-one)', () =>
    {
        cy.loadByAccessionNum('000168441724800397')
        cy.get(selectors.factSidebarToggleBtn).click()
        cy.get(selectors.sidebarFactPeriod(24)).should(
            'include.text', '12 months'
        )
    })
})