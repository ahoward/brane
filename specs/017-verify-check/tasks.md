# Tasks: Verify Check

**Input**: Design documents from `/specs/017-verify-check/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: tc tests are required per Brane's antagonistic testing workflow (Constitution Principle IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Handler Structure)

**Purpose**: Create handler file and register route

- [X] T001 Create handler file at src/handlers/mind/verify.ts
- [X] T002 Register /mind/verify route in src/index.ts

---

## Phase 2: User Story 1 - Run All Rules (Priority: P1) 🎯 MVP

**Goal**: Run all defined rules and return a unified violation report

**Independent Test**: Create graph with known cycle and orphan, verify both are reported

### Tests for US1

- [X] T003 [P] [US1] Create tc test for no violations at tests/mind/verify/data/00-success-no-violations/
- [X] T004 [P] [US1] Create tc test for with violations at tests/mind/verify/data/01-success-with-violations/
- [X] T005 [P] [US1] Create tc test for not initialized at tests/mind/verify/data/04-error-not-initialized/

### Implementation for US1

- [X] T006 [US1] Implement /mind/verify handler core logic in src/handlers/mind/verify.ts
- [X] T007 [US1] Add list all rules functionality (reuse /mind/rules/list logic)
- [X] T008 [US1] Add execute rule functionality (reuse /mind/rules/query logic)
- [X] T009 [US1] Add summary statistics computation (rules_passed, rules_failed, total_violations)

**Checkpoint**: Can verify graph with all rules - MVP complete

---

## Phase 3: User Story 2 - Run Specific Rules (Priority: P2)

**Goal**: Run only specified rules instead of all rules

**Independent Test**: Verify with {"rules": ["cycles"]} only runs cycles rule

### Tests for US2

- [X] T010 [P] [US2] Create tc test for specific rules at tests/mind/verify/data/02-success-specific-rules/
- [X] T011 [P] [US2] Create tc test for rule not found at tests/mind/verify/data/05-error-rule-not-found/

### Implementation for US2

- [X] T012 [US2] Add rules parameter parsing in src/handlers/mind/verify.ts
- [X] T013 [US2] Add rule existence validation before execution
- [X] T014 [US2] Filter rules to execute based on parameter

**Checkpoint**: Can verify with specific rules

---

## Phase 4: User Story 3 - Exit Codes (Priority: P2)

**Goal**: Return appropriate exit codes for CI/CD integration

**Independent Test**: Verify exit code is non-zero when violations found

### Implementation for US3

- [X] T015 [US3] Update src/cli.ts to check result.passed and set exit code
- [X] T016 [US3] Ensure error responses also return non-zero exit code

**Checkpoint**: Can integrate into CI/CD pipelines

---

## Phase 5: User Story 4 - Summary Statistics (Priority: P3)

**Goal**: Include summary statistics in verification result

**Note**: Summary statistics are already implemented as part of US1 (T009). This phase validates and tests edge cases.

### Tests for US4

- [X] T017 [P] [US4] Create tc test for no rules defined at tests/mind/verify/data/03-success-no-rules/
- [X] T018 [P] [US4] Create tc test for rule execution error at tests/mind/verify/data/06-success-rule-execution-error/

### Implementation for US4

- [X] T019 [US4] Handle empty rules table gracefully (passed: true, rules: [])
- [X] T020 [US4] Handle rule execution errors without stopping other rules

**Checkpoint**: Can handle all edge cases

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T021 Run full test suite to verify all tests pass (200 passed, 0 failed)
- [ ] T022 Run quickstart.md validation manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup - CORE FUNCTIONALITY
- **User Story 2 (Phase 3)**: Can start after US1 tests pass
- **User Story 3 (Phase 4)**: Can start after US1 tests pass
- **User Story 4 (Phase 5)**: Can start after US1 tests pass
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Foundation - must complete first
- **US2 (P2)**: Independent of US3/US4
- **US3 (P2)**: Independent of US2/US4
- **US4 (P3)**: Independent of US2/US3

### Parallel Opportunities

Within Phase 2 (US1):
- T003, T004, T005 (tests) can run in parallel

Within Phase 3 (US2):
- T010, T011 (tests) can run in parallel

Within Phase 5 (US4):
- T017, T018 (tests) can run in parallel

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (handler file, route registration)
2. Complete Phase 2: US1 (all rules verification)
3. **STOP and VALIDATE**: Run `brane /mind/verify '{}'`
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Handler structure ready
2. Add US1 → Can verify all rules → MVP!
3. Add US2 → Can verify specific rules
4. Add US3 → CI/CD integration ready
5. Add US4 → All edge cases handled

---

## Notes

- Single handler at src/handlers/mind/verify.ts
- Reuses existing /mind/rules/list and /mind/rules/query logic internally
- tc tests use Brane's existing test infrastructure (JSON in/out)
- Exit code handling is in cli.ts, not the handler
- Total tasks: 22
