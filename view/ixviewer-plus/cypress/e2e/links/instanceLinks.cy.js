import { selectors } from "../../utils/selectors"

describe('Instance Function', () => {
    it('Should be able to navigate using the instance function without hanging', () => {
        cy.loadByAccessionNum('sbsef03')
        cy.get('button[data-cy="instance-dropdown"] li a').each(($el, index, $lis) => {
            if (index < $lis.length-1) {
                cy.get(selectors.instanceDropdown).click()
                cy.get(selectors.getNthInstanceLink(index+1)).click()
                cy.waitForAppReady(20000)
            }
        })
    })
})