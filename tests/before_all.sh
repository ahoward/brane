#!/usr/bin/env bash
#
# before_all.sh - runs ONCE before all tests
# Creates seed databases that are copied into each test workspace
#

set -e

source "$TC_TESTS_DIR/lib.sh"

echo "Creating seed databases..."
create_seeds
echo "Seeds ready at $TC_SEEDS_DIR"
