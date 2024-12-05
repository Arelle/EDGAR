// import { enrichedFilingsUniqueFormTypes } from '../data/enrichedFilingsUniqueFormTypes.js'
// import { filings } from '../../dataPlus/enrichedFilingsPlus.mjs'
import {getFilingsSample} from "../../dataPlus/filingsFunnel";
import { filings } from '../../dataPlus/standardFilings.js'

/*
npx cypress run --spec 'cypress/e2e/menuInfoMulti.cy.js'
*/

const filingsSample = getFilingsSample(Cypress.env)

describe(`Menu Info Modal`, () => {
    filingsSample.forEach((filing) => {
		it(`Menu 'information' modal should function. ACC NUM ${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get('a[data-test="menu-dropdown-link"]', { timeout: Number(filing.timeout) }).click()
            cy.get('a[id="menu-dropdown-information"]').click()
            cy.get('div[data-test="form-information-modal"]').should('exist')
            
            // some don't have a cik
            // cy.get('td[data-name="Central Index Key"]').should('contain.text', filing.cik)
        })
    })
})