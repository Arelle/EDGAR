import { selectors } from "../../utils/selectors.mjs"

describe(`Instance open tab should overlap the modal`, () => {
    it(`Instance open tab should overlap the modal  and z-index of instance is higher than modal`, () => {
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
})


describe("Instance switching", () =>
{
    //Note: loading a specific instance is *vital* to the function of these tests
    const multiDoc = "/Archives/edgar/data/1314610/000131461024800819/afd06-20230922.htm";
    const singleDoc = "/Archives/edgar/data/1314610/000131461024800819/EXFILINGFEES.htm";

    it("Facts should be highlighted on-load", () =>
    {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factModal).should('be.visible');
        
        cy.visit(singleDoc);
        cy.get("#fact-identifier-1").click();
        cy.get(selectors.factModal).should("be.visible");
    });

    it("Facts should be highlighted after switching instance", () =>
    {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get("#fact-identifier-1").click();
        cy.get(selectors.factModal).should("be.visible");
        
        cy.visit(singleDoc);
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factModal).should("be.visible");
    });
    
    it("Facts should be highlighted after switching instance (2nd load)", () =>
    {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");
        
        //switch, then switch back
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();

        cy.get("#fact-identifier-4").click();
        cy.get(selectors.factModal).should("be.visible");
    });

    it("Facts should be highlighted after switching instance (2nd load) -- mult-doc", () =>
    {
        cy.visit(multiDoc);
        cy.get("#loading-animation").should("not.be.visible");

        cy.get("#tabs-container a.nav-link:not(.active)").click();  //switch doc tab
        cy.get("#fact-identifier-5").click();
        cy.get(selectors.factModal).should("be.visible");

        
        //switch, then switch back
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();

        cy.get("#tabs-container a.nav-link:not(.active)").click();  //switch doc tab
        cy.get("#fact-identifier-5").click();
        cy.get(selectors.factModal).should("be.visible");
    });
});
