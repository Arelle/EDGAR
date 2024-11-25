import { selectors } from "../../utils/selectors";

describe(`Nested Fact Modal`, () => {
    it('Should show only fact modal or nested-fact modal, not both', () => {
        cy.loadByAccessionNum('000101376223000425');

        // normal fact
        cy.get('#fact-identifier-7').first().click();
        cy.get(selectors.factModal).should('be.visible');

        // nested fact parent
        cy.get('#fact-identifier-168').click();
        cy.get(selectors.factModal).should('not.be.visible');
        cy.get(selectors.nestedFactModal).should('be.visible');

        // click normal fact again
        cy.get('#fact-identifier-7').first().click();
        cy.get(selectors.factModal).should('be.visible');
        cy.get(selectors.nestedFactModal).should('not.be.visible');
    })

    it('Should not have overlapping concept name text', () => {
        cy.loadByAccessionNum('000101376223000425');

        // nested fact parent
        cy.get('#fact-identifier-189').click()

        // click normal fact again
        cy.get(selectors.nextNestedFactBtn).click()
        cy.get(selectors.nextNestedFactBtn).click()

        // click nested parent again
        cy.get('#fact-identifier-189').click()

        cy.get(selectors.nestedFactCarouselLabel).children().should('have.length', 1);
    })

    it('Should show correct count of nested facts', () => {
        cy.loadByAccessionNum('000101376223000425');

        // fact 1
        cy.get('#fact-identifier-168').click()

        //Click a nested fact
        cy.get(selectors.nestedPage)
            .should('have.text', '1')
        cy.get(selectors.nestedCount)
            .should('have.text', '21')
    })

    it('Should show enable the fact selector and navigates to the fact', () => {
        cy.loadByAccessionNum('000101376223000425');

        cy.get(selectors.factsHeader).click()
        cy.get('#fact-identifier-168').click()
        cy.hash().should('eq', '#fact-identifier-168')
        cy.get('#fact-identifier-168').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.nestedFactModal).should('be.visible')
        cy.get(selectors.nestedFactModalCarouselNextArrow).click({ force: true })
        cy.get(selectors.nestedPage)
            .should('have.text', '2')
        cy.get(selectors.nestedCount)
            .should('have.text', '21')
        cy.hash().should('eq', '#fact-identifier-169')
        cy.get('#fact-identifier-169').should('be.visible').should('have.attr', 'selected-fact', 'true')
        cy.get(selectors.nestedFactModal).should('be.visible')
    })

})
