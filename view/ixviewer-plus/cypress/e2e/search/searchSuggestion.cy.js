import { selectors } from "../../utils/selectors.mjs"

describe('Search recommendation box tests', () => {
    it('Search suggestion box should only appear when the search field is in focus', () => {
        cy.loadByAccessionNum('000080786323000002')
        cy.get(selectors.search).type('92101')
        cy.get(selectors.searchSuggestBox).should('be.visible').then(() => {
            cy.get('#fact-identifier-2').click()
            cy.get(selectors.searchSuggestBox).should('not.be.visible')
        })
    })
})
