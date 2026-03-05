#!/usr/bin/env bash
#
# smoke test — ingest the corpus through brane with the REAL LLM,
# dump the concept graphs for human review.
#
# usage:
#   bash try/smoke.sh           # run smoke test
#   bash try/smoke.sh --mock    # run with mock LLM (fast, deterministic)
#
set -e

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export BRANE_EMBED_MOCK=1  # embeddings don't matter for this test

if [[ "${1:-}" == "--mock" ]]; then
  export BRANE_LLM_MOCK=1
  echo "=== smoke test (mock LLM) ==="
else
  unset BRANE_LLM_MOCK
  echo "=== smoke test (real LLM) ==="
fi

OUTDIR="$BRANE_ROOT/try/smoke-output"
rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"

# --- workspace ---
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT
cd "$WORKDIR"

echo '{}' | brane /body/init  > /dev/null 2>&1
echo '{}' | brane /mind/init  > /dev/null 2>&1

# --- copy corpus into workspace ---
cp -r "$BRANE_ROOT/corpus/code" "$WORKDIR/code"
cp -r "$BRANE_ROOT/corpus/prose" "$WORKDIR/prose"

echo ""
echo "--- ingesting code/ ---"
brane ingest code/
echo ""
echo "--- ingesting prose/ ---"
brane ingest prose/

# --- dump everything ---
echo ""
echo "=========================================="
echo "  GRAPH SUMMARY"
echo "=========================================="
brane graph summary | tee "$OUTDIR/summary.txt"

echo ""
echo "=========================================="
echo "  CONCEPTS"
echo "=========================================="
brane graph concepts | tee "$OUTDIR/concepts.txt"

echo ""
echo "=========================================="
echo "  EDGES"
echo "=========================================="
brane graph edges | tee "$OUTDIR/edges.txt"

echo ""
echo "=========================================="
echo "  VISUALIZATION (ascii)"
echo "=========================================="
brane graph viz | tee "$OUTDIR/viz-ascii.txt"

echo ""
echo "=========================================="
echo "  VISUALIZATION (mermaid)"
echo "=========================================="
brane graph viz -f mermaid | tee "$OUTDIR/viz-mermaid.txt"

# --- per-file JSON dumps ---
echo ""
echo "=========================================="
echo "  FULL JSON DUMPS"
echo "=========================================="

brane graph summary --json > "$OUTDIR/summary.json"
echo "  wrote $OUTDIR/summary.json"

brane graph concepts --json > "$OUTDIR/concepts.json"
echo "  wrote $OUTDIR/concepts.json"

brane graph edges --json > "$OUTDIR/edges.json"
echo "  wrote $OUTDIR/edges.json"

brane graph viz --json > "$OUTDIR/viz.json"
echo "  wrote $OUTDIR/viz.json"

# --- provenance (which concepts came from which files) ---
# cross-reference provenance IDs with concept names
CONCEPTS_JSON=$(brane graph concepts --json 2>/dev/null)

echo ""
echo "=========================================="
echo "  PROVENANCE (file → concepts)"
echo "=========================================="
{
for f in code/panopticon.ts code/kingmaker.ts code/oracle.ts prose/safety-theater.md prose/move-fast.md prose/alignment-washing.md; do
  url="file://$WORKDIR/$f"
  echo ""
  echo "--- $f ---"
  IDS=$(echo "{\"file_url\": \"$url\"}" | brane /mind/provenance/list 2>&1 | jq -r '.result.links[]?.concept_id' 2>/dev/null)
  if [[ -z "$IDS" ]]; then
    echo "  (no provenance)"
  else
    for id in $IDS; do
      name=$(echo "$CONCEPTS_JSON" | jq -r ".result.concepts[] | select(.id == $id) | \"\(.name) (\(.type))\"" 2>/dev/null)
      echo "  [$id] $name"
    done
  fi
done
} | tee "$OUTDIR/provenance.txt"

echo ""
echo "=========================================="
echo "  DONE — review files in:"
echo "  $OUTDIR/"
echo "=========================================="
ls -la "$OUTDIR/"
