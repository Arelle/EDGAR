import {readFilingData, readFilingDataAccNum} from "../../dataPlus/filingsFunnel";

let filing = readFilingDataAccNum('000121390021056659');

describe("IX Viewer Menu", () =>
{
    it("Menu dropdown should contain the version number", () =>
    {
        cy.loadFiling(filing);
        
        cy.get('a[data-test="menu-dropdown-link"]', { timeout: Number(filing.timeout) }).click();

        cy.get("#form-information-version").should('exist');
        cy.get('#form-information-version').invoke('text').should('match', /Version: [2-9][0-9]\.[0-9].*/);
    });
});
