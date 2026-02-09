# Implementation Plan: Graph Explore

**Branch**: `027-graph-explore` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-graph-explore/spec.md`

## Summary

Add CLI graph exploration commands to provide visibility into the knowledge graph structure. Primary commands include `brane graph` (summary), `brane graph concepts` (listing), `brane graph edges` (listing), `brane graph neighbors` (drill-down), and `brane graph viz` (ASCII/Mermaid visualization). Implementation reuses existing `/mind/concepts/list` and `/mind/edges/list` handlers where possible, adding new handlers for summary, neighbors, and visualization.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: citty (CLI), CozoDB (cozo-node), existing mind.ts utilities
**Storage**: CozoDB mind.db (RocksDB backend) - no schema changes required
**Testing**: tc test harness (JSON in/out contract tests)
**Target Platform**: Linux/macOS CLI
**Project Type**: Single project
**Performance Goals**: Sub-second response for graphs up to 1000 nodes
**Constraints**: No external dependencies for visualization (pure text output)
**Scale/Scope**: Graphs up to 10k concepts/edges; visualization readable up to ~20 nodes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | All data structures are interfaces/types, no classes |
| II. Result Envelope | ✅ PASS | All handlers return standard Result envelope |
| III. sys.call Public API | ✅ PASS | Handlers delegate to internal functions |
| IV. Antagonistic Testing | ✅ PASS | tc tests before implementation |
| V. Unix-Clean | ✅ PASS | JSON output, proper exit codes, stdout for output |
| VI. Simplicity (YAGNI) | ✅ PASS | Minimal implementation, ASCII/Mermaid without external deps |

## Project Structure

### Documentation (this feature)

```text
specs/027-graph-explore/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── graph/
│       ├── summary.ts       # /graph/summary - counts and distributions
│       ├── neighbors.ts     # /graph/neighbors - connected concepts
│       └── viz.ts           # /graph/viz - ASCII/Mermaid visualization
├── cli/
│   └── commands/
│       └── graph.ts         # brane graph [summary|concepts|edges|neighbors|viz]
└── lib/
    └── viz.ts               # Visualization utilities (ASCII, Mermaid)

tests/
└── graph/
    ├── summary/
    │   ├── run
    │   └── data/
    ├── neighbors/
    │   ├── run
    │   └── data/
    └── viz/
        ├── run
        └── data/
```

**Structure Decision**: Single project structure. New handlers under `src/handlers/graph/` following existing patterns. CLI command at `src/cli/commands/graph.ts`. Shared visualization utilities at `src/lib/viz.ts`.

## Complexity Tracking

No constitution violations to justify.

## Implementation Approach

### Reuse Existing Infrastructure

- **Concept listing**: Delegate to `/mind/concepts/list` handler
- **Edge listing**: Delegate to `/mind/edges/list` handler
- **Mind utilities**: Use existing `open_mind()`, `is_mind_error()` from mind.ts

### New Components

1. **`/graph/summary`** - Aggregate queries for counts and type/relation distributions
2. **`/graph/neighbors`** - CozoDB query joining edges with concepts
3. **`/graph/viz`** - Pure TypeScript ASCII/Mermaid generation

### CLI Structure

```
brane graph              # Default to summary
brane graph summary      # Explicit summary
brane graph concepts     # Delegate to concept list
brane graph edges        # Delegate to edge list
brane graph neighbors ID # Show neighborhood
brane graph viz          # ASCII visualization
brane graph viz --format mermaid  # Mermaid output
brane graph viz --center ID       # Centered on concept
```

### Visualization Strategy

- **ASCII**: Simple box drawing with `─│┌┐└┘` characters
- **Mermaid**: Standard flowchart syntax `graph TD; A-->B`
- **Large graph handling**: Warn and suggest --limit or --center flags
