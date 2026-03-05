# Tasks: Prune Orphaned Knowledge

**Input**: Design documents from `/specs/033-prune/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: tc test suites included (brane uses antagonistic testing per constitution).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Register handler and wire CLI

- [ ] T001 Create handler skeleton at `src/handlers/mind/prune.ts` — export async handler, return success with empty result
- [ ] T002 Register `/mind/prune` handler in `src/index.ts`
- [ ] T003 Add `brane prune` CLI subcommand with `--dry-run` flag in `src/cli/commands/prune.ts`

---

## Phase 2: Foundational

**Purpose**: Core prune logic — cross-db orphan detection and deletion

- [ ] T004 Implement orphan detection in `src/handlers/mind/prune.ts`: open body.db → get valid file_urls, open mind.db → get all provenance, compute orphan concept_ids (all provenance stale), compute dangling edge_ids
- [ ] T005 Implement deletion in `src/handlers/mind/prune.ts`: delete edges → provenance → concepts via CozoDB `:rm` queries. Skip deletions when `dry_run` is true.
- [ ] T006 Return result envelope with `concepts_removed`, `edges_removed`, `provenance_removed`, and `details` (lists of removed items)

**Checkpoint**: Handler works end-to-end. Ready for test suites.

---

## Phase 3: User Story 1 — Prune after file deletion (Priority: P1) MVP

**Goal**: Remove orphaned concepts/edges when source files are deleted from the project.

**Independent Test**: Ingest a file, delete it from disk, run `brane prune`, verify concepts/edges/provenance removed.

### Tests for User Story 1

- [ ] T007 [P] [US1] Create test runner `tests/mind/prune/run` with workspace setup and `brane /mind/prune` invocation
- [ ] T008 [P] [US1] Create test case `tests/mind/prune/data/00-success-basic/` — ingest file, remove from body.db, prune removes orphan concepts + edges + provenance
- [ ] T009 [P] [US1] Create test case `tests/mind/prune/data/01-success-no-orphans/` — all provenance valid, prune removes nothing
- [ ] T010 [P] [US1] Create test case `tests/mind/prune/data/02-success-multi-provenance/` — concept with provenance from 2 files, one removed, concept survives
- [ ] T011 [P] [US1] Create test case `tests/mind/prune/data/03-error-not-initialized/` — no .brane directory, returns error

### Implementation for User Story 1

- [ ] T012 [US1] Verify handler handles the basic prune case: stale provenance → orphan concepts → dangling edges all removed
- [ ] T013 [US1] Verify handler preserves concepts with at least one valid provenance record

**Checkpoint**: US1 tests pass. Basic prune works.

---

## Phase 4: User Story 2 — Dry run (Priority: P1)

**Goal**: Preview what would be removed without modifying mind.db.

**Independent Test**: Run `brane prune --dry-run`, verify output matches what actual prune would do, verify mind.db unchanged.

### Tests for User Story 2

- [ ] T014 [P] [US2] Create test case `tests/mind/prune/data/04-success-dry-run/` — dry_run=true, returns counts and details, mind.db unchanged

### Implementation for User Story 2

- [ ] T015 [US2] Verify dry_run flag skips all `:rm` queries but still returns full details

**Checkpoint**: US2 tests pass. Dry run works.

---

## Phase 5: User Story 3 — Prune after re-extraction (Priority: P2)

**Goal**: Clean up stale concepts after a file is re-ingested with different content.

**Independent Test**: Ingest file, update provenance to point to different concepts, prune removes old-only concepts.

### Tests for User Story 3

- [ ] T016 [P] [US3] Create test case `tests/mind/prune/data/05-success-re-extraction/` — old concept has stale provenance after re-extraction, gets pruned

**Checkpoint**: US3 tests pass.

---

## Phase 6: User Story 4 — Respect manually created concepts (Priority: P2)

**Goal**: Concepts with no provenance (manually created) are never pruned.

**Independent Test**: Create concept manually (no provenance), run prune, verify it survives.

### Tests for User Story 4

- [ ] T017 [P] [US4] Create test case `tests/mind/prune/data/06-success-manual-concepts/` — concept with no provenance, prune leaves it alone

**Checkpoint**: US4 tests pass. Manual concepts safe.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T018 Run full test suite (`BRANE_EMBED_MOCK=1 bun run src/tc.ts`) — verify zero regressions
- [ ] T019 Create whitebox spike `try/prune.sh` — end-to-end prune with real ingest + file deletion
- [ ] T020 Send implementation to Gemini for antagonistic review
- [ ] T021 Address Gemini findings (if any)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 (parallel with US1)
- **US3 (Phase 5)**: Depends on Phase 2 (parallel with US1/US2)
- **US4 (Phase 6)**: Depends on Phase 2 (parallel with US1/US2/US3)
- **Polish (Phase 7)**: Depends on all user stories

### Parallel Opportunities

- T007-T011: All test case creation can run in parallel
- T014, T016, T017: Test cases for US2-US4 can run in parallel with US1 tests
- US1-US4 implementation is sequential (single handler file) but tests are parallel

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup (T001-T003)
2. Phase 2: Foundational (T004-T006)
3. Phase 3: US1 tests + implementation (T007-T013)
4. Phase 4: US2 tests + implementation (T014-T015)
5. **VALIDATE**: Core prune + dry run working

### Complete

6. Phase 5: US3 (T016)
7. Phase 6: US4 (T017)
8. Phase 7: Polish (T018-T021)

---

## Notes

- All test cases use `tests/lib.sh` helpers (`init_brane`, `create_concepts`, `create_edges`)
- Test runner needs to set up body.db with specific files, then manipulate provenance/file records to simulate deletion
- CozoDB `:rm` queries follow patterns from `src/handlers/mind/provenance/delete.ts`
- 21 total tasks across 7 phases
