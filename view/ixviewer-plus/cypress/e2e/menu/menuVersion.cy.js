// import { filings } from '../../dataPlus/enrichedFilingsPlus.mjs'
import { filings } from '../../dataPlus/standardFilings.js'

let filing = filings[0];

describe("IX Viewer Menu", () =>
{
    it("should contain the version number", () =>
    {
        cy.visitHost(filing);
        
        cy.get('a[data-test="menu-dropdown-link"]', { timeout: filing.timeout }).click();

        cy.get("#form-information-version").should('exist');
        cy.get('#form-information-version').invoke('text').should('match', /Version: [2-9][0-9]\.[0-9].*/);
    });
});
