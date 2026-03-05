#!/usr/bin/env bash
#
# run-demo.sh — clone a repo, ingest through brane, dump results, cleanup
#
# usage: bash demos/run-demo.sh <github-org/repo> <paths...>
#
# paths can be files or directories. use small, targeted selections
# to keep LLM extraction time reasonable (~20s per file).
#
set -e

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export BRANE_EMBED_MOCK=1

REPO="$1"
shift
PATHS=("$@")

if [[ -z "$REPO" ]]; then
  echo "usage: bash demos/run-demo.sh <org/repo> <paths...>"
  exit 1
fi

REPO_NAME=$(echo "$REPO" | tr '/' '-')
DEMO_DIR="$BRANE_ROOT/demos/$REPO_NAME"
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT

echo "=== demo: $REPO ==="
echo "  output: $DEMO_DIR/"
echo ""

# --- clone (shallow) ---
echo "--- cloning $REPO (shallow) ---"
git clone --depth 1 "https://github.com/$REPO.git" "$WORKDIR/repo" 2>&1 | tail -2
echo ""

# --- setup brane workspace ---
cd "$WORKDIR/repo"
echo '{}' | brane /body/init  > /dev/null 2>&1
echo '{}' | brane /mind/init  > /dev/null 2>&1

# --- ingest each path ---
for p in "${PATHS[@]}"; do
  if [[ -e "$p" ]]; then
    echo "--- ingesting: $p ---"
    brane ingest "$p" 2>&1 | grep -E "^(\[|done|ingesting|summary)" || true
    echo ""
  else
    echo "--- skipping (not found): $p ---"
  fi
done

# --- dump results ---
mkdir -p "$DEMO_DIR"

echo "--- dumping graph ---"
brane graph summary          > "$DEMO_DIR/summary.txt" 2>&1
brane graph summary --json   > "$DEMO_DIR/summary.json" 2>&1
brane graph concepts         > "$DEMO_DIR/concepts.txt" 2>&1
brane graph concepts --json  > "$DEMO_DIR/concepts.json" 2>&1
brane graph edges            > "$DEMO_DIR/edges.txt" 2>&1
brane graph edges --json     > "$DEMO_DIR/edges.json" 2>&1
brane graph viz              > "$DEMO_DIR/viz-ascii.txt" 2>&1
brane graph viz -f mermaid --limit 100 > "$DEMO_DIR/viz-mermaid.txt" 2>&1
brane graph viz --json       > "$DEMO_DIR/viz.json" 2>&1

# provenance
CONCEPTS_JSON=$(brane graph concepts --json 2>/dev/null)
{
echo "# Provenance"
echo ""
brane /body/files/list 2>/dev/null | jq -r '.result.files[].url' 2>/dev/null | sort | while read -r url; do
  short=$(echo "$url" | sed "s|file://$WORKDIR/repo/||")
  echo "## $short"
  echo ""
  IDS=$(echo "{\"file_url\": \"$url\"}" | brane /mind/provenance/list 2>&1 | jq -r '.result.links[]?.concept_id' 2>/dev/null)
  if [[ -z "$IDS" ]]; then
    echo "(no provenance)"
  else
    echo "| ID | Concept | Type |"
    echo "|----|---------|------|"
    for id in $IDS; do
      echo "$CONCEPTS_JSON" | jq -r ".result.concepts[] | select(.id == $id) | \"| $id | \(.name) | \(.type) |\"" 2>/dev/null
    done
  fi
  echo ""
done
} > "$DEMO_DIR/provenance.md"

cat "$DEMO_DIR/summary.txt"
echo ""
echo "=== done: $DEMO_DIR/ ==="
