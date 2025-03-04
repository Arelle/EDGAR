import { selectors } from '../../utils/selectors'

describe('Back Button Fact Navigation', () => {
    it('The back button should be able to navigate to a previously clicked internal link', () => {
        cy.loadByAccessionNum('000110465923127862')
        cy.get('a[href="#ConsolidatedFinancialStatements"]').click().then(() => {
            cy.get('a[href="#NotestotheInterimCondensedConsolidated"]').click().then(() => {
                cy.go('back').then(() => {
                    cy.get('[id="fact-identifier-24"]').should('be.visible')
                })
            })
        })
    })

    it('Back button should be able to navigate to the previous doc in a multidoc', () => {
        cy.loadByAccessionNum('000121390021056659')
        cy.url().then(($url) => {
            const startURL = $url
            cy.get(selectors.docTab1).click().then(() => {
                cy.url().should('not.eq', startURL)
                cy.get('section[filing-url="stratasys-991.htm"]').should('be.visible')
                cy.go('back').then(() => {
                    cy.url().should('eq', startURL)
                    cy.get('section[filing-url="stratasys-6k.htm"]').should('be.visible')
                })
            })
        })
    })

    it('Back button should be able to navigate back to previously clicked fact', () => {
        cy.loadByAccessionNum('000110465923127862')
        cy.get('[id="fact-identifier-24"]').click().then(() => {
            cy.get('[id="fact-identifier-909"]').click().then(() => {
                cy.go('back').then(() => {
                    cy.get('[id="fact-identifier-24"]').should('be.visible')
                })
            })
        })
    })
})