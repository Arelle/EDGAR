import { filings as standardFilings } from './standardFilings.js'
// Todo: import experimentalFilings
import { filings as set200 } from './enrichedFilingsPlus.mjs'
// import addendum from './addendum.json'

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
            filingSet = experimentalFilings;
            break;
        }
        case "all": {
            // should include standard and experimental, set200 is being deprecated probably.
            filingSet =  [...standardFilings];
            break;
        }
        default: {
            filingSet = standardFilings;
            break;
        }
    }
    return filingSet;
}

export const getFilingsSample = (CyEnv) => {
    const cyEnvVars = CyEnv();
    let filingsSample = getBaseSet(cyEnvVars.filingSet);

    console.log('cyEnvVars.targetFilingAccessionNum', cyEnvVars.targetFilingAccessionNum)
    if (cyEnvVars.targetFilingAccessionNum) {
        return filingsSample.filter(filing => {
            return filing.accessionNum == cyEnvVars.targetFilingAccessionNum;
        })
    }
    
    if (cyEnvVars.limitNumOfFilingsForTestRun) {
        filingsSample = filingsSample.slice(0, cyEnvVars.limitOfFilingsToTest)
    }
    return filingsSample;
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

export const getByAccessionNum = (accessionNum) => {
    let filingsSample = getBaseSet("all");
    // combine whatever sets once they are correctly structured (standardized fields) and ready to be imported
    // let filingsSample = [...getBaseSet("all"), ...getBaseSet("set200")];

    const filing = filingsSample.filter(filing => filing.accessionNum == accessionNum)[0];
    if (filing) return filing;
    else { console.error(`no filing matching accession number ${accessionNum}`) }
}