import { readFilingDataAccNum } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors"

const filing = readFilingDataAccNum('000080786323000002')

describe(`Reset Filters`, () => {
    let initialFactCount = 0

    console.log(filing)
    it(`should clear filters ${filing?.ticker || filing.docName} ${filing.formType || filing.submissionType}`, () => {
        cy.loadFiling(filing)
        cy.get(selectors.factCountClock, { timeout: Number(filing.timeout) }).should('not.exist')

        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))

            // add amounts filter
            cy.get(selectors.dataFiltersButton).click()
            cy.get(selectors.dataAmountsOnlyFilter).click()
            
            // add standard only filter
            cy.get(selectors.tagsHeader).click()
            cy.get(selectors.standardTagsRadio).click()
            
            // add period filter
            cy.get(selectors.moreFiltersHeader).click()
            cy.get(selectors.periodFilterTagsDrawer).click()
            cy.get(selectors.period1Filter).click()
            
            cy.get(selectors.resetAllFilters).click()
            cy.get(selectors.factCountBadge).then(newfactBadge => {
                let newFactCount = Number(newfactBadge.text().replace(',', ''))
                cy.expect(newFactCount).to.eq(initialFactCount)
            })
        })
    })
})
