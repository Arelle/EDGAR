import { selectors } from "../../utils/selectors.mjs"
import { search, assertSearchResultCount } from "../../utils/utils.mjs"

describe(`Instance open tab should overlap the modal`, () => {
    it(`should have text labels`, () => {
        cy.visit('/Archives/edgar/data/1314610/000131461024800819/EXFILINGFEES.htm')
        cy.get(selectors.instanceDropdown).click()
        cy.get(selectors.instanceDropdown).should('be.visible')
        cy.get(selectors.instanceDropdownOptions).each(opt => {
            cy.get(opt).should('not.have.text', '')
        })
    })
})

describe("Instance switching", () => {
    //Note: loading a specific instance is *vital* to the function of these tests
    const multiDoc = "/Archives/edgar/data/1314610/000131461024800819/afd06-20230922.htm";
    const singleDoc = "/Archives/edgar/data/1314610/000131461024800819/EXFILINGFEES.htm";
    

    it("Facts should be highlighted on-load", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.searchHourglass).should("not.be.visible");

        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factSidebar).should('be.visible');

        cy.visit(singleDoc);
        cy.waitForAppReady();
        cy.get("#fact-identifier-1").click();
        cy.get(selectors.factSidebar).should('be.visible');
    });

    it("Facts should be highlighted after switching instance", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.searchHourglass).should("not.be.visible");

        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();
        cy.get("#fact-identifier-1").click();
        cy.get(selectors.factSidebar).should('be.visible');

        cy.visit(singleDoc);
        cy.waitForAppReady();
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();
        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factSidebar).should('be.visible');
    });

    it("Facts should be highlighted after switching instance (2nd load)", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();

        // switch instance
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        // swtich back
        cy.waitForAppReady();
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();

        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factSidebar).should('be.visible');
    });

    it("Facts should be highlighted after switching instance (2nd load) -- mult-doc", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();

        cy.get("#tabs-container a.nav-link:not(.active)").click();  //switch doc tab
        cy.waitForAppReady();
        cy.get("#fact-identifier-5").click();
        cy.get(selectors.factSidebar).should('be.visible');

        //switch instance
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();
        // then switch back
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();

        //switch doc tab
        cy.get("#tabs-container a.nav-link:not(.active)").click();
        cy.waitForAppReady();
        cy.get("#fact-identifier-5").click();
        cy.get(selectors.factSidebar).should('be.visible');
    });

    it("Back button should go to prev instance after instance change", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();

        cy.url().should('include', 'afd06-20230922.htm');
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.url().should('include', 'EXFILINGFEES.htm');
        cy.go('back')
        cy.url().should('include', 'afd06-20230922.htm');
    });

    it("Back button should go to both prev instances after 2 instance changes", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();

        cy.url().should('include', 'afd06-20230922.htm');
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();

        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.url().should('include', 'afd06-20230922.htm');
        cy.go('back')
        cy.url().should('include', 'EXFILINGFEES.htm');
        cy.go('back')
        cy.url().should('include', 'afd06-20230922.htm');
    });

    it("Facts should be searchable after switching instances", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.searchHourglass).should("not.be.visible");

        for (let i = 0; i < 2; i++) {
            search("smaller")
            assertSearchResultCount(2)

            cy.get('#fact-identifier-10')
                .should('have.attr', 'highlight-fact', 'true')

            cy.get(selectors.instanceDropdown).click();
            cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
            cy.waitForAppReady();


            search("457")
            assertSearchResultCount(1)

            cy.get('#fact-identifier-11')
                .should('have.attr', 'highlight-fact', 'true')

            cy.get(selectors.instanceDropdown).click();
            cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
            cy.waitForAppReady();
        }
    });
});

