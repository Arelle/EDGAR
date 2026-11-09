import { selectors } from "../../utils/selectors.mjs";

describe('Fact Calculations', () => {
    it('Should display calculations for a numeric fact with calculation linkage', () => {
        cy.visit('/Archives/edgar/data/1517396/000121390021056659/stratasys-991.htm');
        cy.waitForAppReady();
        
        cy.get('#fact-identifier-30').click();
        
        cy.get('h5[data-cy="fact-details-calculations-header"]').click()
        cy.get('#fact-details-calculations').should('be.visible');
        cy.get('#fact-details-calculations tbody tr').should('have.length.greaterThan', 0);

        cy.get('#fact-details-calculations tbody tr').first().find('th').first().should('have.text', 'Balance');
        cy.get('#fact-details-calculations tbody tr').first().find('td').first().should('have.text', 'Debit');
        cy.get('#fact-details-calculations tbody tr').eq(2).find('th').first().should('contain', 'Section');
        cy.get('#fact-details-calculations tbody tr').eq(2).find('td').first().should('contain', '001 - Statement');
        cy.get('#fact-details-calculations tbody tr').eq(3).find('th').first().should('contain', 'Weight');
        cy.get('#fact-details-calculations tbody tr').eq(3).find('td').first().should('contain', 'Added to parent(1.00)');
        cy.get('#fact-details-calculations tbody tr').eq(4).find('th').first().should('contain', 'Parent');
        cy.get('#fact-details-calculations tbody tr').eq(4).find('td').first().should('contain', 'us-gaap:AssetsCurrent');
    });

    it('Should not display calculations for facts without calculation linkage', () => {
        cy.visit('/Archives/edgar/data/1517396/000121390021056659/stratasys-991.htm');
        cy.waitForAppReady();

        cy.get('#fact-identifier-27').click();
        
        cy.get('h5[data-cy="fact-details-calculations-header"]').click()
        cy.get('#fact-details-calculations').should('be.visible');
        cy.get('#fact-details-calculations tbody tr').should('have.length.greaterThan', 0);

        cy.get('#fact-details-calculations tbody tr').first().find('th').first().should('have.text', 'Balance');
        cy.get('#fact-details-calculations tbody tr').first().find('td').first().should('have.text', 'N/A');
    });
});
