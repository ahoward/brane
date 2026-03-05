#!/usr/bin/env bash
#
# Whitebox spike: does AST extraction work end-to-end?
# NO MOCKS. Real tree-sitter. Real files.
#
set -e

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export BRANE_EMBED_MOCK=1

echo "=== spike: extract-ast ==="

# test with bun run (not compiled binary — WASM loading from node_modules)
echo "--- panopticon.ts ---"
CONTENT=$(cat "$BRANE_ROOT/corpus/code/panopticon.ts")
echo "{\"file_url\": \"file:///project/corpus/code/panopticon.ts\", \"content\": $(echo "$CONTENT" | jq -Rs .)}" | bun run "$BRANE_ROOT/src/cli.ts" /calabi/extract-ast 2>&1
echo ""

echo "--- kingmaker.ts ---"
CONTENT=$(cat "$BRANE_ROOT/corpus/code/kingmaker.ts")
echo "{\"file_url\": \"file:///project/corpus/code/kingmaker.ts\", \"content\": $(echo "$CONTENT" | jq -Rs .)}" | bun run "$BRANE_ROOT/src/cli.ts" /calabi/extract-ast 2>&1
echo ""

echo "--- oracle.ts ---"
CONTENT=$(cat "$BRANE_ROOT/corpus/code/oracle.ts")
echo "{\"file_url\": \"file:///project/corpus/code/oracle.ts\", \"content\": $(echo "$CONTENT" | jq -Rs .)}" | bun run "$BRANE_ROOT/src/cli.ts" /calabi/extract-ast 2>&1
echo ""

echo "--- unsupported: README.md ---"
echo '{"file_url": "file:///project/README.md", "content": "# Hello"}' | bun run "$BRANE_ROOT/src/cli.ts" /calabi/extract-ast 2>&1
echo ""

echo "=== spike complete ==="
