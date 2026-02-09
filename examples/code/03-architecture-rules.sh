#!/usr/bin/env bash
#
# 03-architecture-rules.sh — make unwritten rules executable
#
# "The frontend never calls the database directly."
# "Auth goes through the gateway."
# These rules live in code review comments and Slack threads.
# Brane makes them Datalog.
#

set -e
source "$(dirname "$0")/../lib/common.sh"
setup_workspace

echo "═══════════════════════════════════════════════════════════════"
echo "  ARCHITECTURE RULES: make unwritten rules executable"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────
# a layered architecture: Frontend → API → Service → Database
# ─────────────────────────────────────────────────────────────────

echo "--- the layers ---"
echo ""

brane concept create --name "WebApp" --type Frontend
brane concept create --name "MobileApp" --type Frontend
brane concept create --name "ApiGateway" --type API
brane concept create --name "AuthService" --type Service
brane concept create --name "UserService" --type Service
brane concept create --name "OrderService" --type Service
brane concept create --name "UserDB" --type Database
brane concept create --name "OrderDB" --type Database

echo "--- clean dependencies (each layer calls the next) ---"
echo ""

# Frontend → API
brane edge create --from WebApp --to ApiGateway --rel DEPENDS_ON
brane edge create --from MobileApp --to ApiGateway --rel DEPENDS_ON

# API → Service
brane edge create --from ApiGateway --to AuthService --rel DEPENDS_ON
brane edge create --from ApiGateway --to UserService --rel DEPENDS_ON
brane edge create --from ApiGateway --to OrderService --rel DEPENDS_ON

# Service → Database
brane edge create --from UserService --to UserDB --rel DEPENDS_ON
brane edge create --from OrderService --to OrderDB --rel DEPENDS_ON

echo "--- verify with built-in rules ---"
echo ""

brane verify

echo "  Clean. But the built-in rules only check for cycles and"
echo "  orphans. We need a custom rule for our architecture."
echo ""

# ─────────────────────────────────────────────────────────────────
# THE RULE: frontends must never touch databases directly
#
# This is Datalog. Not a 500-line ESLint plugin.
# Not a regex that greps import statements.
# ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  The rule: frontends must never call databases directly."
echo "  Encoding it as Datalog:"
echo "═══════════════════════════════════════════════════════════════"
echo ""

brane rule create \
  --name "layer_skip" \
  --description "Frontend components must not depend directly on Database components" \
  --body 'layer_skip[id, name] := *concepts[id, name, "Frontend", _], *edges[_, id, tid, "DEPENDS_ON", _], *concepts[tid, _, "Database", _]'

echo "--- verify: does our architecture obey the rule? ---"
echo ""

brane verify

echo "  Clean. Every frontend goes through the API layer."
echo ""

# ─────────────────────────────────────────────────────────────────
# 3 months later: a "quick fix" in production
# ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  Three months later. Production is down. A developer adds"
echo "  a 'temporary' direct database call from MobileApp to UserDB."
echo "  Just to fix the outage. They'll clean it up later."
echo "═══════════════════════════════════════════════════════════════"
echo ""

brane edge create --from MobileApp --to UserDB --rel DEPENDS_ON

echo "--- verify ---"
echo ""

brane verify || true

echo ""
echo "  Caught. MobileApp (Frontend) depends directly on"
echo "  UserDB (Database). The 'temporary' fix violates"
echo "  the architecture."
echo ""
echo "  Without brane, this lives in prod for 18 months"
echo "  until someone notices during a security audit."
echo ""
echo "  With brane, it fails verify in CI before the PR merges."
echo ""
