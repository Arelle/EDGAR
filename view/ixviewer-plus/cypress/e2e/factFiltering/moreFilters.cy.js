import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);
// import { getFilingsWithHighestFactCount } from '../../utils/helpers'

const testAddingMoreFilterCategories = (categoryHeaderSelector, filters, initialFactCount) => {
    let prevFactCount = 0
    let newFactCount = 0

    cy.get(categoryHeaderSelector).click()

    // toggle filters on one by one and check for increase in fact count
    filters.forEach((filter, index) => {
        cy.get(filter).click()
        cy.get(selectors.factCountBadge).then(newfactBadge => {
            newFactCount = Number(newfactBadge.text().replace(',', ''))
            if (index == 0) {
                cy.expect(newFactCount).to.be.lte(initialFactCount)
            } else {
                cy.expect(Number(newfactBadge.text().replace(',', ''))).to.be.gte(prevFactCount)
                cy.expect(newFactCount).to.be.gte(prevFactCount)
            }
            prevFactCount = newFactCount
        })
    })

    // Clear and check that we're back to original fact count
    filters.forEach(catSel => cy.get(catSel).click())
    cy.get(selectors.factCountBadge).then(newfactBadge => {
        newFactCount = Number(newfactBadge.text().replace(',', ''))
        cy.expect(newFactCount).to.eq(initialFactCount)
    })
}

describe('Filters | More', () => {
    it('More-period-2023 should have specific result for nmex filing', () => {
        cy.loadByAccessionNum('000143774923034166')

        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '171')
    })
    it('Period-2023 & 2022 should have specific result for nmex filing', () => {
        cy.loadByAccessionNum('000143774923034166')

        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click()
        cy.get(selectors.period2Filter).click()
        cy.get(selectors.factCountBadge).should('have.text', '220')
    })
    it('3 months ending 10/31/2023 should match 90 facts', () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1FilterDrawer).click()
        cy.get('input[name="3 months ending 10/31/2023"]').click()
        cy.get(selectors.factCountBadge).should('have.text', '90')
    })
    it('10/31/2023 - 10/31/2023 should match 2 facts', () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1FilterDrawer).click()
        cy.get('input[name="10/31/2023 - 10/31/2023"]').click()
        cy.get(selectors.factCountBadge).should('have.text', '2')
    })
    it('As of 10/31/2023 should match 39 facts', () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1FilterDrawer).click()
        cy.get('input[name="As of 10/31/2023"]').click()
        cy.get(selectors.factCountBadge).should('have.text', '39')
    })
    it('2023 minus 3 months ending 10/31/2023 should match 81 facts', () => {
        cy.loadByAccessionNum('000143774923034166')
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.periodFilterTagsDrawer).click()
        cy.get(selectors.period1Filter).click() // apply 2023
        cy.get(selectors.period1FilterDrawer).click()
        cy.get('input[name="3 months ending 10/31/2023"]').click() // un apply 10/31/2023 - 10/31/2023
        cy.get(selectors.factCountBadge).should('have.text', '81')
    })
})

describe(`Filters | More (bulk - more selected should have more results)`, () => {

    let initialFactCount = 0

    beforeEach(() => {
        cy.loadByAccessionNum('000090831524000023')
        cy.get(selectors.moreFiltersHeader).click()

        // highFactCountFilings.forEach(f => {
        //     cy.log('f.factCount', f.factCount)
        // })
    })

    // Periods
    it('Period Filters should filter facts', () => {
        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))
            const filtersArr = [selectors.period1Filter, selectors.period2Filter, selectors.period3Filter]
            // const filtersArr = [selectors.period1Filter] // only 1 period filter for 
            testAddingMoreFilterCategories(selectors.periodFilterTagsDrawer, filtersArr, initialFactCount)
        })
    })

    // Measures
    it('Measure Filters should filter facts', () => {
        let filtersArr = [selectors.measure1Filter, selectors.measure2Filter, selectors.measure3Filter]

        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))
            testAddingMoreFilterCategories(selectors.measuresFilterTagsDrawer, filtersArr, initialFactCount)
        })
    })

    // Axis
    it('Axis Filters should filter facts', () => {
        let filtersArr = [selectors.axis1Filter]

        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))
            testAddingMoreFilterCategories(selectors.axisFilterTagDrawer, filtersArr, initialFactCount)
        })
    })

    // Members
    it('Members Filters should filter facts', () => {
        let filtersArr = [selectors.membersFilter1]

        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))
            testAddingMoreFilterCategories(selectors.membersFilterTagDrawer, filtersArr, initialFactCount)
        })
    })

    // Scale
    it('Scale Filters should filter facts', () => {
        let filtersArr = [
            selectors.scaleFilter1, 
            selectors.scaleFilter2, 
            // selectors.scaleFilter3
        ]

        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))
            testAddingMoreFilterCategories(selectors.scaleFilterTagDrawer, filtersArr, initialFactCount)
        })
    })

    // Balance
    it('Balance Filters should filter facts', () => {
        let filtersArr = [selectors.balanceFilter1, selectors.balanceFilter2]

        cy.get(selectors.factCountBadge).invoke('text').then(text => {
            initialFactCount = Number(text.replace(',', ''))
            testAddingMoreFilterCategories(selectors.balanceFilterTagDrawer, filtersArr, initialFactCount)
        })
    })
})

describe('Filters | multiple Axes', () => {
    // before fix, facts that had multiple axes would not show up in filter results / fact list
    it('Facts with multiple Axes should show up in filter results', () => {
        // fact 215
        cy.visit('/Archives/edgar/data/1415744/000143774923034166/nmex20231031_10q.htm')
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.axisFilterTagDrawer).click()
        cy.get(selectors.axisExplicitTagDrawer).click()
        cy.get('[id="us-gaap:BusinessAcquisitionAxis"]').click()
        cy.get(selectors.factCountBadge).should('contain.text', '1')
    })
})

describe('Filters | multiple Members', () => {
    // before fix, facts that had members axes would not show up in filter results / fact list
    it('Facts with multiple Members should show up in filter results', () => {
        // fact 223, 224
        cy.visit('/Archives/edgar/data/1415744/000143774923034166/nmex20231031_10q.htm')
        cy.get(selectors.moreFiltersHeader).click()
        cy.get(selectors.membersFilterTagDrawer).click()
        cy.get(selectors.membersExplicitTagDrawer).click()
        cy.get('[name="srt:ChiefFinancialOfficerMember"]').click()
        cy.get(selectors.factCountBadge).should('contain.text', '2')
    })
})
