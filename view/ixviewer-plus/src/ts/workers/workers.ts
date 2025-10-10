/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */

import { FetchAndMerge } from '../fetch-merge/fetch-merge';

/*
data in 
const fetchAndMergeArgs: FetchMergeArgs = {
    params: HelpersUrl.getAllParams,
    absolute: HelpersUrl.getFolderAbsUrl,
    instance: changeInstance ? Constants.getInstances : null,
    std_ref: Constants.getStdRef,
};
From docsAndInstance
- this.activeInstance.xml = instXml]
- [this.activeInstance.docs]
from metaAndSummary
- this.metaVersion = metalinks.version || null;
- this.std_ref = metalinks.std_ref || {} as any;
- this.activeInstance = metalinks.instance;
*/

self.onmessage = ({ data }) => {
    const fetchAndMerge = new FetchAndMerge(data);
    fetchAndMerge.fetch()
        .then((data) => self.postMessage(data))
        .then(() => fetchAndMerge.facts())
        .then((data) => self.postMessage(data))
        .then(() => fetchAndMerge.merge())
        .then((data) => self.postMessage(data))
        .catch((e) => setTimeout(() => { throw new Error(JSON.stringify(e)) }));
};
