#!/bin/sh
# Rebuild the EXG resources from the guide's Word source.  See ../handoffs/README.md.
#   sh build.sh <guide.docx> "<edition>" "<review note>" [work dir]
# Writes validate/resources/exg-set-definitions.json and efm-exg-references.json, and in the work dir the extracted
# tables (guide.json), the crosswalk and fresh reference candidates.  The candidates are NOT used until reviewed:
# compare work/refs/candidates.tsv with references-candidates.tsv, and work/refs/direct-candidates.tsv and
# work/refs/elo-candidates.tsv with the files of the same names here, settle the differences in review, then copy
# them over and run this again.
set -e
DOCX=${1:?guide .docx}; EDITION=${2:?edition, e.g. "November 2026"}; REVIEW=${3:?review note}
HERE=$(cd "$(dirname "$0")" && pwd); VALIDATE=$(cd "$HERE/../../.." && pwd); WORK=${4:-$(mktemp -d)}
python3 "$HERE/extractSets.py" "$DOCX" "$VALIDATE/resources/exg-set-definitions.json" "$EDITION"
python3 "$HERE/extract.py" "$DOCX" "$WORK/guide.json"
python3 "$VALIDATE/tools/crosswalk.py" "$VALIDATE" "$WORK/guide.json" "$WORK/crosswalk"
python3 "$VALIDATE/tools/references.py" "$WORK/crosswalk" "$WORK/guide.json" "$VALIDATE" "$WORK/refs"
# Arelle's own modules log EFM codes too; scanned where the plugin is installed in Arelle (arelle/plugin/EDGAR)
ARELLE=$(cd "$VALIDATE/../../.." && pwd); [ -f "$ARELLE/ValidateFilingText.py" ] || ARELLE=
python3 "$VALIDATE/tools/directCodes.py" "$WORK/guide.json" "$VALIDATE/.." "$WORK/refs/direct-candidates.tsv" $ARELLE
python3 "$VALIDATE/tools/eloCodes.py" "$WORK/guide.json" "$VALIDATE" "$WORK/refs/elo-candidates.tsv"
python3 "$HERE/buildReferences.py" "$HERE/references-candidates.tsv" "$HERE/absence-candidates.tsv" "$HERE/direct-candidates.tsv" "$HERE/elo-candidates.tsv" "$EDITION" "$REVIEW" "$VALIDATE/resources/efm-exg-references.json"
for f in candidates.tsv:references-candidates.tsv absence-candidates.tsv:absence-candidates.tsv direct-candidates.tsv:direct-candidates.tsv elo-candidates.tsv:elo-candidates.tsv; do
    if cmp -s "$WORK/refs/${f%%:*}" "$HERE/${f##*:}"; then
        echo "${f##*:} unchanged"
    else
        echo "${f##*:} CHANGED: review $WORK/refs/${f%%:*} against $HERE/${f##*:}"
    fi
done
echo "work files in $WORK"
