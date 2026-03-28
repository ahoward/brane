#!/usr/bin/env bash
#
# 14-status.sh — health dashboard
#
# One command to see what brane knows: lens, schema, counts, recent memories.
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init

# ─────────────────────────────────────────────────────────────────────────────
# status on an empty graph
# ─────────────────────────────────────────────────────────────────────────────

brane status

# brane 0.x.x
#
#   Lens:     default
#   Path:     /tmp/xxx/.brane
#   Schema:   1.7.0
#   Body DB:  12.0 KB
#   Mind DB:  1.2 MB
#
#   Concepts: 0
#   Edges:    0

# ─────────────────────────────────────────────────────────────────────────────
# add some knowledge, then check again
# ─────────────────────────────────────────────────────────────────────────────

brane concept create --name AuthService --type Entity
brane concept create --name UserDB --type Entity
brane edge create --from AuthService --to UserDB --rel DEPENDS_ON
brane memory remember "Auth uses bcrypt for password hashing"

brane status

# brane 0.x.x
#
#   Lens:     default
#   Schema:   1.7.0
#   Body DB:  12.0 KB
#   Mind DB:  1.3 MB
#
#   Concepts: 2
#             Entity: 2
#   Edges:    1
#             DEPENDS_ON: 1
#
#   Recent memories (1):
#     #1  2026-03-27  Auth uses bcrypt for password hashing [auth]

# ─────────────────────────────────────────────────────────────────────────────
# JSON mode for scripting
# ─────────────────────────────────────────────────────────────────────────────

brane status -j

# { "status": "success", "result": { "version": "...", "lens": "default", ... } }
