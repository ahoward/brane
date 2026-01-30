# Research: Whitebox Scripts

**Feature**: 022-whitebox-scripts
**Date**: 2026-01-30

## Research Questions

### 1. How to build a compiled Brane binary?

**Decision**: Use `bun build` with appropriate flags for single-file executable.

**Rationale**: Bun's built-in bundler can produce standalone executables. This is the simplest path with no additional tooling.

**Command**:
```bash
bun build src/cli.ts --compile --outfile brane
```

**Alternatives considered**:
- pkg (Node.js packager) — Requires Node.js, adds complexity
- esbuild + runtime — Still needs Bun/Node runtime
- Docker — Overkill for CLI tool

### 2. Script organization pattern

**Decision**: Numbered prefix (`00-`, `01-`, etc.) with descriptive names in `examples/` directory.

**Rationale**:
- Numbers provide natural execution order for readers
- `examples/` is a conventional, discoverable location
- Self-documenting without README

**Alternatives considered**:
- `scripts/` — Could conflict with build scripts
- `demos/` — Less conventional
- Subdirectories by category — Over-organization for ~10 scripts

### 3. Idempotency strategy

**Decision**: Each script creates a fresh temp directory, runs workflow, then cleans up.

**Rationale**:
- Guarantees clean slate on every run
- No pollution of user's working directory
- Easy to debug (can skip cleanup with flag)

**Pattern**:
```bash
WORKDIR=$(mktemp -d)
trap "rm -rf $WORKDIR" EXIT
cd "$WORKDIR"
# ... do work ...
```

**Alternatives considered**:
- Check-and-skip pattern — Complex, error-prone
- Named directories with `rm -rf` first — Risk of deleting wrong thing

### 4. Binary location configuration

**Decision**: `BRANE_BIN` environment variable with fallback chain.

**Rationale**: Standard Unix pattern. Allows CI to specify path while local dev uses defaults.

**Fallback chain**:
1. `$BRANE_BIN` if set
2. `./brane` (local build)
3. `brane` in PATH

**Implementation**:
```bash
BRANE="${BRANE_BIN:-./brane}"
if ! command -v "$BRANE" &>/dev/null; then
  echo "ERROR: Brane binary not found. Set BRANE_BIN or build with: bun build src/cli.ts --compile --outfile brane"
  exit 1
fi
```

### 5. Output formatting for readability

**Decision**: Use section headers with `echo` and separator lines.

**Rationale**: Scripts should be readable as documentation. Clear sections help users follow along.

**Pattern**:
```bash
echo "=== Step 1: Initialize Brane ==="
$BRANE /body/init
echo

echo "=== Step 2: Scan Files ==="
$BRANE /body/scan
echo
```

**Alternatives considered**:
- Silent mode with `-q` flag — Defeats TL;DR purpose
- JSON output only — Not human-readable
- Colored output — Complexity, terminal compatibility issues

### 6. Test runner design

**Decision**: Simple bash loop that runs each script, tracks pass/fail, reports summary.

**Rationale**: KISS. No external test framework needed.

**Pattern**:
```bash
PASSED=0
FAILED=0
for script in examples/[0-9]*.sh; do
  echo "Running: $script"
  if bash "$script"; then
    ((PASSED++))
  else
    ((FAILED++))
    FAILURES+=("$script")
  fi
done
echo "Passed: $PASSED, Failed: $FAILED"
exit $((FAILED > 0 ? 1 : 0))
```

### 7. Fixture generation strategy

**Decision**: Inline heredocs for small fixtures; simple TypeScript files for code extraction demos.

**Rationale**: Self-contained scripts with no external file dependencies.

**Pattern**:
```bash
cat > src/auth.ts << 'EOF'
// AuthService handles user authentication
export class AuthService {
  login(user: string, pass: string): boolean {
    return true;
  }
}
EOF
```

## Summary

All research questions resolved. No NEEDS CLARIFICATION remaining.

| Question | Decision | Confidence |
|----------|----------|------------|
| Binary build | `bun build --compile` | High |
| Script organization | Numbered in `examples/` | High |
| Idempotency | Temp directory + trap cleanup | High |
| Binary location | `BRANE_BIN` env var | High |
| Output format | Echo sections | High |
| Test runner | Simple bash loop | High |
| Fixtures | Inline heredocs | High |
