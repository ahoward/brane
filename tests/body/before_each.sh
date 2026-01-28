#!/usr/bin/env bash
#
# body/ level before_each hook
# Just sources lib.sh for utility functions
# Each handler that needs init_body should have its own before_each.sh
#

set -e

source "$TC_TESTS_DIR/lib.sh"
