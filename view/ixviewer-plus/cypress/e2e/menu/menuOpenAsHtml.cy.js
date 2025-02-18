import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);

describe(`Menu open as html for ${filingsSample.length} filings`, () => {
    filingsSample.forEach((filing) => {
        it(`${filing.formType || filing.submissionType} : ${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get('button[data-test="menu-dropdown-link"]').click({ timeout: filing.timeout })

            cy.get('a[data-test="form-information-html"]').invoke('attr', 'href').then(href => {
                cy.request(href).then(response => {
                    expect(response.status).to.eq(200)
                })
            })
        })
    })
})