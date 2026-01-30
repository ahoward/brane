#!/usr/bin/env bash
#
# 00-quickstart.sh - Complete Brane workflow demonstration
#
# Demonstrates: init → scan → concepts → search → verify
# Run time: ~5 seconds
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

# === Create sample source files ===
section "Step 1: Create sample source files"

mkdir -p src

cat > src/auth.ts << 'EOF'
// AuthService handles user authentication
export class AuthService {
  async login(username: string, password: string): Promise<boolean> {
    // Validate credentials
    return username === "admin" && password === "secret"
  }

  async logout(): Promise<void> {
    // Clear session
  }
}
EOF

cat > src/database.ts << 'EOF'
// DatabasePool manages database connections
export class DatabasePool {
  private connections: Connection[] = []

  async getConnection(): Promise<Connection> {
    // Return pooled connection
    return this.connections[0]
  }

  async close(): Promise<void> {
    // Close all connections
  }
}

interface Connection {
  query(sql: string): Promise<any>
}
EOF

cat > src/api.ts << 'EOF'
// API router for HTTP endpoints
import { AuthService } from "./auth"
import { DatabasePool } from "./database"

export class ApiRouter {
  constructor(
    private auth: AuthService,
    private db: DatabasePool
  ) {}

  async handleRequest(path: string): Promise<Response> {
    // Route to appropriate handler
    return new Response("OK")
  }
}
EOF

echo "Created: src/auth.ts, src/database.ts, src/api.ts"
echo ""

# === Initialize Body ===
section "Step 2: Initialize Body (file tracking)"

run_json "/body/init" '{}'

# === Initialize Mind ===
section "Step 3: Initialize Mind (knowledge graph)"

run_json "/mind/init" '{}'

# === Scan files into Body ===
section "Step 4: Scan files into Body"

run_json "/body/scan" '{"path": "src"}'

# === Create concepts in Mind ===
section "Step 5: Create concepts (simulating extraction)"

run_json "/mind/concepts/create" '{"name": "AuthService", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "DatabasePool", "type": "Entity"}'
run_json "/mind/concepts/create" '{"name": "ApiRouter", "type": "Entity"}'

# === Create edges (relationships) ===
section "Step 6: Create edges (relationships)"

run_json "/mind/edges/create" '{"source": 3, "target": 1, "relation": "DEPENDS_ON"}'
run_json "/mind/edges/create" '{"source": 3, "target": 2, "relation": "DEPENDS_ON"}'

# === Search for concepts ===
section "Step 7: Search for concepts (semantic)"

echo "Searching for 'authentication'..."
run_json "/mind/search" '{"query": "authentication", "limit": 3}'

echo "Searching for 'database'..."
run_json "/mind/search" '{"query": "database", "limit": 3}'

# === Verify rules ===
section "Step 8: Verify graph integrity"

run_json "/mind/verify" '{}'

# === List what we built ===
section "Summary: What we created"

echo "Concepts in Mind:"
run_json "/mind/concepts/list" '{}'

echo "Edges in Mind:"
run_json "/mind/edges/list" '{}'

success "Quick start complete!"
echo ""
echo "You've just:"
echo "  1. Created a sample codebase"
echo "  2. Initialized Brane (body + mind)"
echo "  3. Scanned files into the body"
echo "  4. Created concepts in the mind"
echo "  5. Linked concepts with edges"
echo "  6. Searched semantically"
echo "  7. Verified graph integrity"
