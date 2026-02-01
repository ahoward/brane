#!/usr/bin/env bash
#
# 12-lens.sh — lens configuration and usage tracking
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# show default lens
# ─────────────────────────────────────────────────────────────────────────────

run brane lens show

# Name: default
# Version: 1.0.0
# Description: Default lens for code analysis
#
# Golden Types:
#   Entity       A named entity in the knowledge graph
#   Caveat       A warning or consideration about an entity
#   Rule         A verification rule for the knowledge graph
#
# Golden Relations:
#   DEPENDS_ON       One entity depends on another
#   CONFLICTS_WITH   Two entities have a conflict (symmetric)
#   DEFINED_IN       An entity is defined in a location

# ─────────────────────────────────────────────────────────────────────────────
# create concepts with custom types (usage tracked silently)
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name AuthService --type Entity > /dev/null
brane concept create --name UserController --type Controller > /dev/null
brane concept create --name OrderModel --type Model > /dev/null
brane concept create --name PaymentGateway --type Service > /dev/null

# create edges with custom relations
brane edge create --from 1 --to 2 --rel DEPENDS_ON > /dev/null
brane edge create --from 2 --to 3 --rel ACCESSES > /dev/null
brane edge create --from 4 --to 3 --rel ACCESSES > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# view usage stats
# ─────────────────────────────────────────────────────────────────────────────

run brane lens stats

# TYPE                COUNT   GOLDEN  FIRST SEEN               LAST SEEN
# Entity              1       yes     2026-01-31T...           2026-01-31T...
# Controller          1       no      2026-01-31T...           2026-01-31T...
# Model               1       no      2026-01-31T...           2026-01-31T...
# Service             1       no      2026-01-31T...           2026-01-31T...
#
# RELATION            COUNT   GOLDEN  FIRST SEEN               LAST SEEN
# DEPENDS_ON          1       yes     2026-01-31T...           2026-01-31T...
# ACCESSES            2       no      2026-01-31T...           2026-01-31T...

# ─────────────────────────────────────────────────────────────────────────────
# view only candidates (non-golden)
# ─────────────────────────────────────────────────────────────────────────────

run brane lens stats --candidates

# TYPE                COUNT   GOLDEN  FIRST SEEN               LAST SEEN
# Controller          1       no      2026-01-31T...           2026-01-31T...
# Model               1       no      2026-01-31T...           2026-01-31T...
# Service             1       no      2026-01-31T...           2026-01-31T...
#
# RELATION            COUNT   GOLDEN  FIRST SEEN               LAST SEEN
# ACCESSES            2       no      2026-01-31T...           2026-01-31T...

# ─────────────────────────────────────────────────────────────────────────────
# bless a candidate type
# ─────────────────────────────────────────────────────────────────────────────

run brane lens bless --type Service --description "A service component"

# Blessed type: Service
# Description: A service component
# Authority: manual

# ─────────────────────────────────────────────────────────────────────────────
# bless a candidate relation
# ─────────────────────────────────────────────────────────────────────────────

run brane lens bless --rel ACCESSES --description "Component accesses a resource"

# Blessed relation: ACCESSES
# Description: Component accesses a resource
# Authority: manual

# ─────────────────────────────────────────────────────────────────────────────
# export lens as YAML
# ─────────────────────────────────────────────────────────────────────────────

run brane lens export

# name: default
# version: 1.0.0
# description: Default lens for code analysis
# concepts:
#   - type: Entity
#     description: A named entity in the knowledge graph
#     authority: lens
#   - type: Caveat
#     ...
#   - type: Service
#     description: A service component
#     authority: manual
# relations:
#   - rel: DEPENDS_ON
#     ...
#   - rel: ACCESSES
#     description: Component accesses a resource
#     symmetric: false
#     authority: manual
# consolidation: {}
