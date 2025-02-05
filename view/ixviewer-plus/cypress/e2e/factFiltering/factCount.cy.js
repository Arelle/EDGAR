import { getFilingsSample, readFilingData } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

let filingsSample = getFilingsSample(Cypress.env);

/*
npx cypress run --spec 'cypress/e2e/factCount.cy.js'
*/

describe(`Fact Count`, () => {
    filingsSample.forEach((filing) => {
		it(`fact count for ${filing.docName} should match`, () => {
            cy.loadFiling(filing)
            // // give app 15 secs per 1000 facts to load.
            // const timeout = filing.factCount > 1000 ? filing.factCount * 15 : 15000

			cy.get(selectors.factCountBadge)
                .should('contain.text', Number(filing.factCount).toLocaleString("en-US"))
        })
    })
})

describe(`Filing docs should have correct number of counted facts`, () => {
    it('stratasys docs should have 15 and 794', () => {
        cy.loadByAccessionNum('000121390021056659')

        cy.get('span[doc-slug="stratasys-6k.htm"]').should('have.text', '15');
        cy.get('span[doc-slug="stratasys-991.htm"]').should('have.text', '794');
    })
})