import { selectors } from "../../utils/selectors"

describe(`Fact Attrs: Sign`, () => {
    it('should include a negative attribute for negative facts', () => {
        cy.loadByAccessionNum("000121390021056659")
        // switch docs
        cy.get('a[data-cy="inlineDocTab-1"]').click()
        cy.get('#fact-identifier-112').click()

        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(8) > th').should('contain.text', 'Sign')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(8) > td > div').should('contain.text', 'Negative')
    })
})

describe('Fact Attrs: Axis, Member, Explicit Member', () => {
    it('should include all 3 attrs', () => {
        cy.loadByAccessionNum('000005114323000021')
        cy.get('#fact-identifier-6').click()

        //cy.get(selectors.factAttrsBody).should('contain.text', 'Axis')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(4) > th').should('contain.text', 'Axis')
        //cy.get(selectors.factAttrsBody).should('contain.text', 'US-GAAP Statement Class Of Stock [Axis]')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(4) > td > div').should('contain.text', 'US-GAAP Statement Class Of Stock [Axis]')
        //cy.get(selectors.factAttrsBody).should('contain.text', 'DEI Entity Listings Exchange [Axis]')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(4) > td > div').should('contain.text', 'DEI Entity Listings Exchange [Axis]')
        
        // cy.get(selectors.factAttrsBody).should('contain.text', 'Member')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(5) > th').should('contain.text', 'Member')
        // cy.get(selectors.factAttrsBody).should('contain.text', 'US-GAAP Common Stock [Member]')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(5) > td > div').should('contain.text', 'US-GAAP Common Stock [Member]')
        // cy.get(selectors.factAttrsBody).should('contain.text', 'EXCH XNYS')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(5) > td > div').should('contain.text', 'EXCH XNYS')

        // cy.get(selectors.factAttrsBody).should('contain.text', 'Explicit Member')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > th').should('contain.text', 'Explicit Member')
        // cy.get(selectors.factAttrsBody).should('contain.text', 'us-gaap:CommonStockMember')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > td > div').should('contain.text', 'us-gaap:CommonStockMember')
        // cy.get(selectors.factAttrsBody).should('contain.text', 'exch:XNYS')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > td > div').should('contain.text', 'exch:XNYS')
    })
})

describe('Fact Attrs: Implicit Member', () => {
    it('should have an implicit (typed) attribute', () => {
        //Archives/edgar/data/0000051143/000005114323000021/ibm-20230630.htm
        cy.loadByAccessionNum('000005114323000021')
        cy.get('#fact-identifier-38').click()

        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > th').should('contain.text', 'Typed Member')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > td > div').should('contain.text', '2025-07-01')
    })
})

describe('Fact Attrs: Scale', () => {
    it('should include a Scale attribute', () => {
        cy.loadByAccessionNum('000089418923007993')
        cy.get('#fact-identifier-41').click()
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(8) > th').should('contain.text', 'Scale')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(8) > td > div').should('contain.text', 'Hundredths')
    })
})

describe('Fact Attrs: Format', () => {
    it('should include a Format attribute', () => {
        //Archives/edgar/data/0000051143/000005114323000021/ibm-20230630.htm
        cy.loadByAccessionNum('000005114323000021')
        cy.get('#fact-identifier-6').click()
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(8) > th').should('contain.text', 'Format')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(8) > td > div').should('contain.text', 'exchnameen')
    })
})

describe('Fact Attrs: More/Less Expansion', () => {
    it('should include an Format attribute', () => {
        cy.loadByAccessionNum('000121390021056659')
        cy.get(selectors.docTab1).click()
        cy.get('#fact-identifier-572').click();
        cy.get('div[class^="word-break fact-value-modal position-relative collapse"]').invoke('height').should('equal',33);
        cy.get(selectors.factExpandMoreLess).click();
        cy.get('div[class^="word-break fact-value-modal position-relative collapse show"]').invoke('height').should('be.greaterThan',33);
        cy.get(selectors.factModalClose).click()
    })
})

describe('Fact Attribute period should show valid date on durational period date', () => {

    it('should include valid number of months when they are not on same month', () => {
        cy.loadByAccessionNum('000121390023047204')
        cy.get('#fact-identifier-3').click()
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(3) > th').should('contain.text', 'Period')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(3) > td > div').should('contain.text', '12 months ending 12/31/2022')
    })

    it('should show valid format when start and end date are in the same month', () => {     
        cy.loadByAccessionNum('000080786323000002')
        cy.get('#fact-identifier-3').click()
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(3) > th').should('contain.text', 'Period')
        cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(3) > td > div').should('contain.text', '1/4/2023 - 1/4/2023')  
    })
})