import { selectors } from "../../utils/selectors.mjs"
import { getByAccessionNum } from '../../dataPlus/filingsFunnel.js'

const filing = getByAccessionNum('000080786323000002');

describe(`Menu Help for ${filing.docName} ${filing.formType || filing.submissionType}`, () => {
    it('should show help info', () => {
        cy.visitHost(filing)
        cy.get(selectors.menu, { timeout: filing.timeout }).click({force: true})
        cy.get(selectors.helpLink).click({force: true})

        cy.get(selectors.gettingStarted).click({force: true})
        cy.get('div[id="help-getting-started"]').should('exist')

        cy.get('button[data-bs-target="#help-fact-review-window"]').click({force: true})
        cy.get('div[id="help-fact-review-window"]').should('exist')

        cy.get('button[data-bs-target="#help-search"]').click({force: true})
        cy.get('div[id="help-search"]').should('exist')

        cy.get('button[data-bs-target="#help-filter"]').click({force: true})
        cy.get('div[id="help-filter"]').should('exist')

        cy.get('button[data-bs-target="#help-facts-results-list"]').click({force: true})
        cy.get('div[id="help-facts-results-list"]').should('exist')

        cy.get('button[data-bs-target="#help-tagged-sections"]').click({force: true})
        cy.get('div[id="help-tagged-sections"]').should('exist')

        cy.get('button[data-bs-target="#help-tagged-menu"]').click({force: true})
        cy.get('div[id="help-tagged-menu"]').should('exist')
    })
})
