#!/usr/bin/env bash
#
# 04-edges.sh — manage relationships
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# create some concepts first
brane concept create --name Controller --type Entity > /dev/null
brane concept create --name Service --type Entity > /dev/null
brane concept create --name Repository --type Entity > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# create edges
# ─────────────────────────────────────────────────────────────────────────────

run brane edge create --from 1 --to 2 --rel DEPENDS_ON

# Id: 1
# Source: 1
# Target: 2
# Relation: DEPENDS_ON
# Weight: 1

run brane edge create --from 2 --to 3 --rel DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# list
# ─────────────────────────────────────────────────────────────────────────────

run brane edge list

# ID    FROM    TO    RELATION
# 1     1       2     DEPENDS_ON
# 2     2       3     DEPENDS_ON

run brane edge list --from 1

# ID    FROM    TO    RELATION
# 1     1       2     DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# get
# ─────────────────────────────────────────────────────────────────────────────

run brane edge get 1

# Id: 1
# Source: 1
# Target: 2
# Relation: DEPENDS_ON
# Weight: 1
