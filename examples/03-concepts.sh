#!/usr/bin/env bash
#
# 03-concepts.sh — manage concepts
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# create
# ─────────────────────────────────────────────────────────────────────────────

run brane concept create --name UserService --type Entity

# Id: 1
# Name: UserService
# Type: Entity

run brane concept create --name OrderService --type Entity
run brane concept create --name no-orphans --type Rule

# ─────────────────────────────────────────────────────────────────────────────
# list
# ─────────────────────────────────────────────────────────────────────────────

run brane concept list

# ID    NAME          TYPE
# 1     UserService   Entity
# 2     OrderService  Entity
# 3     no-orphans    Rule

run brane concept list --type Entity

# ID    NAME          TYPE
# 1     UserService   Entity
# 2     OrderService  Entity

# ─────────────────────────────────────────────────────────────────────────────
# get
# ─────────────────────────────────────────────────────────────────────────────

run brane concept get 1

# Id: 1
# Name: UserService
# Type: Entity

# ─────────────────────────────────────────────────────────────────────────────
# update
# ─────────────────────────────────────────────────────────────────────────────

run brane concept update 1 --name UserServiceV2

# Id: 1
# Name: UserServiceV2
# Type: Entity

# ─────────────────────────────────────────────────────────────────────────────
# delete
# ─────────────────────────────────────────────────────────────────────────────

run brane concept delete 3

# deleted: concept 3
