import { selectors } from "../../utils/selectors"

describe(`Filing Fees`, () => {
    it('loads', () => {
        cy.loadByAccessionNum('000001469323000155');
        cy.get(selectors.factSidebarToggleBtn).click();
        cy.get(selectors.factSidebar).should('be.visible');
    })
})