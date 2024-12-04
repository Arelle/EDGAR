import * as fs from "fs"

const convertYesNoToBool = (str) => {
    if (str.toLowerCase() != 'yes' && str.toLowerCase() != 'no') return str;
    return (str.toLowerCase()) == 'yes' ? true : false;
}

const csvToJsonWithRowHeadersAsKeys = (csvFilePathToRead, destinationFilePath, outputFileName, fileType = '') => {
    console.log('csvFilePathToRead', csvFilePathToRead)
    /*
    Utility specific to converting Security Types per Rule csv to javascript object
    Sorta Converts table like...
        name    age     job
        robin   100     dev
        sam     6       cat
    To object like... (yes, I like trailing commas :P)
        {
            "robin": {
                "age": 100,
                "job": "dev"
            },
            "sam": {
                "age": 6,
                "job": "cat",
            },
        }
    */
    
    try {
        if (!fs.existsSync(csvFilePathToRead)) throw(`no such file: ${csvFilePathToRead}`);
    } catch (err) {
        console.error(err);
    }

    const csv = fs.readFileSync(csvFilePathToRead, 'utf-8');

    // Convert the data to String and
    // split it in an array of row data strings
    const arrayOfRows = csv.toString().split("\r");
    let table = [];  // 2 dimensional array of data
    let reqsJson = {}; // empty json object to fill out and write to file
    arrayOfRows.forEach((row) => {
        console.log('row', row)
        row = row.replace('\n', '');
        const rowCellsAsArray = row.split(",");
        table.push(rowCellsAsArray);
    })

    // 1. iterate over row 1, and create an object with strings as keys and empty ojects as value '457(a)': {}
    for (let cell = 0; cell < table[0].length; cell++) {
        const ruleString = `Rule ${table[0][cell]}`;
        reqsJson[ruleString] = {};
    }

    // 2. iterate over rows starting with row 2 and populate object 
    for (let cell = 1; cell < table[1].length; cell++) {
        for (let row = 1; row < table.length; row++) {
            const value = (table[row][cell] == "Yes") ? true : false;
            const ruleName = `Rule ${table[0][cell]}`;
            const secTitle = table[row][0];
            reqsJson[ruleName][secTitle] = value;
        }
    }

    let outputArrayAsString = JSON.stringify(reqsJson, null, 4);
    let outputArrayAsStringWithDef = `const ${outputFileName} = ${outputArrayAsString}`;
    // write export line in file so we can import it in our generator
    outputArrayAsStringWithDef += `\nexports.${outputFileName} = ${outputFileName};`;

    if (fileType) fileType = '.' + fileType
    try {
        // example path and file name: "dest/testData.requirements.js"
        fs.writeFileSync(`${destinationFilePath}/${outputFileName}${fileType}.js`, outputArrayAsStringWithDef);
    } catch(err) {
        console.log(err);
    }
}

const csvToJsonAsFlatObjects = (csvFilePathToRead, destinationFilePath, outputFileName, fileType = '') => {
    /*
        Steps to produce:
        1. go to current version of Submission Group 1_3_4_5_6_7_8_9_10_11_12 Requirements_09-13-2022_v3 DRAFT
        2. copy table 5-1
        3. paste to excel   
        4. break column 3 in to 3 separate columns so that 457(a), 457(o), Rule Other have their own columns.
        5. Delete the now empty row 2
        6. save as csv and put in cypress\e2e\RulesPerSubType
        7. run `node cypress/e2e/RulesPerSubType/convertTable5-1toJSdata.js`
        8. That command will create the js data file.
    */

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
    console.log('arrayOfRows', arrayOfRows)
    const headers = arrayOfRows[0].split(',');
    console.log('headers', headers)
    const outputArray = [];

    for (let row = 1; row < arrayOfRows.length; row++) {
        const rowAsArrayOfVals = arrayOfRows[row].split(',');
        const rowAsObject = {};
        rowAsArrayOfVals.forEach((val, columnNumber) => {
            // ignore row with empty group data
            // if (!val) return

            rowAsObject[sanitizeString(headers[columnNumber])] = convertYesNoToBool(sanitizeString(val));
            // console.log('rowAsObject[headers[columnNumber]]', rowAsObject[headers[columnNumber]]);
            // console.log('val', val);
        })
        outputArray.push(rowAsObject)
    }

    let outputArrayAsString = JSON.stringify(outputArray, null, 4);
    // console.log('outputArrayAsString', outputArrayAsString);
    let outputArrayAsStringWithDef = `const ${outputFileName.replace('-', '_')} = ${outputArrayAsString}`;
    // write export line in file so we can import it in our generator
    outputArrayAsStringWithDef += `\nexports.${outputFileName.replace('-', '_')} = ${outputFileName.replace('-', '_')};`;

    if (fileType) fileType = '.' + fileType
    try {
        // example path and file name: "dest/testData.requirements.js"
        fs.writeFileSync(`${destinationFilePath}/${outputFileName}${fileType}.js`, outputArrayAsStringWithDef);
    } catch(err) {
        console.log(err);
    }
}

export { 
    csvToJsonWithRowHeadersAsKeys,
    csvToJsonAsFlatObjects,
}

csvToJsonAsFlatObjects('../dataPlus/StandardFilingsJul5.csv', '../dataPlus/', 'standardFilings', 'json');