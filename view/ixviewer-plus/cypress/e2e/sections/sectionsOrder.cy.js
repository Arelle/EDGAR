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
        cy.visitFiling("1045609", "000095017024015979", `pld-20230331.htm`);

        // open sections sidebar
        cy.get(selectors.sectionsHeader).click();
        cy.wait(2);

        let orderTracker = 1;

        cy.get(selectors.sectionsLinks).each((link, indexLink) => {
            // this test can be slow, so just check first 35.
            if (indexLink < 35) {
                cy.get(link).invoke('attr', 'order').then(order => {
                    expect(Number(order)).to.be.gte(orderTracker);
                    orderTracker = Number(order);
                    cy.wait(2);
                });
            }
        });
    });
});

describe(`Sections Links Order Bulk`, () => {
    // TODO: maybe migrate to selenium and harvest the order from mustard menu
    // NOTE: looking for order on filings with metalinks version 2.1 will fail as it appears order is not included in 2.1 schema
    
    filingsSample.forEach((filing, filingIndex) => {
        it(`[${filing.docName} - ${filing.submissionType}] should reflect order property value in MetaLinks.json`, () => {
            if (filingIndex === 0) {
                cy.log(`filtered out ${metalinks2dot1Filings.length} filings with metalinks older version 2.1`)
            }
            cy.visitHost(filing);

            // open sections sidebar
            cy.get(selectors.sectionsHeader, {timeout: filing.timeout}).click({timeout: filing.timeout});

            let orderTracker = 0;
            cy.get(selectors.sectionsLinks).each((link, linkIndex) => {
                // takes up a lot of memory and runs slow, so limit to 10
                if (linkIndex < 10) {
                    cy.get(link).invoke('attr', 'order').then(order => {
                        expect(order).to.not.be.null;
                        expect(Number(order)).to.be.gt(orderTracker);
                        orderTracker = Number(order);
                    });
                }
            });
        });
    });
});
