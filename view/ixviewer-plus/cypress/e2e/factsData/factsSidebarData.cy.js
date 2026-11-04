import { selectors } from "../../utils/selectors.mjs";
import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel.js";

describe(`Fact Data | Sidebar`, () => {
    it('facts in sidebar should have correct property values', () => {
        let nmexfiling = readFilingDataAccNum('000143774923034166');
        cy.loadFiling(nmexfiling);
        cy.get(selectors.factSidebarToggleBtn).click();
        cy.get(selectors.sidebarPaginationLast).click();

        //Clicking the fact will verify it's there & visible
        cy.get(selectors.sidebarFact(6)).click();

        const concept = "us-gaap_AntidilutiveSecuritiesExcludedFromComputationOfEarningsPerShareAmount";
        cy.get(selectors.sidebarFactConcept(6)).should('have.text', concept);
        cy.get(selectors.sidebarFactBadge(6)).should('have.text', "A"); //Hidden Fact
        cy.get(selectors.sidebarFactVal(6)).should('have.text', '0');
        cy.get(selectors.sidebarFactPeriod(6)).should('have.text', '3 months ending 10/31/2023');
        cy.get(selectors.sidebarFactFile(6))
            .should('not.have.text', 'Unknown Location')
            .should('have.text', 'nmex20231031_10q.htm');
    });

    it("should render 'D' badge labels for facts with dimensions", { defaultCommandTimeout: 24000 }, () => {
        cy.loadByAccessionNum('000143774923027411').then(() => {
            cy.get(selectors.searchHourglass).should('exist');
            cy.get(selectors.searchHourglass).should('not.be.visible');

            cy.get(selectors.factSidebarToggleBtn).click();
            cy.get(selectors.sidebarPaginationSelect).select('Page 5')
            cy.get(selectors.sidebarPaginationSelect).should('contain.text', 'Page 5')

            cy.get(selectors.sidebarFactBadge(63)).should('contain.text', "D") // Nested Array Segment
            cy.get(selectors.sidebarFactBadge(64)).should('contain.text', "D") // Nested Array Segment
            cy.get(selectors.sidebarFactBadge(65)).should('contain.text', "D") // Array Segment
        })
    })
});
