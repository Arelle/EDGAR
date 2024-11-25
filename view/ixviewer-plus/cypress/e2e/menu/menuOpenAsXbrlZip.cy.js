import { selectors } from "../../utils/selectors.mjs";
import { readFilingData, getByAccNum } from "../../dataPlus/filingsFunnel";

// describe(`Menu open as zip`, () =>
// {
//     it("should download *something*", () =>
//     {
//         let filing = readFilingDataAccNum('000007169123000025')
//         cy.loadFiling(filing);
//         cy.get(selectors.menu).click()
//         cy.get('a[data-test="form-information-zip"]').should('exist')
//             .invoke('attr', 'href')
//             .should('contain', "xbrl.zip")
//             .then(href => {
//                 cy.request(href).then(resp => {
//                     expect(resp.status).to.equal(200)
//                     expect(resp.headers).to.have.property('content-type', 'application/zip')
//                 })
//             })
//     });
    
//     it("should gracefully handle non-standard filing URLs", () =>
//     {
//         //non-standard URLs, for example, do not have an accession number
//         cy.visit('/Archives/edgar/data/wh-sections/out/sbsef03exs-20231231.htm');
//         cy.get(selectors.menu).click();

//         //check for Version because it's unlikely to get removed from Menu
//         cy.get("#form-information-version").should('exist');
//         cy.get('#form-information-version').invoke('text').should('not.equal', "");
//     });
// });
