#!/usr/bin/env bash
#
# common.sh — shared utilities for brane examples
#

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# Find the brane binary
# ─────────────────────────────────────────────────────────────────────────────

if [[ -n "${BRANE_BIN:-}" ]]; then
  _BRANE="$BRANE_BIN"
elif [[ -x "$REPO_ROOT/bin/brane" ]]; then
  _BRANE="$REPO_ROOT/bin/brane"
elif [[ -x "$REPO_ROOT/brane" ]]; then
  _BRANE="$REPO_ROOT/brane"
elif command -v brane &>/dev/null; then
  _BRANE="brane"
else
  _BRANE="bun run $REPO_ROOT/src/cli.ts"
fi

export BRANE_EMBED_MOCK=1

# ─────────────────────────────────────────────────────────────────────────────
# Setup / teardown
# ─────────────────────────────────────────────────────────────────────────────

setup_workspace() {
  WORKDIR=$(mktemp -d)
  trap 'rm -rf "$WORKDIR"' EXIT
  cd "$WORKDIR"
}

# ─────────────────────────────────────────────────────────────────────────────
# brane — echo the command, run it
# ─────────────────────────────────────────────────────────────────────────────

brane() {
  echo "\$ brane $*"
  $_BRANE "$@"
  echo ""
}

brane_q() {
  $_BRANE "$@"
}
