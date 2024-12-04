import { selectors } from "../../utils/selectors.mjs"
import {readFilingData, readFilingDataAccNum} from '../../dataPlus/filingsFunnel.js'

let mitkFiling = readFilingDataAccNum('000080786323000002');
let nv8k = readFilingDataAccNum('000106299321011674');
let strata = readFilingDataAccNum('000121390021056659');

describe(`Search for specific text in specific filings`, () => {
    
    it(`Search for zip value`, () => {
        cy.loadFiling(mitkFiling)
        cy.get(selectors.factCountClock, { timeout: Number(mitkFiling.timeout) }).should('not.exist')

        cy.get(selectors.search).type('92101')
        cy.get(selectors.submitSearchButton).click()
        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it(`Search for 'NV' fact`, () => {
        cy.loadFiling(nv8k)
        cy.get(selectors.factCountClock, { timeout: Number(nv8k.timeout) }).should('not.exist')

        cy.get(selectors.search).type('NV')
        cy.get(selectors.submitSearchButton).click()
        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it(`serach for Reference Number '240'`, () => {
        cy.loadFiling(mitkFiling)
        cy.get(selectors.factCountClock, { timeout: Number(mitkFiling.timeout) }).should('not.exist')

        cy.get(selectors.searchSettingsGear).click()
        cy.get(selectors.searchRefOption).click({ force: true })

        cy.get(selectors.search).type('240', { force: true })
        cy.get(selectors.submitSearchButton).click()
        
        cy.get(selectors.factCountBadge).should('have.text', '8')
    })

    it(`serach for Reference Section 'S99' (find when fact has more than 1 ref)`, () => {
        cy.loadFiling(strata)
        cy.get(selectors.factCountClock, { timeout: Number(strata.timeout) }).should('not.exist')

        cy.get(selectors.searchSettingsGear).click()
        cy.get(selectors.searchRefOption).click({ force: true })

        cy.get(selectors.search).type('S99', { force: true })
        cy.get(selectors.submitSearchButton).click()
        
        cy.get(selectors.factCountBadge).should('have.text', '398')
    })

    it('Search bar should be able to find facts based on transformed name (e.g. searching "NY" will find "New York")', () => {
        cy.loadByAccessionNum('000182912623008291')

        cy.get(selectors.search).type('NY', {force: true})
        cy.get(selectors.submitSearchButton).click()
        cy.get('#fact-identifier-109')
            .should('have.attr', 'highlight-fact', 'true')
    })
})
