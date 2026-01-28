#!/usr/bin/env bash
#
# context/ level before_each hook
# Initializes mind.db (context operations require mind)
#

set -e

source "$TC_TESTS_DIR/lib.sh"
init_mind
