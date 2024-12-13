import { SingleFact } from "../interface/fact";

/* Created by staff of the U.S. Securities and Exchange Commission.
 * Data and content created by government employees within the scope of their employment
 * are not subject to domestic copyright protection. 17 U.S.C. 105.
 */


//For the facts in the HTML that have no IDs...
export class FactIdAllocator
{
    private facts: Map<string, SingleFact>;
    private noIdFactMap: Map<string, Array<string>> | null = null;

    constructor(facts: Map<string, SingleFact>)
    {
        this.facts = facts;
    }

    public getId(contextRef?: string | null, name?: string | null): string | null
    {
        if (this.noIdFactMap == null)
        {
            let m = new Map<string, Array<string>>();
            this.noIdFactMap = [...this.facts.values()]
                .map(({ id, name, contextRef}) => [JSON.stringify({ name, contextRef }), id])
                .reduce((acc, [nameCtxref, id]) =>
                {
                    let idList = acc.get(nameCtxref) || [];
                    idList.push(id);
                    acc.set(nameCtxref, idList);

                    return acc;
                }, m);
        }

        const key = JSON.stringify({ name, contextRef });
        return this.noIdFactMap.get(key)?.shift() || null;
    }
}
