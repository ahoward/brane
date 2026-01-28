# Implementation Plan: Verify Check

**Branch**: `017-verify-check` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-verify-check/spec.md`

## Summary

Add `/mind/verify` endpoint that runs all defined rules (built-in and custom) against the knowledge graph and returns a unified report of violations. Supports selective rule execution, summary statistics, and CI/CD-friendly exit codes.

## Technical Context

**Language/Version**: TypeScript (Bun runtime)
**Primary Dependencies**: CozoDB (mind.db), existing `/mind/rules/*` handlers from 016-rules-define
**Storage**: mind.db (CozoDB with RocksDB backend)
**Testing**: tc tests (JSON in/out)
**Target Platform**: CLI (cross-platform via Bun)
**Project Type**: single
**Performance Goals**: Verify 1000 concepts against all built-in rules in <10 seconds
**Constraints**: Sequential rule execution (parallel is future optimization)
**Scale/Scope**: Typical knowledge graphs have 100-10,000 concepts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | All inputs/outputs are JSON-serializable POD |
| II. Result Envelope | ✅ PASS | Uses standard `{status, result, errors, meta}` shape |
| III. sys.call Public API | ✅ PASS | Single `/mind/verify` endpoint, internal logic uses functions |
| IV. Antagonistic Testing | ✅ PASS | tc tests designed before implementation |
| V. Unix-Clean | ✅ PASS | Exit code 0/non-zero, `null` over `undefined` |
| VI. Simplicity (YAGNI) | ✅ PASS | Single handler, reuses existing `/mind/rules/query` |

**No violations. Gate passed.**

## Project Structure

### Documentation (this feature)

```text
specs/017-verify-check/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── mind/
│       └── verify.ts    # NEW: /mind/verify handler
├── lib/
│   └── mind.ts          # Existing: Rule utilities (reuse)
└── index.ts             # Register new handler

tests/
└── mind/
    └── verify/
        ├── run          # Test runner
        └── data/
            ├── 00-success-no-violations/
            ├── 01-success-with-violations/
            ├── 02-success-specific-rules/
            ├── 03-success-no-rules/
            ├── 04-error-not-initialized/
            ├── 05-error-rule-not-found/
            └── 06-success-rule-execution-error/
```

**Structure Decision**: Single project structure following existing Brane patterns. New handler at `src/handlers/mind/verify.ts` with tc tests at `tests/mind/verify/`.

## Complexity Tracking

No violations to justify. Implementation is minimal:
- One new handler
- Reuses existing `/mind/rules/list` and `/mind/rules/query` logic
- Standard result envelope
