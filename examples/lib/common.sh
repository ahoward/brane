#!/usr/bin/env bash
#
# common.sh - Shared utilities for Brane example scripts
#
# Source this file at the start of each example script:
#   source "$(dirname "$0")/lib/common.sh"
#

set -e

# Find the repository root (where package.json lives)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Binary location with fallback chain:
# 1. BRANE_BIN environment variable
# 2. ./brane in repo root
# 3. brane in PATH
if [[ -n "${BRANE_BIN:-}" ]]; then
  BRANE="$BRANE_BIN"
elif [[ -x "$REPO_ROOT/brane" ]]; then
  BRANE="$REPO_ROOT/brane"
elif command -v brane &>/dev/null; then
  BRANE="brane"
else
  echo "ERROR: Brane binary not found."
  echo ""
  echo "Build it with:"
  echo "  cd $REPO_ROOT && bun build src/cli.ts --compile --outfile brane"
  echo ""
  echo "Or set BRANE_BIN to point to an existing binary."
  exit 1
fi

# Use mock embeddings for deterministic results
export BRANE_EMBED_MOCK=1

# Create a temporary workspace and clean up on exit
setup_workspace() {
  WORKDIR=$(mktemp -d)
  trap 'rm -rf "$WORKDIR"' EXIT
  cd "$WORKDIR"
  echo "Workspace: $WORKDIR"
  echo ""
}

# Run a brane command with pretty output
run() {
  local path="$1"
  shift
  echo "\$ brane $path"
  if [[ $# -gt 0 ]]; then
    echo "$@" | "$BRANE" "$path"
  else
    "$BRANE" "$path"
  fi
  echo ""
}

# Run a brane command with JSON input
run_json() {
  local path="$1"
  local json="$2"
  echo "\$ echo '$json' | brane $path"
  echo "$json" | "$BRANE" "$path"
  echo ""
}

# Print a section header
section() {
  echo "=== $1 ==="
  echo ""
}

# Print success message
success() {
  echo "✅ $1"
}

# Print the brane binary being used
show_binary() {
  echo "Using: $BRANE"
  echo ""
}
