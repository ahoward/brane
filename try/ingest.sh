#!/usr/bin/env bash
#
# Whitebox spike: does brane ingest work end-to-end?
# NO MOCKS. Real API. Real files. Proof of life.
#
set -e

BRANE="$(cd "$(dirname "$0")/.." && pwd)/bin/brane"
WORK="$(mktemp -d)"
trap "rm -rf $WORK" EXIT

echo "=== spike: ingest ==="
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
cat > src/auth.ts << 'EOF'
export class AuthService {
  private tokenStore: TokenStore
  constructor(store: TokenStore) { this.tokenStore = store }
  async login(username: string, password: string): Promise<Token> {
    const user = await UserRepository.findByUsername(username)
    return this.tokenStore.create(user.id)
  }
}
export class TokenStore {
  async create(userId: string): Promise<Token> { return {} as Token }
}
interface Token { value: string; userId: string }
EOF

cat > src/logger.ts << 'EOF'
export class Logger {
  log(message: string): void { console.log(message) }
  error(message: string): void { console.error(message) }
}
EOF
echo "created src/auth.ts and src/logger.ts"
echo ""

# 3. Ingest single file
echo "--- ingest single file ---"
$BRANE ingest src/auth.ts --json 2>&1
echo ""

# 4. Ingest directory (logger.ts is new, auth.ts is unchanged)
echo "--- ingest directory (auth.ts unchanged, logger.ts new) ---"
$BRANE ingest src/ --json 2>&1
echo ""

# 5. Ingest again (both unchanged)
echo "--- ingest again (all unchanged) ---"
$BRANE ingest src/ --json 2>&1
echo ""

# 6. Dry run
echo "--- dry run ---"
# Modify auth.ts to trigger re-extraction in dry run
echo "// modified" >> src/auth.ts
$BRANE ingest src/auth.ts --dry-run --json 2>&1
echo ""

# 7. Check graph state
echo "--- concepts ---"
$BRANE concept list --json 2>&1
echo ""

echo "--- edges ---"
$BRANE edge list --json 2>&1
echo ""

echo "=== spike complete ==="
