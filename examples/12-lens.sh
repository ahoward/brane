#!/usr/bin/env bash
#
# 12-lens.sh — lens configuration and usage tracking
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# show default lens
# ─────────────────────────────────────────────────────────────────────────────

brane lens show

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

brane_q concept create --name AuthService --type Entity > /dev/null
brane_q concept create --name UserController --type Controller > /dev/null
brane_q concept create --name OrderModel --type Model > /dev/null
brane_q concept create --name PaymentGateway --type Service > /dev/null

# create edges with custom relations
brane_q edge create --from AuthService --to UserController --rel DEPENDS_ON > /dev/null
brane_q edge create --from UserController --to OrderModel --rel ACCESSES > /dev/null
brane_q edge create --from PaymentGateway --to OrderModel --rel ACCESSES > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# view usage stats
# ─────────────────────────────────────────────────────────────────────────────

brane lens stats

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

brane lens stats --candidates

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

brane lens bless --type Service --description "A service component"

# Blessed type: Service
# Description: A service component
# Authority: manual

# ─────────────────────────────────────────────────────────────────────────────
# bless a candidate relation
# ─────────────────────────────────────────────────────────────────────────────

brane lens bless --rel ACCESSES --description "Component accesses a resource"

# Blessed relation: ACCESSES
# Description: Component accesses a resource
# Authority: manual

# ─────────────────────────────────────────────────────────────────────────────
# export lens as YAML
# ─────────────────────────────────────────────────────────────────────────────

brane lens export

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
