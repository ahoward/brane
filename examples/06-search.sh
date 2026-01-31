#!/usr/bin/env bash
#
# 06-search.sh — semantic search
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# create searchable concepts
brane concept create --name AuthenticationService --type Entity > /dev/null
brane concept create --name PasswordHasher --type Entity > /dev/null
brane concept create --name SessionManager --type Entity > /dev/null
brane concept create --name DatabaseConnection --type Entity > /dev/null
brane concept create --name QueryBuilder --type Entity > /dev/null

# link them so they're not orphans
brane edge create --from 1 --to 2 --rel DEPENDS_ON > /dev/null
brane edge create --from 1 --to 3 --rel DEPENDS_ON > /dev/null
brane edge create --from 4 --to 5 --rel DEPENDS_ON > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# search
# ─────────────────────────────────────────────────────────────────────────────

run brane search "login"

# SCORE   ID    NAME                    TYPE
# 0.142   1     AuthenticationService   Entity
# 0.226   3     SessionManager          Entity
# 0.315   2     PasswordHasher          Entity

run brane search "database" --limit 2

# SCORE   ID    NAME                TYPE
# 0.089   4     DatabaseConnection  Entity
# 0.156   5     QueryBuilder        Entity
