// import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

// let filingsSample = getFilingsSample(Cypress.env);

describe(`XBRL tags that should not be considered facts`, () => {
	Cypress.config('defaultCommandTimeout', 20000);
	it('"ix:exclude" tags are not facts', () => {
		cy.loadByAccessionNum('000143774923027411')
		cy.get('ix\\:exclude').should('not.have.attr', 'contextref')
    })
    it('"ix:footnote" tags are not facts', () => {
		cy.loadByAccessionNum('000143774923027411')
		cy.get('ix\\:footnote').should('not.have.attr', 'contextref')
    })
    it('"ix:header" tags are not facts', () => {
		cy.loadByAccessionNum('000143774923027411')
		cy.get('ix\\:header').should('not.have.attr', 'contextref')
    })
})
