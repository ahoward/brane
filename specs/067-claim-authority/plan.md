# Implementation Plan: First-Class Claim + Authority Model

**Branch**: `067-claim-authority` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)
**Issue**: [#113](https://github.com/ahoward/brane/issues/113) | **Umbrella**: [#112](https://github.com/ahoward/brane/issues/112)
**Input**: Feature specification from `/specs/067-claim-authority/spec.md`

## Summary

Add two CozoDB relations to `mind.db` — `claims` (assertions about concepts/edges) and `authorities`
(a ranked, registered tier set) — plus eight sys.call handlers, one built-in Datalog rule, a schema
migration, and CLI surfaces.

The whole design turns on one decision: **authority rank is joined at read time, never copied into the
claim row, and resolution is a projection that never writes.** That is what keeps contradiction durable
instead of collapsing it on insert.

## Technical Context

**Language/Version**: TypeScript 5.x on Bun 1.x
**Primary Dependencies**: cozo-node (CozoDB, RocksDB backend), citty (CLI) — all existing
**Storage**: CozoDB `mind.db` — two new relations (`claims`, `authorities`), schema v1.12.0 → v1.13.0
**Testing**: tc suites (`tests/mind/claims/`, `tests/mind/authorities/`), shell runner + JSON fixtures
**Target Platform**: Linux/macOS CLI, local-first, offline
**Project Type**: Single project (existing brane layout)
**Performance Goals**: claim/conflict/resolved queries < 1s at 10,000 claims (SC-007)
**Constraints**: No new dependencies. No embeddings (conflict is exact-match, not semantic). Migration
must preserve all existing data and be backup/restore-safe.
**Scale/Scope**: 8 handlers, 1 migration, 1 built-in rule, 2 CLI command groups, ~2 lib modules touched

## Constitution Check

*GATE: passed before Phase 0, re-checked after Phase 1 design.*

| Principle | Compliance |
|---|---|
| I. POD only | Claims, tiers, conflict groups are interfaces over plain JSON. No classes. |
| II. Result envelope | All 8 handlers return `success()` / `error()` from `lib/result.ts`. |
| III. sys.call public API only | Handlers are thin; shared logic lands in `src/lib/claims.ts` as plain functions. |
| IV. Antagonistic testing | tc suites written and Gemini-reviewed before implementation. Tests lock after review. |
| V. Unix-clean | `null` over `undefined`, JSON on stdout, non-zero exit on error, snake_case fields. |
| VI. Simplicity (YAGNI) | No `binding` flag, no retraction audit, no semantic conflict detection, no claim→claim edges. All deferred to #114/#115/#116 and recorded in spec Out of Scope. |

**Complexity to justify**: one — a second new relation (`authorities`) rather than a hardcoded tier
constant. Justified in Complexity Tracking below.

**Post-design re-check**: passed. Design adds no classes, no exceptions-for-control-flow, no new
dependencies, and no handler that returns a non-envelope shape.

## Project Structure

### Documentation (this feature)

```text
specs/067-claim-authority/
├── spec.md              # Feature specification (merged in PR #117)
├── plan.md              # This file
├── research.md          # Phase 0: decisions + rationale
├── data-model.md        # Phase 1: relations, fields, invariants
├── contracts/           # Phase 1: sys.call request/response contracts
│   ├── claims.md
│   └── authorities.md
├── quickstart.md        # Phase 1: the refund scenario, end to end
└── tasks.md             # Phase 2
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── claims.ts                       # NEW — id allocation, validation, rank join, conflict grouping
│   ├── mind.ts                         # MODIFIED — BUILTIN_RULE_NAMES += "contradictions"
│   └── migrate.ts                      # MODIFIED — v1.12.0 → v1.13.0 migration, LATEST_VERSION bump
├── handlers/mind/
│   ├── init.ts                         # MODIFIED — schema v1.13.0, new relations, seed tiers, new builtin rule
│   ├── claims/
│   │   ├── create.ts                   # NEW — /mind/claims/create
│   │   ├── get.ts                      # NEW — /mind/claims/get
│   │   ├── list.ts                     # NEW — /mind/claims/list (filters + resolve)
│   │   ├── delete.ts                   # NEW — /mind/claims/delete
│   │   └── conflicts.ts                # NEW — /mind/claims/conflicts
│   ├── authorities/
│   │   ├── create.ts                   # NEW — /mind/authorities/create (upsert)
│   │   ├── list.ts                     # NEW — /mind/authorities/list
│   │   └── delete.ts                   # NEW — /mind/authorities/delete (refuses if referenced)
│   ├── concepts/delete.ts              # MODIFIED — cascade claims
│   └── edges/delete.ts                 # MODIFIED — cascade claims
├── cli/
│   ├── commands/claim.ts               # NEW — brane claim create|list|get|delete|conflicts
│   ├── commands/authority.ts           # NEW — brane authority list|create|delete
│   └── main.ts                         # MODIFIED — register both under admin + backward-compat top level
└── index.ts                            # MODIFIED — sys.register the 8 new paths

tests/mind/
├── claims/                             # NEW — run + data/NN-case/{params,result}.json
└── authorities/                        # NEW — run + data/NN-case/{params,result}.json
```

**Structure Decision**: Existing single-project brane layout. Handlers map to sys.call paths one-to-one
(`/mind/claims/create` → `src/handlers/mind/claims/create.ts`), matching the annotations and episodes
precedent exactly. Shared non-handler logic goes in `src/lib/claims.ts` per constitution III.

## Phase 0 — Research

See [research.md](./research.md). Ten decisions recorded, including the three the spec deferred to this
phase:

- **Case sensitivity** → conflict comparison is trim-then-exact, **case-sensitive**.
- **Rank storage** → registry lookup at read time; claims store the tier *name* only.
- **Idempotency** → pre-insert lookup on the full 5-tuple, no content hash.

## Phase 1 — Design

- [data-model.md](./data-model.md) — the two relations, field types, invariants, cascade rules, and the
  derived conflict-group shape.
- [contracts/claims.md](./contracts/claims.md) — request/response for the five claim paths.
- [contracts/authorities.md](./contracts/authorities.md) — request/response for the three authority paths.
- [quickstart.md](./quickstart.md) — the refund 30/14/45 walkthrough as a copy-pasteable session.

## Phase 2 — Tasks

Generated into [tasks.md](./tasks.md). Ordering: migration + schema → lib → handlers → rule → CLI →
tests, with tc test authoring pulled ahead of implementation per constitution IV.

## Risks

| Risk | Mitigation |
|---|---|
| Cozo arity coupling — the built-in `contradictions` rule hardcodes the 8-column `claims` shape; a later column addition (e.g. #114's `binding`) breaks it | Document the coupling in `data-model.md`; #114 must update the rule body in the same migration that adds the column. Rule syntax is validated at init, so breakage surfaces immediately, not at query time. |
| Migration on a live db | Reuse the existing backup/restore path in `migrate.ts` — no new machinery. New relations only; no data rewrite, so restore is cheap. |
| Idempotency pre-insert lookup cost at scale | The 5-tuple lookup is a filtered scan; acceptable at the 10k target. Revisit with an index only if SC-007 fails. |
| `resolve: true` and conflict grouping done in TypeScript rather than Datalog | Deliberate — grouping/tie logic in Datalog is opaque and hard to test. Rows come back from a single query; grouping is in-memory. Revisit if 10k claims breaches SC-007. |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Second new relation (`authorities`) instead of a hardcoded `AUTHORITY_TIERS` constant | Spec FR-006 requires projects to register their own tiers (`security`, `sre`, `compliance`) and FR-012 requires re-ranking without rewriting claims. A constant makes both impossible. | A hardcoded tier list would make "strict about authority" mean "strict about *brane's* authorities", which is not the principle. The registry is 3 fields and 3 handlers — the smallest thing that satisfies FR-004/006/012. |
