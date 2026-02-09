# Implementation Plan: Binary Examples

**Branch**: `028-binary-examples` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-binary-examples/spec.md`

## Summary

Ensure all documentation examples run with compiled `brane` binary from `./bin/`. Update build output location, add `./bin` to PATH via `.envrc`, audit all examples to confirm they work.

## Technical Context

**Language/Version**: Bash (POSIX-compatible), Bun 1.x (build only)
**Primary Dependencies**: Bun build system, direnv
**Storage**: N/A (no data changes)
**Testing**: Shell script validation, manual execution
**Target Platform**: Linux/macOS with direnv
**Project Type**: Single project
**Performance Goals**: N/A
**Constraints**: All examples must pass
**Scale/Scope**: ~9 quickstart files + README.md

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | N/A | No data structures involved |
| II. Result Envelope | N/A | No sys.call changes |
| III. sys.call is Public API | N/A | Not touching API |
| IV. Antagonistic Testing | PASS | Will create validation tests |
| V. Unix-Clean | PASS | Binary in PATH, clean exit codes |
| VI. Simplicity | PASS | Minimal changes, direct approach |

## Project Structure

### Documentation (this feature)

```text
specs/028-binary-examples/
├── spec.md              # Feature specification
├── plan.md              # This file
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Task breakdown (after /speckit.tasks)
```

### Source Code Changes

```text
Changes to existing files:
├── package.json         # Update build output to ./bin/brane
├── .envrc               # Add ./bin to PATH
├── .gitignore           # Ensure ./bin/brane is ignored (binary)
└── README.md            # Already uses `brane` command (verify)

Files to audit (no changes expected):
├── specs/016-rules-define/quickstart.md
├── specs/017-verify-check/quickstart.md
├── specs/018-annotate/quickstart.md
├── specs/019-pr-verify/quickstart.md
├── specs/021-vector-search/quickstart.md
├── specs/022-whitebox-scripts/quickstart.md
├── specs/025-lens-config/quickstart.md
├── specs/026-context-vector/quickstart.md
└── specs/027-graph-explore/quickstart.md

Tests to create:
└── tests/binary-examples/
    ├── run              # Test runner script
    └── data/
        ├── 01-binary-exists/
        ├── 02-help-works/
        ├── 03-init-works/
        └── 04-readme-examples/
```

**Structure Decision**: Minimal changes to build system and PATH configuration. Validation via tests that exercise compiled binary.

## Complexity Tracking

No violations. Simple, direct approach.

## Implementation Approach

### Phase 1: Build Configuration

1. **Update package.json** - Change build output from `./brane` to `./bin/brane`
   - Current: `"build": "bun build src/cli.ts --compile --outfile brane"`
   - New: `"build": "mkdir -p bin && bun build src/cli.ts --compile --outfile bin/brane"`

2. **Update .envrc** - Add `./bin` to PATH
   - Add: `export PATH="$PWD/bin:$PATH"`
   - This ensures `brane` resolves to `./bin/brane` when in project directory

3. **Update .gitignore** - Ensure binary is not committed
   - Add: `/bin/brane` or `/bin/` if not already present

### Phase 2: Audit Documentation

1. **README.md** - Verify all examples use `brane` command
   - Already confirmed: INSTALL section shows `./brane --help`
   - Need to update: Should show `brane --help` (relies on PATH)

2. **Quickstart files** - Audit all 9 files for `brane` usage
   - Already confirmed: All use `brane` command directly

### Phase 3: Validation Tests

Create tests that exercise the compiled binary:

1. **Binary exists** - Verify `./bin/brane` exists after build
2. **Help works** - `brane --help` exits 0 with expected output
3. **Init works** - `brane init` in temp directory succeeds
4. **Core commands** - Sample of README examples execute without error

### Phase 4: CI Integration

Document how to run example validation in CI:
1. Build binary
2. Source .envrc
3. Run validation tests

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Binary location | `./bin/brane` | Standard convention, keeps root clean |
| PATH approach | .envrc with direnv | Already in use, automatic for devs |
| Test framework | tc-style JSON tests | Consistent with project conventions |
| README INSTALL | Update to use PATH | Shows real workflow, not ./brane hack |

## Dependencies

- direnv must be installed and configured
- Users must run `direnv allow` in project directory
- Build must succeed before examples work

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| User doesn't have direnv | Document in README, provide manual PATH instructions |
| Build fails | Test build in CI before merging |
| Old binary in project root | Clean up in this PR, add to .gitignore |

## Success Metrics

From spec:
- SC-001: 100% of README.md code blocks execute without error
- SC-002: 100% of quickstart guide code blocks execute without error
- SC-003: `which brane` returns `./bin/brane` in project directory
- SC-004: No examples use `bun run src/cli.ts` pattern
- SC-005: `bun run build` creates `./bin/brane`
