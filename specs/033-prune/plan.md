# Implementation Plan: Prune Orphaned Knowledge

**Branch**: `033-prune` | **Date**: 2026-03-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/033-prune/spec.md`

## Summary

Add `brane prune` command that removes orphaned concepts, dangling edges, and stale provenance from mind.db when their source files no longer exist in body.db. Supports `--dry-run` for preview. Lens-aware via `resolve_lens_paths()`.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: cozo-node (CozoDB), bun:sqlite, citty (CLI), existing mind.ts/body.ts/state.ts utilities
**Storage**: SQLite `.brane/lens/{name}/body.db` (file tracking), CozoDB `.brane/lens/{name}/mind.db` (knowledge graph) — both existing
**Testing**: tc test runner (`src/tc.ts`) — JSON in/out test cases
**Target Platform**: Linux/macOS CLI
**Project Type**: single
**Performance Goals**: Prune completes in under 5 seconds for graphs with up to 10,000 concepts
**Constraints**: Must not remove manually created concepts (no provenance). Must not remove concepts with at least one valid provenance.
**Scale/Scope**: Single new handler + CLI subcommand. ~100-150 lines of handler code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ | All data in/out is JSON POD |
| II. Result Envelope | ✅ | Handler returns standard `{status, result, errors, meta}` |
| III. sys.call Public API Only | ✅ | Single handler at `/mind/prune`, internal logic uses direct function calls |
| IV. Antagonistic Testing | ✅ | tc tests designed first, Gemini review before implementation |
| V. Unix-Clean | ✅ | null over undefined, exit codes, JSON output |
| VI. Simplicity (YAGNI) | ✅ | Single handler, no abstractions. Cross-db query is straightforward. |

**GATE PASSED** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/033-prune/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── mind/
│       └── prune.ts         # NEW — /mind/prune handler
├── cli/
│   └── commands/
│       └── prune.ts         # MODIFY — add `brane prune` subcommand
├── index.ts                 # MODIFY — register /mind/prune handler
└── lib/
    ├── mind.ts              # existing — open_mind()
    ├── body.ts              # existing — open body.db
    └── state.ts             # existing — resolve_lens_paths()

tests/
└── mind/
    └── prune/
        ├── run              # test runner
        └── data/
            ├── 00-success-basic/
            ├── 01-success-dry-run/
            ├── 02-success-no-orphans/
            ├── 03-success-multi-provenance/
            ├── 04-success-manual-concepts/
            ├── 05-error-not-initialized/
            └── ...
```

**Structure Decision**: Single new handler file at `src/handlers/mind/prune.ts`. CLI wiring in existing `src/cli/commands/`. Follows existing handler-per-path convention.
