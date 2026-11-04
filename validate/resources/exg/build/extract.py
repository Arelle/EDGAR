"""Extract the EDGAR XBRL Guide's validation and concept tables from its Word source (.docx).

Usage: python3 extract.py <guide.docx> <out.json>

Section numbers are computed from the Heading1..Heading4 paragraph styles, which carry the guide's outline
numbering. Text is taken in the ACCEPTED view of tracked changes (insertions kept, deletions dropped); each
row also records whether it carries tracked changes and its text in the ORIGINAL view (insertions dropped,
deletions kept), so the changes in a draft are visible without Word.

Also recorded, as "citations", the EFM sections each section's prose and other (non-validation, non-concept)
tables cite ("EFM 6.7.20", "§ 6.5.41", "(Formerly 6.7.23)"): sections such as 5.7 or 11.14 state a rule in prose
without a validation table, and validate/tools/directCodes.py uses these citations for checks no validation row cites.
"""
import json, re, sys, zipfile
from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
ns = {"w": W}
q = lambda t: "{%s}%s" % (W, t)
INS, DEL = (q("ins"), q("moveTo")), (q("del"), q("moveFrom"))

# the guide's validation tables vary their headers; these name the same columns
VALIDATION_COLUMNS = ["Incl", "Excl", "c", "Check", "f", "On failure", "s", "EFM v68 Ref"]
COLUMN_SYNONYMS = {"Types": "Incl", "Assertion": "Check", "Codes": "On failure", "Ref": "EFM v68 Ref", "": "EFM v68 Ref"}
efmCitationPattern = re.compile(r"(?:EFM|§|Formerly)\s*(?:v[0-9]+\s*)?(?:§\s*)?([0-9]+(?:\.[0-9]+)+)")

def text(el, view="accepted"):
    skip = DEL if view == "accepted" else INS
    out = []
    for t in el.iter(q("t"), q("delText"), q("tab"), q("br"), q("noBreakHyphen"), q("softHyphen"), q("sym")):
        anc = {a.tag for a in t.iterancestors()}
        if anc & set(skip):
            continue
        if t.tag in (q("t"), q("delText")):
            if t.tag == q("delText") and view == "accepted":
                continue
            out.append(t.text or "")
        elif t.tag == q("noBreakHyphen"):
            out.append("-")
        elif t.tag == q("softHyphen"):
            pass
        elif t.tag == q("sym"):
            out.append(chr(int(t.get(q("char")), 16)) if t.get(q("char")) else "")
        else:
            out.append(" ")
    return re.sub(r"\s+", " ", "".join(out).replace("\xa0", " ")).strip()

def hasChanges(el):
    return any(True for _ in el.iter(*INS, *DEL))

def style(p):
    s = p.find("w:pPr/w:pStyle", ns)
    return s.get(q("val")) if s is not None else ""

def rows(tbl):
    for tr in tbl.findall("w:tr", ns):
        # a row deleted as a whole in tracked changes
        rowDeleted = tr.find("w:trPr/w:del", ns) is not None
        rowInserted = tr.find("w:trPr/w:ins", ns) is not None
        cells = tr.findall("w:tc", ns)
        yield ([text(c) for c in cells], [text(c, "original") for c in cells],
               rowInserted, rowDeleted, any(hasChanges(c) for c in cells))

def extract(path):
    body = etree.fromstring(zipfile.ZipFile(path).read("word/document.xml")).find("w:body", ns)
    counters, cur, title = [0] * 6, "", ""
    sections, concepts, validations, other = {}, [], [], []
    rowNum, lastValidationSection = {}, None
    citations = {}  # section -> EFM sections its prose and non-validation tables cite ("EFM 6.7.20", "§ 6.5.41")
    def cite(section, s):
        for ref in efmCitationPattern.findall(s or ""):
            citations.setdefault(section, set()).add(ref)
    for el in body:
        if el.tag == q("p"):
            st = style(el)
            m = re.fullmatch(r"Heading([1-6])", st)
            if m and text(el):
                lv = int(m.group(1)); counters[lv - 1] += 1
                counters[lv:] = [0] * (6 - lv)
                cur, title = ".".join(map(str, counters[:lv])), text(el)
                sections[cur] = title
            elif cur:
                cite(cur, text(el))
        elif el.tag == q("tbl"):
            rs = list(rows(el))
            if not rs:
                continue
            header = [COLUMN_SYNONYMS.get(h, h) for h in rs[0][0]]
            if header[0] == "Incl" or ("Check" in header and "On failure" in header):
                cols, body = header, rs[1:]
            elif lastValidationSection == cur and len(rs[0][0]) >= 6 and rs[0][0][6:7] and rs[0][0][6] in ("E", "W", "I"):
                cols, body = VALIDATION_COLUMNS, rs      # a continuation table without a header row
            else:
                cols = None
            if cols:
                lastValidationSection = cur
                for acc, orig, ins, dele, chg in body:
                    if not any(acc):                     # blank spacer row (the spreadsheet does not count them)
                        continue
                    rowNum[cur] = rowNum.get(cur, 0) + 1
                    rec = dict.fromkeys(VALIDATION_COLUMNS, "")
                    rec.update(zip(cols, acc))
                    rec.update(Section=cur, Row=rowNum[cur], header=rs[0][0] if cols is header else None,
                               rowInserted=ins, rowDeleted=dele, changed=chg, original=orig if chg else None)
                    validations.append(rec)
            elif rs[0][0][:2] == ["Concept", "#"]:
                for acc, orig, ins, dele, chg in rs[1:]:
                    if not any(acc):
                        continue
                    rec = dict(zip(["Concept", "Elt", "Type or regex", "Meaning"], acc))
                    rec.update(Section=cur, rowInserted=ins, rowDeleted=dele, changed=chg,
                               original=orig if chg else None)
                    concepts.append(rec)
            else:
                other.append(dict(Section=cur, header=rs[0][0], rows=len(rs) - 1))
                for acc, *_ in rs:
                    cite(cur, " ".join(acc))
    citations = {s: sorted(refs, key=lambda r: [int(x) for x in r.split(".")]) for s, refs in citations.items()}
    return dict(source=path, sections=sections, concepts=concepts, validations=validations, otherTables=other,
                citations=citations)

if __name__ == "__main__":
    r = extract(sys.argv[1])
    json.dump(r, open(sys.argv[2], "w"), indent=1, ensure_ascii=False)
    v, c = r["validations"], r["concepts"]
    print("sections", len(r["sections"]), "validation rows", len(v), "concept rows", len(c), "other tables", len(r["otherTables"]))
    print("validation rows by chapter.section:", sorted({(x["Section"].split(".")[0] + "." + x["Section"].split(".")[1]) for x in v}))
    print("rows with tracked changes: validations", sum(x["changed"] or x["rowInserted"] or x["rowDeleted"] for x in v),
          " concepts", sum(x["changed"] or x["rowInserted"] or x["rowDeleted"] for x in c))
    print("distinct validation headers:", {tuple(x["header"] or ["(continuation)"]) for x in v})
