# Tasks: Graph Explore

**Input**: Design documents from `/specs/027-graph-explore/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure and handler registration

- [x] T001 Create graph handler directory at src/handlers/graph/
- [x] T002 Register graph command in src/cli/main.ts (import and add to subCommands)
- [x] T003 [P] Create visualization library at src/lib/viz.ts with interface stubs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared test infrastructure

- [x] T004 Create test directory structure at tests/graph/summary/, tests/graph/neighbors/, tests/graph/viz/
- [x] T005 [P] Create test runner script at tests/graph/summary/run
- [x] T006 [P] Create test runner script at tests/graph/neighbors/run
- [x] T007 [P] Create test runner script at tests/graph/viz/run

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Graph Summary (Priority: P1) 🎯 MVP

**Goal**: Users can view a summary of their knowledge graph showing concept count, edge count, type distribution, and relation distribution

**Independent Test**: Run `brane graph` in an initialized workspace and see counts and breakdowns

### Tests for User Story 1

- [x] T008 [P] [US1] Create test case 00-success-basic-summary at tests/graph/summary/data/00-success-basic-summary/
- [x] T009 [P] [US1] Create test case 01-success-empty-graph at tests/graph/summary/data/01-success-empty-graph/
- [x] T010 [P] [US1] Create test case 02-error-not-initialized at tests/graph/summary/data/02-error-not-initialized/

### Implementation for User Story 1

- [x] T011 [US1] Implement /graph/summary handler at src/handlers/graph/summary.ts
- [x] T012 [US1] Register /graph/summary route in src/index.ts
- [x] T013 [US1] Create CLI graph command at src/cli/commands/graph.ts with summary subcommand
- [x] T014 [US1] Wire up default `brane graph` to show summary (shows help; use `brane graph summary`)

**Checkpoint**: User Story 1 complete - `brane graph` shows summary with counts and distributions

---

## Phase 4: User Story 2 - List Concepts with Filtering (Priority: P2)

**Goal**: Users can list all concepts, optionally filtered by type

**Independent Test**: Run `brane graph concepts` to list all; run `brane graph concepts --type Entity` to filter

### Implementation for User Story 2

- [x] T015 [US2] Add concepts subcommand to src/cli/commands/graph.ts (delegates to /mind/concepts/list)
- [x] T016 [US2] Format concept list output with ID, NAME, TYPE columns

**Checkpoint**: User Story 2 complete - `brane graph concepts` lists concepts with optional type filter

---

## Phase 5: User Story 3 - List Edges with Filtering (Priority: P3)

**Goal**: Users can list all edges, optionally filtered by relation, source, or target

**Independent Test**: Run `brane graph edges` to list all; run `brane graph edges --relation DEPENDS_ON` to filter

### Implementation for User Story 3

- [x] T017 [US3] Add edges subcommand to src/cli/commands/graph.ts (delegates to /mind/edges/list)
- [x] T018 [US3] Format edge list output with ID, SOURCE, TARGET, RELATION, WEIGHT columns

**Checkpoint**: User Story 3 complete - `brane graph edges` lists edges with optional filters

---

## Phase 6: User Story 4 - Show Concept Neighbors (Priority: P4)

**Goal**: Users can see all concepts connected to a specific concept (its "neighborhood")

**Independent Test**: Run `brane graph neighbors 1` to see all concepts connected to concept ID 1

### Tests for User Story 4

- [x] T019 [P] [US4] Create test case 00-success-with-neighbors at tests/graph/neighbors/data/00-success-with-neighbors/
- [x] T020 [P] [US4] Create test case 01-success-no-neighbors at tests/graph/neighbors/data/01-success-no-neighbors/
- [x] T021 [P] [US4] Create test case 02-error-not-found at tests/graph/neighbors/data/02-error-not-found/
- [x] T022 [P] [US4] Create test case 03-error-missing-id at tests/graph/neighbors/data/03-error-missing-id/
- [x] T022b [P] [US4] Create test case 04-error-not-initialized at tests/graph/neighbors/data/04-error-not-initialized/

### Implementation for User Story 4

- [x] T023 [US4] Implement /graph/neighbors handler at src/handlers/graph/neighbors.ts
- [x] T024 [US4] Register /graph/neighbors route in src/index.ts
- [x] T025 [US4] Add neighbors subcommand to src/cli/commands/graph.ts

**Checkpoint**: User Story 4 complete - `brane graph neighbors ID` shows connected concepts

---

## Phase 7: User Story 5 - Graph Visualization (Priority: P5)

**Goal**: Users can see a visualization of their graph in ASCII or Mermaid format

**Independent Test**: Run `brane graph viz` for ASCII; run `brane graph viz --format mermaid` for Mermaid

### Tests for User Story 5

- [x] T026 [P] [US5] Create test case 00-success-ascii at tests/graph/viz/data/00-success-ascii/
- [x] T027 [P] [US5] Create test case 01-success-mermaid at tests/graph/viz/data/01-success-mermaid/
- [x] T028 [P] [US5] Create test case 02-success-empty-graph at tests/graph/viz/data/02-success-empty-graph/
- [x] T029 [P] [US5] Create test case 03-success-centered at tests/graph/viz/data/03-success-centered/
- [x] T030 [P] [US5] Create test case 04-success-truncated at tests/graph/viz/data/04-success-truncated/
- [x] T031 [P] [US5] Create test case 05-error-invalid-format at tests/graph/viz/data/05-error-invalid-format/
- [x] T031b [P] [US5] Create test case 06-error-center-not-found at tests/graph/viz/data/06-error-center-not-found/

### Implementation for User Story 5

- [x] T032 [US5] Implement render_ascii() function in src/lib/viz.ts
- [x] T033 [US5] Implement render_mermaid() function in src/lib/viz.ts
- [x] T034 [US5] Implement /graph/viz handler at src/handlers/graph/viz.ts
- [x] T035 [US5] Register /graph/viz route in src/index.ts
- [x] T036 [US5] Add viz subcommand to src/cli/commands/graph.ts with --format and --center flags

**Checkpoint**: User Story 5 complete - `brane graph viz` outputs ASCII or Mermaid visualization

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration and validation

- [x] T037 Add alias 'g' for graph command in src/cli/main.ts subCommandAliases
- [x] T038 Run all graph tests and verify passing (15 tests, all pass)
- [x] T039 Run quickstart.md validation scenarios manually (all scenarios pass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - MVP
- **User Story 2 (P2)**: No dependencies - delegates to existing handler
- **User Story 3 (P3)**: No dependencies - delegates to existing handler
- **User Story 4 (P4)**: No dependencies on other stories
- **User Story 5 (P5)**: No dependencies on other stories

### Within Each User Story

- Tests written first (marked [P] within story for parallel)
- Handler implementation
- Route registration
- CLI subcommand

### Parallel Opportunities

- T005, T006, T007 can run in parallel (different test runners)
- T008, T009, T010 can run in parallel (different test cases)
- T019, T020, T021, T022 can run in parallel (different test cases)
- T026-T031 can run in parallel (different test cases)

---

## Parallel Example: User Story 5 Tests

```bash
# Launch all viz tests together:
Task: "Create test case 00-success-ascii at tests/graph/viz/data/00-success-ascii/"
Task: "Create test case 01-success-mermaid at tests/graph/viz/data/01-success-mermaid/"
Task: "Create test case 02-success-empty-graph at tests/graph/viz/data/02-success-empty-graph/"
Task: "Create test case 03-success-centered at tests/graph/viz/data/03-success-centered/"
Task: "Create test case 04-success-truncated at tests/graph/viz/data/04-success-truncated/"
Task: "Create test case 05-error-invalid-format at tests/graph/viz/data/05-error-invalid-format/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: User Story 1 (T008-T014)
4. **STOP and VALIDATE**: `brane graph` shows summary
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → `brane graph` works (MVP!)
3. User Story 2 → `brane graph concepts` works
4. User Story 3 → `brane graph edges` works
5. User Story 4 → `brane graph neighbors` works
6. User Story 5 → `brane graph viz` works
7. Each story adds value without breaking previous stories

---

## Notes

- User Stories 2 & 3 delegate to existing handlers - minimal new code
- Visualization (US5) is the most complex - ASCII and Mermaid rendering
- All handlers follow existing patterns (Result envelope, open_mind(), etc.)
- Test structure follows tc convention (JSON in/out)
