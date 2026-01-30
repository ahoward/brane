# Implementation Plan: Whitebox Scripts

**Branch**: `022-whitebox-scripts` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-whitebox-scripts/spec.md`

## Summary

Create a collection of idempotent, hacker-clean bash scripts that demonstrate Brane workflows and serve as a white-box test suite. All scripts run against a **compiled binary** (not `bun run`), ensuring we test what users actually ship. Scripts are self-documenting TL;DR examples for onboarding.

## Technical Context

**Language/Version**: Bash (POSIX-compatible where possible)
**Primary Dependencies**: Brane CLI (compiled binary), standard Unix utilities (echo, cat, mkdir, rm, mktemp)
**Storage**: N/A (scripts create temporary directories)
**Testing**: Self-testing via test runner script + integration with existing tc framework
**Target Platform**: macOS, Linux, WSL (Windows Subsystem for Linux)
**Project Type**: Scripts collection (not source code)
**Performance Goals**: All scripts complete in under 60 seconds total
**Constraints**: No external dependencies beyond Brane and standard Unix utilities
**Scale/Scope**: ~10-15 scripts covering core workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ N/A | Scripts, not data structures |
| II. Result Envelope | ✅ Pass | Scripts call Brane CLI which returns envelopes |
| III. sys.call Public API | ✅ Pass | Scripts use CLI (public API), not internal functions |
| IV. Antagonistic Testing | ✅ Pass | Scripts ARE the tests; will be reviewed |
| V. Unix-Clean | ✅ Pass | Bash scripts, exit codes, stdin/stdout |
| VI. Simplicity (YAGNI) | ✅ Pass | Minimal scripts, no abstractions |

**Gate Result**: PASS — No violations, proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/022-whitebox-scripts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # N/A (no data model)
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A (no API contracts)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
examples/
├── 00-quickstart.sh          # P1: Full workflow demo
├── 01-body-init.sh           # P2: Initialize body.db
├── 02-body-scan.sh           # P2: Scan files into body
├── 03-mind-init.sh           # P2: Initialize mind.db
├── 04-mind-concepts.sh       # P2: Create/list concepts
├── 05-mind-edges.sh          # P2: Create/list edges
├── 06-mind-search.sh         # P2: Semantic search
├── 07-mind-verify.sh         # P2: Run verification rules
├── 08-calabi-extract.sh      # P2: LLM extraction
├── 09-context-query.sh       # P2: Context retrieval
├── run-all.sh                # P3: Test runner
└── lib/
    └── common.sh             # Shared functions (BRANE_BIN, fixtures)
```

**Structure Decision**: Scripts live in `examples/` at repo root for discoverability. Shared utilities in `lib/common.sh` to avoid duplication (DRY without over-abstraction).

## Complexity Tracking

No violations requiring justification.
