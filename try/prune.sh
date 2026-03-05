#!/usr/bin/env bash
#
# Whitebox spike: does brane prune work end-to-end?
# Uses BRANE_LLM_MOCK=1 for ingest (nested claude CLI won't work).
# The mock extracts PascalCase basename as concept, which is enough to test prune.
#
set -e

export BRANE_LLM_MOCK=1
export BRANE_EMBED_MOCK=1

BRANE="$(cd "$(dirname "$0")/.." && pwd)/bin/brane"
WORK="$(mktemp -d)"
trap "rm -rf $WORK" EXIT

echo "=== spike: prune ==="
echo "workdir: $WORK"
echo "brane: $BRANE"
echo ""

cd "$WORK"

# 1. Init
echo "--- init ---"
$BRANE init .
echo ""

# 2. Create test files
echo "--- create files ---"
mkdir -p src
cat > src/AuthService.ts << 'EOF'
export class AuthService {
  async login(username: string, password: string): Promise<void> {}
}
EOF

cat > src/Logger.ts << 'EOF'
export class Logger {
  log(message: string): void { console.log(message) }
}
EOF
echo "created src/AuthService.ts and src/Logger.ts"
echo ""

# 3. Ingest both files (mock LLM extracts PascalCase basename as concept)
echo "--- ingest ---"
$BRANE ingest src/ --json 2>&1
echo ""

# 4. Show state before prune
echo "--- concepts before prune ---"
$BRANE concept list --json 2>&1
echo ""

# 5. Dry run prune (nothing to prune yet — all provenance valid)
echo "--- prune dry-run (nothing stale) ---"
$BRANE prune --dry-run --json 2>&1
echo ""

# 6. Delete AuthService.ts from disk, then re-scan body
echo "--- delete src/AuthService.ts and re-scan ---"
rm src/AuthService.ts
$BRANE body scan . --json 2>&1
echo ""

# 7. Dry run prune (should find orphans from deleted file)
echo "--- prune dry-run (orphans expected) ---"
$BRANE prune --dry-run --json 2>&1
echo ""

# 8. Actual prune
echo "--- prune (actual) ---"
$BRANE prune --json 2>&1
echo ""

# 9. Verify state after prune — AuthService concept should be gone, Logger should remain
echo "--- concepts after prune ---"
$BRANE concept list --json 2>&1
echo ""

# 10. Prune again (nothing left to prune)
echo "--- prune again (nothing to prune) ---"
$BRANE prune --json 2>&1
echo ""

echo "=== spike complete ==="
