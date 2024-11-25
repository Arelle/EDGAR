import { readFilingDataAccNum } from "../../dataPlus/filingsFunnel";

const filing = readFilingDataAccNum('000080786323000002')
describe(`Fact Element in ${filing.docName} ${filing.formType || filing.submissionType}`, () => {
    it('has all attributes needed for interaction', () => {
        cy.loadFiling(filing)

        // Check text val and attributes of documentType fact 8-K
        cy.get(`[id="fact-identifier-2"]`, { timeout: Number(filing.timeout) }).should('have.text', '8-K')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'ix', "id3VybDovL2RvY3MudjEvZG9jOjcwZDMwN2VlODY3MjRiMDc5NzkzM2JiYzRjMTEzYmExL3NlYzo3MGQzMDdlZTg2NzI0YjA3OTc5MzNiYmM0YzExM2JhMV8xL2ZyYWc6OGQxYjdmOTU3YTYwNDJjYjk1NTY0MzY1MmY4YzAwM2MvdGV4dHJlZ2lvbjo4ZDFiN2Y5NTdhNjA0MmNiOTU1NjQzNjUyZjhjMDAzY180NzU4_01d953c1-45aa-44cc-bc0b-80ba5f70b1a2")
        cy.checkAttr(`[id="fact-identifier-2"]`, 'contextref', 'id8b4fb87d8d84f85bf46863e6314316e_D20230104-20230104')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'name', 'dei:DocumentType')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'tabindex', '18')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'enabled-fact', 'true')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'continued-fact', 'false')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'selected-fact', 'false')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'hover-fact', 'false')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'inside-table', 'false')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'listeners', 'true')
        cy.checkAttr(`[id="fact-identifier-2"]`, 'highlight-fact', 'false')
    })
})
