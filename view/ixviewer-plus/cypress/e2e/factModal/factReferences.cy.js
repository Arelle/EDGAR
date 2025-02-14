import { selectors } from "../../utils/selectors.mjs";
import { getByAccessionNum } from "../../dataPlus/filingsFunnel.js";

describe('Fact References', () => {
    it('Ensure all fact references are shown in fact modal', () =>
    {
        cy.loadByAccessionNum('000005114323000021')
        cy.get('#fact-identifier-6').click()
        cy.get(selectors.factModalCarouselNextArrow).click().click()
        cy.get('#fact-modal-carousel-page-3 tbody').children().should('have.length', 622)
    })
});

