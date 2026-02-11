# Implementation Plan: Ingest

**Branch**: `030-ingest` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-ingest/spec.md`

## Summary

Unified `brane ingest <path>` command that merges file indexing (body/scan) and LLM-powered knowledge extraction (calabi/extract-llm) into a single operation. Orchestrates existing handlers — no new infrastructure, just a new handler at `/calabi/ingest` and a CLI command.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: CozoDB (cozo-node), bun:sqlite, citty (CLI), existing mind.ts/body.ts utilities
**Storage**: SQLite body.db (file tracking), CozoDB mind.db (knowledge graph) — both existing
**Testing**: tc.ts test runner with BRANE_LLM_MOCK=1 BRANE_EMBED_MOCK=1
**Target Platform**: Linux/macOS CLI
**Project Type**: Single CLI application
**Performance Goals**: Process 10+ files sequentially with per-file progress
**Constraints**: RocksDB single-connection (10ms delays between files), LLM calls are the bottleneck (~3-15s per file)
**Scale/Scope**: Typical usage: 5-50 files per ingest run

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | PASS | All data in/out is JSON-serializable POD |
| II. Result Envelope | PASS | Handler returns standard `{status, result, errors, meta}` |
| III. sys.call Public API | PASS | `/calabi/ingest` is thin orchestrator, delegates to internal handlers via direct function calls |
| IV. Antagonistic Testing | PASS | tc tests with mock backends |
| V. Unix-Clean | PASS | stdin/stdout, JSON output, exit codes |
| VI. Simplicity | PASS | Orchestrator only — reuses existing scan + extract-llm handlers, no new abstractions |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/030-ingest/
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
│   └── calabi/
│       └── ingest.ts          # NEW: /calabi/ingest handler (orchestrator)
├── cli/
│   └── commands/
│       └── ingest.ts          # NEW: brane ingest CLI command
├── index.ts                   # MODIFIED: register /calabi/ingest
└── lib/
    ├── body.ts                # EXISTING: file_exists_in_body()
    ├── llm.ts                 # EXISTING: extract_from_file()
    ├── mind.ts                # EXISTING: open_mind()
    └── lens.ts                # EXISTING: get_golden_types/relations()

tests/
└── calabi/
    └── ingest/
        ├── run                # NEW: test runner
        └── data/
            ├── 00-success-single-file/
            ├── 01-success-directory/
            ├── 02-success-skip-unchanged/
            ├── 03-success-dry-run/
            ├── 04-error-not-initialized/
            └── 05-error-file-not-found/
```

**Structure Decision**: Follows existing handler-per-path pattern. Single new handler + CLI command + tests. No new libraries or abstractions.
