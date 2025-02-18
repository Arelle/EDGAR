import { selectors } from "../../utils/selectors.mjs"

describe(`Links | Internal Links (#...)`, () => {
    it('Should just scroll to id and add hash to url', () => {
        cy.loadByAccessionNum('000101376223000425');
        cy.get('[href="#f_001"]').should('not.have.attr', 'xhtml-change', 'true');
        cy.get('[href="#f_001"]').click();
        cy.url().should('include', '#f_001')
    })
})
