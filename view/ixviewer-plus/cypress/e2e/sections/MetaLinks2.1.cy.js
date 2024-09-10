import { selectors } from "../../utils/selectors.mjs"

describe(`Sections | Filing with metalinks 2.1`, () => {
    
    it('should be able to load sections data when metalinks 2.1', () => {
        cy.visitFiling("1517396", "000121390021056659", `stratasys-991.htm`);
        cy.get(selectors.sectionsHeader).click();
        cy.get(selectors.taggedSections).should('not.contain.text', 'No Reports Data');
    });
});