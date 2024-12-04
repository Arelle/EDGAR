import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);

describe(`Search for ${filingsSample.length} filings`, () => {
    filingsSample.forEach((filing, index) => {
        let initialFactCount = 0
        let newFactCount = 0
        let expandedFactCount = 0
        
        // just checking for smaller or equal fact count
        it(`[${index + 1}] Search text 'cash' should filter facts. AC : ${filing.accessionNum}`, () => {
            cy.loadFiling(filing)

            cy.get(selectors.factCountBadge).invoke('text').then(text => {
                initialFactCount = Number(text.replace(',', ''))

                cy.get(selectors.search).type('cash')
                cy.get(selectors.submitSearchButton).click()

                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text())
                    cy.expect(newFactCount).to.be.lt(initialFactCount)
                })
            })
            
            // test that expanding search grows results or keep equal
            cy.get(selectors.searchSettingsGear).click()
            
            // Check all options except Match Case (These selectors are gross...)
            cy.get('form[id="global-search-form"] div.form-check:nth-child(4) input').click({force: true})
            cy.get('form[id="global-search-form"] div.form-check:nth-child(5) input').click({force: true})
            cy.get('form[id="global-search-form"] div.form-check:nth-child(6) input').click({force: true})
            // Reference Options (outdated?)
            // cy.get('form[id="global-search-form"] div.dropdown-menu div.border div.form-check:nth-child(2) > input').click()
            // cy.get('form[id="global-search-form"] div.dropdown-menu div.border div.form-check:nth-child(3) > input').click()
            // cy.get('form[id="global-search-form"] div.dropdown-menu div.border div.form-check:nth-child(4) > input').click()
            // cy.get('form[id="global-search-form"] div.dropdown-menu div.border div.form-check:nth-child(5) > input').click()
            // cy.get('form[id="global-search-form"] div.dropdown-menu div.border div.form-check:nth-child(6) > input').click()

            cy.get(selectors.submitSearchButton).click()

            cy.get(selectors.factCountBadge).then(newfactBadge => {
                expandedFactCount = Number(newfactBadge.text().replace(',', ''))
                cy.expect(expandedFactCount).to.be.gte(newFactCount)
            })
        })

        it(`[${index + 1}] Search text 'tp' should filter facts. AC : ${filing.accessionNum}`, () => {
            // tp means type - Walter suggested this search term during a demo
            cy.loadFiling(filing)
            
            // this assertion forces it to wait for it to be populated with number
            cy.get(selectors.factCountClock, { timeout: Number(filing.timeout) }).should('not.exist')

            
            cy.get(selectors.factCountBadge).invoke('text').then(text => {
                initialFactCount = Number(text.replace(',', ''))

                cy.get(selectors.search).type('tp')
                cy.get(selectors.submitSearchButton).click()

                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text().replace(',', ''))
                    cy.expect(newFactCount).to.be.lt(initialFactCount)
                })
            })
        })

        it(`[${index + 1}] Search text 'form' should filter facts. AC : ${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            
            // this assertion forces it to wait for it to be populated with number
            cy.get(selectors.factCountClock, { timeout: Number(filing.timeout) }).should('not.exist')

            
            cy.get(selectors.factCountBadge).invoke('text').then(text => {
                initialFactCount = Number(text.replace(',', ''))

                cy.get(selectors.search).type('form')
                cy.get(selectors.submitSearchButton).click()

                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text().replace(',', ''))
                    cy.expect(newFactCount).to.be.lt(initialFactCount)
                })
            })
        })
    })
})
