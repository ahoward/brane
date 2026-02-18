# Implementation Plan: Multi-Lens

**Branch**: `031-multi-lens` | **Date**: 2026-02-17 | **Spec**: specs/031-multi-lens/spec.md
**Input**: Feature specification from `/specs/031-multi-lens/spec.md`

## Summary

Named lenses as top-level citizens. Each lens is an independent body.db + mind.db pair stored under `.brane/lens/{name}/`. A new `.brane/state.db` (SQLite) provides brane-wide persistent configuration (active lens, future settings). The existing flat layout (`.brane/body.db` + `.brane/mind.db`) is detected and treated as the "default" lens for backward compatibility. All existing commands operate on the active lens transparently via a centralized path-resolution layer.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: cozo-node (CozoDB), bun:sqlite, citty (CLI), js-yaml (YAML parsing) — all existing
**Storage**: SQLite `.brane/state.db` (new, brane-wide config); SQLite `.brane/lens/{name}/body.db` (per-lens file tracking); CozoDB `.brane/lens/{name}/mind.db` (per-lens knowledge graph)
**Testing**: tc test framework (language-agnostic JSON in/out) + BRANE_EMBED_MOCK=1 for deterministic embeddings
**Target Platform**: Linux (primary), macOS
**Project Type**: Single project (existing)
**Performance Goals**: Lens create/switch/delete < 100ms. No regression on ingest throughput.
**Constraints**: Zero regressions on 290+ existing tests. Backward compatible with flat layout.
**Scale/Scope**: Tens of lenses per project (not thousands). Each lens has its own full database pair.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | PASS | All new data structures are interfaces/type aliases. No classes. |
| II. Result Envelope | PASS | New handlers (`/state/init`, `/lens/create`, `/lens/use`, `/lens/list`, `/lens/delete`, `/lens/migrate`) return standard Result envelope. |
| III. sys.call is Public API Only | PASS | Path resolution is internal (lib function). New CLI commands delegate to handlers via sys.call. |
| IV. Antagonistic Testing | PASS | Will use tc test framework. Gemini review before implementation. |
| V. Unix-Clean | PASS | `null` not `undefined`. Exit codes. JSON stdout, progress stderr. |
| VI. Simplicity (YAGNI) | PASS | No composition, no inheritance, no lens merging. Deferred per spec. state.db has a single `config` table, not an ORM. |

## Project Structure

### Documentation (this feature)

```text
specs/031-multi-lens/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # sys.call contract definitions
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── state.ts         # NEW — open/read/write state.db, resolve active lens paths
│   ├── mind.ts          # MODIFY — open_mind() accepts optional lens path override
│   ├── body.ts          # MODIFY — file_exists_in_body() accepts optional lens path override
│   └── lens.ts          # EXISTING — no changes needed (operates on db handle, not paths)
├── handlers/
│   ├── state/
│   │   └── init.ts      # NEW — /state/init: create state.db with config table
│   ├── lens/
│   │   ├── create.ts    # NEW — /lens/create: create named lens directory + dbs
│   │   ├── use.ts       # NEW — /lens/use: set active lens in state.db
│   │   ├── list.ts      # NEW — /lens/list: list lens directories + active marker
│   │   ├── delete.ts    # NEW — /lens/delete: remove non-default, non-active lens
│   │   ├── migrate.ts   # NEW — /lens/migrate: move flat layout to lens/default/
│   │   ├── show.ts      # MODIFY — accept optional lens name argument
│   │   ├── import.ts    # EXISTING — no changes (uses open_mind() which gets lens-aware)
│   │   ├── export.ts    # EXISTING — no changes
│   │   ├── stats.ts     # EXISTING — no changes
│   │   └── bless.ts     # EXISTING — no changes
│   ├── body/
│   │   └── init.ts      # MODIFY — accept target_dir to create body.db at lens path
│   ├── mind/
│   │   └── init.ts      # MODIFY — accept target_dir to create mind.db at lens path
│   └── calabi/
│       └── ingest.ts    # MODIFY — resolve paths via state.ts instead of hardcoded .brane/
└── cli/
    └── commands/
        ├── init.ts      # MODIFY — also create state.db
        └── lens.ts      # NEW — brane lens {create,use,list,delete,migrate} subcommands

tests/
├── state/init/          # NEW
├── lens/create/         # NEW
├── lens/use/            # NEW
├── lens/list/           # NEW
├── lens/delete/         # NEW
└── lens/migrate/        # NEW
```

**Structure Decision**: Extends existing single-project layout. New `src/lib/state.ts` is the keystone — all path resolution flows through it. New `src/handlers/state/init.ts` for state.db lifecycle. New lens management handlers. Existing handlers unchanged (they already call `open_mind()` which becomes lens-aware).

## Complexity Tracking

No violations. All new code follows existing patterns (handler + lib, Result envelope, tc tests).
