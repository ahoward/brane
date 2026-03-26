# Implementation Plan: Schema Migrations

**Branch**: `049-schema-migrations` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/049-schema-migrations/spec.md`

## Summary

Add a versioned migration system to mind.db that automatically detects outdated schemas on open, backs up the database, and applies sequential migrations to reach the latest version. Integrates into the existing `open_mind()` path so all handlers benefit without individual changes.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: cozo-node (CozoDB with RocksDB backend), existing mind.ts utilities
**Storage**: CozoDB mind.db (RocksDB backend) — schema_meta relation for version tracking
**Testing**: tc test runner (`bun run src/tc.ts`), whitebox spike scripts
**Target Platform**: Linux/macOS CLI
**Project Type**: Single project (existing brane codebase)
**Performance Goals**: Migration of <10K concept database completes in under 5 seconds
**Constraints**: Must not break any of the existing 334 tests; CozoDB backup via native `backup_db()` method
**Scale/Scope**: Migration registry starts with 0 migrations (v1.7.0 is current); future issues (#34, #37, etc.) will add migrations as they change schema

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | PASS | Migrations are functions operating on POD (version strings, CozoDb handle). No classes for data. |
| II. Result Envelope | PASS | `open_mind()` returns `MindDb \| MindError` (existing pattern). Migration errors surface through this. |
| III. sys.call is Public API Only | PASS | Migrations are internal library code, not sys.call handlers. Called from `open_mind()`. |
| IV. Antagonistic Testing | PASS | Will follow: spike first, tc tests, Gemini review. |
| V. Unix-Clean | PASS | Migration logs to stderr. No stdout pollution. |
| VI. Simplicity (YAGNI) | PASS | Minimal design: ordered array of migration functions, linear walk from current to latest. No migration rollback DSL, no partial migrations, no migration generators. |

## Project Structure

### Documentation (this feature)

```text
specs/049-schema-migrations/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── migrate.ts       # NEW: migration registry, runner, backup logic
├── handlers/
│   └── mind/
│       └── init.ts      # MODIFIED: bump SCHEMA_VERSION, call migrate on existing dbs
└── lib/
    └── mind.ts          # MODIFIED: call migrate() in open_mind() before returning db
```

**Structure Decision**: Single new file `src/lib/migrate.ts` contains the entire migration system. Integration points are `open_mind()` (auto-migrate on access) and `mind/init.ts` (version tracking). No new directories needed.
