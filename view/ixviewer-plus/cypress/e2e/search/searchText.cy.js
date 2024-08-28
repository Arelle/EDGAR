import { selectors } from "../../utils/selectors.mjs"
import { getByAccessionNum } from '../../dataPlus/filingsFunnel.js'

let mitkFiling = getByAccessionNum('000080786323000002');
let nv8k = getByAccessionNum('000106299321011674');
let strata = getByAccessionNum('000121390021056659');

describe(`Search for specific text in specific filings`, () => {
    
    it(`Search for zip value`, () => {
        cy.visitHost(mitkFiling)
        cy.get(selectors.factCountClock, { timeout: mitkFiling.timeout }).should('not.exist')

        cy.get(selectors.search).type('92101')
        cy.get(selectors.submitSearchButton).click()
        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it(`Search for 'NV' fact`, () => {
        cy.visitHost(nv8k)
        cy.get(selectors.factCountClock, { timeout: nv8k.timeout }).should('not.exist')

        cy.get(selectors.search).type('NV')
        cy.get(selectors.submitSearchButton).click()
        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it(`serach for Reference Number '240'`, () => {
        cy.visitHost(mitkFiling)
        cy.get(selectors.factCountClock, { timeout: mitkFiling.timeout }).should('not.exist')

        cy.get(selectors.searchSettingsGear).click()
        cy.get(selectors.searchRefOption).click({ force: true })

        cy.get(selectors.search).type('240', { force: true })
        cy.get(selectors.submitSearchButton).click()
        
        cy.get(selectors.factCountBadge).should('have.text', '8')
    })

    it(`serach for Reference Section 'S99' (find when fact has more than 1 ref)`, () => {
        cy.visitHost(strata)
        cy.get(selectors.factCountClock, { timeout: strata.timeout }).should('not.exist')

        cy.get(selectors.searchSettingsGear).click()
        cy.get(selectors.searchRefOption).click({ force: true })

        cy.get(selectors.search).type('S99', { force: true })
        cy.get(selectors.submitSearchButton).click()
        
        cy.get(selectors.factCountBadge).should('have.text', '398')
    })
})
