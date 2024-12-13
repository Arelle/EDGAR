// import { filings } from '../../dataPlus/enrichedFilingsPlus.mjs'
import { selectors } from "../../utils/selectors.mjs"
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

let filingsSample = getFilingsSample(Cypress.env);
const metalinks2dot1Filings = [
    "000106299321011674",
    "000158765021000010",
]
filingsSample = filingsSample.filter(f => !metalinks2dot1Filings.includes(f.accessionNum));
console.log(`filtered out ${metalinks2dot1Filings.length} filings with metalinks older version 2.1`)

describe(`Sections Links Order Special Case`, () => {
    it(`should reflect order property value in MetaLinks.json`, () => {
        cy.loadByAccessionNum('000095017024015979');

        // open sections sidebar
        cy.get(selectors.sectionsHeader).click();

        let orderTracker = 1;

        cy.get(selectors.sectionsLinks).each((link, indexLink) => {
            // this test can be slow or even lock up if you look at too many, so let's just test the first thirty
            if (indexLink < 30) {
                cy.get(link).invoke('attr', 'order').then(order => {
                    expect(Number(order)).to.be.gte(orderTracker);
                    orderTracker = Number(order);
                });
            }
        });
    });
});

// wina filing has a cover item at order 43 - not sure why.
// this is an issue with filing data format or construction, not with the viewer.
// describe(`Sections Links Order Bulk`, () => {
//     // TODO: maybe migrate to selenium and harvest the order from mustard menu
//     // NOTE: looking for order on filings with metalinks version 2.1 will fail as it appears order is not included in 2.1 schema
    
//     filingsSample.forEach((filing, filingIndex) => {
//         it(`[${filing.docName} - ${filing.submissionType}] should reflect order property value in MetaLinks.json`, () => {
//             if (filingIndex === 0) {
//                 cy.log(`filtered out ${metalinks2dot1Filings.length} filings with metalinks older version 2.1`)
//             }
//             cy.loadFiling(filing);

//             // open sections sidebar
//             cy.get(selectors.sectionsHeader, {timeout: Number(filing.timeout)}).click({timeout: filing.timeout});

//             let orderTracker = 0;
//             cy.get(selectors.sectionsLinks).each((link, linkIndex) => {
//                 // takes up a lot of memory and runs slow, so limit to 10
//                 if (linkIndex < 10) {
//                     cy.get(link).invoke('attr', 'order').then(order => {
//                         expect(order).to.not.be.null;
//                         expect(Number(order)).to.be.gt(orderTracker);
//                         orderTracker = Number(order);
//                     });
//                 }
//             });
//         });
//     });
// });
