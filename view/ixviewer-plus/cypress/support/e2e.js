// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import { selectors } from '../utils/selectors.mjs'
import { filings } from '../dataPlus/standardFilings.js'
import { getByAccessionNum } from '../dataPlus/filingsFunnel.js'

// Alternatively you can use CommonJS syntax:
// require('./commands')

Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false
})

Cypress.Commands.add('loadByAccessionNum', (accessionNum) => {
    //This function invokes the 'getByAccessionNum' function over in filingsFunnel.js
    //Did it this way so we can keep this function usable by standalone scripts outside Cypress
    let filingObj = getByAccessionNum(accessionNum)
    if (filingObj) cy.loadFiling(filingObj);
})

//Sends Cypress browser to the filing with index X
Cypress.Commands.add('loadByIndex', (index) => {
    let filing = filings.find(filing => filing.index === index.toString())
    if (filing) cy.loadFiling(filing);
    else { console.error(`no filing matching accession number ${accessionNum}`) }
})

Cypress.Commands.add('loadFiling', (filing) => {
    return cy.visit(filing.docPath).then(browser => {
        //Standard mode of waiting until the filing has completely loaded
        cy.get(selectors.factCountClock, { timeout: Number(filing.timeout) }).should('not.exist');
    })
})

Cypress.Commands.add('openSettings', () => {
    cy.get(selectors.menu).click({ force: true })
    cy.get(selectors.settings).click({ force: true })
})

Cypress.Commands.add('visitHost', (filing) => {
    // give app 15 secs per 1000 facts to load.
    let timeout = 15000;
    if (filing?.factCount > 1000 && filing.timeout) {
        timeout = filing.timeout;
    }
    return cy.visit()
});

Cypress.Commands.add('requestFilingSummaryPerHost', (filing) => {
    let FilingSummaryUrl
    FilingSummaryUrl = (Cypress.config('baseUrl') + filing.docPath)
    cy.prepUrl(FilingSummaryUrl).then(FilingSummaryUrl => {
        FilingSummaryUrl = FilingSummaryUrl.replace(filing.docName + '.htm', 'FilingSummary.xml')
        cy.request(FilingSummaryUrl)
    })
})

Cypress.Commands.add('requestMetaLinksPerHost', (filing) => {
    let MetaLinksUrl
    MetaLinksUrl = (Cypress.config('baseUrl') + filing.docPath)
    cy.prepUrl(MetaLinksUrl).then(MetaLinksUrl => {
        MetaLinksUrl = MetaLinksUrl.replace(filing.docName + '.htm', 'MetaLinks.json')
        cy.request(MetaLinksUrl)
    })
})

Cypress.Commands.add('prepUrl', (url) => {
    /*
    Replacing all these bits from the IXViewer URL when loading other docs like filingSummary or metaLinks.
    Depending on what domain you're testing, you will likely have one or more of these.
    They are essential for IXViewer, but must be removed for these other related docs.
    */
    url = url.replace('../..', '')
    url = url.replace('/ix.xhtml?doc=.', '')
    url = url.replace('/ix.xhtml?doc=', '')
    url = url.replace('/ix?doc=', '')
    url = url.replace('/iy?doc=', '')
    url = url.replace('/ix3/ixviewer3', '')
    url = url.replace('/ixviewer-ix-dev', '')
    return url;
})

Cypress.Commands.add('checkAttr', (selector, attrName, attrVal) => {
    cy.get(selector)
        .invoke('attr', attrName)
        .should('eq', attrVal)
})

Cypress.Commands.add('onClickShouldScrollDown', ($clickTarget) => {
    // find scroll pos in viewer elem
    let prevScrollPos = 0;
    cy.get('div[id="dynamic-xbrl-form"]', { timeout: 2000 }).then($viewerElem => {
        prevScrollPos = $viewerElem.scrollTop();
        cy.get($clickTarget).click().then(() => {
            cy.expect($viewerElem.scrollTop()).to.be.gt(prevScrollPos)
            prevScrollPos = $viewerElem.scrollTop()
        })
    })
})

Cypress.Commands.add('onClickShouldScrollUp', ($clickTarget) => {
    // find scroll pos in viewer elem
    let prevScrollPos = 0;
    cy.log('onClickShouldScrollUp')
    cy.get('div[id="dynamic-xbrl-form"]', { timeout: 2000 }).then($inlineDocElem => {
        prevScrollPos = $inlineDocElem.scrollTop();
        cy.get($clickTarget).click().then(() => {
            cy.expect($inlineDocElem.scrollTop()).to.be.lt(prevScrollPos)
            prevScrollPos = $inlineDocElem.scrollTop()
        })
    })
})

// fails after 5 or so breaks
Cypress.Commands.add('onClickShouldScrollDownRecursive', ($targetCollection, clickSelector) => {
    // find scroll pos in viewer elem
    // let prevScrollPos = 0;
    cy.log('2 onClickShouldScrollDown')
    cy.get('div[id="dynamic-xbrl-form"]', { timeout: 2000 }).then($viewerElem => {
        let prevScrollPos = $viewerElem.scrollTop();
        cy.log('3 scrollTop')
        cy.wait(2000)
        // cy.screenshot()
        cy.get(clickSelector).then(($clickTarget) => {
            cy.wait(2000)
            cy.log('$clickTarget', $clickTarget)
            cy.wrap($clickTarget).click().then(() => {
                cy.wait(2000)

                cy.log('4 expect')

                cy.expect($viewerElem.scrollTop()).to.be.gt(prevScrollPos)
                // prevScrollPos = $viewerElem.scrollTop()
                if ($targetCollection.length > 1) {
                    cy.wait(2000)
                    cy.log('5 recursive!')
                    cy.onClickShouldScrollDownRecursive($targetCollection.slice(1), clickSelector)
                }
            })
        })
    })
})

// fails the same way
Cypress.Commands.add('onClickShouldScrollDownFlat', ($clickTarget, clickSelector) => {
    // find scroll pos in viewer elem
    let prevScrollPos = 0;
    cy.get('div[id="dynamic-xbrl-form"]', { timeout: 2000 }).then($viewerElem => {
        prevScrollPos = $viewerElem.scrollTop();
        cy.get(clickSelector).click().then(() => {
            cy.expect($viewerElem.scrollTop()).to.be.gt(prevScrollPos)
            // prevScrollPos = $viewerElem.scrollTop()
        })
    })
})