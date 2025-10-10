import { selectors } from "../../utils/selectors"
import { getFilingsSample } from '../../dataPlus/filingsFunnel.js'

// only testing 1 filing as these tests seem redundant, as does running them on 20+ filings.
let filingsSample = getFilingsSample(Cypress.env).slice(0, Cypress.env('limitOfFilingsToTest'));

let singleFiling = { "accessionNum": "000121390021056659-991", "timeout": "15000", "docPath": "/Archives/edgar/data/1517396/000121390021056659/stratasys-991.htm" }

describe("UI Basic checkup", () => {

    /*
    This test isn't working.
    The attempt was to make a test that scrolls to the bottom, then clicks the Previous Page button,
    then demonstrates that the page has scrolled up some amount.
    It's very tricky to test scroll behavior.
    I suspect it's doable, but I need to figure out how to make it work.
    */
    //    it("Visibility Experiment", () => {
    //        let testScroll
    //        cy.viewport(1920, 1080);
    //        cy.loadFiling(singleFiling)
    //        cy.get(selectors.xbrlForm).scrollTo('bottom')
    //        .then(() => {
    //            cy.window().then((win) => {
    //                //cy.get(window).should('have.property', 'scrollY')
    //                //let bottomScroll = Number(cy.window().its('scrollY'))
    //                console.log(Number(cy.window().its('scrollY')))
    //                cy.wrap().then(() => {
    //                    console.log(bottomScroll)
    //                    cy.get(selectors.goToPrevInlinePage).click()
    //                    .then(() => {
    //                        //testScroll = cy.window().its('scrollY')
    //                        //console.log(win.its('scrollY'))
    //                        cy.window().then((win) => {
    //                            console.log(bottomScroll)
    //                            cy.window().its('scrollY').should('be.lt', bottomScroll)
    //                        })
    //                    })
    //                })
    //            })
    //        })
    //    })

    //    it.skip("Verify function of First Page button", () => {
    //    // TODO : Find a way to determine overall height of page so we can tell if it's scrolling properly
    //        cy.viewport(1920, 1080);
    //        cy.loadFiling(singleFiling)
    //        //let maxHeight = cy.findMaxHeight()
    //        //console.log("Max Height: "+maxHeight)
    //        cy.get(selectors.goToBtnOfDoc).click()
    //        .then(() => {
    //            cy.document().then((doc) => {
    //            })
    //            cy.window().then((win) => {
    //                cy.get(selectors.xbrlForm).then((xbrl) => {
    //                    //console.log(xbrl.clientHeight)
    //                })
    //
    //                //console.log(win.scrollMaxY)
    //                cy.window.its('scrollY').should('be.gte', 0)
    //            })
    //        })
    //    })

    filingsSample.forEach((filing) => {

        it("Menu Dropdown and Info Modal: " + `${filing.accessionNum}`, () => {
            // This test will grab a sample of filings and will ensure that the Version line of the menu dropdown is correct
            // Then it will open the Info modal and check that the basic data fields are present.
            cy.loadFiling(filing)
            // Click the Menu button, opening the Menu dropdown
            cy.get(selectors.menuButton).click().then(() => {
                cy.get(selectors.menuDropdown).should('be.visible').within(($dropdown) => {
                    // Checking for the existence of the buttons in the menu dropdown
                    // These tests will fail if we change the specific wording of these buttons
                    cy.get(selectors.menuInfoButton).should('contain.text', 'Information')
                    cy.get(selectors.menuXBRLInstance).should('contain.text', 'Save XBRL Instance')
                    cy.get(selectors.menuXBRLZip).should('contain.text', 'Save XBRL Zip File')
                    cy.get(selectors.menuHTML).should('contain.text', 'Open as HTML')
                    cy.get(selectors.menuSettings).should('contain.text', 'Settings')
                    cy.get(selectors.menuHelp).should('contain.text', 'Help')
                    // Version line should read "Version: XX.X" and may or may not include the word "plus"
                    cy.get(selectors.menuVersion).invoke('text').should('match', /Version: [2-9][0-9]\.[0-9].*/);
                })

                // Click the Info button, opening the info modal
                cy.get(selectors.menuInfoButton).click().then(() => {
                    // Looking thru the rows on the modal, looking for the relevant data headers
                    cy.get(selectors.infoModal).within(($list) => {
                        cy.get('th').should('contain.text', 'Company Name')
                        cy.get('th').should('contain.text', 'Central Index Key')
                        cy.get('th').should('contain.text', 'Document Type')
                        cy.get('th').should('contain.text', 'Period End Date')
                        cy.get('th').should('contain.text', 'Amendment/Description')
                        // The fields "Fiscal Year/Period Focus" and "Current Fiscal Year End" are situational
                        // These rows may or may not be present in a given filing, and so they're omitted from this test.

                    })
                })
            })
        })

        it("Open Sections Sidebar and check contents, then close the sidebar: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            // Opens Sections Sidebar
            cy.get(selectors.sectionsHeader).click()
            // Sidebar should be visible
            cy.get(selectors.sectionsSidebar).should('be.visible').then(() => {
                // Sidebar header should say 'Tagged Sections'
                cy.get(selectors.sectionsSidebar + "> div > div > h5").should('be.visible').and('have.text', 'Tagged Sections')
                // The actual sections should be displayed
                cy.get(selectors.taggedSections).should('be.visible')
                // The button to close the sidebar should be displayed
                cy.get(selectors.closeSectionsBtn).should('be.visible').click().then(() => {
                    // The button to close the sidebar should be functional
                    cy.get(selectors.sectionsSidebar).should('not.be.visible')
                })
            })
        })

        it("Open search options, check they're all there, then close it again: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            // Click the Search Option button should open the Search Option dropdown
            cy.get(selectors.searchSettingsGear).should('be.visible').click().then(() => {
                // Checking that all search options are present
                cy.get(selectors.searchSettingsDropdown).should('be.visible').within(($list) => {
                    cy.get('span').should('be.visible').and('contain.text', 'Include Fact Name')
                    cy.get('span').should('be.visible').and('contain.text', 'Include Fact Name')
                    cy.get('span').should('be.visible').and('contain.text', 'Include Fact Content')
                    cy.get('span').should('be.visible').and('contain.text', 'Include Labels')
                    cy.get('span').should('be.visible').and('contain.text', 'Include Definitions')
                    cy.get('span').should('be.visible').and('contain.text', 'Include Dimensions')
                })
                // Clicking the Search Option button again should close the dropdown
                cy.get(selectors.searchSettingsGear).click().then(() => {
                    cy.get(selectors.searchSettingsDropdown).should('not.be.visible')
                })
            })
        })

        it("Enter text in the search field, get suggestions, then click the Clear Search button: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get(selectors.searchHourglass).should('not.be.visible');
            cy.get(selectors.search).click().then(() => {
                // Enter text into the search bar
                cy.get(selectors.search).type("Document Type")
                // Should be getting search suggestions
                cy.get(selectors.searchSuggestBox).should('be.visible').then(() => {
                    // Clicking the Clear Search button should clear the search bar and remove the search suggestions
                    cy.get(selectors.clearSearchBtn).click()
                    cy.get(selectors.searchSuggestBox).should('not.be.visible')
                    cy.get(selectors.search).should('have.value', '')
                })
            })
        })
        /* TODO This test does not work yet.
        Find a universal search term and a way to ensure it's highlighting facts
        First I tried searching for "Document Type", but some filings have that as a hidden fact
        Perhaps try "Address" or "$" or "E" or something.
        It's got to be a search term that will return a non-hidden fact in any filing we might throw at it.*/

        it.skip("Enter text in the search field and execute a search: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            // Enter "Document Type" into the search bar
            //cy.get(selectors.search).type("Document Type").then(() => {
            cy.get(selectors.search).type("E ").then(() => {
                //cy.get(selectors.search).type("date").then(() => {
                // Click the Search button
                cy.get(selectors.submitSearchButton).click()
                // The fact should be highlighted
                //cy.get('[name="dei:DocumentType"]').should('have.attr', 'highlight-fact', 'true')
                //                cy.get('[name="Date"]').should('have.attr', 'highlight-fact', 'true')
                //                cy.get('[id^="fact-identifier"]').each(($fact, index, $list) => {
                //                    cy.wrap($fact).should('have.attr', 'highlight-fact', 'true')
                //                })
                cy.get('[contextref="c0"]')//.should('be.visible')
                    .each(($fact) => {
                        cy.wrap($fact)
                            .should('have.attr', 'highlight-fact', 'true')
                    })
            })
        })

        it("Data Filter dropdown should have all filters, and filters should filter facts, and Reset Filter button should reset filters: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get(selectors.searchHourglass).should('not.be.visible');
            cy.get(selectors.factCountBadge).then(($fullCount) => {
                // Store the full fact count for later use
                const fullCount = Number($fullCount.text().replace(/,/g, ''))
                // Open the Data Filter dropdown
                cy.get(selectors.dataFiltersButton).click().then(() => {

                    // Apply the "Amounts Only" filter
                    cy.get(selectors.dataAmountsOnlyFilter).click().then(() => {
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be less than or equal to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('be.lte', fullCount)
                        })
                    })

                    // Apply the "Calculations Only" filter
                    cy.get(selectors.dataCalcOnlyFilter).click().then(() => {
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be less than or equal to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('be.lte', fullCount)
                        })
                    })

                    // Apply the "Negatives Only" filter
                    cy.get(selectors.dataNegOnlyFilter).click().then(() => {
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be less than or equal to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('be.lte', fullCount)
                        })
                    })

                    // Apply the "Additional Items Only" filter
                    cy.get(selectors.dataAdditionalOnlyFilter).click().then(() => {
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be less than or equal to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('be.lte', fullCount)
                        })
                    })

                    // Hit the "Reset Filters" button
                    cy.get(selectors.resetAllFilters).click().then(() => {
                        // Data Filter dropdown should vanish
                        cy.get(selectors.dataFilterDropdown).should('not.be.visible')
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be back up to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('equal', fullCount)
                        })
                    })
                })
            })
        })

        it("Tags Filter dropdown should have all filters, and filters should filter facts, and Reset Filter button should reset filters: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get(selectors.searchHourglass).should('not.be.visible');
            cy.get(selectors.factCountBadge).then(($fullCount) => {
                // Store the full fact count for later use
                const fullCount = Number($fullCount.text().replace(/,/g, ''))
                // Open the Data Filter dropdown
                cy.get(selectors.tagsHeader).click().then(() => {
                    // Apply the "Standard Only" filter
                    cy.get(selectors.standardTagsRadio).click().then(() => {
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be less than or equal to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('be.lte', fullCount)
                        })
                    })
                    // Apply the "Custom Only" filter
                    cy.get(selectors.customTagsRadio).click().then(() => {
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be less than or equal to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('be.lte', fullCount)
                        })
                    })
                    // Hit the "Reset Filters" button
                    cy.get(selectors.resetAllFilters).click().then(() => {
                        // Data Filter dropdown should vanish
                        cy.get(selectors.dataFilterDropdown).should('not.be.visible')
                        cy.get(selectors.factCountBadge).then(($nowCount) => {
                            // Fact Count should be back up to the full count
                            let nowCount = Number($nowCount.text().replace(/,/g, ''))
                            cy.wrap(nowCount).should('equal', fullCount)
                        })
                    })
                })
            })
        })

        it("Fact Count on Fact Tabs should add up to the count on the Fact Sidebar Button", () => {
            // This test works on both single-doc and multi-doc filings
            // TODO confirm this test also works for multi-instance filings
            cy.loadFiling(filing)
            let factCount = 0
            let fullCount = 0
            cy.get(selectors.factCountBadge).then(($fullCount) => {
                // Store the full fact count for later use
                fullCount = Number($fullCount.text().replace(/,/g, ''))
            }).then(() => {
                // Iterate over the doc tabs, adding their fact counts together.
                cy.get("ul[id='tabs-container']> li > a > span").each(($tab, index) => {
                    factCount = factCount + Number($tab.text().replace(/,/g, ''))
                }).then(() => {
                    // The sum of the doc tab counts should equal the fact sidebar count
                    expect(factCount).to.equal(fullCount)
                })
            })
        })

        it("All elements of Fact Sidebar should be present: " + `${filing.accessionNum}`, () => {
            cy.loadFiling(filing)
            cy.get(selectors.factCountBadge).then(($fullCount) => {
                // Store the full fact count for later use
                const fullCount = ($fullCount.text())
                // Open the Facts Sidebar
                cy.get(selectors.factsHeader).click().then(() => {
                    cy.get(selectors.factSidebar).should('be.visible')

                    // Element that has the word "Facts", followed by the fact count
                    cy.get(selectors.factSidebar + ' > div > span > h5').should("have.text", 'Facts')
                    cy.get(selectors.factSidebar + ' > div > span > span').should("have.text", fullCount)

                    // Prev/Next fact buttons
                    cy.get(selectors.prevFact).should('be.visible').contains('Previous Fact')
                    cy.get(selectors.nextFact).should('be.visible').contains('Next Fact')

                    // Page Select Dropdown
                    cy.get(selectors.sidebarPaginationSelect).contains('Page 1')

                    // Page Navigation buttons (First, Prev, Next, Last)
                    cy.get(selectors.sidebarPaginationFirst).should('be.visible')
                    cy.get(selectors.sidebarPaginationPrev).should('be.visible')
                    cy.get(selectors.sidebarPaginationNext).should('be.visible')
                    cy.get(selectors.sidebarPaginationLast).should('be.visible')

                    // Facts List
                    cy.get('div[id="facts-menu-list-pagination"] > div[class*="facts-scrollable"]').should('be.visible')
                    // Fact List should have at least one fact in it
                    cy.get('div[id="facts-menu-list-pagination"] > div[class*="facts-scrollable"] > a')

                    // Close Sidebar button should be functional
                    cy.get(selectors.factSideBarClose).should('be.visible').then(($closeBtn) => {
                        cy.get($closeBtn).click().then(() => {
                            cy.get(selectors.factSidebar).should('not.be.visible')
                        })
                    })
                })
            })
        })

        it("Verify function of Last Page button", () => {
            cy.viewport(1920, 1080);
            cy.loadFiling(filing)
            cy.window().its('scrollY').should('eq', 0)
            //cy.get(selectors.xbrlForm).scrollTo('bottom').then(() => {
            cy.get(selectors.goToBtnOfDoc).click().then(() => {
                cy.window().its('scrollY').should('be.gt', 0)
            })
        })
    })
    /* A Note for Those Who Come After -
    Testing the pagination buttons with Cypress has proven very difficult.
    The buttons work fine whenever I use them manually, but the Prev Page
    and First Page buttons don't work right when tested within Cypress.
    It's difficult to explain, but the entire window, including the scroll bars
    slides to the top of the viewport. I have no idea why this is happening,
    but you can try it yourself with the test below.
    My hunch is that it has to do with our iFrame situation, but that
    also could just be me blaming all my woes on iFrames.
    Good luck! <3 - Mason
    */
    it.skip("First Page Button Thing", () => {
        cy.viewport(1920, 1080);
        cy.loadFiling(singleFiling)
        cy.get(selectors.xbrlForm).scrollTo('bottom').then(() => {
            cy.get(selectors.goToTopOfDoc).click()
        })
    })
})
