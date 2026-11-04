import { selectors } from "../../utils/selectors.mjs"
import { search } from "../../utils/utils.mjs"

describe("Instance change resets search and filters", () => {
    //Note: loading a specific instance is *vital* to the function of these tests
    const multiDoc = "/Archives/edgar/data/1314610/000131461024800819/afd06-20230922.htm";
    const multiDocName = "afd06-20230922.htm";
    const singleDoc = "/Archives/edgar/data/1314610/000131461024800819/EXFILINGFEES.htm";
    const singleDocName = "EXFILINGFEES.htm";
    const searchText = "zzqxnotfound";

    const setMoreFilters = (state = 'open') => {
        cy.get(selectors.moreFiltersHeader).should('be.visible').then($hdr => {
            const isOpen = $hdr.attr('aria-expanded') === 'true'
            const shouldOpen = state === 'open'
            if (shouldOpen !== isOpen) {
                cy.wrap($hdr).click()
            }

            cy.get(selectors.moreFiltersHeader).should('have.attr', 'aria-expanded', state === 'open' ? 'true' : 'false');
        })
    }

    const switchInstance = () => {
        setMoreFilters('close')
        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item:not(.active)`).click();
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');
    };


    const applySearchAndFilters = () => {
        cy.get(selectors.dataFiltersButton).click();
        cy.get(selectors.dataAmountsOnlyFilter).click();
        cy.get(selectors.dataAmountsOnlyFilter).should('be.checked');

        cy.get(selectors.tagsHeader).click();
        cy.get(selectors.standardTagsRadio).click();
        cy.get(selectors.standardTagsRadio).should('be.checked');

        search(searchText); // should I pass in search text here
        cy.get(selectors.search).should('have.value', searchText);

        // cy.get(selectors.moreFiltersHeader).click();
        setMoreFilters()

        cy.get(selectors.balanceFilterTagDrawer).click();
        cy.get(selectors.balanceFilter1).click();
        cy.get(selectors.balanceFilter1).should('be.checked');
        cy.get(selectors.moreFiltersBadge).should('have.text', '1');

        cy.get(selectors.resetAllFilters).should('be.visible');
        cy.get(selectors.dataFiltersButton).should('have.class', 'text-warning');
        cy.get(selectors.tagsHeader).should('have.class', 'text-warning');
        cy.get(selectors.moreFiltersHeader).should('have.class', 'text-warning');
    };

    const assertSearchAndFiltersCleared = () => {
        cy.get(selectors.search).should('have.value', '');
        cy.get(selectors.dataAmountsOnlyFilter).should('not.be.checked');
        cy.get(selectors.standardTagsRadio).should('not.be.checked');
        cy.get(selectors.balanceFilter1).should('not.be.checked');
        cy.get('li#current-filters-reset').should('have.class', 'd-none');
        cy.get(selectors.moreFiltersBadge).should('have.text', '');
        cy.get(selectors.dataFiltersButton).should('not.have.class', 'text-warning');
        cy.get(selectors.tagsHeader).should('not.have.class', 'text-warning');
        cy.get(selectors.moreFiltersHeader).should('not.have.class', 'text-warning');
    };

    const readMoreFiltersDom = () => cy.document().then(doc => ({
        periodRows: doc.querySelectorAll('#user-filters-periods > div > div').length,
        measureRows: doc.querySelectorAll('#user-filters-measures > div').length,
        scaleRows: doc.querySelectorAll('#user-filters-scales > div').length,
        axisAccordions: doc.querySelectorAll('[id^="axes-filters-accordion-"]').length,
        memberAccordions: doc.querySelectorAll('[id^="members-filters-accordion-"]').length,
        periodsBadge: doc.getElementById('filters-periods-count').textContent,
    }));

    it("clears search and filters when switching instance and keeps them cleared when switching back", () => {
        cy.visit(singleDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');
        cy.get(selectors.factCountBadge).invoke('text').then(text => text.trim()).as('instanceBCount');

        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');
        cy.get(selectors.factCountBadge).invoke('text').then(text => text.trim()).as('instanceACount');

        applySearchAndFilters();
        cy.get('@instanceACount').then(instanceACount => {
            cy.get(selectors.factCountBadge).should('not.have.text', instanceACount);
        });

        switchInstance();
        cy.url().should('include', singleDocName);
        assertSearchAndFiltersCleared();
        cy.get('@instanceBCount').then(instanceBCount => {
            cy.get(selectors.factCountBadge).should('have.text', instanceBCount);
        })

        switchInstance();
        cy.url().should('include', multiDocName);
        assertSearchAndFiltersCleared();
        cy.get('@instanceACount').then(instanceACount => {
            cy.get(selectors.factCountBadge).should('have.text', instanceACount);
        })
    });

    it("restores search option defaults when switching instance", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');

        cy.get('input[name="search-options"]').then($opts => {
            const defaultOptions = [...$opts].map(opt => opt.checked);
            cy.wrap(defaultOptions).as('defaultCheckedOptions')
        });

        search(searchText);

        cy.get(selectors.searchSettingsGear).click();

        cy.get('input[name="search-options"]').each($el => {
            cy.wrap($el).click();
        })
        cy.get(selectors.searchSettingsGear).click();

        switchInstance();
        cy.get(selectors.search).should('have.value', '');

        cy.get('@defaultCheckedOptions').then(defaultOptions => {
            cy.get('input[name="search-options"]').each(($el, idx) => {
                expect($el[0].checked).to.eq(defaultOptions[idx]);
            })
        })
    });

    it("rebuilds More Filters for the new instance", () => {
        cy.visit(singleDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');
        setMoreFilters()
        readMoreFiltersDom().then(snapshot => {
            cy.wrap(snapshot).as('baselineB')
        });
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');
        setMoreFilters()
        readMoreFiltersDom().then(snapshot => {
            cy.wrap(snapshot).as('baselineA')
        });

        cy.get('@baselineA').then(baselineA => {
            cy.get('@baselineB').then(baselineB => {
                expect(baselineA, 'multiDoc baseline').not.to.deep.equal(baselineB);
            })
        })

        switchInstance();
        cy.url().should('include', singleDocName);
        cy.get('#filters-periods-count i.fa-clock').should('exist');
        setMoreFilters()
        readMoreFiltersDom().then(snapshot => {
            cy.get('@baselineB').then(baselineB => {
                expect(snapshot, 'rebulit filters for singleDoc').to.deep.equal(baselineB);
            })
        });

        switchInstance();
        cy.url().should('include', multiDocName);
        setMoreFilters()
        readMoreFiltersDom().then(snapshot => {
            cy.get('@baselineA').then(baselineA => {

                expect(snapshot, 'rebulit filters for multiDoc').to.deep.equal(baselineA);
            })
        });
    });

    it("clears search and filters when going back to the previous instance", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');
        cy.get(selectors.factCountBadge).invoke('text').then(text => text.trim()).as('instanceACount');

        switchInstance();
        cy.url().should('include', singleDocName);
        applySearchAndFilters();

        cy.go('back');
        cy.waitForAppReady();
        cy.url().should('include', multiDocName);
        assertSearchAndFiltersCleared();
        
        cy.get('@instanceACount').then(instanceACount => {
            cy.get(selectors.factCountBadge).should('have.text', instanceACount);
        })
    });

    it("does nothing when the already-active instance is selected", () => {
        cy.visit(multiDoc);
        cy.waitForAppReady();
        cy.get(selectors.factCountClock).should('not.exist');

        applySearchAndFilters();
        cy.get(selectors.factCountBadge).invoke('text').then(text => text.trim()).as('instanceACount');

        cy.get('#dynamic-xbrl-form').children().first().invoke('attr', 'data-cy-marker', 'kept');

        cy.get(selectors.instanceDropdown).click();
        cy.get(`${selectors.instanceDropdown} a.dropdown-item.active`).click();

        cy.url().should('include', multiDocName);
        cy.get('#dynamic-xbrl-form [data-cy-marker="kept"]').should('exist');
        cy.get(selectors.search).should('have.value', searchText);
        cy.get(selectors.dataAmountsOnlyFilter).should('be.checked');
        cy.get(selectors.standardTagsRadio).should('be.checked');
        cy.get(selectors.balanceFilter1).should('be.checked');
        cy.get(selectors.moreFiltersBadge).should('have.text', '1');
        cy.get(selectors.resetAllFilters).should('be.visible');

        cy.get('@instanceACount').then(instanceACount => {
            cy.get(selectors.factCountBadge).should('have.text', instanceACount);
        })
    });
});
