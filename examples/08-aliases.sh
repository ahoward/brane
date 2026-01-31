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

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# same commands, fewer keystrokes
# ─────────────────────────────────────────────────────────────────────────────

run brane c create --name Foo --type Entity
run brane c create --name Bar --type Entity

# Id: 1
# Name: Foo
# Type: Entity

run brane e create --from 1 --to 2 --rel DEPENDS_ON

# Id: 1
# Source: 1
# Target: 2
# Relation: DEPENDS_ON

run brane c list

# ID    NAME    TYPE
# 1     Foo     Entity
# 2     Bar     Entity

run brane e list

# ID    FROM    TO    RELATION
# 1     1       2     DEPENDS_ON

run brane r list

# NAME      BUILTIN   DESCRIPTION
# cycles    yes       Detects circular dependencies
# orphans   yes       Detects disconnected concepts
