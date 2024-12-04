import { Xbrltype, reference } from "./meta";

export type Facts = { key: string, value: SingleFact } & Record<string, string>;

export interface SingleFact {
    contextRef: string;
    name: string;
    ix: string;
    id: string;
    value?: string;
    isAmountsOnly: boolean;
    isTextOnly: boolean;
    isNegativeOnly: boolean;
    isHTML: boolean;
    isSelected: boolean;
    period: string;
    periodDates?: string[];
    scale: string | null;
    decimals?: Decimals | null;
    sign: string | null;
    footnote: null | string;
    isEnabled: boolean;
    isHighlight: boolean;
    references: Array<ReferenceAsArray> | null;
    calculations: Array<Calculation[]>;
    labels: LabelElement[];
    xbrltype: string;
    localname: string;
    nsuri: string;
    presentation: string[];
    raw?: string;
    format?: null | string;
    isAdditional?: boolean;
    isCustom?: boolean;
    file: string | null;
    unitRef?: string;
    measure?: string;
    balance?: Balance;
    segment?: Array<SegmentClass[] | SegmentClass>;
    isContinued: boolean;
    continuedIDs: Array<string>;
    "xsi:nil"?: string;
    "xml:lang"?: string;
}

/** somehow, an object in fetch-merge metamorphosizes from SingleFact into this */
export interface SingleFact2
{
    name: string;
    segment: [{ dimension: string, axis: string }];
    references: reference[];
    calculations: [{ label: string, value: string }] | [];
    labels: string[];
    filter: { labels: string; definitions: string; };
    balance: string;
    xbrltype: Xbrltype | null;
    localname: string | null;
    nsuri: string | null;
    presentation: string[] | null | undefined;
}

export enum Balance {
    Credit = "Credit",
    Debit = "Debit",
}

export interface Calculation {
    label: LabelEnum;
    value: string;
}

export enum LabelEnum
{
    Balance = "Balance",
    Parent = "Parent",
    Section = "Section",
    Weight = "Weight",
}

export enum Decimals
{
    Tens = "Tens",
    Hundreds = "Hundreds",
    Thousands = "Thousands",
    TenThousands = "Ten Thousands",
    HundredThousands = "Hundred Thousands",
    Millions = "Millions",
    TenMillions = "Ten Millions",
    HundredMillions = "Hundred Millions",
    Billions = "Billions",
    TenBillions = "Ten Billions",
    HundredBillions = "Hundred Billions",
    Trillions = "Trillions",

    Tenths = "Tenths",
    Hundredths = "Hundredths",
    Thousandths = "Thousandths",
    TenThousandths = "Ten Thousandths",
    HundredThousandths = "Hundred Thousandths",
    Millionths = "Millionths",
}

export interface LabelElement {
    Documentation: string;
    Label: string;
    "Terse Label"?: string;
    "Verbose Label"?: string;
    "Negated Terse Label"?: string;
    "Total Label"?: string;
    "Negated Label"?: string;
    "Period End Label"?: string;
    "Period Start Label"?: string;
    "Negated Period End Label"?: string;
    "Negated Period Start Label"?: string;
    "Negated Total Label"?: string;
}

// TODO: ask knowledge bearers if we maybe we create distint orders for each taxonomy body (fasb, sec, etc...) as they each probably have their own properties.
export interface Reference {
    Publisher: string;
    Name: string;
    Number?: string;
    IssueDate?: string;
    Chapter?: string,
    Article?: string;
    Note?: string;
    Section?: string;
    Subsection?: string;
    Topic?: string;
    SubTopic?: string;
    Paragraph?: string;
    Subparagraph?: string;
    Clause?: string,
    Subclause?: string,
    Example?: string,
    Page?: string,
    Exhibit?: string,
    Footnote?: string,
    Sentence?: string;
    URI?: string;
    URIDate?: string,
}

interface RefProp {
    string: string,
}
export interface ReferenceAsArray {
    ReferenceMember: Array<RefProp>
}

export interface SegmentClass {
    axis: string;
    dimension: string;
    type: string;
    value?: null;
}
