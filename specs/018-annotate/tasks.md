# Tasks: Manual Annotations

**Input**: Design documents from `/specs/018-annotate/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: tc tests are required per Brane's antagonistic testing workflow (Constitution Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Schema & Infrastructure)

**Purpose**: Add annotations relation to mind.db schema and helper functions

- [X] T001 Add annotations relation schema to src/handlers/mind/init.ts
- [X] T002 Add annotation helpers to src/lib/mind.ts (types, validators, ID counter)
- [X] T003 Create handler directory structure at src/handlers/mind/annotations/

---

## Phase 2: User Story 1 & 2 - Create and Read Annotations (Priority: P1) 🎯 MVP

**Goal**: Create annotations on concepts and retrieve them via list/get

**Independent Test**: Create annotation, list all, get by ID - verify data persists

### Tests for US1 & US2

- [X] T004 [P] [US1] Create tc test for successful create at tests/mind/annotations/data/00-success-create/
- [X] T005 [P] [US1] Create tc test for error not initialized at tests/mind/annotations/data/01-error-not-initialized/
- [X] T006 [P] [US1] Create tc test for error concept not found at tests/mind/annotations/data/02-error-concept-not-found/
- [X] T007 [P] [US1] Create tc test for error text required at tests/mind/annotations/data/03-error-text-required/
- [X] T008 [P] [US2] Create tc test for successful list at tests/mind/annotations/data/04-success-list/
- [X] T009 [P] [US2] Create tc test for successful get at tests/mind/annotations/data/05-success-get/
- [X] T010 [P] [US2] Create tc test for error annotation not found at tests/mind/annotations/data/06-error-annotation-not-found/

### Implementation for US1 & US2

- [X] T011 [US1] Implement /mind/annotations/create handler in src/handlers/mind/annotations/create.ts
- [X] T012 [US2] Implement /mind/annotations/list handler in src/handlers/mind/annotations/list.ts
- [X] T013 [US2] Implement /mind/annotations/get handler in src/handlers/mind/annotations/get.ts
- [X] T014 [US1] Register annotation routes in src/index.ts
- [X] T015 [US1] Create test runner at tests/mind/annotations/run

**Checkpoint**: Can create and retrieve annotations - MVP complete

---

## Phase 3: User Story 3 - Delete Annotations (Priority: P2)

**Goal**: Remove outdated annotations

**Independent Test**: Create annotation, delete it, verify not in list

### Tests for US3

- [X] T016 [P] [US3] Create tc test for successful delete at tests/mind/annotations/data/07-success-delete/
- [X] T017 [P] [US3] Create tc test for delete not found at tests/mind/annotations/data/08-error-delete-not-found/

### Implementation for US3

- [X] T018 [US3] Implement /mind/annotations/delete handler in src/handlers/mind/annotations/delete.ts
- [X] T019 [US3] Register delete route in src/index.ts

**Checkpoint**: Can delete annotations

---

## Phase 4: User Story 4 - Annotation Types & Filtering (Priority: P3)

**Goal**: Categorize annotations and filter by target/type

**Independent Test**: Create annotations with different types, filter list by type

### Tests for US4

- [X] T020 [P] [US4] Create tc test for filter by target at tests/mind/annotations/data/09-success-filter-target/
- [X] T021 [P] [US4] Create tc test for filter by type at tests/mind/annotations/data/10-success-filter-type/
- [X] T022 [P] [US4] Create tc test for invalid type error at tests/mind/annotations/data/11-error-invalid-type/
- [X] T023 [P] [US4] Create tc test for text too long at tests/mind/annotations/data/12-error-text-too-long/

### Implementation for US4

- [X] T024 [US4] Add type validation to create handler
- [X] T025 [US4] Add target and type filter parameters to list handler
- [X] T026 [US4] Add text length validation (4096 char limit) to create handler

**Checkpoint**: Full annotation functionality complete

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T027 Run full test suite to verify all tests pass (213 passed, 0 failed)
- [ ] T028 Run quickstart.md validation manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 & 2 (Phase 2)**: Depends on Setup - CORE FUNCTIONALITY
- **User Story 3 (Phase 3)**: Can start after US1/US2 tests pass
- **User Story 4 (Phase 4)**: Can start after US1/US2 tests pass
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **US1 & US2 (P1)**: Foundation - must complete first (grouped because create/read are both essential for MVP)
- **US3 (P2)**: Independent of US4
- **US4 (P3)**: Independent of US3

### Parallel Opportunities

Within Phase 2 (US1 & US2):
- T004, T005, T006, T007, T008, T009, T010 (tests) can run in parallel

Within Phase 3 (US3):
- T016, T017 (tests) can run in parallel

Within Phase 4 (US4):
- T020, T021, T022, T023 (tests) can run in parallel

---

## Implementation Strategy

### MVP First (US1 & US2 Only)

1. Complete Phase 1: Setup (schema, helpers, directory)
2. Complete Phase 2: US1 & US2 (create, list, get)
3. **STOP and VALIDATE**: Run `brane /mind/annotations/create`, `/list`, `/get`
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Schema and helpers ready
2. Add US1 & US2 → Can create and retrieve annotations → MVP!
3. Add US3 → Can delete annotations
4. Add US4 → Full type/filter support

---

## Notes

- Single test runner at tests/mind/annotations/run handles all test cases
- Schema adds `annotations` relation to existing mind.db
- Follows existing patterns from concepts/edges handlers
- Total tasks: 28
