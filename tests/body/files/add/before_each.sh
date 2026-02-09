#!/usr/bin/env bash
#
# body/files/add before_each hook
# Initializes body.db for most test cases
# Cases that test uninitialized state should skip via their own setup.sh
#

set -e

source "$TC_TESTS_DIR/lib.sh"

# Most tests need body initialized
# The 05-error-not-initialized case will handle its own setup
if [[ "$TC_CASE_NAME" != "05-error-not-initialized" ]]; then
  init_body
fi
