import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample, getByAccessionNum } from '../../dataPlus/filingsFunnel.js'

const filing = getByAccessionNum('000080786323000002');


describe(`Settings Show Popover on Hover`, () => {
    it(`${filing?.ticker || filing.docName} ${filing.formType || filing.submissionType}`, () => {
        cy.visitHost(filing)

        // popover shouldn't show when setting off (default)
        cy.get('[id="fact-identifier-2"]', {timeout: filing.timeout}).first().trigger('mouseover')
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
