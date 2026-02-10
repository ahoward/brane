#!/usr/bin/env bash
#
# Whitebox spike: does LLM extraction work end-to-end?
# NO MOCKS. Real API. Real files. Proof of life.
#
set -e

BRANE="$(cd "$(dirname "$0")/.." && pwd)/bin/brane"
WORK="$(mktemp -d)"
trap "rm -rf $WORK" EXIT

echo "=== spike: extract-llm ==="
echo "workdir: $WORK"
echo "brane: $BRANE"
echo ""

cd "$WORK"

# 1. Init
echo "--- init ---"
$BRANE init .
echo ""

# 2. Create a test file and scan it
echo "--- create + scan ---"
mkdir -p src
cat > src/auth.ts << 'EOF'
export class AuthService {
  private tokenStore: TokenStore

  constructor(store: TokenStore) {
    this.tokenStore = store
  }

  async login(username: string, password: string): Promise<Token> {
    const user = await UserRepository.findByUsername(username)
    if (!user || !user.verifyPassword(password)) {
      throw new AuthError("Invalid credentials")
    }
    return this.tokenStore.create(user.id)
  }

  async logout(token: string): Promise<void> {
    await this.tokenStore.revoke(token)
  }
}

export class TokenStore {
  async create(userId: string): Promise<Token> { /* ... */ }
  async revoke(token: string): Promise<void> { /* ... */ }
  async verify(token: string): Promise<boolean> { /* ... */ }
}

interface Token {
  value: string
  userId: string
  expiresAt: Date
}
EOF
$BRANE scan .
echo ""

# 3. Extract with dry run first
echo "--- extract dry-run ---"
$BRANE extract src/auth.ts --dry-run --json 2>&1 | head -40
echo ""

# 4. Extract for real
echo "--- extract ---"
$BRANE extract src/auth.ts --json 2>&1
echo ""

# 5. Check graph state
echo "--- concepts ---"
$BRANE concept list --json 2>&1
echo ""

echo "--- edges ---"
$BRANE edge list --json 2>&1
echo ""

echo "=== spike complete ==="
