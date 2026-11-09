import { selectors } from "../../utils/selectors.mjs"
import { readFilingData, readFilingDataAccNum } from '../../dataPlus/filingsFunnel.js'

const filing = readFilingDataAccNum('000080786323000002');


describe(`Settings: Select Open Sidebar Options`, () => {
    beforeEach(() => {
        cy.visit(filing.docPath, {
            onBeforeLoad(win) {
                win.localStorage.setItem('openSidebarOption', 'false');
            },
            timeout: Number(filing.timeout)
        }).then(browser => {
            cy.waitForAppReady(Number(filing.timeout) || 12000);
            cy.get(selectors.factCountClock).should('not.exist');
        })

    })
    it(`Select value changes Yes/No`, () => {
        cy.loadFiling(filing)
        cy.openSettings()
        cy.get(selectors.openSidebarOptionSelect).should('contain.text', 'No')

        cy.get(selectors.openSidebarOptionSelect).select('true')
        cy.get(selectors.openSidebarOptionSelect).should('contain.text', 'Yes')

        cy.get(selectors.openSidebarOptionSelect).select('false')
        cy.get(selectors.openSidebarOptionSelect).should('contain.text', 'No')
    })
})
