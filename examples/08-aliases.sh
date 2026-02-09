#!/usr/bin/env bash
#
# 08-aliases.sh — short command aliases
#
# c = concept    e = edge    r = rule
# a = annotation p = provenance
# b = body       f = fts
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# same commands, fewer keystrokes
# ─────────────────────────────────────────────────────────────────────────────

brane c create --name Foo --type Entity
brane c create --name Bar --type Entity

# Id: 1
# Name: Foo
# Type: Entity

brane e create --from Foo --to Bar --rel DEPENDS_ON

# Id: 1
# Source: 1
# Target: 2
# Relation: DEPENDS_ON

brane c list

# ID    NAME    TYPE
# 1     Foo     Entity
# 2     Bar     Entity

brane e list

# ID    FROM    TO    RELATION
# 1     1       2     DEPENDS_ON

brane r list

# NAME      BUILTIN   DESCRIPTION
# cycles    yes       Detects circular dependencies
# orphans   yes       Detects disconnected concepts
