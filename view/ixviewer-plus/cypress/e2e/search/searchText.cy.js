import { selectors } from "../../utils/selectors.mjs"
import {readFilingData, readFilingDataAccNum} from '../../dataPlus/filingsFunnel.js'

let mitkFiling = readFilingDataAccNum('000080786323000002');
// http://localhost:3000/ix.xhtml?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm
let nv8k = readFilingDataAccNum('000106299321011674');
let strata = readFilingDataAccNum('000121390021056659');
// http://localhost:3000/ix.xhtml?doc=/Archives/edgar/data/1517396/000121390021056659/stratasys-6k.htm

describe(`Search for specific text in specific filings`, () => {
    
    it(`Search for zip value`, () => {
        
        cy.loadFiling(mitkFiling)
        cy.get(selectors.factCountClock, { timeout: Number(mitkFiling.timeout) }).should('not.exist')
        cy.get(selectors.searchHourglass).should('exist');
        cy.get(selectors.searchHourglass).should('not.be.visible');

        cy.get(selectors.search).type('92101')
        // cy.get(selectors.submitSearchButton).click()
        cy.get(selectors.search).type('{enter}')

        cy.get(selectors.searchHourglass).should('not.be.visible')
        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it(`Search for 'NV' fact`, () => {
        cy.loadFiling(nv8k)
        cy.get(selectors.factCountClock, { timeout: Number(nv8k.timeout) }).should('not.exist')

        cy.get(selectors.search).type('NV')
        // cy.get(selectors.submitSearchButton).click()
        cy.get(selectors.search).type('{enter}')

        cy.get(selectors.factCountBadge).should('have.text', '1')
    })

    it('Search bar should be able to find facts based on transformed name (e.g. searching "NY" will find "New York")', () => {
        cy.loadByAccessionNum('000182912623008291')
        // http://localhost:3000/ix.xhtml?doc=/Archives/edgar/data/1653876/000182912623008291/momentous_10kt.htm

        cy.get(selectors.search).type('NY', {force: true})

        cy.get(selectors.search).type('{enter}')
        cy.wait(200);

        cy.get('#fact-identifier-109')
            .should('have.attr', 'highlight-fact', 'true')
    })
})
