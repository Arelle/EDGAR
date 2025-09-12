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

describe('Fact Attrs: Explicit Member', () => {
    it('2 Explicit Dimensions', () => {
        cy.loadByAccessionNum('000005114323000021')
        cy.get('#fact-identifier-6').click()

        /*

        xml data:
        <segment>
            <xbrldi:explicitMember dimension="us-gaap:StatementClassOfStockAxis">us-gaap:CommonStockMember</xbrldi:explicitMember>
            <xbrldi:explicitMember dimension="dei:EntityListingsExchangeAxis">exch:XCHI</xbrldi:explicitMember>
        </segment>

        json data (first one)
        {
            _attributes: {
                dimension: 'us-gaap:StatementClassOfStockAxis'
            }
            _text: "us-gaap:CommonStockMember"
        }

        display as:
        Class of Stock [Axis]               Common Stock [Member]
        Entity Listings, Exchange [Axis]    NEW YORK STOCK EXCHANGE, INC. [Member]

        */

        // explicit memb1
        cy.get('th[data-cy="Class of Stock [Axis]"]').should('contain.text', 'Class of Stock [Axis]');
        cy.get('div[data-cy="Class of Stock [Axis]-value"]').should('contain.text', 'Common Stock [Member]');

        // explicit memb 2
        cy.get('th[data-cy="Entity Listings, Exchange [Axis]"]').should('contain.text', 'Entity Listings, Exchange [Axis]');
        cy.get('div[data-cy="Entity Listings, Exchange [Axis]-value"]').should('contain.text', 'NEW YORK STOCK EXCHANGE, INC. [Member]');
    })

    it('Single Explicit Member on Fact', () => {
        cy.visit('/Archives/edgar/data/0000051143/000005114323000021/ibm-20230630.htm#fact-identifier-127');

        /*
        xml data:
        <segment>
            <xbrldi:explicitMember dimension="srt:ProductOrServiceAxis">us-gaap:TechnologyServiceMember</xbrldi:explicitMember>
        </segment>

        json data (first one)
        {
            _attributes: {
                
            }
            _text: 
        }

        display as:
        

        */

        // explicit memb1
        cy.get('th[data-cy="Product and Service [Axis]"]').should('contain.text', 'Product and Service [Axis]');
        cy.get('div[data-cy="Product and Service [Axis]-value"]').should('contain.text', 'Technology Service [Member]');
    })
})

describe('Fact Attrs: Implicit Member & Explicit Member', () => {
    it('Should show Implicit & Explicit Members', () => {
        // Archives/edgar/data/0000051143/000005114323000021/ibm-20230630.htm
        cy.loadByAccessionNum('000005114323000021')
        cy.get('#fact-identifier-38').click()

        cy.get('th[data-cy="Revenue, Remaining Performance Obligation, Expected Timing of Satisfaction, Start Date [Axis]"]')
            .should('contain.text', 'Revenue, Remaining Performance Obligation, Expected Timing of Satisfaction, Start Date [Axis]')
        cy.get('div[data-cy="Revenue, Remaining Performance Obligation, Expected Timing of Satisfaction, Start Date [Axis]-value"]')
            .should('contain.text', '2025-07-01')
        cy.get('div[data-cy="Statistical Measurement [Axis]-value"]').should('contain.text', 'Maximum [Member]')
    })
})

describe('Fact Attrs: Implicit Members', () => {
    it('should have an implicit (typed) attribute', () => {
        // /Archives/edgar/data/200245/000095010324012164/dp216618_exfilingfees.htm
        cy.loadByAccessionNum('000095010324012164');

        // /*
        // XML FILE
        // <segment>
        //     <xbrldi:typedMember dimension="ffd:OfferingAxis">
        //         <dei:lineNo>1</dei:lineNo>                              // VALUE SHOULD COME FROM HERE
        //     </xbrldi:typedMember>
        // </segment>

        // metalinks.json
        // "ffd_OfferingAxis": {
        //     "xbrltype": "stringItemType",
        //         "nsuri": "http://xbrl.sec.gov/ffd/2024",
        //             "localname": "OfferingAxis",
        //                 "presentation": [
        //                     "http://xbrl.sec.gov/ffd/role/document/feesOfferingTable"
        //                 ],
        //                 "lang": {
        //                      "en-us": {
        //                          "role": {
        //                              "label": "Offering [Axis]",         // LABEL SHOULD COME FROM HERE
        //     ...
        // }}}}
        // */
        cy.get('#fact-identifier-6').click();

        // cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > th').should('contain.text', 'Typed Member');
        // cy.get('#fact-modal-carousel-page-1 > tbody > tr:nth-child(6) > td > div').should('contain.text', '2025-07-01');
        cy.get('[data-cy="Offering [Axis]"]').should('contain.text', 'Offering [Axis]');
        cy.get('[data-cy="Offering [Axis]-value"]').should('contain.text', '1');
    })

    it('should have multiple (3) implicit (typed) attributes', () => {
        // /Archives/edgar/data/wh-sections/out/sbsef03exq-20231231.htm
        // cy.loadByAccessionNum('sbsef03');
        cy.visit('/Archives/edgar/data/wh-sections/out/sbsef03exq-20231231.htm');

        // /*
        // XML FILE
        // <segment>
        //     <xbrldi:typedMember dimension="sbs:SbsefTradgSysOrPltfmAxis">
        //      <sbs:SbsefTradgSysOrPltfmAxis.domain>1</sbs:SbsefTradgSysOrPltfmAxis.domain>
        //     </xbrldi:typedMember>
        //     <xbrldi:typedMember dimension="sbs:SbsefTradgSysOrPltfmOrdrTpAxis">
        //      <sbs:SbsefTradgSysOrPltfmOrdrTpAxis.domain>1</sbs:SbsefTradgSysOrPltfmOrdrTpAxis.domain>
        //     </xbrldi:typedMember>
        //     <xbrldi:typedMember dimension="sbs:SbsefTradgSysOrPltfmScnroAxis">
        //      <sbs:SbsefTradgSysOrPltfmScnroAxis.domain>1</sbs:SbsefTradgSysOrPltfmScnroAxis.domain>
        //     </xbrldi:typedMember>
        // </segment>

        cy.get('#fact-identifier-13').click();
        cy.get('th[data-cy="SBSEF Trading System or Platform [Axis]"]').should('contain.text', 'SBSEF Trading System or Platform [Axis]');
        cy.get('div[data-cy="SBSEF Trading System or Platform [Axis]-value"]').should('contain.text', '1');

        cy.get('th[data-cy="SBSEF Trading System or Platform Order Type [Axis]"]').should('contain.text', 'SBSEF Trading System or Platform Order Type [Axis]');
        cy.get('div[data-cy="SBSEF Trading System or Platform Order Type [Axis]-value"]').should('contain.text', '1');

        cy.get('th[data-cy="SBSEF Trading System or Platform Scenario [Axis]"]').should('contain.text', 'SBSEF Trading System or Platform Scenario [Axis]');
        cy.get('div[data-cy="SBSEF Trading System or Platform Scenario [Axis]-value"]').should('contain.text', '1');
    })
})          

describe('Fact Attrs: Scale', () => {
    it('should include a Scale attribute', () => {
        cy.loadByAccessionNum('000089418923007993');
        cy.get('#fact-identifier-41').click();
        cy.get('th[data-cy="Scale"]').should('contain.text', 'Scale');
        cy.get('div[data-cy="Scale-value"]').should('contain.text', 'Hundredths');
    })
})
describe('Fact Attrs: Scale', () => {
    it('should include a Scale attribute', () => {
        cy.loadByAccessionNum('000089418923007993');
        cy.get('#fact-identifier-41').click();
        cy.get('th[data-cy="Scale"]').should('contain.text', 'Scale');
        cy.get('[data-cy="Scale-value"]').should('contain.text', 'Hundredths');
    })
})

describe('Fact Attrs: Format', () => {
    it('should include a Format attribute', () => {
        //Archives/edgar/data/0000051143/000005114323000021/ibm-20230630.htm
        cy.loadByAccessionNum('000005114323000021');
        cy.get('#fact-identifier-6').click();
        cy.get('[data-cy="Format"]').should('contain.text', 'Format');
        cy.get('[data-cy="Format-value"]').should('contain.text', 'exchnameen');
    })
})

describe('Fact Attrs: More/Less Expansion', () => {
    it('should expand fact text', () => {
        cy.loadByAccessionNum('000121390021056659');
        cy.get(selectors.docTab1).click();
        cy.get('#fact-identifier-572').click();
        cy.get('[data-cy="Fact-value"]').invoke('height').should('be.lessThan', 50);
        cy.get(selectors.factExpandMoreLess).click();
        cy.get('[data-cy="Fact-value"]').invoke('height').should('be.greaterThan', 50);
        cy.get(selectors.factModalClose).click();
    })
})

describe('Fact Attribute period should show valid date on durational period date', () => {
    it('should include valid number of months when they are not on same month', () => {
        cy.loadByAccessionNum('000121390023047204')
        cy.get('#fact-identifier-3').click()
        cy.get('[data-cy="Period"]').should('contain.text', 'Period')
        cy.get('[data-cy="Period-value"]').should('contain.text', '12 months ending 12/31/2022')
    })

    it('should show valid format when start and end date are in the same month', () => {     
        cy.loadByAccessionNum('000080786323000002')
        cy.get('#fact-identifier-3').click()
        cy.get('[data-cy="Period"]').should('contain.text', 'Period')
        cy.get('[data-cy="Period-value"]').should('contain.text', '1/4/2023 - 1/4/2023')  
    })
})

describe('Member class should have all chars', () => {
    it('Class A Ordinary', () => {
        // /Archives/edgar/data/2023730/000095017025034611/ck0002023730-20241231.htm#fact-identifier-24
        cy.loadByAccessionNum('000095017025034611');
        cy.get('#fact-identifier-24').click();
        // cy.get('[data-cy="Member-value"]').should('contain.text', 'Units Each Consisting Of One Class A Ordinary Share [Member]')
        cy.get('th[data-cy="Class of Stock [Axis]"]').should('contain.text', 'Class of Stock [Axis]')
        cy.get('div[data-cy="Class of Stock [Axis]-value"]').should('contain.text', 'Units Each consisting of One Class A Ordinary Share [Member]')

    })
})
