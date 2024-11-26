import { selectors } from '../../utils/selectors'
import * as convert from 'xml-js';
import { filings } from '../../dataPlus/standardFilings.js'
import { getFilingsSample, readFilingDataAccNum } from '../../dataPlus/filingsFunnel.js'
import { getFactAttrsFromAnchorProps } from '../../../src/ts/fetch-merge/merge-data-utils.ts'

let filingsSample = getFilingsSample(Cypress.env);

describe(`Sections | Links number in instance header`, () => {
    it(`should have 4 links`, () => {
        cy.visit('/Archives/edgar/data/wh-sections/out/sbsef03exi-20231231.htm')

        cy.get(selectors.sectionsHeader).click()
        cy.get(selectors.sectionActive).then(elem => {
            // get number in badge in ui
            let subSectionsText = elem.find('span.badge').text();
            subSectionsText = subSectionsText.replace('[', '');
            subSectionsText = subSectionsText.replace(']', '').trim();
            const subSectionsCount = Number(subSectionsText) || 0;

            // count subsection elements
            const subSectionsActual = elem.find('li.section-link').length || 0;

            // should be the same
            expect(subSectionsCount).to.eq(subSectionsActual);
        })
    })

    filingsSample.forEach((filing) => {
        it(`badge number should match actual number of links in section`, () => {
            cy.loadFiling(filing)

            cy.get(selectors.sectionsHeader, {timeout: Number(filing.timeout)}).click({timeout: Number(filing.timeout)})
            // cy.wait(200)
            // cy.get(selectors.sectionHeaderActive).click()
            cy.get(selectors.sectionActive, { timeout: Number(filing.timeout) }).then(elem => {
                // get number in badge in ui
                let subSectionsText = elem.find('span.badge').text();
                subSectionsText = subSectionsText.replace('[', '');
                subSectionsText = subSectionsText.replace(']', '').trim();
                const subSectionsCount = Number(subSectionsText) || 0;

                expect(subSectionsCount).to.gt(0);

                // count subsection elements
                const subSectionsActual = elem.find('li.section-link').length || 0;

                // should be the same
                expect(subSectionsCount).to.eq(subSectionsActual);
            })
        })
    })
})

/*
//This one needs work - We really need to figure out how to know what the correct number of sections should be
describe.skip(`Sub sections quantity should match number derived from FilingsSummary.xml`, () => {
    filingsSample.forEach((filing) => {
        it(`${filing.docName} ${filing.submissionType}`, () => {
            cy.loadFiling(filing)
            cy.requestFilingSummaryPerHost(filing).then(resp => {
                // const summaryBody = JSON.parse(convert.xml2json(resp.body, { compact: true }));
                // console.log('Reports', summaryBody.FilingSummary.MyReports.Report)
                // summaryBody.FilingSummary.MyReports.Report.forEach(r => {
                //     console.log(r.ShortName._text)
                // })
                let sections = JSON.parse(convert.xml2json(resp.body, { compact: true })).FilingSummary.MyReports.Report;

                sections = sections.filter(section => section && section.MenuCategory && section.Position && section.ShortName && section._attributes)
                const sectionCont = sections.length;
                cy.get(selectors.sectionsHeader).click({ timeout: filing.timeout })

                // We don't have a good source of truth for section link count
                // Added field filing.expectedSectionCountCorrection to standardFilings.js, but this file is generated so will have to be maintained
                // manually after each new generation.
                // accession numbers that need this are in addendum.json
                cy.get('[id="sections-menu"]')
                    .find(selectors.sectionsLinks)
                    .should('have.length', sectionCont + Number(filing.expectedSectionCountCorrection) || 0)
            })
        })
    })


    it(`This filing should have 3 sections`, () => {
        // http://localhost:3000/ix.xhtml?doc=/Archives/edgar/data/0000894189-23-007395/ck0001616668-20221031.htm

        cy.getByAccNum('000158765021000010')

        cy.requestFilingSummaryPerHost(filing).then(resp => {
            cy.log(resp.body)
            let sections = JSON.parse(convert.xml2json(resp.body, { compact: true })).FilingSummary.MyReports.Report;

            sections = sections.filter(section => section && section.MenuCategory && section.Position && section.ShortName && section._attributes)
            const sectionCont = sections.length;

            cy.get(selectors.sectionsHeader).click({timeout: filing.timeout})

            cy.get('[id="sections-menu"]')
                .find(selectors.sectionsLinks)
                .should('have.length', sectionCont)
        })
    })
    
    it(`WH filings should have the right number of sections in UI`, () => {
        cy.loadByIndex(223);

        cy.get(selectors.sectionsHeader).click();

        cy.get('[id="sections-menu"]')
            .find(selectors.sectionsLinks)
            .should('have.length', 25);
    });

});
*/
