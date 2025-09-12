import { selectors } from "../../utils/selectors.mjs"

describe(`Instance open tab should overlap the modal`, () => {
    it(`should overlap the modal`, () => {
        cy.visit('/Archives/edgar/data/1314610/000131461024800819/EXFILINGFEES.htm')
        let zindexModal = 0
        let zindexInstance = 0
        cy.get("#fact-identifier-1").click()
        cy.get(selectors.factModal).then($el => {
            zindexModal = Number(window.getComputedStyle($el[0]).getPropertyValue('z-index'))
            cy.get(selectors.instanceDropdown).click()
            cy.get(selectors.instanceDropdown).should('be.visible')
            cy.get(selectors.instanceDropDownMenu).then($el => {
                zindexInstance = Number(window.getComputedStyle($el[0]).getPropertyValue('z-index'))
                cy.expect(zindexInstance).to.be.gte(zindexModal)
            })
        })
    })
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
        cy.get(selectors.searchHourglass).should("not.be.visible");

        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factModal).should('be.visible');

        cy.visit(singleDoc);
        cy.wait(500)
        cy.get("#fact-identifier-1").click();
        cy.get(selectors.factModal).should("be.visible");
    });

    it("Facts should be highlighted after switching instance", () => {
        cy.visit(multiDoc);
        cy.get(selectors.searchHourglass).should("not.be.visible");

        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.wait(500)
        cy.get("#fact-identifier-1").click();
        cy.get(selectors.factModal).should("be.visible");

        cy.visit(singleDoc);
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.wait(500)
        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factModal).should("be.visible");
    });

    it("Facts should be highlighted after switching instance (2nd load)", () => {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        // switch instance
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        // swtich back
        cy.get("#loading-animation").should("not.be.visible");
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();

        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factModal).should("be.visible");
    });

    it("Facts should be highlighted after switching instance (2nd load) -- mult-doc", () => {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        cy.get("#tabs-container a.nav-link:not(.active)").click();  //switch doc tab
        cy.get("#loading-animation").should("not.be.visible");
        cy.get("#fact-identifier-5").click();
        cy.get(selectors.factModal).should("be.visible");

        //switch instance
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get("#loading-animation").should("not.be.visible");
        // then switch back
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get("#loading-animation").should("not.be.visible");

        //switch doc tab
        cy.get("#tabs-container a.nav-link:not(.active)").click();  
        cy.get("#loading-animation").should("not.be.visible");
        cy.get("#fact-identifier-5").click();
        cy.get(selectors.factModal).should("be.visible");
    });

    it("Back button should go to prev instance after instance change", () => {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        cy.url().should('include', 'afd06-20230922.htm');
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.url().should('include', 'EXFILINGFEES.htm');
        cy.go('back')
        cy.url().should('include', 'afd06-20230922.htm');
    });

    it("Back button should go to both prev instances after 2 instance changes", () => {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        cy.url().should('include', 'afd06-20230922.htm');
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get("#loading-animation").should("not.be.visible");

        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.url().should('include', 'afd06-20230922.htm');
        cy.go('back')
        cy.url().should('include', 'EXFILINGFEES.htm');
        cy.go('back')
        cy.url().should('include', 'afd06-20230922.htm');
    });
});
