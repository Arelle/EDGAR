import { selectors } from "../../utils/selectors.mjs"

describe('IXViewer Content Missing', () => {
    it("IXViewer should show the entire contents of large filings.", () => {
        /*
        This test requires a bit of explanation
        There was a bug with filings 50MB and larger, where IXViewer would only display part of the content.
        The majority of the filing would simply be missing.
        This test takes a modified filing that is known to be effected by the bug,
        and checks that it is the correct length
        Correct length: 53,841,643 characters
        Bugged length :    254,439 characters
        */
        Cypress.config('pageLoadTimeout', 10000)
        cy.loadByAccessionNum('bigFiling1')
        cy.get(selectors.xbrlForm+" > section[id='xbrl-section-current'] > body").then(($body) => {
            /*
            IXViewer will make slight changes to the raw HTML document, so we have to give it some wiggle room
            In my testing, the variance introduced by IXViewer is 0.2%. Giving it a 1% allowance should be fine.
            */
            cy.get($body).invoke('html').its('length').should('be.within', 0.99*53841643, 1.01*53841643)
        })
    })
})