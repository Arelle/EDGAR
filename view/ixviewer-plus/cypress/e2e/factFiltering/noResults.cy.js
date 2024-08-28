import { getByAccessionNum } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

describe(`Filters | No Results`, () => {
    it(`No error if custom selected`, () => {
        const filing = getByAccessionNum("000080786323000002")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.customTagsRadio).click()

        cy.get(selectors.factCountBadge).should('have.text', '0')
    })
})
