import { selectors } from "../../utils/selectors"

describe(`Instance request on peculiar file.htm.htm`, () => {
	it(`instance xml should load for golden minerals company`, () => {
		
		// assert no data-test="error-container"
		cy.loadByAccessionNum('000117625625000090');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/1011509/000117625625000090/aumn-20250930.htm.htm

		cy.get('[data-test="error-container"]').should('not.be.visible');

		// sections should populate (dependent on instance load)
		cy.get(selectors.sectionsHeader).click();
		cy.get(selectors.sectionsCount).should('contain.text', '49');
	})
})