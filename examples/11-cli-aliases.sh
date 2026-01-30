#!/usr/bin/env bash
#
# 11-cli-aliases.sh - Demonstrate short command aliases
#
# Aliases: c=concept, e=edge, r=rule, a=annotation, p=provenance, b=body, f=fts
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize"

"$BRANE" init

section "Short Aliases Demo"

echo "brane c = brane concept"
echo "brane e = brane edge"
echo "brane r = brane rule"
echo "brane a = brane annotation"
echo "brane p = brane provenance"
echo "brane b = brane body"
echo "brane f = brane fts"
echo ""

section "Create with Aliases"

echo "Using: brane c create --name X --type Entity"
"$BRANE" c create --name "ServiceA" --type "Entity"
"$BRANE" c create --name "ServiceB" --type "Entity"

echo ""
echo "Using: brane c list"
"$BRANE" c list

section "Edges with Aliases"

echo "Using: brane e create --from 1 --to 2 --rel DEPENDS_ON"
"$BRANE" e create --from 1 --to 2 --rel "DEPENDS_ON"

echo ""
echo "Using: brane e list"
"$BRANE" e list

section "Rules with Aliases"

echo "Using: brane r list"
"$BRANE" r list

section "Body with Aliases"

mkdir -p src
echo "hello" > src/test.ts

echo "Using: brane b scan src/"
"$BRANE" b scan src/

success "Alias demo complete!"
