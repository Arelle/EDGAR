/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { ConstantsFunctions } from "../constants/functions";
import { FactMap } from "../facts/map";
import { FactsGeneral } from "../facts/general";
import { UserFiltersState } from "../user-filters/state";
import { actionKeyHandler } from "../helpers/utils";
import { callSearch } from "../flex-search/search-worker-interface";
import { searchUiUpdate } from "../flex-search/flex-search-ui";
import { showSearchingHourglass } from "../flex-search/flex-search-ui";
// import { buildArrowKeyListenerForElems } from "../helpers/utils"; // WIP

export const Search = {

  clear: () => {
    ConstantsFunctions.emptyHTMLByID('suggestions');
    (document.getElementById('global-search') as HTMLInputElement).value = '';
    UserFiltersState.setUserSearch({});
    // FlexSearch.searchFacts({});
    callSearch({}, true).then(searchResults => {
      searchUiUpdate(searchResults);
    })
  },

  closeSuggestions: () => {
    ConstantsFunctions.emptyHTMLByID('suggestions');
  },

  submit: () => {
    // 1 => Include Fact Name
    // 2 => Include Fact Content
    // 3 => Include Labels
    // 4 => Include Definitions
    // 5 => Include Dimensions
    // 6 => Include References
    showSearchingHourglass();
    ConstantsFunctions.emptyHTMLByID('suggestions');
    // let valueToSearchFor = (document.getElementById('global-search') as HTMLInputElement).value;
    // here we sanitize the users input to account for Regex patterns
    let valueToSearchFor = (document.getElementById('global-search') as HTMLInputElement).value;
    valueToSearchFor = valueToSearchFor.replace(/[\\{}()[\]^$+*?.]/g, '\\$&');

    const options = document.querySelectorAll('[name="search-options"]');
    let optionsArray = Array.prototype.slice.call(options);
    optionsArray = optionsArray.map((current) => {
      if (current['checked']) {
        return parseInt(current['value']);
      }
    }).filter((element) => {
      return element;
    });

    valueToSearchFor = Search.createValueToSearchFor(valueToSearchFor);

    const query = {
      value: [valueToSearchFor],
      'options': optionsArray
    };
    UserFiltersState.setUserSearch(query);

    callSearch(query).then(searchResults => {
      searchUiUpdate(searchResults);
    })
  },

  createValueToSearchFor: (input: string) => {
    // AND template = (?=.*VARIABLE1)(?=.*VARIABLE2)
    // OR template = (VARIABLE1)|(VARIABLE2)

    // TODO this will require a second/third look
    const inputArray = input.replace(/ and /gi, ' & ').replace(/ or /gi, ' | ').split(' ');
    if (inputArray.length > 1) {
      let regex = '^';
      inputArray.forEach((current: string) => {
        if (current === '|') {
          regex += '|';
        } else if (current === '&') {
          // business as usual
        } else {
          regex += '(?=.*' + current + ')';
        }
      });
      return regex;
    }
    return input;
  },

  suggestions: () => {
    const smallSetSize = 3;
    const lrgSetSize = 6;
    let valueToSearchFor = (document.getElementById('global-search') as HTMLInputElement).value;
    const search = document.getElementById('global-search');
    ConstantsFunctions.emptyHTMLByID('suggestions');
    if (valueToSearchFor.length > 1 && document.activeElement === search) {
      // here we sanitize the users input to account for Regex patterns
      valueToSearchFor = valueToSearchFor.replace(/[\\{}()[\]^$+*?.]/g, '\\$&');

      const options = document.querySelectorAll('[name="search-options"]');
      let optionsArray = Array.prototype.slice.call(options);
      optionsArray = optionsArray.map((current) => {
        if (current['checked']) {
          return parseInt(current['value']);
        }
      }).filter((element) => {
        return element;
      });

      valueToSearchFor = Search.createValueToSearchFor(valueToSearchFor);

      const query = {
        value: [valueToSearchFor],
        'options': optionsArray
      };

      const suggestionsUl = document.getElementById('suggestions') as HTMLElement;

      const populateSuggestionsUi = (results) => {
        results?.slice(0, lrgSetSize).forEach((current: string, index) => {
          const hidden = index >= smallSetSize;
          const factListMember = FactsGeneral.renderFactElem(current, hidden);
          suggestionsUl.append(factListMember);
        });
      }

      const addMoreFactsButton = (results) => {
        // More Facts Button
        if (results && results!.length > smallSetSize) {
          const moreFactsLi = document.createElement('li');
          moreFactsLi.classList.add('hover-dim');
          moreFactsLi.classList.add('list-group-item');
          moreFactsLi.classList.add('not-numbered');
          moreFactsLi.classList.add('d-flex');
          moreFactsLi.classList.add('justify-content-between');
          moreFactsLi.classList.add('align-items-start');

          const moreFactsDiv = document.createElement('div');
          moreFactsDiv.setAttribute('id', 'moreFactsBtn');
          moreFactsDiv.classList.add('ms-2');
          moreFactsDiv.classList.add('me-auto');

          const title = document.createTextNode(`More Facts`);
          moreFactsDiv.append(title);
          moreFactsLi.append(moreFactsDiv);
          suggestionsUl.append(moreFactsLi);

          // action
          moreFactsLi.addEventListener('click', (e) => {
            e.stopPropagation(); // so it doesn't close suggestions
            const hiddenSuggestions = suggestionsUl.querySelectorAll('#suggestions a.d-none');
            hiddenSuggestions.forEach(hiddenFactResult => {
              hiddenFactResult.classList.remove('d-none');
            })
            moreFactsLi.classList.add('d-none')
            suggestionsUl.style.maxHeight = '85vh';
          })
        }
      }

      callSearch(query, true).then(searchResults => {
        populateSuggestionsUi(searchResults);
        addMoreFactsButton(searchResults);
      })

      document.getElementById('global-search-form')?.append(suggestionsUl);

      window.setTimeout(() => {
        // submit search upon clicking suggestion
        const suggestionElems = document.querySelectorAll('#suggestions > a');
        suggestionElems?.forEach(((suggestionElem) => {
          suggestionElem.addEventListener('click', Search.submit);
          suggestionElem.addEventListener('keyup', (event) => {
            if (!actionKeyHandler(event as KeyboardEvent)) return;
            Search.submit()
          })
        }))
      }, 200)

      // wip adding arrow key functionality amongst suggestions
      // const moreFactsBtn = document.getElementById('moreFactsBtn');
      // const searchSuggestionElems = Array.from(document.querySelectorAll('[id="suggestions"] > a'));
      // const suggestionElems = [search, ...searchSuggestionElems, moreFactsBtn]
      // buildArrowKeyListenerForElems(suggestionElems)
    }
  },

  suggestionsTemplate: (factID: string) => {
    const fact = FactMap.getByID(factID);
    if (fact) {
      const li = document.createElement('li');
      li.classList.add('list-group-item');
      li.classList.add('d-flex');
      li.classList.add('justify-content-between');
      li.classList.add('align-items-start');

      const div = document.createElement('div');
      div.classList.add('ms-2');
      div.classList.add('me-auto');

      const div1 = document.createElement('div');
      div1.classList.add('fw-bold');
      const title = document.createTextNode(ConstantsFunctions.getFactLabel(fact.labels));
      const period = document.createTextNode(fact.period);
      div1.append(title);
      div.append(div1);
      div.append(period);
      li.append(div);

      return li;
    }
  },

  suggestionsEmpty: () => {
    ConstantsFunctions.emptyHTMLByID('suggestions')
  },

}
