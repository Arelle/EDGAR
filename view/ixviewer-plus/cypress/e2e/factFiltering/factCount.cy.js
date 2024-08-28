import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

let filingsSample = getFilingsSample(Cypress.env);

/*
npx cypress run --spec 'cypress/e2e/factCount.cy.js'
*/

describe(`Fact Count`, () => {
    filingsSample.forEach((filing) => {
		it(`fact count for ${filing.docName} should match`, () => {
            cy.visitHost(filing)
            // // give app 15 secs per 1000 facts to load.
            // const timeout = filing.factCount > 1000 ? filing.factCount * 15 : 15000

			cy.get(selectors.factCountBadge, {timeout: filing.timeout})
                .should('contain.text', Number(filing.factCount).toLocaleString("en-US"))
        })
    })
})