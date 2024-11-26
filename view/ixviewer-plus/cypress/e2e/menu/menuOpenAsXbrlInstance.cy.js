import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'
import { selectors } from "../../utils/selectors.mjs"
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel.js";
let filingsSample = getFilingsSample(Cypress.env);


describe(`Menu open as xbrl instance`, () => {
    filingsSample.forEach((filing) => {
		it(`${filing?.ticker || filing.docName} ${filing.formType || filing.submissionType} : ${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get('a[data-test="menu-dropdown-link"]').click({ timeout: Number(filing.timeout) })

            cy.get('a[data-test="form-information-instance"]').invoke('attr', 'href').then(href => {
                cy.request(href).then(response => {
                    expect(response.status).to.eq(200)
                })
            })
        })
    })
})