import { Reference, SingleFact } from "./fact";
import { InstanceFile } from "./instance-file";
import { Section } from "./meta";
import { UrlParams } from "./url-params";


//TODO: make `instance` plural (`instances`)
export type FMFinalResponse = { instance: InstanceFile[], sections: Section[], std_ref: Record<string, Reference>, error?: false };
export type ErrorResponse = { error: true, messages: string[] };
export type All = { all: FMFinalResponse };
export type FMResponse = All | { xhtml: string; isNcsr: boolean } | { facts: Map<string, SingleFact> };

export type FetchMergeArgs =
{
    absolute: string,
    params: UrlParams,
    instance?: InstanceFile[] | null,
    customPrefix?: string,
    std_ref: { [key: string]: Reference },
};
