# Implementation Plan: Episodic Memory

**Branch**: `034-episodic-memory` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/034-episodic-memory/spec.md`

## Summary

Add episodic memory to brane's knowledge graph — a new `episodes` relation in mind.db with CRUD handlers and semantic search. Episodes record what agents observed, decided, and learned, timestamped and embedded for retrieval by meaning. Schema v1.8.0 delivered via the migration system from #49.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: cozo-node (CozoDB with RocksDB backend), existing mind.ts/embed.ts utilities, migrate.ts (from #49)
**Storage**: CozoDB mind.db (RocksDB backend) — new `episodes` relation + HNSW index
**Testing**: tc test runner (`bun run src/tc.ts`), whitebox spike scripts
**Target Platform**: Linux/macOS CLI
**Project Type**: Single project (existing brane codebase)
**Performance Goals**: All episode operations < 1 second for databases with up to 10K episodes
**Constraints**: Must use existing embed system (model2vec, 256 dims). Schema migration must preserve all existing data.
**Scale/Scope**: 5 new handlers, 1 migration, ~20 tc test cases

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | PASS | Episodes are POD in/out. No classes for data. |
| II. Result Envelope | PASS | All 5 handlers return standard `{ status, result, errors, meta }`. |
| III. sys.call is Public API Only | PASS | Handlers are thin adapters. Embedding, ID generation use internal functions. |
| IV. Antagonistic Testing | PASS | Spike first, tc tests, Gemini review. |
| V. Unix-Clean | PASS | JSON in/out, null over undefined. |
| VI. Simplicity (YAGNI) | PASS | No update handler (create new, delete old). No episode versioning. No consolidation (future #38). |

## Project Structure

### Source Code

```text
src/
├── lib/
│   ├── migrate.ts           # MODIFIED: add v1.7.0→v1.8.0 migration + bump LATEST_VERSION
│   └── mind.ts              # MODIFIED: add get_next_episode_id()
├── handlers/
│   └── mind/
│       └── episodes/
│           ├── create.ts    # NEW: /mind/episodes/create
│           ├── list.ts      # NEW: /mind/episodes/list
│           ├── get.ts       # NEW: /mind/episodes/get
│           ├── delete.ts    # NEW: /mind/episodes/delete
│           └── search.ts    # NEW: /mind/episodes/search
└── handlers/
    └── mind/
        └── init.ts          # MODIFIED: add episodes relation + HNSW to create_schema()

try/
└── episodes-spike.sh        # NEW: whitebox spike

tests/
└── mind/episodes/           # NEW: tc tests for all 5 handlers
```
