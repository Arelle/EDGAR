/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment 
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { Constants } from "../constants/constants";
// import { ErrorsMinor } from "../errors/minor";

// Empty object means no active search
export type UserSearch = { clauses: string[][]; options: number[] } | Record<string, never>;

export const UserFiltersState = {
    getAxes: [],
    getMembers: [] as string[],
    getBalance: [] as string[],
    getMeasure: [] as string[],
    getPeriod: [] as string[],
    getScale: [] as string[],
    getType: [] as string[],
    getDataRadios: 0,

    setDataRadios: (input: number) => {
        if (input >= 0 && input <= 5) {
            UserFiltersState.getDataRadios = input;
        } else {
            // ErrorsMinor.unknownError();
        }
    },

    getTagsRadios: 0,

    setTagsRadio: (input: number) => {
        if (input >= 0 && input <= 2) {
            UserFiltersState.getTagsRadios = input;
        } else {
            // ErrorsMinor.unknownError();
        }
    },

    getUserSearch: {} as UserSearch,

    setUserSearch: (input: UserSearch) => {
        UserFiltersState.getUserSearch = input;
        Constants.getSearchCriteria = input; // this one not tied with UI and can be called from workers
    },

    tagRadios: (current: HTMLElement, enabledFact: boolean) => {
        // 0 = All
        // 1 = Standard Only
        // 2 = Custom Only
        if (current === null) return;
        if (UserFiltersState.getTagsRadios && enabledFact) {
            switch (UserFiltersState.getTagsRadios) {
                case 2: {
                    // Custom Only

                    if (!current.hasAttribute('isCustomOnly')) {
                        const isCustomTag = current.getAttribute('name')?.split(':')[0].toLowerCase() === Constants.getMetaCustomPrefix;
                        current.setAttribute('isCustomOnly', isCustomTag ? 'true' : 'false');
                    }

                    if (current.hasAttribute('isCustomOnly') && current.getAttribute('isCustomOnly') === 'true') {
                        return true;
                    }
                    return false;
                }
                case 1: {
                    // Standard Only
                    if (!current.hasAttribute('isStandardOnly')) {
                        const isStandardPrefix = current.getAttribute('name')?.split(':')[0].toLowerCase() !== Constants.getMetaCustomPrefix;
                        current.setAttribute('isStandardOnly', isStandardPrefix ? 'true' : 'false');
                    }

                    if (current.hasAttribute('isStandardOnly') && current.getAttribute('isStandardOnly') === 'true') {
                        return true;
                    }
                    return false;
                }
                default: {
                    // All
                    return true;
                }
            }
        }
        return enabledFact;
    },

    periods: (current: HTMLElement, enabledFact: boolean) => {
        if (UserFiltersState.getPeriod.length > 0 && enabledFact) {

            for (let i = 0; i < UserFiltersState.getPeriod.length; i++) {
                if (UserFiltersState.getPeriod[i].contextref.indexOf(current.getAttribute('contextref') || "") >= 0) {
                    return true;
                }
            }
            return false;
        }
        return enabledFact;
    },

    measures: (current: HTMLElement, enabledFact: boolean) => {
        if (UserFiltersState.getMeasure.length && enabledFact) {

            if (current.hasAttribute('unitref')) {
                for (let i = 0; i < UserFiltersState.getMeasure.length; i++) {
                    if (current.getAttribute('unitref') === UserFiltersState.getMeasure[i]) {
                        return true;
                    }
                }
            }
            return false;
        }

        return enabledFact;
    },

    axes: (current: HTMLElement, enabledFact: boolean) => {
        if (UserFiltersState.getAxes.length && enabledFact) {

            for (let i = 0; i < UserFiltersState.getAxes.length; i++) {
                if (document.querySelector(`#dynamic-xbrl-form [id="${current.getAttribute('contextref')}"] [dimension="${UserFiltersState.getAxes[i]['name']}"]`)) {
                    return true;
                }
            }
            return false;

        }
        return enabledFact;
    },

    members: (current: HTMLElement, enabledFact: boolean) => {
        if (UserFiltersState.getMembers.length && enabledFact) {
            for (let i = 0; i < UserFiltersState.getMembers.length; i++) {
                for (let k = 0; k < UserFiltersState.getMembers[i].parentID.length; k++) {
                    if (current.getAttribute('contextref') === UserFiltersState.getMembers[i]['parentID'][k]) {
                        return true;
                    }
                }
            }
            return false;

        }
        return enabledFact;
    },

    scales: (current: HTMLElement, enabledFact: boolean) => {
        if (UserFiltersState.getScale.length && enabledFact) {

            for (let i = 0; i < UserFiltersState.getScale.length; i++) {
                if (UserFiltersState.getScale[i] === current.getAttribute('scale')) {
                    return true;
                }
            }
            return false;

        }
        return enabledFact;
    },

    types: (current: HTMLElement | null, enabledFact: boolean) => {
        if (current == null) return;
        if (UserFiltersState.getType.length && enabledFact) {
            for (let i = 0; i < UserFiltersState.getType.length; i++) {
                if (current.hasAttribute('name') && current.getAttribute('name')?.split(':').length === 2) {
                    if (UserFiltersState.getType[i].toLowerCase() === current.getAttribute('name')?.split(':')[0].toLowerCase()) {
                        return true;
                    }
                }
            }
            return false;
        }
        return enabledFact;
    },
};
