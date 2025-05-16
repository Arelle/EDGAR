import { selectors } from "../../utils/selectors"

describe(`Fact Display`, () => {
    it('Text block facts should have appropriate attributes', () => {
        cy.visit('/Archives/edgar/data/1561894/000156189425000041/hasi-20241231.htm');
        cy.get('#fact-identifier-10').should('have.attr', 'text-block-fact');
        cy.get('#fact-identifier-10').should('not.have.attr', 'inline-block-fact');
        cy.get('#fact-identifier-10').should('not.have.attr', 'inline-fact');
        
        // have to click to scroll to so that obsserver is triggered.
        cy.get('#fact-identifier-39').click()
        cy.get('#fact-identifier-39').should('have.attr', 'text-block-fact');
        cy.get('#fact-identifier-39').should('not.have.attr', 'inline-block-fact');
        cy.get('#fact-identifier-39').should('not.have.attr', 'inline-fact');
    })

    it('Inline block facts should have appropriate attributes', () => {
        cy.visit('/Archives/edgar/data/1141819/000089418923007993/ck0001141819-20231031.htm#fact-identifier-29');
        cy.get('#fact-identifier-29').should('have.attr', 'inline-block-fact');
        cy.get('#fact-identifier-29').should('not.have.attr', 'text-block-fact');
        cy.get('#fact-identifier-29').should('not.have.attr', 'inline-fact');
    })

})