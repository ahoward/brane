# Tasks: Define Datalog Rules

**Input**: Design documents from `/specs/016-rules-define/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: tc tests are required per Brane's antagonistic testing workflow (Constitution Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

**Antagonist Review**: Self-review completed (Gemini quota exhausted). Additional edge cases added.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Schema & Infrastructure)

**Purpose**: Add rules relation to mind.db schema and create handler structure

- [X] T001 Add `rules` relation schema to src/handlers/mind/init.ts
- [X] T002 [P] Add BUILTIN_RULES constant with cycles and orphans definitions in src/handlers/mind/init.ts
- [X] T003 [P] Create handler directory structure at src/handlers/mind/rules/
- [X] T004 [P] Add rules utilities to src/lib/mind.ts (validate_rule_syntax, get_rule_by_name)
- [X] T005 Update SCHEMA_VERSION to "1.2.0" in src/handlers/mind/init.ts

---

## Phase 2: Foundational (Built-in Rules Seeding)

**Purpose**: Ensure built-in rules (cycles, orphans) are seeded on mind/init

**⚠️ CRITICAL**: User stories depend on built-in rules being available

- [X] T006 Implement built-in rules seeding in create_schema() in src/handlers/mind/init.ts
- [X] T007 Create test for built-in rules seeded on init at tests/mind/init/data/04-success-builtin-rules/ (Validated via mind/rules/list tests)

**Checkpoint**: Built-in rules available after `mind/init` - user story implementation can begin

---

## Phase 3: User Story 1 & 2 - Built-in Rules (Priority: P1) 🎯 MVP

**Goal**: Query cycles and orphans rules to detect graph integrity issues

**Independent Test**: Create graph with known cycle (A→B→C→A) and orphan, verify rules detect them

### Tests for US1 & US2

- [X] T008 [P] [US1] Create tc test for cycles found at tests/mind/rules/query/data/00-success-cycles-found/
- [X] T009 [P] [US1] Create tc test for cycles none at tests/mind/rules/query/data/01-success-cycles-none/
- [X] T010 [P] [US2] Create tc test for orphans found at tests/mind/rules/query/data/02-success-orphans-found/
- [X] T011 [P] [US2] Create tc test for orphans none at tests/mind/rules/query/data/03-success-orphans-none/
- [X] T012 [P] [US1] Create tc test for query not found at tests/mind/rules/query/data/05-error-not-found/
- [X] T013 [P] [US1] Create tc test for cycles self-loop (A→A) at tests/mind/rules/query/data/06-success-cycles-self-loop/
- [X] T014 [P] [US1] Create tc test for multiple independent cycles at tests/mind/rules/query/data/07-success-cycles-multiple/
- [X] T015 [P] [US1] Create tc test for query not initialized at tests/mind/rules/query/data/08-error-not-initialized/
- [X] T016 [P] [US2] Create tc test for orphan with self-edge only at tests/mind/rules/query/data/09-success-orphans-self-edge/

### Implementation for US1 & US2

- [X] T017 [US1] Implement /mind/rules/query handler in src/handlers/mind/rules/query.ts
- [X] T018 [US1] Register /mind/rules/query route in src/index.ts

**Checkpoint**: Can query cycles and orphans rules - MVP complete

---

## Phase 4: User Story 3 - Create Custom Rules (Priority: P2)

**Goal**: Create custom Datalog rules with syntax validation

**Independent Test**: Create a simple custom rule, verify it's stored and can be queried

### Tests for US3 - Create

- [X] T019 [P] [US3] Create tc test for create success at tests/mind/rules/create/data/00-success-create-custom/
- [X] T020 [P] [US3] Create tc test for invalid syntax at tests/mind/rules/create/data/01-error-invalid-syntax/
- [X] T021 [P] [US3] Create tc test for missing name at tests/mind/rules/create/data/02-error-missing-name/
- [X] T022 [P] [US3] Create tc test for duplicate name at tests/mind/rules/create/data/03-error-duplicate-name/
- [X] T023 [P] [US3] Create tc test for missing description at tests/mind/rules/create/data/04-error-missing-description/
- [X] T024 [P] [US3] Create tc test for missing body at tests/mind/rules/create/data/05-error-missing-body/
- [X] T025 [P] [US3] Create tc test for overwrite builtin at tests/mind/rules/create/data/06-error-overwrite-builtin/
- [X] T026 [P] [US3] Create tc test for create not initialized at tests/mind/rules/create/data/07-error-not-initialized/
- [X] T027 [P] [US3] Create tc test for query custom rule at tests/mind/rules/query/data/04-success-custom-rule/

### Implementation for US3 - Create

- [X] T028 [US3] Implement /mind/rules/create handler in src/handlers/mind/rules/create.ts
- [X] T029 [US3] Register /mind/rules/create route in src/index.ts

### Tests for US3 - Delete

- [X] T030 [P] [US3] Create tc test for delete success at tests/mind/rules/delete/data/00-success-delete-custom/
- [X] T031 [P] [US3] Create tc test for delete not found at tests/mind/rules/delete/data/01-error-not-found/
- [X] T032 [P] [US3] Create tc test for delete builtin protected at tests/mind/rules/delete/data/02-error-builtin-protected/
- [X] T033 [P] [US3] Create tc test for delete missing name at tests/mind/rules/delete/data/03-error-missing-name/
- [X] T034 [P] [US3] Create tc test for delete not initialized at tests/mind/rules/delete/data/04-error-not-initialized/

### Implementation for US3 - Delete

- [X] T035 [US3] Implement /mind/rules/delete handler in src/handlers/mind/rules/delete.ts
- [X] T036 [US3] Register /mind/rules/delete route in src/index.ts

**Checkpoint**: Can create and delete custom rules

---

## Phase 5: User Story 4 - List Rules (Priority: P2)

**Goal**: List all defined rules (built-in and custom)

**Independent Test**: Create custom rules, verify list shows both built-in and custom

### Tests for US4

- [X] T037 [P] [US4] Create tc test for list all at tests/mind/rules/list/data/00-success-list-all/
- [X] T038 [P] [US4] Create tc test for list empty custom at tests/mind/rules/list/data/01-success-list-empty-custom/
- [X] T039 [P] [US4] Create tc test for list not initialized at tests/mind/rules/list/data/02-error-not-initialized/

### Implementation for US4

- [X] T040 [US4] Implement /mind/rules/list handler in src/handlers/mind/rules/list.ts
- [X] T041 [US4] Register /mind/rules/list route in src/index.ts

**Checkpoint**: Can list all rules

---

## Phase 6: User Story 5 - Get Rule (Priority: P3)

**Goal**: Get a single rule by name with full details

**Independent Test**: Get built-in rule, verify all fields returned

### Tests for US5

- [X] T042 [P] [US5] Create tc test for get builtin at tests/mind/rules/get/data/00-success-get-builtin/
- [X] T043 [P] [US5] Create tc test for get custom at tests/mind/rules/get/data/01-success-get-custom/
- [X] T044 [P] [US5] Create tc test for get not found at tests/mind/rules/get/data/02-error-not-found/
- [X] T045 [P] [US5] Create tc test for get missing name at tests/mind/rules/get/data/03-error-missing-name/
- [X] T046 [P] [US5] Create tc test for get not initialized at tests/mind/rules/get/data/04-error-not-initialized/

### Implementation for US5

- [X] T047 [US5] Implement /mind/rules/get handler in src/handlers/mind/rules/get.ts
- [X] T048 [US5] Register /mind/rules/get route in src/index.ts

**Checkpoint**: Can get individual rule details

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T049 [P] Update tests/.seeds to include mind_rules seed with built-in rules (N/A - built-in rules seeded via init_mind)
- [X] T050 Run full test suite to verify all tests pass (193 passed, 0 failed)
- [ ] T051 Run quickstart.md validation manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase
  - US1 & US2 can proceed together (both P1, test built-in rules)
  - US3-5 can proceed after US1/US2 (need query working first)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 & US2 (P1)**: Can start after Phase 2 - Test built-in rules
- **US3 (P2)**: Needs query handler (T017) working first
- **US4 (P2)**: Can start after Phase 2 - Independent
- **US5 (P3)**: Can start after Phase 2 - Independent

### Parallel Opportunities

Within Phase 1:
- T002, T003, T004 can run in parallel

Within Phase 3 (US1 & US2):
- T008-T016 (all tests) can run in parallel

Within Phase 4 (US3):
- T019-T027 (create tests) can run in parallel
- T030-T034 (delete tests) can run in parallel

Within Phase 5 (US4):
- T037-T039 (list tests) can run in parallel

Within Phase 6 (US5):
- T042-T046 (get tests) can run in parallel

---

## Parallel Example: Phase 3 Tests

```bash
# Launch all tests for US1 & US2 together:
Task: "Create tc test for cycles found at tests/mind/rules/query/data/00-success-cycles-found/"
Task: "Create tc test for cycles none at tests/mind/rules/query/data/01-success-cycles-none/"
Task: "Create tc test for orphans found at tests/mind/rules/query/data/02-success-orphans-found/"
Task: "Create tc test for orphans none at tests/mind/rules/query/data/03-success-orphans-none/"
Task: "Create tc test for query not found at tests/mind/rules/query/data/05-error-not-found/"
Task: "Create tc test for cycles self-loop at tests/mind/rules/query/data/06-success-cycles-self-loop/"
Task: "Create tc test for multiple cycles at tests/mind/rules/query/data/07-success-cycles-multiple/"
Task: "Create tc test for query not initialized at tests/mind/rules/query/data/08-error-not-initialized/"
Task: "Create tc test for orphan self-edge at tests/mind/rules/query/data/09-success-orphans-self-edge/"
```

---

## Implementation Strategy

### MVP First (US1 & US2 Only)

1. Complete Phase 1: Setup (schema, structure)
2. Complete Phase 2: Foundational (built-in rules seeding)
3. Complete Phase 3: US1 & US2 (query cycles and orphans)
4. **STOP and VALIDATE**: Run `brane /mind/rules/query '{"name": "cycles"}'`
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Built-in rules available
2. Add US1 & US2 → Can query cycles/orphans → MVP!
3. Add US3 → Can create/delete custom rules
4. Add US4 → Can list all rules
5. Add US5 → Can get rule details

---

## Antagonist Review Notes

Edge cases added from self-review (Gemini quota exhausted):

1. **Self-loops**: Added test for A→A cycle detection
2. **Multiple cycles**: Added test for independent cycles (A→B→A, C→D→C)
3. **Orphan with self-edge**: Concept pointing only to itself - is it orphan?
4. **Missing fields**: Added tests for missing description, body, name in create/delete/get
5. **Overwrite builtin**: Cannot create rule named "cycles" or "orphans"
6. **Not initialized**: All handlers need not_initialized error test

---

## Notes

- tc tests use Brane's existing test infrastructure (JSON in/out)
- Built-in rules (cycles, orphans) use CozoDB Datalog recursive queries
- Schema version bumps to 1.2.0 with `rules` relation
- All handlers follow existing patterns in src/handlers/mind/concepts/
- Total tasks: 51 (was 39, added 12 edge case tests)
