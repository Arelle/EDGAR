import { getByAccessionNum } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

describe(`Filters - Combo`, () => {
    it(`Amts & Standard Tags for nmex filing`, () => {
        const filing = getByAccessionNum("000143774923034166")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '178')
    })

    it(`Amts & Period (2023) Tags for nmex filing`, () => {
        const filing = getByAccessionNum("000143774923034166")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()

        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()

        cy.get(selectors.factCountBadge).should('have.text', '128')
    })

    it(`Amts & Std Tags & Period (2022 & 2023) Tags for nmex filing`, () => {
        const filing = getByAccessionNum("000143774923034166")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()

        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.period2Filter).click()

        cy.get(selectors.factCountBadge).should('have.text', '177')
    })

    it(`Amts & Std Tags & Period (2023) Tags for nmex filing`, () => {
        const filing = getByAccessionNum("000143774923034166")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()

        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()

        cy.get(selectors.factCountBadge).should('have.text', '125')
    })

    it(`Amts & Std Tags & Period (2022 & 2023) Tags for nmex filing`, () => {
        const filing = getByAccessionNum("000143774923034166")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()

        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.period2Filter).click()

        cy.get(selectors.factCountBadge).should('have.text', '172')
    })

    it(`Match for Data, NO match for Tags for nmex filing`, () => {
        const filing = getByAccessionNum("000143774923034166")
        cy.visitHost(filing)
            
        cy.get(selectors.factCountClock, { timeout: filing.timeout }).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAdditionalOnlyFilter).click()

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '5')
        cy.get(selectors.customTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '0')
        cy.get(selectors.standardTagsRadio).click()
        
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '5')
        cy.get(selectors.period1Filter).click() // deselect
        cy.get(selectors.period2Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '0')
    })
})
