#!/usr/bin/env bash
#
# 09-context-query.sh - Query context from the knowledge graph
#
# Demonstrates: /context/query endpoint
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize Body and Mind"

run_json "/body/init" '{}'
run_json "/mind/init" '{}'

section "Create Sample Files"

mkdir -p src

cat > src/auth.ts << 'EOF'
export class AuthService {
  login(user: string, pass: string): boolean { return true }
}
EOF

cat > src/db.ts << 'EOF'
export class Database {
  query(sql: string): any[] { return [] }
}
EOF

echo "Created src/auth.ts and src/db.ts"
echo ""

section "Scan Files"

run_json "/body/scan" '{"path": "src"}'

section "Create Concepts"

run_json "/mind/concepts/create" '{"name": "AuthService", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "Database", "type": "Entity"}'

section "Create Edge"

run_json "/mind/edges/create" '{"source": 1, "target": 2, "relation": "DEPENDS_ON"}'

section "Query Context"

echo "Querying context for 'Auth'..."
run_json "/context/query" '{"query": "Auth"}'

echo "Querying context for 'Database' with depth=2..."
run_json "/context/query" '{"query": "Database", "depth": 2}'

success "Context query complete!"
