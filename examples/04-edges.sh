#!/usr/bin/env bash
#
# 04-edges.sh — manage relationships
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# create some concepts first
brane_q concept create --name Controller --type Entity > /dev/null
brane_q concept create --name Service --type Entity > /dev/null
brane_q concept create --name Repository --type Entity > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# create edges
# ─────────────────────────────────────────────────────────────────────────────

brane edge create --from Controller --to Service --rel DEPENDS_ON

# Id: 1
# Source: 1
# Target: 2
# Relation: DEPENDS_ON
# Weight: 1

brane edge create --from Service --to Repository --rel DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# list
# ─────────────────────────────────────────────────────────────────────────────

brane edge list

# ID    FROM    TO    RELATION
# 1     1       2     DEPENDS_ON
# 2     2       3     DEPENDS_ON

brane edge list --from Controller

# ID    FROM    TO    RELATION
# 1     1       2     DEPENDS_ON

# ─────────────────────────────────────────────────────────────────────────────
# get
# ─────────────────────────────────────────────────────────────────────────────

brane edge get 1

# Id: 1
# Source: 1
# Target: 2
# Relation: DEPENDS_ON
# Weight: 1
