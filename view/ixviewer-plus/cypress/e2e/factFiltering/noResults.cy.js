import { selectors } from "../../utils/selectors.mjs"

describe(`Filters | No Results`, () => {
    it(`No error if custom selected`, () => {
        cy.loadByAccessionNum('000080786323000002')
            
        cy.get(selectors.factCountClock).should('not.exist')
        cy.get(selectors.searchHourglass, { timeout: 12000 }).should('not.be.visible')

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.customTagsRadio).click()

        cy.get(selectors.factCountBadge).should('have.text', '0')
    })
})
