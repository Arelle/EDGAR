// import { filings } from '../../dataPlus/filingsWithUrls'
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);

describe(`Metalinks requests`, () => {
	filingsSample.forEach((filing) => {
		
		it(`metalinks.json should load for ${filing?.ticker || filing.docName} ${filing.formType || filing.submissionType}`, () => {
			cy.requestMetaLinksPerHost(filing).then(resp => {
				expect(resp.status).to.equal(200)
			})
		})
    })
})