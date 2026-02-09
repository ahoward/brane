# Implementation Plan: 025-lens-config

**Branch**: `025-lens-config` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-lens-config/spec.md`

## Summary

Add shareable ontology configurations ("lenses") that define golden concept types, edge relations, rules, and consolidation hints. Silently track all type/relation usage with stats to surface candidates for blessing as golden. Enable reproducible verification across users with the same lens.

## Technical Context

**Language/Version**: TypeScript 5.x (Bun 1.x runtime)
**Primary Dependencies**: CozoDB (cozo-node), citty (CLI), js-yaml (YAML parsing)
**Storage**: CozoDB mind.db (RocksDB backend) - new relations for lens data
**Testing**: tc test harness (JSON in/out contract tests)
**Target Platform**: Linux/macOS CLI
**Project Type**: Single project (existing Brane CLI)
**Performance Goals**: N/A (configuration operations, not hot path)
**Constraints**: Schema migration must preserve existing data
**Scale/Scope**: Local-first, single-user CLI tool

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. POD Only | ✅ PASS | Lens config is YAML → POD, all data structures are interfaces |
| II. Result Envelope | ✅ PASS | All `/lens/*` handlers return standard envelope |
| III. sys.call Public API | ✅ PASS | Handlers are thin, internal functions do the work |
| IV. Antagonistic Testing | ✅ PASS | Will write tc tests, Gemini review before implementation |
| V. Unix-Clean | ✅ PASS | `null` over `undefined`, exit codes matter |
| VI. Simplicity (YAGNI) | ✅ PASS | Phase 1 & 2 only (storage + tracking), defer consolidation |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/025-lens-config/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── lens/
│       ├── show.ts      # /lens/show - return current lens config
│       ├── import.ts    # /lens/import - load lens from YAML
│       ├── export.ts    # /lens/export - dump lens to YAML
│       ├── stats.ts     # /lens/stats - usage statistics
│       └── bless.ts     # /lens/bless - promote to golden
├── cli/
│   └── commands/
│       └── lens.ts      # brane lens [show|import|export|stats|bless]
└── lib/
    └── lens.ts          # shared lens utilities

tests/
└── lens/
    ├── show/
    ├── import/
    ├── export/
    ├── stats/
    └── bless/
```

**Structure Decision**: Follows existing handler/CLI pattern (see `src/handlers/mind/`, `src/cli/commands/`). New `lens` namespace for all lens-related operations.

## Implementation Phases

### Phase 1: Lens Storage & Basic Operations

**Goal**: Store lens configuration in mind.db, import/export YAML

1. Schema migration (v1.6.0):
   - `lens_meta` relation for name, version, description
   - `golden_types` relation for concept types
   - `golden_relations` relation for edge relations
   - `consolidation_map` relation for type mappings

2. Handlers:
   - `/lens/show` - return current lens config as POD
   - `/lens/import` - parse YAML, upsert to relations
   - `/lens/export` - query relations, serialize to YAML

3. CLI:
   - `brane lens show`
   - `brane lens import <file>`
   - `brane lens export`

4. Built-in lenses:
   - `default` lens seeded on `brane init` (current Entity/Caveat/Rule + DEPENDS_ON/etc.)

### Phase 2: Usage Tracking & Stats

**Goal**: Silently track all type/relation usage, surface candidates

1. Schema additions:
   - `type_usage` relation (type, count, first_seen, last_seen, golden)
   - `relation_usage` relation (rel, count, first_seen, last_seen, golden)

2. Modify existing handlers:
   - `/mind/concepts/create` - increment type_usage on create
   - `/mind/concepts/update` - update type_usage if type changes
   - `/mind/edges/create` - increment relation_usage on create
   - `/mind/edges/update` - update relation_usage if relation changes

3. Handlers:
   - `/lens/stats` - return usage stats, optionally filter to candidates
   - `/lens/bless` - promote detected type/relation to golden

4. CLI:
   - `brane lens stats`
   - `brane lens stats --candidates`
   - `brane lens bless --type <type> --description <desc>`
   - `brane lens bless --rel <rel> --description <desc>`

### Phase 3: Consolidation (Future - Not This Spec)

Deferred per YAGNI. Will implement when needed.

### Phase 4: Shareable Verification (Future - Not This Spec)

Deferred per YAGNI. Lens rules already stored; verification integration later.

## Complexity Tracking

> No violations requiring justification.

| Item | Decision | Rationale |
|------|----------|-----------|
| js-yaml dependency | Add new dep | Standard YAML parser, small footprint, well-maintained |
| Schema v1.6.0 | Additive migration | New relations only, no changes to existing relations |
| Usage tracking | Inline in handlers | Simpler than hooks/middleware, explicit is better |
