import { selectors } from "../../utils/selectors.mjs"
import {readFilingData, readFilingDataAccNum} from '../../dataPlus/filingsFunnel.js'

const filing = readFilingDataAccNum('000080786323000002');


describe(`Settings Show Popover on Hover`, () => {
    it(`${filing?.ticker || filing.docName} ${filing.formType || filing.submissionType}`, () => {
        cy.loadFiling(filing)

        // popover shouldn't show when setting off (default)
        cy.get('[id="fact-identifier-2"]', {timeout: Number(filing.timeout)}).first().trigger('mouseover')
        cy.get('div[id^="popover"]')
            .should('not.exist')

        // popover should show if popover on hover turned on
        cy.openSettings()
        cy.get(selectors.hoverForQuickInfoSelect).select('true')
        cy.get(selectors.hoverForQuickInfoSelect).should('contain.text', 'On')
        cy.get(selectors.settingsClose).click()
        // trigger hover
        cy.get('[id="fact-identifier-2"]').first().trigger('mouseover')
        cy.wait(200)
        cy.get('div[id^="popover"]')
            .should('exist')
    })
})
