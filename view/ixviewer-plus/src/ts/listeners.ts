/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FactsChart } from "./facts/chart";
import { FactsMenu } from "./facts/menu";
import { FactsTable } from "./facts/table";
import { FormInformation } from "./form-information/form-information";
import { Modals } from "./modals/modals";
import { ModalsFormInformation } from "./modals/form-information";
import { ModalsSettings } from "./modals/settings";
import { Search } from "./search/search";
import { SectionsSearch } from "./sections/sectionSearch";
import { UserFiltersDataRadios } from "./user-filters/data-radios";
import { UserFiltersDropdown } from "./user-filters/dropdown";
import { UserFiltersGeneral } from "./user-filters/general";
import { UserFiltersMoreFiltersBalances } from "./user-filters/more-filters-balance";
import { UserFiltersTagsRadios } from "./user-filters/tags-radios";
import { defaultKeyUpHandler } from "./helpers/utils";
import { Constants } from "./constants/constants";
import { ConstantsFunctions } from "./constants/functions";

export class Listeners {
    constructor() {
        this.init();
    }
    init() {
        Constants.appWindow.addEventListener('popstate', () => {
            const newStateDoc = Constants.getInlineFiles.filter(file => Constants.appWindow.location.search.includes(file.slug))[0];
            if (!newStateDoc.current) {
                ConstantsFunctions.switchDoc(newStateDoc.slug, true);
            } 
        });

        document.getElementById('menu-dropdown-information')?.addEventListener('click', (event: MouseEvent) => {
            ModalsFormInformation.clickEvent(event);
        });
        document.getElementById('menu-dropdown-information')?.addEventListener('keyup', (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            ModalsFormInformation.clickEvent(event);
        });

        document.getElementById('menu-dropdown-link')?.addEventListener('click', () => {
            FormInformation.init();
        });
        document.getElementById('menu-dropdown-link')?.addEventListener('keyup', () => {
            FormInformation.init();
        });

        document.getElementById('menu-dropdown-settings')?.addEventListener('click', (event: MouseEvent) => {
            ModalsSettings.clickEvent(event);
        });
        document.getElementById('menu-dropdown-settings')?.addEventListener('keyup', (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            ModalsSettings.clickEvent(event);
        });

        document.getElementById('nav-filter-more')?.addEventListener('click', () => {
            UserFiltersGeneral.moreFiltersClickEvent();
        });

        document.getElementById('nav-filter-more')?.addEventListener('keyup', () => {
            UserFiltersGeneral.moreFiltersClickEvent();
        });

        document.getElementById("user-filters-balances-credit")?.addEventListener("click", (event: MouseEvent) => {
            UserFiltersMoreFiltersBalances.clickEvent(event, 1);
        });
        document.getElementById("user-filters-balances-credit")?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            UserFiltersMoreFiltersBalances.clickEvent(event, 1);
        });
        document.getElementById("user-filters-balances-debit")?.addEventListener("click", (event: MouseEvent) => {
            UserFiltersMoreFiltersBalances.clickEvent(event, 0);
        });
        document.getElementById("user-filters-balances-debit")?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            UserFiltersMoreFiltersBalances.clickEvent(event, 0);
        });

        //Array includes: form-information-instance, form-information-zip, form-information-zip, form-information-help, form-information-html
        //more-filters-menu-balance,more-filters-menu-periods,more-filters-menu-measures,more-filters-menu-axis,more-filters-menu-members,more-filters-scale
        const links = [...document.querySelectorAll(`a[id*="form-information-"]`), ...document.querySelectorAll(`[id*="more-filters-menu-"]`),];

        links.forEach(link => {
            link.addEventListener('keyup', (event) => {
                if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === 'Space' || event.key === ' '))
                {
                    const id= link.getAttribute('id');
                    document.getElementById(id as string)?.click();
                }
            });
        });
        //#facts-menu-button          
        document.getElementById('facts-menu-button')?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === 'Space' || event.key === ' ')){
                event.preventDefault();
                document.getElementById('facts-menu-button')?.click();
            }
        });  

        document.getElementById("current-filters-reset-all")?.addEventListener("click", () => {
            UserFiltersDropdown.resetAll();
        });
        document.getElementById("current-filters-reset-all")?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            UserFiltersDropdown.resetAll();
        });

        document.getElementById("fact-menu-secondary-toggle")?.addEventListener("click", (event: MouseEvent) => {
            FactsMenu.toggle(event);
        });
        document.getElementById("fact-menu-secondary-toggle")?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            FactsMenu.toggle(event);
        });

        document.getElementById('nav-filter-dropdown')?.addEventListener('change', (event) => {
            UserFiltersDataRadios.clickEvent(event);
        });
        document.getElementById('nav-filter-tags-dropdown')?.addEventListener('change', (event) => {
            UserFiltersTagsRadios.clickEvent(event);
        });

        document.getElementById('sections-menu-search-submit')?.addEventListener('submit', (event) => {
            event.preventDefault();
            SectionsSearch.submit();
            return false;
        });

        document.getElementById('section-menu-search-btn-clear')?.addEventListener('click', () => {
            SectionsSearch.clear();
        });
        document.getElementById('section-menu-search-btn-clear')?.addEventListener('keyup', (event: KeyboardEvent) => {
            if (!defaultKeyUpHandler(event)) return;
            SectionsSearch.clear();
        });


        // global search
        document.getElementById('global-search-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            let valueToSearchFor = (document.getElementById('global-search') as HTMLInputElement).value;
            if (valueToSearchFor.length > 1) {
                Search.submit();
            } else {
                Search.clear();
            }
        });

        let globalSearchTimeout: string | number | NodeJS.Timeout | null | undefined = null;
        document.getElementById('global-search')?.addEventListener('keyup', () => {
            if (globalSearchTimeout) {
                clearTimeout(globalSearchTimeout);
            }
            globalSearchTimeout = setTimeout(() => {
                Search.suggestions();
            }, 500)
        });

        document.getElementById('search-btn-clear')?.addEventListener("click", () => {
            Search.clear();
        });
        document.getElementById('search-btn-clear')?.addEventListener("keyup", (event) => {
            if (event.key === 'Enter' || event.key === 'Space' || event.key === ' ') {
                Search.clear();
            }
        });
        
        const searchOptions = document.querySelectorAll('input[name="search-options"]');

        searchOptions.forEach(opt => {
            opt.addEventListener('keyup', (event) => {
                const keyEvent = <KeyboardEvent> event;
                if (keyEvent.key == 'Space' || keyEvent.key == ' ') {
                    let search = document.getElementById('global-search') as HTMLInputElement;
                    let searchText = search?.value;
                    if (searchText?.length) {
                        Search.submit();
                    }
                }
            });
            opt.addEventListener('click', () => {
                const search = document.getElementById('global-search') as HTMLInputElement;
                const searchText = search?.value;
                if (searchText?.length) {
                    Search.submit();
                }
            });
        })

        const search = document.getElementById('global-search') as HTMLInputElement;
        search?.addEventListener('blur', () => {
            ConstantsFunctions.emptyHTMLByID('suggestions');
        })

        document.getElementById('hover-option-select')?.addEventListener("change", (event: Event) => {
            ModalsSettings.hoverOption(event);
        });

        document.getElementById('scroll-position-select')?.addEventListener("change", (event: Event) => {
            if (!PRODUCTION) console.log('scroll-position-select')
            ModalsSettings.scrollPosition(event);
        });

        document.getElementById('fact-copy-content-close')?.addEventListener('click', (event: MouseEvent) => {
            Modals.copyContent(event, 'fact-modal-carousel', 'fact-copy-content');
        });

        document.getElementById('fact-copy-content-close')?.addEventListener('keyup', (event: KeyboardEvent) => {
            Modals.copyContent(event, 'fact-modal-carousel', 'fact-copy-content');
        });

        document.getElementById('fact-nested-copy-content')?.addEventListener('click', (event: MouseEvent) => {
            Modals.copyContent(event, 'modal-fact-nested-content-carousel', 'fact-nested-copy-paste');
        });

        document.getElementById('fact-nested-copy-content')?.addEventListener('keyup', (event: KeyboardEvent) => {
            Modals.copyContent(event, 'modal-fact-nested-content-carousel', 'fact-nested-copy-paste');
        });
        // scroll-position-select
        // scrollPosition

        const closeOtherSideBars = (barToOpenId: string) => {
            const sidebars = document.getElementsByClassName('sidebar');
            for (const elem in sidebars) {
                const sidebarElem = sidebars[elem]
                if (sidebarElem?.id?.length && sidebarElem?.id != barToOpenId) {
                    if (sidebarElem.classList) {
                        sidebarElem?.classList?.remove('show')
                    }
                }
            }
        }

        // help menu
        const helpMenu = document.getElementById('help-menu');
        helpMenu?.addEventListener('show.bs.collapse', (event: Event) => {
            closeOtherSideBars(event!.target!.id)
        })
        
        // help sidebar section - prevent propagation
        const helpSidebarCollapsableSections = document.querySelectorAll('#help-sections .collapse');
        helpSidebarCollapsableSections?.forEach(helpSection => {
            helpSection?.addEventListener('show.bs.collapse', (event: Event) => {
                event.stopPropagation(); // so that the sidebar doesn't close
            })
        })

        // #facts-menu-button
        const factsMenu = document.getElementById('facts-menu');
        factsMenu?.addEventListener('show.bs.collapse', () => {
            // FactsMenu.toggle(event as MouseEvent | KeyboardEvent); // not needed
            closeOtherSideBars('facts-menu');
            FactsMenu.prepareForPagination();
        })
        //#facts-menu-button
        document.getElementById('facts-menu-button')?.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === 'Space' || event.key === ' ')) {
                document.getElementById('facts-menu-button')?.click();
            }
        });
        // #sections-dropdown-link
        const sectionsSidebar = document.getElementById('sections-menu');
        sectionsSidebar?.addEventListener('show.bs.collapse', () => {
            // FactsMenu.toggle(event as MouseEvent | KeyboardEvent); // not needed
            closeOtherSideBars('sections-menu')
        })

        // fact-table
        const factTableMenu = document.getElementById('fact-table-container');
        factTableMenu?.addEventListener('shown.bs.offcanvas', () => FactsTable.toggle(true));
        factTableMenu?.addEventListener('hidden.bs.offcanvas', () => FactsTable.toggle(false));

        // facts-breakdown-button
        const factsBreakdownMenu = document.getElementById('facts-breakdown-container');
        factsBreakdownMenu?.addEventListener('shown.bs.offcanvas', () => FactsChart.toggle(true));
        factsBreakdownMenu?.addEventListener('hidden.bs.offcanvas', () => FactsChart.toggle(false));
    }
}