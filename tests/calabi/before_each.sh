#!/usr/bin/env bash
#
# calabi/ level before_each hook
# Initializes mind.db (calabi operations require mind)
#

set -e

source "$TC_TESTS_DIR/lib.sh"
init_mind
