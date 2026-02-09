# Implementation Plan: Vector Search

**Branch**: `021-vector-search` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)

## Summary

Add semantic similarity search to Brane's knowledge graph. Concepts get 384-dimensional embeddings generated locally via fastembed-js. New `/mind/search` endpoint finds semantically similar concepts using CozoDB's HNSW index. Embeddings are generated on concept create/update.

## Technical Context

**Language/Version**: TypeScript (Bun runtime)
**Primary Dependencies**: fastembed-js (ONNX-based local embeddings), CozoDB (HNSW vector index)
**Storage**: mind.db (CozoDB with RocksDB backend)
**Testing**: tc framework (JSON in/out tests)
**Target Platform**: Linux/macOS CLI
**Project Type**: Single project (existing structure)
**Performance Goals**: <100ms embedding generation, <50ms search on 10k concepts
**Constraints**: CPU-only (no GPU required), offline-capable, zero API cost
**Scale/Scope**: Up to 10,000 concepts per project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | Embeddings are `number[]`, search results are POD |
| II. Result Envelope | ✅ PASS | /mind/search returns standard envelope |
| III. sys.call Public API | ✅ PASS | Only /mind/search is new endpoint |
| IV. Antagonistic Testing | ✅ PASS | tc tests with mock embeddings |
| V. Unix-Clean | ✅ PASS | stdin/stdout, null over undefined |
| VI. Simplicity | ✅ PASS | Single embedding lib, no abstractions |

No violations. Proceeding to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/021-vector-search/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical research
├── data-model.md        # Schema changes
├── contracts/           # API contracts
│   └── mind-search.md   # /mind/search contract
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── mind/
│       ├── search.ts        # NEW: /mind/search handler
│       ├── concepts/
│       │   ├── create.ts    # MODIFY: add embedding generation
│       │   └── update.ts    # MODIFY: regenerate embedding
│       └── init.ts          # MODIFY: schema v1.4.0 with vector field + HNSW
└── lib/
    ├── mind.ts              # MODIFY: add embedding helpers
    └── embed.ts             # NEW: fastembed wrapper

tests/
└── mind/
    └── search/              # NEW: tc tests for /mind/search
        ├── run
        └── data/
            ├── 00-success-basic-search/
            ├── 01-success-limit/
            ├── 02-success-empty-results/
            └── 03-error-mind-not-initialized/
```

**Structure Decision**: Follows existing pattern. New handler at `src/handlers/mind/search.ts`, new lib at `src/lib/embed.ts`.

## Complexity Tracking

No violations to justify.
