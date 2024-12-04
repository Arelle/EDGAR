import * as fs from "fs"
import { addendum } from '../dataPlus/addendum.mjs'


// csv requires either "docPath" or "secUrl" to populate urls
export const csvToJsonAsFlatObjects = (csvFilePathToRead, destinationFilePath, outputFileName, fileType = '') => {
    /*
    Convert table like...
        name    age
        robin   100
        sam     6
    To array of objects like...
        [
            {
                name: 'robin'
                age: 100,
            },
            {
                name: 'sam',
                age: 6,
            },
        ]
    */

    const correctSectionsCount = (filing) => {
        // why?  we are manually maintaining this as a source of truth for now. There's not alternative data to guide us otherwise.
        if (addendum.filingsNeedingCorrectedSectionCount.hasOwnProperty(filing.accessionNum)) {
            filing.expectedSectionCountCorrection = addendum.filingsNeedingCorrectedSectionCount[filing.accessionNum].correction;
        }
        return filing;
    }

    const sanitizeString = (grpStr) => {
        if (!grpStr) return '';
        const grpStr2 = grpStr.trim(); // "   pos am   " => "pos am"
        const grpStr3 = grpStr2.replace(/[\*\n]+/g, ''); // "\n444(d)***" => "444(d)"
        return grpStr3
    }

    const csv = fs.readFileSync(csvFilePathToRead)

    // Convert the data to String and
    // split it in an array of row data strings
    const arrayOfRows = csv.toString().split("\r");
    // console.log('arrayOfRows', arrayOfRows)
    const headers = arrayOfRows[0].split(',');
    console.log('input headers', headers)
    const outputArray = [];

    for (let row = 1; row < arrayOfRows.length; row++) {
        const rowAsArrayOfVals = arrayOfRows[row].split(',');
        let filing = {};
        rowAsArrayOfVals.forEach((val, columnNumber) => {
            // ignore row with empty group data
            // if (!val) return
            if (sanitizeString(headers[columnNumber]) == 'factCount') {
                filing[sanitizeString(headers[columnNumber])] = Number(sanitizeString(val));
                if (filing.factCount > 1000) {
                    filing['timeout'] = filing.factCount * 18;
                } else {
                    filing['timeout'] = 15000; // default
                }
            } else {
                filing[sanitizeString(headers[columnNumber])] = sanitizeString(val);
            }
        })
        console.log('processing', filing.docPath)
        filing = correctSectionsCount(filing);
        outputArray.push(filing)
    }

    let outputArrayAsString = JSON.stringify(outputArray, null, 4);
    // console.log('outputArrayAsString', outputArrayAsString);
    let outputArrayAsStringWithDef = `export const filings = ${outputArrayAsString}`;

    if (fileType) fileType = '.' + fileType
    try {
        // example path and file name: "dest/testData.requirements.js"
        fs.writeFileSync(`${destinationFilePath}/${outputFileName}${fileType}.js`, outputArrayAsStringWithDef);
    } catch(err) {
        console.log(err);
    }
}

csvToJsonAsFlatObjects('../dataPlus/StandardFilings08022024.csv', '../dataPlus/', 'standardFilings');