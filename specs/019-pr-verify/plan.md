# Implementation Plan: PR Verify

**Branch**: `019-pr-verify` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-pr-verify/spec.md`

## Summary

PR Verify combines file change detection from `/body/files/status` with rule verification from `/mind/verify` to provide pre-commit/CI validation. It reports both what files changed and whether those changes would pass all rules.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun runtime)
**Primary Dependencies**: bun:sqlite, cozo-node (existing)
**Storage**: SQLite (body.db), CozoDB (mind.db) - both existing
**Testing**: tc framework (JSON in/out)
**Target Platform**: CLI (Linux/macOS)
**Project Type**: Single project (existing structure)
**Performance Goals**: <5s for 100 changed files
**Constraints**: Must compose existing handlers, no new database tables
**Scale/Scope**: Single new handler at `/calabi/pr-verify`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | All inputs/outputs are JSON-serializable POD |
| II. Result Envelope | ✅ PASS | Uses standard `{status, result, errors, meta}` shape |
| III. sys.call is Public API Only | ✅ PASS | Handler is thin adapter, reuses existing internal functions |
| IV. Antagonistic Testing | ✅ PASS | tc tests will be designed then reviewed |
| V. Unix-Clean | ✅ PASS | Exit codes reflect pass/fail, `null` over `undefined` |
| VI. Simplicity (YAGNI) | ✅ PASS | Composes existing handlers, minimal new code |

## Project Structure

### Documentation (this feature)

```text
specs/019-pr-verify/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - no new entities)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── calabi-pr-verify.md
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── calabi/
│       └── pr-verify.ts    # NEW: PR verification handler
└── index.ts                # Route registration

tests/
└── calabi/
    └── pr-verify/
        ├── run
        └── data/
            ├── 00-success-no-violations/
            ├── 01-success-with-violations/
            ├── 02-success-no-changes/
            ├── 03-success-specific-rules/
            ├── 04-success-dry-run/
            ├── 05-error-body-not-initialized/
            ├── 06-error-mind-not-initialized/
            └── 07-error-rule-not-found/
```

**Structure Decision**: Single new handler under `/calabi` (the integration layer between body and mind). Reuses existing helpers from `src/lib/mind.ts` and patterns from `src/handlers/body/files/status.ts`.

## Complexity Tracking

No violations - composing existing functionality.
