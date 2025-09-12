import { selectors } from "../../utils/selectors.mjs"

describe(`Sections | Filing with metalinks 2.1`, () => {
    
    it('should be able to load sections data when metalinks 2.1', () => {
        cy.loadByAccessionNum('000121390021056659');
        cy.get(selectors.sectionsHeader).click();
        cy.get(selectors.taggedSections).should('not.contain.text', 'No Reports Data');
    });

    it('should be able to acces fact segment labels when metalinks 2.1', () => {
        // /Archives/edgar/data/920760/000162828016017488/len-20160531_95xixbrl.htm
        cy.loadByAccessionNum('000162828016017488');
        cy.get('[id="error-container"]').should('not.be.visible')
    });
});