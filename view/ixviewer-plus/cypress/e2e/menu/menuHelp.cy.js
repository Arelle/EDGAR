import { selectors } from "../../utils/selectors.mjs"
import {readFilingData, readFilingDataAccNum} from '../../dataPlus/filingsFunnel.js'

const filing = readFilingDataAccNum('000080786323000002');

describe(`Menu Help`, () => {
    it('should show help info', () => {
        cy.loadFiling(filing)
        cy.get(selectors.menu, { timeout: Number(filing.timeout) }).click({force: true})
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
