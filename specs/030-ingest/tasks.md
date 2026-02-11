# Tasks: Ingest

**Input**: Design documents from `/specs/030-ingest/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Whitebox spike proving the feature works end-to-end

- [X] T001 Write whitebox spike script in try/ingest.sh — init workspace, create files, run `brane ingest .`, verify body.db and mind.db populated. NO MOCKS.
- [X] T002 Run spike and iterate until it passes end-to-end

**Checkpoint**: Spike proves ingest works with real LLM. Only then proceed to formal implementation.

---

## Phase 2: Foundational (Handler + Registration)

**Purpose**: Core handler and CLI command that all user stories depend on

- [X] T003 Create /calabi/ingest handler in src/handlers/calabi/ingest.ts — orchestrator that calls body/scan handler then iterates added/updated files through extract_from_file + extract handler
- [X] T004 Create brane ingest CLI command in src/cli/commands/ingest.ts — positional path arg (default "."), --dry-run, --json flags, per-file progress output
- [X] T005 Register /calabi/ingest handler in src/index.ts and register ingest CLI command in src/cli/main.ts

**Checkpoint**: `brane ingest src/auth.ts` works end-to-end (single file, no dry-run)

---

## Phase 3: User Story 1 - Ingest a Single File (Priority: P1)

**Goal**: Single file ingestion — index into body.db AND extract into mind.db in one step

**Independent Test**: Run `brane ingest src/auth.ts` on a tracked/untracked file, verify body.db entry and mind.db concepts

- [X] T006 [US1] Create test directory and runner in tests/calabi/ingest/run — workspace setup with init, file creation, body file tracking
- [X] T007 [P] [US1] Create test case tests/calabi/ingest/data/00-success-single-file/ — new file ingested, verify totals show files_added=1, concepts_extracted>0
- [X] T008 [P] [US1] Create test case tests/calabi/ingest/data/01-success-updated-file/ — file already tracked with different hash, verify re-extraction
- [X] T009 [P] [US1] Create test case tests/calabi/ingest/data/02-success-unchanged-file/ — file tracked and unchanged, verify skipped (files_unchanged=1, no extraction)
- [X] T010 [US1] Run test suite with BRANE_LLM_MOCK=1 BRANE_EMBED_MOCK=1 — all ingest tests pass

**Checkpoint**: Single file ingestion works — new, updated, and unchanged cases all handled

---

## Phase 4: User Story 2 - Ingest a Directory (Priority: P2)

**Goal**: Directory ingestion — all eligible files under a path are indexed and extracted

**Independent Test**: Run `brane ingest src/` on a directory with multiple files, verify all processed

- [X] T011 [P] [US2] Create test case tests/calabi/ingest/data/03-success-directory/ — directory with multiple files, verify totals aggregate correctly
- [X] T012 [US2] Run test suite — all tests pass including directory case

**Checkpoint**: Directory ingestion works with per-file progress and aggregated totals

---

## Phase 5: User Story 3 - Dry Run Preview (Priority: P3)

**Goal**: Preview what ingestion would do without modifying databases

**Independent Test**: Run `brane ingest src/ --dry-run`, verify no DB changes but patch output shown

- [X] T013 [P] [US3] Create test case tests/calabi/ingest/data/04-success-dry-run/ — dry_run=true, verify concepts_created=0 and patch field present
- [X] T014 [US3] Run test suite — all tests pass including dry-run case

**Checkpoint**: Dry run shows preview without side effects

---

## Phase 6: User Story 4 - Default Path and Error Cases (Priority: P4)

**Goal**: Default to "." when no path given, proper error messages for uninitialized workspace

**Independent Test**: Run `brane ingest` with no args, verify defaults to current directory

- [X] T015 [P] [US4] Create test case tests/calabi/ingest/data/05-error-not-initialized/ — no .brane directory, verify error
- [X] T016 [P] [US4] Create test case tests/calabi/ingest/data/06-success-default-path/ — no path arg, verify defaults to "."
- [X] T017 [US4] Run test suite — all tests pass

**Checkpoint**: All user stories complete and independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T018 Run full test suite (all 289 tests) — verify no regressions
- [X] T019 Build binary and verify `brane ingest` works from compiled binary
- [X] T020 try/ingest.sh spike already exercises all modes (single file, directory, dry-run, unchanged skip)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — spike first
- **Foundational (Phase 2)**: Depends on spike passing
- **User Stories (Phase 3-6)**: All depend on Phase 2 (handler + CLI exist)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 only — no other story dependencies
- **User Story 2 (P2)**: Depends on Phase 2 only — directory is just "multiple single files"
- **User Story 3 (P3)**: Depends on Phase 2 only — dry_run is a flag on the same handler
- **User Story 4 (P4)**: Depends on Phase 2 only — default path and error handling

### Parallel Opportunities

- T007, T008, T009 can run in parallel (different test case directories)
- T011 can run in parallel with US1 tests (different test case)
- T013 can run in parallel with other test cases
- T015, T016 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Write spike (T001-T002) — prove it works with real LLM
2. Implement handler + CLI (T003-T005)
3. Add US1 tests (T006-T010)
4. **STOP and VALIDATE**: `brane ingest src/auth.ts` works

### Incremental Delivery

1. Spike → Foundation → US1 (single file) → validate
2. Add US2 (directory) → validate
3. Add US3 (dry run) → validate
4. Add US4 (defaults + errors) → validate
5. Polish → full regression suite

---

## Notes

- Tests use BRANE_LLM_MOCK=1 BRANE_EMBED_MOCK=1 for deterministic results
- Mock LLM extracts PascalCase basename from filename as single Entity concept
- RocksDB single-connection: 10ms delays between files in handler
- body/scan handler is called directly (not via sys.call) per Constitution Principle III
