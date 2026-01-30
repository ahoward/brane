#!/usr/bin/env bash
#
# 08-calabi-extract.sh - Extract concepts from code using LLM
#
# Demonstrates: /calabi/extract endpoint (requires LLM API key)
# Note: This example shows the interface; actual extraction needs ANTHROPIC_API_KEY
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body and Mind"

run_json "/body/init" '{}'
run_json "/mind/init" '{}'

section "Create Sample Code"

mkdir -p src

cat > src/user-service.ts << 'EOF'
// UserService manages user lifecycle
export class UserService {
  constructor(private db: Database) {}

  async createUser(email: string, password: string): Promise<User> {
    const hash = await bcrypt.hash(password, 10)
    return this.db.users.create({ email, passwordHash: hash })
  }

  async authenticate(email: string, password: string): Promise<boolean> {
    const user = await this.db.users.findByEmail(email)
    if (!user) return false
    return bcrypt.compare(password, user.passwordHash)
  }
}
EOF

echo "Created src/user-service.ts"
cat src/user-service.ts
echo ""

section "Scan File"

run_json "/body/scan" '{"path": "src"}'

section "Extract Concepts (Interface Demo)"

echo "Note: Full extraction requires ANTHROPIC_API_KEY"
echo ""
echo "The /calabi/extract endpoint:"
echo "  1. Reads scanned files"
echo "  2. Sends code to LLM for analysis"
echo "  3. Creates concepts and edges automatically"
echo ""
echo "Example call (would extract UserService, Database, etc.):"
echo '  echo '\''{"path": "src"}'\'' | brane /calabi/extract'
echo ""

# Uncomment when API key is available:
# run_json "/calabi/extract" '{"path": "src"}'

success "Calabi extract demo complete!"
