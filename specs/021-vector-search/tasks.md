# Tasks: Vector Search

**Input**: Design documents from `/specs/021-vector-search/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add fastembed-js dependency and embedding infrastructure

- [ ] T001 Add fastembed dependency to package.json
- [ ] T002 Create src/lib/embed.ts with embedding wrapper (mock mode support)

---

## Phase 2: Foundational (Schema + HNSW Index)

**Purpose**: Update mind.db schema to support vectors - BLOCKS all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Update src/handlers/mind/init.ts schema to v1.5.0 with vector field
- [ ] T004 Add HNSW index creation to src/handlers/mind/init.ts
- [ ] T005 Update tests/lib.sh seed databases for schema v1.5.0
- [ ] T006 Update tests/mind/init/data/*/result.json for schema v1.5.0

**Checkpoint**: Foundation ready - schema supports vectors, HNSW index exists

---

## Phase 3: User Story 1 - Semantic Concept Search (Priority: P1) 🎯 MVP

**Goal**: `/mind/search` endpoint returns semantically similar concepts

**Independent Test**: Create concepts, search with related query, verify results with scores

### Tests for User Story 1

- [ ] T007 [P] [US1] Create tests/mind/search/run script
- [ ] T008 [P] [US1] Create tests/mind/search/data/00-success-basic-search/ test case
- [ ] T009 [P] [US1] Create tests/mind/search/data/01-success-limit/ test case
- [ ] T010 [P] [US1] Create tests/mind/search/data/02-success-empty-results/ test case
- [ ] T011 [P] [US1] Create tests/mind/search/data/03-error-mind-not-initialized/ test case
- [ ] T012 [P] [US1] Create tests/mind/search/data/04-error-query-required/ test case

### Implementation for User Story 1

- [ ] T013 [US1] Create src/handlers/mind/search.ts handler
- [ ] T014 [US1] Add search handler to src/sys.ts routing
- [ ] T015 [US1] Implement HNSW query in search.ts using CozoDB

**Checkpoint**: `/mind/search` works with manually created concept vectors

---

## Phase 4: User Story 2 - Automatic Embedding Generation (Priority: P2)

**Goal**: Concepts automatically get embeddings on create/update

**Independent Test**: Create concept, verify embedding exists in mind.db

### Tests for User Story 2

- [ ] T016 [P] [US2] Update tests/mind/concepts/create test to verify embedding generated
- [ ] T017 [P] [US2] Add test case for concept update regenerates embedding
- [ ] T018 [P] [US2] Add test case for graceful degradation when embed fails

### Implementation for User Story 2

- [ ] T019 [US2] Modify src/handlers/mind/concepts/create.ts to generate embedding
- [ ] T020 [US2] Modify src/handlers/mind/concepts/update.ts to regenerate embedding
- [ ] T021 [US2] Add generate_embedding() helper to src/lib/mind.ts

**Checkpoint**: Creating concepts automatically generates searchable embeddings

---

## Phase 5: User Story 3 - Local Embedding Generation (Priority: P3)

**Goal**: Embeddings generated locally via fastembed-js (no API calls)

**Independent Test**: Generate embedding offline, verify deterministic output

### Tests for User Story 3

- [ ] T022 [P] [US3] Add test case for offline embedding generation (no network mock)
- [ ] T023 [P] [US3] Add test case for deterministic embeddings (same input = same output)

### Implementation for User Story 3

- [ ] T024 [US3] Implement fastembed-js integration in src/lib/embed.ts
- [ ] T025 [US3] Add model lazy loading with caching in embed.ts
- [ ] T026 [US3] Verify BRANE_EMBED_MOCK=1 produces deterministic vectors

**Checkpoint**: All embeddings generated locally, no external API calls

---

## Phase 6: Polish & Integration

**Purpose**: Ensure everything works together

- [ ] T027 [P] Run full test suite, fix any regressions
- [ ] T028 [P] Validate quickstart.md examples work
- [ ] T029 Update CLAUDE.md with vector search context

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational + embed.ts from Setup
- **User Story 3 (Phase 5)**: Depends on User Story 2 (need embedding generation to test)
- **Polish (Phase 6)**: Depends on all user stories

### Parallel Opportunities

```bash
# Phase 1 - Sequential (T001 before T002)
T001 → T002

# Phase 2 - Sequential (schema before index before tests)
T003 → T004 → T005, T006 (parallel)

# Phase 3 - Tests parallel, then implementation
T007, T008, T009, T010, T011, T012 (all parallel)
→ T013 → T014 → T015

# Phase 4 - Tests parallel, then implementation
T016, T017, T018 (all parallel)
→ T019, T020 (parallel) → T021

# Phase 5 - Tests parallel, then implementation
T022, T023 (parallel)
→ T024 → T025 → T026
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2)

1. Phase 1: Setup (T001-T002)
2. Phase 2: Schema (T003-T006)
3. Phase 3: Search endpoint (T007-T015)
4. Phase 4: Auto-embedding (T016-T021)
5. **STOP**: Test full flow - create concept, search for it

### Full Feature

6. Phase 5: Local embeddings (T022-T026)
7. Phase 6: Polish (T027-T029)

---

## Notes

- Mock mode uses `BRANE_EMBED_MOCK=1` (not BRANE_LLM_MOCK)
- Schema version bumps to 1.5.0 (current is 1.4.0)
- HNSW index parameters: dim=384, m=50, distance=Cosine
- fastembed default model is BGESmallEN (384 dimensions)
- Existing concepts will have null vectors until updated
