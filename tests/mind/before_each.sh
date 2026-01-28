#!/usr/bin/env bash
#
# mind/ level before_each hook
# Initializes mind.db (includes body.db)
#

set -e

source "$TC_TESTS_DIR/lib.sh"
init_mind
