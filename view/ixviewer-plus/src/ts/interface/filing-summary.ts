export interface FilingSummary
{
    //These fields are read from filingSummary.xml and cannot be renamed to be correct camelCase
    BaseTaxonomies: { BaseTaxonomy: Array<TextValue> };
    ContextCount: TextValue;
    ElementCount: TextValue;
    EntityCount: TextValue;
    FootnotesReported: TextValue;
    HasCalculationLinkbase: TextValue;
    HasPresentationLinkbase: TextValue;
    InputFiles: TextValue & { File: { _attributes?: { original?: string, isNcsr?: string }}[] };
    Logs: TextValue;
    MyReports: TextValue & { Report: FilingSummReport[] };
    ProcessingTime: TextValue;
    ReportFormat: TextValue;
    ScenarioCount: TextValue;
    SegmentCount: TextValue;
    SupplementalFiles: { File: Array<TextValue> };
    TuplesReported: TextValue;
    UnitCount: TextValue;
    Version: TextValue;
}

export interface FilingSummReport
{
    _attributes: { instance: string };
    MenuCategory: TextValue;
    HasEmbeddedReports: TextValue;
    HtmlFileName: TextValue;
    IsDefault: TextValue;
    LongName: TextValue;
    Position: TextValue;
    ReportType: TextValue;
    Role: TextValue;
    ShortName: TextValue;
}

type TextValue = { _text: string };
