#!/usr/bin/env bash
#
# dedup-spike.sh - whitebox spike for fuzzy concept deduplication
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BRANE="$PROJECT_DIR/bin/brane"

echo "=== fuzzy dedup spike ==="
echo ""

# Create temp workspace
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
cd "$TMPDIR"

# Init
"$BRANE" /body/init > /dev/null 2>&1
BRANE_EMBED_MOCK=1 "$BRANE" /mind/init > /dev/null 2>&1

# Create initial concept
echo "--- creating AuthMiddleware (Entity) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "AuthMiddleware", "type": "Entity"}'
echo ""

# Try exact duplicate
echo "--- creating AuthMiddleware again (should return existing) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "AuthMiddleware", "type": "Entity"}'
echo ""

# Try normalized match (snake_case)
echo "--- creating auth_middleware (normalized match) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "auth_middleware", "type": "Entity"}'
echo ""

# Try normalized match (kebab-case)
echo "--- creating auth-middleware (normalized match) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "auth-middleware", "type": "Entity"}'
echo ""

# Try normalized match (spaces)
echo "--- creating Auth Middleware (normalized match) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "Auth Middleware", "type": "Entity"}'
echo ""

# Try fuzzy match (typo)
echo "--- creating AuthMiddlewar (fuzzy/levenshtein match) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "AuthMiddlewar", "type": "Entity"}'
echo ""

# Should NOT match (too different)
echo "--- creating DatabaseService (should create new, too different) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "DatabaseService", "type": "Entity"}'
echo ""

# Test with fuzzy_dedup=false
echo "--- creating auth_middleware with fuzzy_dedup=false (should create new) ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create '{"name": "auth_middleware", "type": "Entity", "fuzzy_dedup": false}'
echo ""

# List all concepts
echo "--- listing all concepts ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/list '{}'
echo ""

# Test batch create with dedup
echo "--- batch create with dedup ---"
BRANE_EMBED_MOCK=1 "$BRANE" /mind/concepts/create-many '{"items": [{"name": "AuthMiddleware", "type": "Entity"}, {"name": "NewThing", "type": "Entity"}, {"name": "new_thing", "type": "Entity"}]}'
echo ""

echo "=== spike complete ==="
