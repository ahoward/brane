# Tasks: Whitebox Scripts

**Input**: Design documents from `/specs/022-whitebox-scripts/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure and shared utilities

- [x] T001 Create examples/ directory structure at repository root
- [x] T002 Create examples/lib/common.sh with shared utilities (BRANE_BIN detection, workspace setup, cleanup trap)
- [x] T003 Add `bun run build` script to package.json for compiled binary generation

---

## Phase 2: Foundational (Binary Build)

**Purpose**: Ensure compiled binary exists and works - BLOCKS all user stories

**⚠️ CRITICAL**: No script work can begin until binary builds successfully

- [x] T004 Verify `bun build src/cli.ts --compile --outfile brane` produces working binary
- [x] T005 Test binary with `./brane /ping` returns valid JSON response

**Checkpoint**: Compiled binary ready - script development can begin

---

## Phase 3: User Story 1 - Quick Start Workflow (Priority: P1) 🎯 MVP

**Goal**: Single script demonstrates the complete Brane workflow: init → scan → concepts → search → verify

**Independent Test**: Run `./examples/00-quickstart.sh` and observe all steps completing with clear output

### Implementation for User Story 1

- [x] T006 [US1] Create examples/00-quickstart.sh with full workflow demonstration
  - Source lib/common.sh
  - Create temp workspace with sample TypeScript files
  - Initialize body.db and mind.db
  - Scan files into body
  - Create concepts manually (simulating extraction)
  - Search for concepts by semantic query
  - Run verify to check rules
  - Clean output with section headers
- [x] T007 [US1] Add sample fixture generation (inline heredocs for src/auth.ts, src/db.ts)
- [x] T008 [US1] Verify script is idempotent (run twice, same result)

**Checkpoint**: Quick-start script fully functional - users can understand Brane in 2 minutes

---

## Phase 4: User Story 2 - Individual Command Examples (Priority: P2)

**Goal**: Each Brane command has a focused demonstration script

**Independent Test**: Each script in examples/01-*.sh through 09-*.sh runs independently and shows one command

### Implementation for User Story 2

- [x] T009 [P] [US2] Create examples/01-body-init.sh demonstrating /body/init
- [x] T010 [P] [US2] Create examples/02-body-scan.sh demonstrating /body/scan
- [x] T011 [P] [US2] Create examples/03-mind-init.sh demonstrating /mind/init
- [x] T012 [P] [US2] Create examples/04-mind-concepts.sh demonstrating /mind/concepts/create, /list, /get
- [x] T013 [P] [US2] Create examples/05-mind-edges.sh demonstrating /mind/edges/create, /list
- [x] T014 [P] [US2] Create examples/06-mind-search.sh demonstrating /mind/search with semantic queries
- [x] T015 [P] [US2] Create examples/07-mind-verify.sh demonstrating /mind/verify with rules
- [x] T016 [P] [US2] Create examples/08-calabi-extract.sh demonstrating /calabi/extract (mock LLM mode)
- [x] T017 [P] [US2] Create examples/09-context-query.sh demonstrating /context/query

**Checkpoint**: All individual command scripts work independently

---

## Phase 5: User Story 3 - Automated Test Runner (Priority: P3)

**Goal**: Run all scripts as a test suite with pass/fail reporting

**Independent Test**: Run `./examples/run-all.sh` and see summary of passed/failed scripts

### Implementation for User Story 3

- [x] T018 [US3] Create examples/run-all.sh test runner script
  - Loop through all numbered scripts (00-*.sh through 09-*.sh)
  - Track pass/fail count
  - Report summary at end
  - Exit with non-zero if any failures
- [x] T019 [US3] Add timing output (total execution time)
- [x] T020 [US3] Verify all scripts pass when run via test runner

**Checkpoint**: Test runner executes all scripts and reports results

---

## Phase 6: Polish & Integration

**Purpose**: Final validation and CI integration

- [x] T021 [P] Make all scripts executable (chmod +x)
- [x] T022 [P] Add script header comments (purpose in 1-3 lines) to all scripts
- [x] T023 Verify all scripts complete in under 60 seconds total (13s actual)
- [x] T024 Run quickstart.md validation (all documented commands work)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (compiled binary must exist)
- **User Story 2 (Phase 4)**: Depends on Foundational + common.sh from Phase 1
- **User Story 3 (Phase 5)**: Depends on User Stories 1 and 2 (needs scripts to run)
- **Polish (Phase 6)**: Depends on all user stories

### Parallel Opportunities

```bash
# Phase 1 - Sequential (T001 before T002)
T001 → T002 → T003

# Phase 2 - Sequential (build before test)
T004 → T005

# Phase 3 (US1) - Sequential (core script first)
T006 → T007 → T008

# Phase 4 (US2) - ALL PARALLEL (different files, no dependencies)
T009, T010, T011, T012, T013, T014, T015, T016, T017 (all parallel)

# Phase 5 (US3) - Sequential
T018 → T019 → T020

# Phase 6 - Parallel where marked
T021, T022 (parallel) → T023 → T024
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Phase 1: Setup (T001-T003)
2. Phase 2: Build binary (T004-T005)
3. Phase 3: Quick-start script (T006-T008)
4. **STOP**: Test that 00-quickstart.sh works end-to-end

### Full Feature

5. Phase 4: Individual scripts (T009-T017) - can all be done in parallel
6. Phase 5: Test runner (T018-T020)
7. Phase 6: Polish (T021-T024)

---

## Notes

- All scripts use `BRANE_EMBED_MOCK=1` for deterministic embeddings
- Scripts create temp directories and clean up via trap
- Binary path configurable via `BRANE_BIN` environment variable
- Target execution time: all scripts < 60 seconds total
