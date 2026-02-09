#!/usr/bin/env bash
#
# 06-search.sh — semantic search
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# create searchable concepts
brane_q concept create --name AuthenticationService --type Entity > /dev/null
brane_q concept create --name PasswordHasher --type Entity > /dev/null
brane_q concept create --name SessionManager --type Entity > /dev/null
brane_q concept create --name DatabaseConnection --type Entity > /dev/null
brane_q concept create --name QueryBuilder --type Entity > /dev/null

# link them so they're not orphans
brane_q edge create --from AuthenticationService --to PasswordHasher --rel DEPENDS_ON > /dev/null
brane_q edge create --from AuthenticationService --to SessionManager --rel DEPENDS_ON > /dev/null
brane_q edge create --from DatabaseConnection --to QueryBuilder --rel DEPENDS_ON > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# search
# ─────────────────────────────────────────────────────────────────────────────

brane search "login"

# SCORE   ID    NAME                    TYPE
# 0.142   1     AuthenticationService   Entity
# 0.226   3     SessionManager          Entity
# 0.315   2     PasswordHasher          Entity

brane search "database" --limit 2

# SCORE   ID    NAME                TYPE
# 0.089   4     DatabaseConnection  Entity
# 0.156   5     QueryBuilder        Entity
