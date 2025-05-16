import { selectors } from "../../utils/selectors.mjs"

describe('Navigating the search options with keyboard', () => {
    it('Clicking the \'Gear\' button then pressing Tab should navigate down through the check boxes', () => {
        cy.loadByAccessionNum('000080786323000002')
        cy.get(selectors.searchSettingsGear).click().then(() => {
            cy.get(selectors.searchSettingsGear).tab()
            cy.get('[name="search-options"][value="1"]').should("have.focus")
        })
    })

    it('Use arrow keys to move around search option check boxes', () => {
        cy.loadByAccessionNum('000080786323000002')
        cy.get(selectors.searchSettingsGear).click().then(() => {
            cy.get(selectors.searchSettingsGear).type('{downArrow}').then(() => {
                cy.get('[name="search-options"][value="1"]').should("have.focus").then(() => {
                    cy.get('[name="search-options"][value="1"]').type('{upArrow}').then(() => {
                        cy.get(selectors.searchSettingsGear).should('have.focus')
                    })
                })
            })
        })
    })

    it('Selecting a search option with spacebar should execute a search', () => {
        cy.loadByAccessionNum('000080786323000002')
        cy.get(selectors.factCountBadge).then(($count) => {
            let fullCount = parseInt($count.text())
            cy.get(selectors.search).type('8-K').then(() => {
                cy.get(selectors.searchSettingsGear).click().then(() => {
                    cy.get(selectors.searchSettingsGear).type('{downArrow}').then(() => {
                        cy.get('[name="search-options"][value="1"]').type(' ')
                        cy.get(selectors.factCountBadge).should(($searchCount) => {
                            let searchCount = parseInt($searchCount.text())
                            expect(searchCount).to.be.lessThan(fullCount)
                        })
                    })
                })
            })
        })
    })

    it('Should be able to select search options by clicking either the checkbox or the label', () => {
        cy.loadByAccessionNum('000080786323000002')
        cy.get(selectors.searchSettingsGear).click().then(() => {
            cy.get('input[name="search-options"][value="1"]').click().then(() => {
                cy.get('input[name="search-options"][value="1"]').should('not.be.checked').then(() => {
                     cy.get('div[id="searchOptionsContainer"] span:first').click().then(() => {
                        cy.get('input[name="search-options"][value="1"]').should('be.checked')
                        cy.get('div[id="searchOptionsContainer"]').should('be.visible')
                     })
                })
            })
        })
    })
})