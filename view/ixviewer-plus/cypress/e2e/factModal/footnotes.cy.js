import { selectors } from "../../utils/selectors"

describe('Fact Footnotes', () => {
    it('Ibm footnote 856 should show text', () => {
        cy.visit('/Archives/edgar/data/0000051143/000005114323000021/ibm-20230630.htm#fact-identifier-856')
        cy.get(selectors.modalFootnoteVal).should('contain.text', 'Includes immaterial cash flows from discontinued operations.')
    });

    it('vpip footnote 2920 should show text', () => {
        cy.visit('/Archives/edgar/data/no-cik/0001437749-23-027411/vpip20230630_20f.htm#fact-identifier-2920')
        cy.get(selectors.modalFootnoteVal).should('contain.text', 'The $0.4 million of transaction costs incurred in the year ended June 30, 2023 (year ended June 30, 2022: $0.1 million; year ended June 30, 2021: $2.8 million) relate primarily to capital raises on Nasdaq.')
    });

    it('vpip footnote 1923 should NOT show text', () => {
        cy.visit('/Archives/edgar/data/no-cik/0001437749-23-027411/vpip20230630_20f.htm#fact-identifier-1923')
        cy.get('[data-cy="Tag-value"]').should('exist')
        cy.get(selectors.modalFootnoteVal).should('not.exist')
    });
})