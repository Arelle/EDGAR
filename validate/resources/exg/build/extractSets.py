"""Extract the EDGAR XBRL Guide's Set Definitions (EXG 1.1, Tables 6-1 to 6-4) from its Word source (.docx).

Usage: python3 extractSets.py <guide.docx> <exg-set-definitions.json> <edition label>

Writes the plugin resource validate/resources/exg-set-definitions.json: submission sets (Table 6-1), submission set
suffixes (Table 6-2), entity sets (Table 6-3) and instance types (Table 6-4), in the guide's own codes and wording.
Keys are the guide's terms and column headings in camelCase (submissionSets, submissionTypes, entitySets,
instanceTypes; Table 6-4's Submission Set, Included Entity Set, Excluded Entity Sets, Exhibit Type, Instance Type).
Tables are found by their header rows, not by position, and text is read as extract.py reads it (tracked changes
accepted).

Where the guide's text cannot be used as written, CORRECTIONS below replaces it, and every replacement made is
listed in the output under "corrections", so nothing is changed silently. Each correction should also be reported to
the guide's author; when the guide is fixed, the correction stops applying and is reported as unused, and is removed.
"""
import json, re, sys, zipfile
from lxml import etree
from extract import ns, q, rows, text

# (table, code, as written, replacement); none needed since the November 2026 draft, which fixed EBP "11K" (11-K) and
# AM "SD/A#201" (SD/A%201)
CORRECTIONS = [
]

def tables(path):
    body = etree.fromstring(zipfile.ZipFile(path).read("word/document.xml")).find("w:body", ns)
    for el in body:
        if el.tag == q("tbl"):
            rs = [acc for acc, *_ in rows(el)]
            if rs:
                yield rs[0], [r for r in rs[1:] if any(r)]

def splitList(s):
    return [x.strip() for x in s.split(",") if x.strip()]

def extractSets(path, edition):
    out = {"comment": "EXG 1.1 Set Definitions, generated from the EDGAR XBRL Guide, %s, Tables 6-1 to 6-4, by extractSets.py "
                      "(validate/resources/exg/build). Do not edit by hand: regenerate." % edition,
           "edition": edition}
    for header, body in tables(path):
        if header[:3] == ["Code", "Definition", "Submission Types"]:
            out["submissionSets"] = {r[0]: {"definition": r[1], "submissionTypes": splitList(r[2])} for r in body}
        elif header[:2] == ["Suffix", "Meaning"]:
            out["submissionSetSuffixes"] = {r[0]: r[1] for r in body}
        elif header[:2] == ["Code", "Description"] and any(r[0] == "ALL" for r in body):
            out["entitySets"] = {r[0]: r[1] for r in body}
        elif header and header[-1].replace(" ", "") == "InstanceType":
            out["instanceTypes"] = [{"submissionSet": r[0], "includedEntitySet": r[1],
                                     "excludedEntitySets": splitList(r[2]),
                                     "exhibitType": r[3] or None, "instanceType": r[4]} for r in body]
    missing = [k for k in ("submissionSets", "submissionSetSuffixes", "entitySets", "instanceTypes") if k not in out]
    if missing:
        raise SystemExit("tables not found: %s" % missing)
    applied = []
    for table, code, asWritten, replacement in CORRECTIONS:
        types = out[table].get(code, {}).get("submissionTypes", [])
        if asWritten in types:
            types[types.index(asWritten)] = replacement
            applied.append({"table": table, "code": code, "asWritten": asWritten, "used": replacement})
        else:
            print("correction no longer applies (guide fixed?): %s %s %r" % (table, code, asWritten))
    out["corrections"] = applied
    return out

if __name__ == "__main__":
    sets = extractSets(sys.argv[1], sys.argv[3])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(sets, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("submission sets %d, suffixes %d, entity sets %d, instance type rows %d, corrections applied %d" % (
        len(sets["submissionSets"]), len(sets["submissionSetSuffixes"]), len(sets["entitySets"]),
        len(sets["instanceTypes"]), len(sets["corrections"])))
