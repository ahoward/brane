#!/usr/bin/env bash
#
# 07-json.sh — JSON output for scripting
#

set -e
source "$(dirname "$0")/lib/common.sh"
setup_workspace

brane_q init > /dev/null
brane_q concept create --name Foo --type Entity > /dev/null
brane_q concept create --name Bar --type Entity > /dev/null
brane_q edge create --from Foo --to Bar --rel DEPENDS_ON > /dev/null

# ─────────────────────────────────────────────────────────────────────────────
# --json flag
# ─────────────────────────────────────────────────────────────────────────────

brane concept list --json

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
brane_q concept list --json | jq -r '.result.concepts[].name'
echo ""

# Foo
# Bar
