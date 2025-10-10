import { Facts } from "../facts/facts";
import { UserFiltersDropdown } from "../user-filters/dropdown";
import { FactMap } from "../facts/map";

export const searchUiUpdate = (searchResults = null) => {
    FactMap.setHighlightedFacts(searchResults);
    Facts.inViewPort(true); // to hightlight only facts that match current search
    Facts.updateFactCounts();
    hideSearchingHourglass();
}

export const filtersUiUpdate = () => {
    Facts.inViewPort(true); // to hightlight only facts that match current filter
    UserFiltersDropdown.init();
    Facts.updateFactCounts();
}

export const showSearchingHourglass = () => {
    const searchsubmit = document.getElementById('search-submit-icon');
    const searchHourglass = document.getElementById('search-hourglass');
    searchsubmit?.classList.add('d-none');
    searchHourglass?.classList.remove('d-none');
}

export const hideSearchingHourglass = () => {
    const searchsubmit = document.getElementById('search-submit-icon');
    const searchHourglass = document.getElementById('search-hourglass');
    searchHourglass?.classList.add('d-none');
    searchsubmit?.classList.remove('d-none');
    
    const data = document.getElementById('nav-filter-data');
    const tags = document.getElementById('nav-filter-tags');
    const moreFilters = document.getElementById('nav-filter-more');
    data?.classList.remove('not-ready');
    tags?.classList.remove('not-ready');
    moreFilters?.classList.remove('not-ready');
}
