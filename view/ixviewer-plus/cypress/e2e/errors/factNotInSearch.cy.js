import { selectors } from "../../utils/selectors"

describe(`Not Found warning`, () => {
	it(`Should not appear when unhighlighted fact is clicked`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.hash().should('be.empty')
		
		cy.get(selectors.search).type('8-k')
		cy.get(selectors.search).type('{enter}')
		
		cy.get('[id="error-container"]').children().should('have.length', 0)
		
		cy.get('#fact-identifier-5').click()
		cy.get(selectors.factSidebarDetailDisplay)
		cy.hash().should('eq', '#fact-identifier-5')
		cy.get('[id="error-container"]').children().should('have.length', 0)
		
		cy.get('#fact-identifier-6').click()
		cy.get('[id="error-container"]').children().should('have.length', 0)

	})

	it(`Should not appear when unhighlighted fact is clicked with fact list open`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.hash().should('be.empty')
		
		cy.get(selectors.search).type('8-k')
		cy.get(selectors.search).type('{enter}')
		
		cy.get('[id="error-container"]').children().should('have.length', 0)

		cy.get('#fact-identifier-2').click()
		cy.get(selectors.factListDisplayBtn).click() 
		
		cy.get('#fact-identifier-5').click()
		cy.get(selectors.factSidebarDetailDisplay)
		cy.hash().should('eq', '#fact-identifier-5')
		cy.get('[id="error-container"]').children().should('have.length', 0)
		
		cy.get('#fact-identifier-6').click()
		cy.get('[id="error-container"]').children().should('have.length', 0)

	})

	it(`Should not appear switching to list view while unhighlighted fact is selected`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.hash().should('be.empty')
		
		cy.get(selectors.search).type('8-k')
		cy.get(selectors.search).type('{enter}')
		
		cy.get('[id="error-container"]').children().should('have.length', 0)

		cy.get('#fact-identifier-5').click()
		cy.hash().should('eq', '#fact-identifier-5')

		cy.get(selectors.factListDisplayBtn).click() 
		cy.get(selectors.factSidebarListDisplay)
		cy.get('[id="error-container"]').children().should('have.length', 0)
	})


	it(`Should not appear switching to split while unhighlighted fact is selected`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.hash().should('be.empty')
		
		cy.get(selectors.search).type('8-k')
		cy.get(selectors.search).type('{enter}')
		
		cy.get('[id="error-container"]').children().should('have.length', 0)

		cy.get('#fact-identifier-5').click()
		cy.hash().should('eq', '#fact-identifier-5')

		cy.get(selectors.factDetailsSplitBtn).click()
		cy.get(selectors.factSidebarSplitDisplay)
		cy.get('[id="error-container"]').children().should('have.length', 0)
	})

	it(`Should appear when unhighlighted fact is clicked in split view`, () => {
		cy.loadByAccessionNum('000080786323000002');

		cy.get(selectors.search).type('8-k{enter}')
		cy.get('#fact-identifier-2').click()
		cy.get(selectors.factDetailsSplitBtn).click()
		cy.get(selectors.factSidebarSplitDisplay)

		cy.get('#fact-identifier-5').click()
		cy.get('[id="error-container"]').children().should('have.length', 1)
	})

	it(`Should show and deselect selected fact`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.hash().should('be.empty')
		
		cy.get(selectors.search).type('8-k')
		cy.get(selectors.search).type('{enter}')
		
		cy.get('[id="error-container"]').children().should('have.length', 0)

		cy.get('#fact-identifier-2').click()
		cy.hash().should('eq', '#fact-identifier-2')

		cy.get(selectors.factListDisplayBtn).click() 
		cy.get(selectors.sidebarFact("2")).should('have.attr', 'selected-fact', 'true')

		cy.get('#fact-identifier-5').click()

		cy.get(selectors.factListDisplayBtn).click() 
		cy.get(selectors.sidebarFact("2")).should('have.attr', 'selected-fact', 'false')
	})

	it(`Should not show when searching facts with fact list open`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.get('#fact-identifier-2').click()
		cy.hash().should('eq', '#fact-identifier-2')
		
		cy.get(selectors.search).type('600{enter}')
		cy.get(selectors.factSidebarListDisplay)

		cy.get('[id="error-container"]').then(($el) => {
			expect($el.children()).to.have.length(0)
		})

		cy.get(selectors.search).type('{backspace}{backspace}{backspace}')
		cy.get(selectors.search).type('8-k{enter}')

		cy.get('[id="error-container"]').then(($el) => {
			expect($el.children()).to.have.length(0)
		})
	})

	it(`Should not show when list is not open`, () => {
		cy.loadByAccessionNum('000080786323000002');
		// https://www.sec.gov/ix?doc=/Archives/edgar/data/807863/000080786323000002/mitk-20230104.htm

		cy.get('#fact-identifier-2').click()
		cy.hash().should('eq', '#fact-identifier-2')

		cy.get(selectors.factMenuBtn).click()
		
		cy.get(selectors.factSidebarListDisplay, { timeout: 1000}).should('not.exist')

		cy.get('[id="error-container"]').then(($el) => {
			expect($el.children()).to.have.length(0)
		})

		cy.get(selectors.search).type('600{enter}')

		
		cy.get('[id="error-container"]').then(($el) => {
			expect($el.children()).to.have.length(0)
		})
	})
})