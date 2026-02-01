# Implementation Plan: Context Vector Search

**Branch**: `026-context-vector` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-context-vector/spec.md`

## Summary

Enhance `/context/query` to use vector similarity search for finding anchor concepts instead of just substring matching. Add a `mode` parameter ("semantic", "exact", "hybrid") with "hybrid" as default, combining the best of both approaches. Graceful fallback to exact-only when embeddings fail.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: cozo-node (CozoDB), fastembed-js (embeddings), existing mind.ts utilities
**Storage**: CozoDB mind.db (RocksDB backend) - existing `concepts:semantic` HNSW index
**Testing**: tc contract tests (JSON in/out)
**Target Platform**: CLI (cross-platform via Bun)
**Project Type**: Single project (existing structure)
**Performance Goals**: <500ms response for typical queries
**Constraints**: Must support graceful degradation when embeddings unavailable
**Scale/Scope**: Typical graphs 10-50 concepts, max ~1000

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ Pass | All data structures are interfaces, no classes |
| II. Result Envelope | ✅ Pass | Handler returns standard Result<ContextResult> |
| III. sys.call is Public API Only | ✅ Pass | Handler delegates to internal functions |
| IV. Antagonistic Testing | ✅ Pass | tc tests designed before implementation |
| V. Unix-Clean | ✅ Pass | Uses null, exit codes, JSON output |
| VI. Simplicity (YAGNI) | ✅ Pass | Modifies existing handler, minimal new code |

## Project Structure

### Documentation (this feature)

```text
specs/026-context-vector/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - existing entities)
├── quickstart.md        # Phase 1 output
└── contracts/
    └── context-api.md   # Updated API contract
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── context/
│       └── query.ts     # MODIFIED - add vector search + mode param
├── lib/
│   ├── mind.ts          # Existing mind utilities
│   └── embed.ts         # Existing embedding utilities
└── cli/
    └── commands/
        └── context.ts   # MODIFIED - add --mode flag

tests/
└── context/
    └── query/
        └── data/        # ADD new test cases for semantic/hybrid modes
```

**Structure Decision**: Single project, modifying existing files. No new modules needed - just enhancing `/context/query` handler.

## Complexity Tracking

> No violations - straightforward enhancement of existing handler.
