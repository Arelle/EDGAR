import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"

let filingsSample = getFilingsSample(Cypress.env);

describe(`Filter - Amounts Only`, () => {
    for(let f=0; f<filingsSample.length; f++) {
        let filing = filingsSample[f]
        let initialFactCount = 0
        let newFactCount = 0
        it(`[${f}] should filter facts for ${filing.docName || filing.docPath.split('/').pop() || 'another filing'}`, () => {
            cy.loadFiling(filing)
            
            // this assertion forces it to wait for it to be populated with number
            cy.get(selectors.factCountClock).should('not.exist')

            cy.get(selectors.factCountBadge).invoke('text').then(text => {
                initialFactCount = Number(text.replace(',', ''))

                cy.get(selectors.dataFiltersButton).click()
                cy.get(selectors.dataAmountsOnlyFilter).click()

                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text().replace(',', ''))
                    cy.expect(newFactCount).to.be.lte(initialFactCount)
                })

                // TODO click () All again to see fact count revert
            })
        })
    }

    it(`nmex filing should have specific results`, () => {
        cy.loadByAccessionNum('000143774923034166')
            
        cy.get(selectors.factCountClock).should('not.exist')

        cy.get(selectors.dataFiltersButton).click()
        cy.get(selectors.dataAmountsOnlyFilter).click()
        cy.get(selectors.factCountBadge).should('have.text', '183') // 182 on legacy for some reason
    })
})
