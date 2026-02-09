#!/usr/bin/env bash
#
# 01-circular-deps.sh — catch circular dependencies before they calcify
#
# Nobody introduces a circular dependency on purpose. It happens over
# 50 PRs across 6 months. By the time you notice, it's load-bearing
# spaghetti. Brane catches it on the first edge.
#

set -e
source "$(dirname "$0")/../lib/common.sh"
setup_workspace

echo "═══════════════════════════════════════════════════════════════"
echo "  CIRCULAR DEPENDENCIES: catch them before they calcify"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────
# a clean microservice architecture
# ─────────────────────────────────────────────────────────────────

echo "--- the services ---"
echo ""

brane concept create --name "ApiGateway" --type Service
brane concept create --name "AuthService" --type Service
brane concept create --name "UserService" --type Service
brane concept create --name "NotificationService" --type Service
brane concept create --name "DatabaseLayer" --type Service

echo "--- clean dependency chain ---"
echo ""

# Gateway depends on Auth and User
brane edge create --from ApiGateway --to AuthService --rel DEPENDS_ON
brane edge create --from ApiGateway --to UserService --rel DEPENDS_ON

# Auth depends on User (to look up credentials)
brane edge create --from AuthService --to UserService --rel DEPENDS_ON

# User depends on Database
brane edge create --from UserService --to DatabaseLayer --rel DEPENDS_ON

# Notification depends on User (to get contact info)
brane edge create --from NotificationService --to UserService --rel DEPENDS_ON

echo "--- verify: any cycles? ---"
echo ""

brane verify

echo "  Clean. No circular dependencies."
echo ""

# ─────────────────────────────────────────────────────────────────
# 6 months later, someone adds a "helpful" shortcut
# ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  Six months later. A new developer adds a shortcut:"
echo "  UserService calls AuthService to validate tokens."
echo "  Seems reasonable. What could go wrong?"
echo "═══════════════════════════════════════════════════════════════"
echo ""

brane edge create --from UserService --to AuthService --rel DEPENDS_ON

echo "--- verify again ---"
echo ""

brane verify || true

echo ""
echo "  AuthService depends on UserService."
echo "  UserService now depends on AuthService."
echo "  Cycle detected. Deploy this and both services deadlock"
echo "  on startup."
echo ""
echo "  The built-in 'cycles' rule is 3 lines of Datalog:"
echo ""
echo "    cycles[id, name] :="
echo "      *concepts[id, name, _, _], reachable[id, id]"
echo "    reachable[x, y] := *edges[_, x, y, 'DEPENDS_ON', _]"
echo "    reachable[x, y] :="
echo "      *edges[_, x, z, 'DEPENDS_ON', _], reachable[z, y]"
echo ""
echo "  Not a 500-line ESLint plugin. Not a CI script that greps"
echo "  import statements. A rule that reasons about structure."
echo ""
