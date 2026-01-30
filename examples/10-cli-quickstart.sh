#!/usr/bin/env bash
#
# 10-cli-quickstart.sh - Quick start using CLI commands
#
# Demonstrates the new human-friendly CLI syntax
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Brane"

echo "Using CLI command: brane init"
"$BRANE" init

section "Create Sample Files"

mkdir -p src

cat > src/auth.ts << 'EOF'
export class AuthService {
  login(user: string, pass: string): boolean {
    return true
  }
}
EOF

cat > src/db.ts << 'EOF'
export class DatabasePool {
  query(sql: string): any[] {
    return []
  }
}
EOF

echo "Created src/auth.ts and src/db.ts"

section "Scan Files"

echo "Using CLI command: brane scan src/"
"$BRANE" scan src/

section "Create Concepts"

echo "Using CLI command: brane concept create --name ... --type ..."
"$BRANE" concept create --name "AuthService" --type "Entity"
"$BRANE" concept create --name "DatabasePool" --type "Entity"

section "List Concepts"

echo "Using CLI command: brane concept list"
"$BRANE" concept list

section "Create Edges"

echo "Using CLI command: brane edge create --from ... --to ... --rel ..."
"$BRANE" edge create --from 1 --to 2 --rel "DEPENDS_ON"

section "List Edges"

echo "Using CLI command: brane edge list"
"$BRANE" edge list

section "List Rules"

echo "Using CLI command: brane rule list"
"$BRANE" rule list

section "Verify Graph"

echo "Using CLI command: brane verify"
"$BRANE" verify

section "JSON Output Mode"

echo "Using CLI command: brane concept list --json"
"$BRANE" concept list --json

success "CLI quickstart complete!"
