#!/usr/bin/env bash
#
# before_all.sh - runs ONCE before all tests
# Creates seed databases that are copied into each test workspace
#

set -e

source "$TC_TESTS_DIR/lib.sh"

echo "Building binary..."
(cd "$TC_ROOT" && bun build src/cli.ts --compile --outfile bin/brane 2>&1)
which brane > /dev/null || { echo "FATAL: brane not found in PATH"; exit 1; }

echo "Creating seed databases..."
create_seeds
echo "Seeds ready at $TC_SEEDS_DIR"
