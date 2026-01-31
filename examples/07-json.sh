#!/usr/bin/env bash
#
# 07-json.sh — JSON output for scripting
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane init > /dev/null
brane concept create --name Foo --type Entity > /dev/null
brane concept create --name Bar --type Entity > /dev/null
brane edge create --from 1 --to 2 --rel DEPENDS_ON > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# --json flag
# ─────────────────────────────────────────────────────────────────────────────

run brane concept list --json

# {
#   "status": "success",
#   "result": {
#     "concepts": [
#       { "id": 1, "name": "Foo", "type": "Entity" },
#       { "id": 2, "name": "Bar", "type": "Entity" }
#     ],
#     "total": 2
#   },
#   "errors": null,
#   "meta": { ... }
# }

# ─────────────────────────────────────────────────────────────────────────────
# pipe to jq
# ─────────────────────────────────────────────────────────────────────────────

echo "\$ brane concept list --json | jq '.result.concepts[].name'"
brane concept list --json | jq -r '.result.concepts[].name'
echo ""

# Foo
# Bar
