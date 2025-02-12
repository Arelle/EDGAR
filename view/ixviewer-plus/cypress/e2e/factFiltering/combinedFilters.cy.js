import { selectors } from "../../utils/selectors.mjs"

describe(`Filters - Combo`, () => {
    it(`Amts & Standard Tags for nmex filing`, () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '179')
    })

    it(`Amts & Period (2023) Tags for nmex filing`, () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '128')
    })

    it(`Amts & Std Tags & Period (2022 & 2023) Tags for nmex filing`, () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.period2Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '177')
    })

    it(`Amts & Std Tags & Period (2023) Tags for nmex filing`, () => {
        cy.loadByAccessionNum('000143774923034166')
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
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.period2Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '173')
    })

    it(`Match for Data, NO match for Tags for nmex filing`, () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAdditionalOnlyFilter).click()
        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '7')
        cy.get(selectors.customTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '0')
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '6')
        cy.get(selectors.period1Filter).click() // deselect
        cy.get(selectors.period2Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it(`Zip Code is Amount Only Test`, () => {
        cy.loadByAccessionNum('000121390021056659')
        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        //It would show 743 if zip was included.
        cy.get(selectors.factCountBadge).should('have.text', '741')
    })

})
