# Tasks: LLM-Powered Concept Extraction

**Input**: Design documents from `/specs/020-llm-extract/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and create basic structure

- [ ] T001 Install Anthropic SDK dependency (`bun add @anthropic-ai/sdk`)
- [ ] T002 [P] Create config loader in src/lib/config.ts
- [ ] T003 [P] Create extraction prompt templates in src/lib/prompts.ts

**Checkpoint**: Dependencies installed, config and prompt libs created

---

## Phase 2: Foundational (LLM Integration Core)

**Purpose**: Core LLM client that all extraction depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create LLM client abstraction in src/lib/llm.ts
- [ ] T005 Implement load_config() to read .brane/config.json with env var fallback in src/lib/llm.ts
- [ ] T006 Implement call_anthropic() with tool_use for structured output in src/lib/llm.ts
- [ ] T007 Implement extract_from_content() that builds prompt and calls LLM in src/lib/llm.ts
- [ ] T008 Add mock mode support (BRANE_LLM_MOCK=1) for deterministic testing in src/lib/llm.ts
- [ ] T009 Add error handling for rate limits, network errors, invalid responses in src/lib/llm.ts

**Checkpoint**: LLM client ready - can call Anthropic API and get structured concept extraction

---

## Phase 3: User Story 1 - Extract Concepts from Code (Priority: P1) 🎯 MVP

**Goal**: Replace filename-based stub with real LLM extraction in scan.ts

**Independent Test**: Run scan on a TypeScript file, verify meaningful concepts extracted (not just filename)

### Implementation for User Story 1

- [ ] T010 [US1] Modify scan.ts to read file content from body.db in src/handlers/calabi/scan.ts
- [ ] T011 [US1] Add binary file detection and skip logic in src/handlers/calabi/scan.ts
- [ ] T012 [US1] Add file content truncation for large files in src/handlers/calabi/scan.ts
- [ ] T013 [US1] Replace extract_concept_name() stub with call to llm.extract_from_content() in src/handlers/calabi/scan.ts
- [ ] T014 [US1] Update scan tests with mock LLM responses in tests/calabi/scan/run
- [ ] T015 [P] [US1] Add test case for successful LLM extraction in tests/calabi/scan/data/
- [ ] T016 [P] [US1] Add test case for binary file skip in tests/calabi/scan/data/
- [ ] T017 [P] [US1] Add test case for large file truncation in tests/calabi/scan/data/

**Checkpoint**: Scan extracts meaningful concepts from code files using LLM

---

## Phase 4: User Story 2 - Configurable LLM Provider (Priority: P2)

**Goal**: Support configuration via .brane/config.json or environment variables

**Independent Test**: Configure API key in config file, verify it's used; remove config, verify env var fallback

### Implementation for User Story 2

- [ ] T018 [US2] Add config file validation in src/lib/config.ts
- [ ] T019 [US2] Add clear error messages for missing/invalid configuration in src/lib/llm.ts
- [ ] T020 [P] [US2] Add test case for config file loading in tests/calabi/scan/data/
- [ ] T021 [P] [US2] Add test case for env var fallback in tests/calabi/scan/data/
- [ ] T022 [P] [US2] Add test case for missing API key error in tests/calabi/scan/data/

**Checkpoint**: Configuration works via file or env var with clear error messages

---

## Phase 5: User Story 3 - Incremental Extraction (Priority: P3)

**Goal**: Only re-extract from changed files, preserve existing graph for unchanged files

**Independent Test**: Scan twice with same files, verify no re-extraction; modify file, verify only that file re-extracted

### Implementation for User Story 3

- [ ] T023 [US3] Track file hash in provenance to detect changes in src/handlers/calabi/scan.ts
- [ ] T024 [US3] Skip files with unchanged hash and existing provenance in src/handlers/calabi/scan.ts
- [ ] T025 [P] [US3] Add test case for skipping unchanged files in tests/calabi/scan/data/
- [ ] T026 [P] [US3] Add test case for re-extracting changed files in tests/calabi/scan/data/

**Checkpoint**: Incremental extraction working - only changed files processed

---

## Phase 6: Polish & Edge Cases

**Purpose**: Handle edge cases and improve robustness

- [ ] T027 [P] Add test case for LLM returning empty concepts in tests/calabi/scan/data/
- [ ] T028 [P] Add test case for LLM returning malformed response in tests/calabi/scan/data/
- [ ] T029 Verify all existing calabi/scan tests still pass
- [ ] T030 Run full test suite to ensure no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - core extraction
- **Phase 4 (US2)**: Depends on Phase 2 - can run parallel with US1
- **Phase 5 (US3)**: Depends on Phase 3 - needs extraction working first
- **Phase 6 (Polish)**: Depends on all user stories

### Task Dependencies

```
T001 (install deps)
  └─> T002, T003 (parallel: config, prompts)
        └─> T004-T009 (sequential: LLM client)
              └─> T010-T017 (US1: extraction)
              └─> T018-T022 (US2: config) [parallel with US1]
                    └─> T023-T026 (US3: incremental) [after US1]
                          └─> T027-T030 (polish)
```

### Parallel Opportunities

Within Phase 1:
```bash
# T002 and T003 can run in parallel
Task: "Create config loader in src/lib/config.ts"
Task: "Create extraction prompt templates in src/lib/prompts.ts"
```

Within Phase 3 (US1 tests):
```bash
# T015, T016, T017 can run in parallel
Task: "Add test case for successful LLM extraction"
Task: "Add test case for binary file skip"
Task: "Add test case for large file truncation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009)
3. Complete Phase 3: User Story 1 (T010-T017)
4. **STOP and VALIDATE**: Scan extracts real concepts from code
5. Can ship MVP here if needed

### Full Implementation

1. Setup → Foundational → US1 (MVP)
2. Add US2 (configuration) - can run parallel with US1
3. Add US3 (incremental) - depends on US1
4. Polish & edge cases

---

## Notes

- Mock mode (BRANE_LLM_MOCK=1) essential for deterministic tc tests
- Real LLM integration tested manually or in separate integration tests
- Existing scan tests must continue to pass (backward compatibility)
- 30 total tasks across 6 phases
