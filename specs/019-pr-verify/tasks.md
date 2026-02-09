# Tasks: PR Verify

**Input**: Design documents from `/specs/019-pr-verify/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization - minimal since we're adding to existing codebase

- [X] T001 Create test directory structure at tests/calabi/pr-verify/
- [X] T002 Create test runner at tests/calabi/pr-verify/run

---

## Phase 2: Foundational

**Purpose**: None required - this feature composes existing handlers, no new infrastructure needed

**Checkpoint**: Ready to implement user stories

---

## Phase 3: User Story 1 - Verify Workspace Against Rules (Priority: P1) 🎯 MVP

**Goal**: Check if current workspace passes all rules, returning violations with context

**Independent Test**: Run pr-verify and confirm it returns verification results

### Implementation for User Story 1

- [X] T003 [US1] Create handler skeleton at src/handlers/calabi/pr-verify.ts
- [X] T004 [US1] Implement file change detection (reuse status.ts patterns) in src/handlers/calabi/pr-verify.ts
- [X] T005 [US1] Implement rule verification (reuse verify.ts internals) in src/handlers/calabi/pr-verify.ts
- [X] T006 [US1] Register route /calabi/pr-verify in src/index.ts
- [X] T007 [P] [US1] Create test case 00-success-no-violations in tests/calabi/pr-verify/data/
- [X] T008 [P] [US1] Create test case 01-success-with-violations in tests/calabi/pr-verify/data/
- [X] T009 [P] [US1] Create test case 02-success-no-changes in tests/calabi/pr-verify/data/

**Checkpoint**: Basic pr-verify working - returns changes + verification results ✅

---

## Phase 4: User Story 2 - Diff Context (Priority: P2)

**Goal**: Include changed files list in verification output

**Independent Test**: Modify files, run pr-verify, verify output includes file list

### Implementation for User Story 2

- [X] T010 [US2] Ensure changes structure includes modified/deleted/new arrays in src/handlers/calabi/pr-verify.ts
- [X] T011 [P] [US2] Add test case verifying changes context is returned in tests/calabi/pr-verify/data/

**Note**: US2 is largely satisfied by US1 implementation since changes are included by design. T010 validates the structure.

**Checkpoint**: Changes context clearly shown in output ✅

---

## Phase 5: User Story 3 - Specific Rules (Priority: P2)

**Goal**: Support running only specified rules via rules parameter

**Independent Test**: Run pr-verify with specific rule names, verify only those run

### Implementation for User Story 3

- [X] T012 [US3] Add rules parameter handling in src/handlers/calabi/pr-verify.ts
- [X] T013 [P] [US3] Create test case 03-success-specific-rules in tests/calabi/pr-verify/data/
- [X] T014 [P] [US3] Create test case 07-error-rule-not-found in tests/calabi/pr-verify/data/

**Checkpoint**: Selective rule execution working ✅

---

## Phase 6: User Story 4 - Dry Run (Priority: P3)

**Goal**: Preview what would be checked without running verification

**Independent Test**: Run pr-verify with dry_run, verify verification is null

### Implementation for User Story 4

- [X] T015 [US4] Add dry_run parameter handling in src/handlers/calabi/pr-verify.ts
- [X] T016 [P] [US4] Create test case 04-success-dry-run in tests/calabi/pr-verify/data/

**Checkpoint**: Dry run mode working ✅

---

## Phase 7: Error Handling

**Purpose**: Proper error responses for edge cases

- [X] T017 [P] Create test case 05-error-body-not-initialized in tests/calabi/pr-verify/data/
- [X] T018 [P] Create test case 06-error-mind-not-initialized in tests/calabi/pr-verify/data/

**Checkpoint**: All error cases handled ✅

---

## Phase 8: Polish

**Purpose**: Final validation and cleanup

- [X] T019 Run all tests and verify 100% pass rate
- [X] T020 Validate against quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: N/A
- **US1 (Phase 3)**: Depends on Setup - core implementation
- **US2 (Phase 4)**: Depends on US1 - validates existing behavior
- **US3 (Phase 5)**: Can run parallel with US2 after US1
- **US4 (Phase 6)**: Can run parallel with US2/US3 after US1
- **Error Handling (Phase 7)**: Can run parallel with US2-US4
- **Polish (Phase 8)**: Depends on all prior phases

### Within US1 (Critical Path)

```
T003 (skeleton) → T004 (changes) → T005 (verify) → T006 (route)
                                                        ↓
                                          T007, T008, T009 (tests, parallel)
```

### Parallel Opportunities

After US1 core (T003-T006) is complete:
- T007, T008, T009 (US1 tests) - parallel
- T010, T011 (US2) - parallel with US3/US4
- T012-T014 (US3) - parallel with US2/US4
- T015-T016 (US4) - parallel with US2/US3
- T017-T018 (errors) - parallel with US2-US4

---

## Implementation Strategy

### MVP First (US1 Only)

1. T001-T002: Setup test structure
2. T003-T006: Implement core handler
3. T007-T009: Add test cases
4. **VALIDATE**: Run tests, verify basic functionality

### Full Feature

1. Complete MVP
2. Add T010-T011 (US2 - changes context)
3. Add T012-T014 (US3 - specific rules)
4. Add T015-T016 (US4 - dry run)
5. Add T017-T018 (error cases)
6. T019-T020: Final validation

---

## Summary

- **Total tasks**: 20
- **Completed**: 20/20 ✅
- **US1 (P1)**: 7 tasks (core implementation)
- **US2 (P2)**: 2 tasks (changes context)
- **US3 (P2)**: 3 tasks (specific rules)
- **US4 (P3)**: 2 tasks (dry run)
- **Error handling**: 2 tasks
- **Polish**: 2 tasks
