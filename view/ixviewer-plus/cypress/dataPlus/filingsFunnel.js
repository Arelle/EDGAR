import { filings as standardFilings } from './standardFilings.js'
// Todo: import experimentalFilings
import { filings as set200 } from './enrichedFilingsPlus.mjs'
// import addendum from './addendum.json'

/*
    ABOUT FILING SETS

    standardFilings are filings that Loc has listed in a spreadsheet.  We use these for bulk tests, i.e. when we want to iterate 
    over a set of filings to make sure a feature of the viewer works on all.
    Not all filings we want to test belong in standardFilings - only the ones we want to bulk test do.
    Generally, you can just add a filing to the test filings repo, and test it individually.  
    Filings should only be added to bulk tests by adding it to the spread sheet first.
    then you can dowload it, dress it up a bit, and run a script against it to generate a new standardFilings.js doc.
*/

const filings = [...standardFilings, ...set200];

const getBaseSet = (setName) => {
    let filingSet = [];
    switch (setName) {
        case "standard": {
            filingSet = standardFilings;
            break;
        }
        case "experimental": {
            filingSet = experimentalFilings;
            break;
        }
        case "set200": {
            filingSet = set200;
            break;
        }
        case "all": {
            // should include standard and experimental, set200 is being deprecated probably.
            filingSet = [...standardFilings];
            break;
        }
        default: {
            filingSet = standardFilings;
            break;
        }
    }
    return filingSet;
}

export const getFilingsSample = (CyEnv) =>
{
    const cyEnvVars = CyEnv();
    let filingsSample = getBaseSet(cyEnvVars.filingSet);

    if (cyEnvVars.targetFilingAccessionNum) {
        return filingsSample.filter(filing => {
            return filing.accessionNum == cyEnvVars.targetFilingAccessionNum;
        })
    }

    if (cyEnvVars.limitNumOfFilingsForTestRun) {
        return filingsSample.slice(0, cyEnvVars.limitOfFilingsToTest || Infinity);
    } else {
        return filingsSample;
    }

    // return filings.sort(() => .5 - Math.random())
    //     .slice(0, cyEnvVars.filingSet || Infinity);
}

export const getMultiInstance = (CyEnv) => {
    const cyEnvVars = CyEnv();
    let filingsSample = getBaseSet(cyEnvVars.filingSet);
    return filingsSample.filter(filing => filing.multiInstance)
}

export const getMultiDoc = (CyEnv) => {
    const cyEnvVars = CyEnv();
    let filingsSample = getBaseSet(cyEnvVars.filingSet);
    return filingsSample.filter(filing => filing.multiDoc)
}

// export const getByAccessionNum = (accessionNum) => {
//     let filingsSample = getBaseSet("all");
//     // combine whatever sets once they are correctly structured (standardized fields) and ready to be imported
//     // let filingsSample = [...getBaseSet("all"), ...getBaseSet("set200")];
//
//     const filing = filingsSample.filter(filing => filing.accessionNum == accessionNum)[0];
//     if (filing) return filing;
//     else { console.error(`no filing matching accession number ${accessionNum}`) }
//}

export const getByAccessionNum = (accessionNum) => {
    let filing = filings.find(filing => filing.accessionNum === accessionNum.toString())
    if (filing) return filing
    else { console.error(`no filing matching accession number ${accessionNum}`) }
}

//Returns an object containing filing information from standardFilings for filing index X
export const readFilingData = (index) => {
    const filing = filings.find(filing => filing.index === index.toString())
    return filing
}
//The same as above, but looks up by accession number instead of index
export const readFilingDataAccNum = (accessionNum) => {
    const filing = filings.find(filing => filing.accessionNum === accessionNum.toString())
    return filing
}