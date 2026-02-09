#!/usr/bin/env bash
#
# 05-rules.sh — verification rules
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# built-in rules
# ─────────────────────────────────────────────────────────────────────────────

brane rule list

# NAME      BUILTIN   DESCRIPTION
# cycles    yes       Detects circular dependencies via DEPENDS_ON edges
# orphans   yes       Detects concepts with no edges (disconnected)

brane rule get cycles

# Name: cycles
# Description: Detects circular dependencies via DEPENDS_ON edges
# Body: cycles[id, name] := *concepts[id, name, _, _], reachable[id, id]
#       reachable[x, y] := *edges[_, x, y, 'DEPENDS_ON', _]
#       reachable[x, y] := *edges[_, x, z, 'DEPENDS_ON', _], reachable[z, y]
# Builtin: true

# ─────────────────────────────────────────────────────────────────────────────
# query a rule
# ─────────────────────────────────────────────────────────────────────────────

# create an orphan concept
brane_q concept create --name Orphan --type Entity > /dev/null

brane rule query orphans

# ID    NAME
# 1     Orphan

# ─────────────────────────────────────────────────────────────────────────────
# verify all rules
# ─────────────────────────────────────────────────────────────────────────────

brane verify || true

# FAILED: 1 violations
#
# orphans:
#   - Orphan (id: 1)
