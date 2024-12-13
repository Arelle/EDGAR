import { selectors } from "../../utils/selectors"

describe(`Fact side bar features`, () => {
    it('prev/next fact nav should work', () => {
        cy.loadByAccessionNum('000101376223000425')

        // current instance tab is active
        cy.get(selectors.docTab1).should('have.class', 'active')
        // other tab isn't
        cy.get(selectors.docTab0).should('not.have.class', 'active')

        cy.get(selectors.factSidebarToggleBtn).click()
        cy.get('[data-id="fact-identifier-0"]').click()

        // prev instance tab is no longer active
        cy.get(selectors.docTab1).should('not.have.class', 'active')
        // other tab is
        cy.get(selectors.docTab0).should('have.class', 'active')

        // switch back to original instance
        cy.get('[data-id="fact-identifier-4"]').click()

        // prev instance tab is no longer active
        cy.get(selectors.docTab1).should('have.class', 'active')
        // other tab is
        cy.get(selectors.docTab0).should('not.have.class', 'active')
    })
})
