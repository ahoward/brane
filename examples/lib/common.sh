#!/usr/bin/env bash
#
# common.sh — shared utilities for brane examples
#

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# Find the brane binary
# ─────────────────────────────────────────────────────────────────────────────

USE_BUN=false

if [[ -n "${BRANE_BIN:-}" ]]; then
  BRANE="$BRANE_BIN"
elif [[ -x "$REPO_ROOT/brane" ]]; then
  BRANE="$REPO_ROOT/brane"
elif command -v brane &>/dev/null; then
  BRANE="brane"
else
  # Fallback to bun run for development
  USE_BUN=true
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
# Run a command with pretty echo
# ─────────────────────────────────────────────────────────────────────────────

run() {
  echo "\$ $*"
  "$@"
  echo ""
}

brane() {
  if [[ "$USE_BUN" == "true" ]]; then
    bun run "$REPO_ROOT/src/cli.ts" "$@"
  else
    "$BRANE" "$@"
  fi
}
