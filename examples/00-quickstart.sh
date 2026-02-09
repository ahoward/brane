#!/usr/bin/env bash
#
# 00-quickstart.sh — brane in 60 seconds
#
# init → scan → concepts → edges → verify
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

# ─────────────────────────────────────────────────────────────────────────────
# sample codebase
# ─────────────────────────────────────────────────────────────────────────────

mkdir -p src

cat > src/auth.ts << 'EOF'
export class AuthService {
  login(user: string, pass: string): boolean { return true }
}
EOF

cat > src/database.ts << 'EOF'
export class DatabasePool {
  query(sql: string): any[] { return [] }
}
EOF

cat > src/api.ts << 'EOF'
import { AuthService } from "./auth"
import { DatabasePool } from "./database"

export class ApiRouter {
  constructor(private auth: AuthService, private db: DatabasePool) {}
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────────────────

brane init

# body: created .brane
# mind: created .brane/mind.db

# ─────────────────────────────────────────────────────────────────────────────
# scan files
# ─────────────────────────────────────────────────────────────────────────────

brane scan src/

# added: 3
# updated: 0
# unchanged: 0

# ─────────────────────────────────────────────────────────────────────────────
# create concepts
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name AuthService --type Entity

# Id: 1
# Name: AuthService
# Type: Entity

brane concept create --name DatabasePool --type Entity
brane concept create --name ApiRouter --type Entity

# ─────────────────────────────────────────────────────────────────────────────
# create edges
# ─────────────────────────────────────────────────────────────────────────────

brane edge create --from ApiRouter --to AuthService --rel DEPENDS_ON

# Id: 1
# Source: 3
# Target: 1
# Relation: DEPENDS_ON
# Weight: 1

brane edge create --from ApiRouter --to DatabasePool --rel DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# list
# ─────────────────────────────────────────────────────────────────────────────

brane concept list

# ID    NAME          TYPE
# 1     AuthService   Entity
# 2     DatabasePool  Entity
# 3     ApiRouter     Entity

brane edge list

# ID    FROM    TO    RELATION
# 1     3       1     DEPENDS_ON
# 2     3       2     DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# verify
# ─────────────────────────────────────────────────────────────────────────────

brane verify

# OK: all rules passed
