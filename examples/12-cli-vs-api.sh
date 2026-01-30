#!/usr/bin/env bash
#
# 12-cli-vs-api.sh - Compare CLI mode vs API mode
#
# Shows both syntaxes produce equivalent results
#

set -e
source "$(dirname "$0")/lib/common.sh"

show_binary
setup_workspace

section "Initialize (CLI mode)"

"$BRANE" init

section "Create Concept - CLI Mode"

echo "CLI: brane concept create --name Foo --type Entity"
"$BRANE" concept create --name "Foo" --type "Entity"

section "Create Concept - API Mode"

echo 'API: brane /mind/concepts/create '"'"'{"name":"Bar","type":"Entity"}'"'"
"$BRANE" /mind/concepts/create '{"name":"Bar","type":"Entity"}'

section "List Concepts - CLI Mode"

echo "CLI: brane concept list"
"$BRANE" concept list

section "List Concepts - API Mode"

echo "API: brane /mind/concepts/list '{}'"
"$BRANE" /mind/concepts/list '{}'

section "CLI with --json Flag"

echo "CLI with --json matches API output format:"
echo "brane concept list --json"
"$BRANE" concept list --json

section "Both Syntaxes Work"

echo ""
echo "CLI mode: human-friendly for interactive use"
echo "  brane concept create --name X --type Entity"
echo ""
echo "API mode: JSON in/out for scripting"
echo "  brane /mind/concepts/create '{\"name\":\"X\"}'"
echo ""
echo "Use whichever fits your workflow!"

success "CLI vs API comparison complete!"
