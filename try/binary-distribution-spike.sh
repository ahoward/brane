#!/usr/bin/env bash
#
# Whitebox spike: Binary Distribution (#43)
#
# Tests:
#   1. version module exists and exports
#   2. brane --version outputs version string
#   3. brane -V outputs version string
#   4. CLI main.ts uses dynamic version
#   5. Release workflow exists with test step
#   6. Release workflow builds all 4 targets
#   7. Install script exists and is valid bash
#   8. Install script detects platform
#   9. Homebrew formula template exists
#  10. Compiled binary reports version
#  11. Source code integration
#
set -euo pipefail

BRANE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BRANE_ROOT"

PASS=0
FAIL=0
TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo "  ❌ $1: $2"; }

echo "=== Binary Distribution Spike ==="
echo ""

# ─────────────────────────────────────────────────────────────────
# Test 1: Version module
# ─────────────────────────────────────────────────────────────────
echo "--- Version module ---"

if [ -f "$BRANE_ROOT/src/version.ts" ]; then
  pass "version.ts exists"
else
  fail "module" "src/version.ts not found"
fi

VER_TEST=$(bun -e "
const { get_version } = require('$BRANE_ROOT/src/version.ts');
console.log('version:', get_version());
console.log('has_fn:', typeof get_version === 'function');
" 2>/dev/null)

if echo "$VER_TEST" | grep -q "has_fn: true"; then
  pass "exports get_version"
else
  fail "exports" "get_version not exported"
fi

if echo "$VER_TEST" | grep -q "version: "; then
  VER=$(echo "$VER_TEST" | grep "version:" | awk '{print $2}')
  pass "returns version: $VER"
else
  fail "version" "no version returned"
fi

# ─────────────────────────────────────────────────────────────────
# Test 2: CLI --version flag
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- CLI version flags ---"

VERSION_OUTPUT=$(bun run "$BRANE_ROOT/src/cli.ts" --version 2>/dev/null || true)
if [ -n "$VERSION_OUTPUT" ]; then
  pass "brane --version outputs: $VERSION_OUTPUT"
else
  fail "--version" "no output from --version"
fi

V_OUTPUT=$(bun run "$BRANE_ROOT/src/cli.ts" -V 2>/dev/null || true)
if [ -n "$V_OUTPUT" ]; then
  pass "brane -V outputs: $V_OUTPUT"
else
  fail "-V" "no output from -V"
fi

# Should match
if [ "$VERSION_OUTPUT" = "$V_OUTPUT" ]; then
  pass "--version and -V output match"
else
  fail "match" "--version ($VERSION_OUTPUT) != -V ($V_OUTPUT)"
fi

# ─────────────────────────────────────────────────────────────────
# Test 3: Dynamic version in main.ts
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Dynamic version ---"

if grep -q 'get_version' "$BRANE_ROOT/src/cli/main.ts"; then
  pass "main.ts uses get_version()"
else
  fail "dynamic" "main.ts doesn't use get_version()"
fi

if ! grep -q "version: \"0.1.0\"" "$BRANE_ROOT/src/cli/main.ts"; then
  pass "no hardcoded version in main.ts"
else
  fail "hardcoded" "main.ts still has hardcoded version"
fi

# ─────────────────────────────────────────────────────────────────
# Test 4: Release workflow
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Release workflow ---"

if [ -f "$BRANE_ROOT/.github/workflows/release.yml" ]; then
  pass "release.yml exists"
else
  fail "workflow" "release.yml not found"
fi

# Test step exists
if grep -q "Run tests" "$BRANE_ROOT/.github/workflows/release.yml"; then
  pass "workflow has test step"
else
  fail "tests" "no test step in workflow"
fi

# Tests run before build
if grep -q "needs: test" "$BRANE_ROOT/.github/workflows/release.yml"; then
  pass "build depends on test"
else
  fail "ordering" "build doesn't depend on test"
fi

# All 4 platform targets
for target in "linux-x64" "linux-arm64" "darwin-x64" "darwin-arm64"; do
  if grep -q "$target" "$BRANE_ROOT/.github/workflows/release.yml"; then
    pass "workflow builds $target"
  else
    fail "target" "$target not in workflow"
  fi
done

# Version injection at build time
if grep -q "BRANE_VERSION" "$BRANE_ROOT/.github/workflows/release.yml"; then
  pass "workflow injects BRANE_VERSION at build"
else
  fail "version" "BRANE_VERSION not injected in workflow"
fi

# ─────────────────────────────────────────────────────────────────
# Test 5: Install script
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Install script ---"

if [ -f "$BRANE_ROOT/scripts/install.sh" ]; then
  pass "install.sh exists"
else
  fail "install" "scripts/install.sh not found"
fi

if [ -x "$BRANE_ROOT/scripts/install.sh" ]; then
  pass "install.sh is executable"
else
  fail "install" "install.sh not executable"
fi

# Validate bash syntax
if bash -n "$BRANE_ROOT/scripts/install.sh" 2>/dev/null; then
  pass "install.sh is valid bash"
else
  fail "syntax" "install.sh has bash syntax errors"
fi

# Platform detection function exists
if grep -q "detect_platform" "$BRANE_ROOT/scripts/install.sh"; then
  pass "install.sh has platform detection"
else
  fail "platform" "no detect_platform in install.sh"
fi

# Handles linux and darwin
if grep -q "Linux" "$BRANE_ROOT/scripts/install.sh" && grep -q "Darwin" "$BRANE_ROOT/scripts/install.sh"; then
  pass "install.sh handles Linux and Darwin"
else
  fail "platforms" "missing Linux/Darwin handling"
fi

# Handles x64 and arm64
if grep -q "x86_64" "$BRANE_ROOT/scripts/install.sh" && grep -q "arm64" "$BRANE_ROOT/scripts/install.sh"; then
  pass "install.sh handles x64 and arm64"
else
  fail "arch" "missing architecture handling"
fi

# ─────────────────────────────────────────────────────────────────
# Test 6: Homebrew formula
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Homebrew formula ---"

if [ -f "$BRANE_ROOT/scripts/homebrew/brane.rb" ]; then
  pass "homebrew formula template exists"
else
  fail "homebrew" "brane.rb not found"
fi

if grep -q "class Brane < Formula" "$BRANE_ROOT/scripts/homebrew/brane.rb"; then
  pass "formula defines Brane class"
else
  fail "formula" "missing Brane class"
fi

if grep -q "darwin-arm64" "$BRANE_ROOT/scripts/homebrew/brane.rb" && \
   grep -q "darwin-x64" "$BRANE_ROOT/scripts/homebrew/brane.rb" && \
   grep -q "linux-arm64" "$BRANE_ROOT/scripts/homebrew/brane.rb" && \
   grep -q "linux-x64" "$BRANE_ROOT/scripts/homebrew/brane.rb"; then
  pass "formula covers all 4 platforms"
else
  fail "platforms" "formula missing platform targets"
fi

if grep -q "brane --version" "$BRANE_ROOT/scripts/homebrew/brane.rb"; then
  pass "formula has version test"
else
  fail "test" "formula missing version test"
fi

# ─────────────────────────────────────────────────────────────────
# Test 7: Compiled binary version
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- Compiled binary ---"

# Build with version injection
bun build "$BRANE_ROOT/src/cli.ts" --compile --outfile "$BRANE_ROOT/brane" > /dev/null 2>&1

BINARY_VER=$("$BRANE_ROOT/brane" --version 2>/dev/null || true)
if [ -n "$BINARY_VER" ]; then
  pass "compiled binary reports version: $BINARY_VER"
else
  fail "binary" "compiled binary --version failed"
fi

# ─────────────────────────────────────────────────────────────────
# Test 8: MCP server version
# ─────────────────────────────────────────────────────────────────
echo ""
echo "--- MCP server version ---"

if grep -q 'SERVER_VERSION' "$BRANE_ROOT/src/mcp.ts"; then
  pass "mcp.ts has SERVER_VERSION"
else
  fail "mcp" "SERVER_VERSION not in mcp.ts"
fi

# ─────────────────────────────────────────────────────────────────
# Results
# ─────────────────────────────────────────────────────────────────
echo ""
echo "=== Results ==="
echo ""
echo "  $PASS passed, $FAIL failed, $TOTAL total"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  all tests passed!"
else
  echo "  FAILURES DETECTED"
  exit 1
fi
