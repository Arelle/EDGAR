import { selectors } from "../../utils/selectors.mjs"
import {getFilingsSample, readFilingDataAccNum} from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);

describe(`Tag Filters for ${filingsSample.length} filings`, () => {
    filingsSample.forEach((filing, index) => {
        let initialFactCount = 0
        let newFactCount = 0
        
        it(`[${index}] Tag Filters should filter facts`, () => {
            cy.loadFiling(filing)
            
            // this assertion forces it to wait for it to be populated with number
            cy.get(selectors.factCountClock, { timeout: Number(filing.timeout) }).should('not.exist')

            
            cy.get(selectors.factCountBadge).invoke('text').then(text => {
                initialFactCount = Number(text.replace(',', ''))

                // custom count
                cy.get(selectors.tagsHeader).click()
                cy.get(selectors.customTagsRadio).click()
                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text().replace(',', ''))
                    cy.expect(newFactCount).to.be.lte(initialFactCount)
                })

                // Standard tags count
                cy.get(selectors.standardTagsRadio).click()
                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text().replace(',', ''))
                    cy.expect(newFactCount).to.be.lte(initialFactCount)
                })

                // All tags count
                cy.get(selectors.allTagsRadio).click()
                cy.get(selectors.factCountBadge).then(newfactBadge => {
                    newFactCount = Number(newfactBadge.text().replace(',', ''))
                    cy.expect(newFactCount).to.eq(initialFactCount)
                })
            })
        })
    })
})

describe(`Tag filter for nmex filiing`, () => {
    it(`should have specific results`, () => {
        const filing = readFilingDataAccNum('000143774923034166')
        cy.loadFiling(filing)
            
        cy.get(selectors.factCountClock, { timeout: Number(filing.timeout) }).should('not.exist')

        cy.get(selectors.tagsHeader).click()
        cy.get(selectors.standardTagsRadio).click()
        cy.get(selectors.factCountBadge).should('have.text', '222')
    })
})
