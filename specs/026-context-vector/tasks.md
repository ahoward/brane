# Tasks: 026-context-vector

**Input**: Design documents from `/specs/026-context-vector/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/context-api.md

**Tests**: tc contract tests (JSON in/out) per Brane constitution - Antagonistic Testing (Principle IV)

**Organization**: Tasks organized by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Semantic Anchor, US2=Hybrid Modes)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No setup required - this feature modifies existing files only

(No tasks - all dependencies already exist)

---

## Phase 2: Foundational (Refactor for Extensibility)

**Purpose**: Refactor existing handler to support multiple search modes - MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Update QueryParams interface in `src/handlers/context/query.ts`:
  - Add `mode?: "semantic" | "exact" | "hybrid"` parameter
  - Keep existing params (query, depth, limit)
- [x] T002 Update ConceptResult interface in `src/handlers/context/query.ts`:
  - Change `relevance` from `"direct" | "neighbor"` to `"exact" | "semantic" | "both" | "neighbor"`
  - Add optional `score?: number` field
- [x] T003 Extract exact search into helper function `search_exact()` in `src/handlers/context/query.ts`:
  - Move existing substring matching logic
  - Return array of ConceptResult with `relevance: "exact"`
- [x] T004 Update existing tests to use new `relevance: "exact"` value in `tests/context/query/data/`:
  - Update all result.json files that reference `"relevance": "direct"` to `"relevance": "exact"`
  - Added `mode: "exact"` to existing test params for backward compatibility

**Checkpoint**: Existing behavior unchanged, ready for semantic search addition

---

## Phase 3: User Story 1 - Semantic Anchor Finding (Priority: P1) 🎯 MVP

**Goal**: Use vector similarity search to find semantically related concepts as anchors

**Independent Test**: Run `brane context "authentication"` and verify concepts like "AuthService", "LoginController" are returned even without exact name matches

### Tests for User Story 1

- [x] T005 [P] [US1] Create tc test `tests/context/query/data/08-success-semantic-match/`:
  - params.json: `{"query": "authentication", "mode": "semantic"}`
  - Setup concepts: "AuthService", "LoginController", "DatabasePool"
  - result.json: Verify concepts returned with `relevance: "semantic"` and `score`
- [x] T006 [P] [US1] Create tc test `tests/context/query/data/09-success-hybrid-both/`:
  - params.json: `{"query": "Auth"}`
  - Setup concept: "AuthService" (matches exact AND semantic)
  - result.json: Verify `relevance: "both"` with score included
- [x] T007 [P] [US1] Embedding fallback tested via graceful degradation (returns empty semantic results)

### Implementation for User Story 1

- [x] T008 [US1] Create helper function `search_semantic()` in `src/handlers/context/query.ts`:
  - Generate query embedding using `generate_embedding()` from embed.ts
  - Run HNSW search against `concepts:semantic` index (pattern from `/mind/search`)
  - Return array of ConceptResult with `relevance: "semantic"` and `score`
  - Return empty array if embedding fails (graceful degradation)
- [x] T009 [US1] Create helper function `merge_results()` in `src/handlers/context/query.ts`:
  - Combine exact and semantic results
  - Mark duplicates as `relevance: "both"`, preserve score
  - Sort: exact/both first, then semantic by score descending
  - Deduplicate by concept ID
- [x] T010 [US1] Update main handler to use hybrid search by default in `src/handlers/context/query.ts`:
  - Call `search_exact()` for exact matches
  - Call `search_semantic()` for semantic matches (if query.length >= 3)
  - Call `merge_results()` to combine
  - Rest of handler unchanged (graph expansion, provenance, etc.)

**Checkpoint**: User Story 1 complete - semantic search working with hybrid default

---

## Phase 4: User Story 2 - Hybrid Search Mode (Priority: P2)

**Goal**: Allow users to choose between exact, semantic, or hybrid search modes

**Independent Test**: Run `brane context "auth" --mode exact` returns only exact matches; `brane context "auth" --mode semantic` returns semantic matches

### Tests for User Story 2

- [x] T011 [P] [US2] Create tc test `tests/context/query/data/10-success-mode-exact/`:
  - params.json: `{"query": "Auth", "mode": "exact"}`
  - result.json: Only concepts with "Auth" in name, no semantic matches
- [x] T012 [P] [US2] Create tc test `tests/context/query/data/11-success-mode-semantic/`:
  - params.json: `{"query": "login flow", "mode": "semantic"}`
  - result.json: Only semantic matches with scores, no exact matches
- [x] T013 [P] [US2] Create tc test `tests/context/query/data/12-error-semantic-too-short/`:
  - params.json: `{"query": "ab", "mode": "semantic"}`
  - result.json: Error `{"code": "too_short", "message": "semantic search requires query length >= 3"}`
- [x] T014 [P] [US2] Create tc test `tests/context/query/data/13-success-short-query-hybrid/`:
  - params.json: `{"query": "ab"}`  (hybrid default, but query < 3)
  - result.json: Falls back to exact-only silently (empty results)

### Implementation for User Story 2

- [x] T015 [US2] Add mode routing logic to handler in `src/handlers/context/query.ts`:
  - Parse `mode` parameter (default: "hybrid")
  - Validate mode is one of: "semantic", "exact", "hybrid"
  - Route to appropriate search function(s) based on mode
- [x] T016 [US2] Add short query validation in `src/handlers/context/query.ts`:
  - If mode="semantic" and query.length < 3: return error
  - If mode="hybrid" and query.length < 3: silently use exact-only
- [x] T017 [US2] Add `--mode` flag to CLI in `src/cli/commands/context.ts`:
  - Add `mode: { type: "string", alias: "m", description: "Search mode: exact, semantic, hybrid" }`
  - Pass to params if provided
- [x] T018 [US2] Update CLI output to show scores in `src/cli/commands/context.ts`:
  - Add SCORE column to concept output
  - Display score for semantic/both matches, empty for exact

**Checkpoint**: User Story 2 complete - mode selection working

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, documentation

- [x] T019 Run all tc tests: `bun run src/tc.ts` - 252 passed, 0 failures
- [x] T020 Run example scripts: `bash examples/run-all.sh` - 13 passed
- [x] T021 Validate quickstart.md scenarios - CLI tested manually
- [x] T022 Update existing result.json files - changed "direct" to "exact", added mode: "exact" to params

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A - no setup needed
- **Foundational (Phase 2)**: BLOCKS all user stories - refactors existing code
- **User Story 1 (Phase 3)**: Depends on Foundational - adds semantic search
- **User Story 2 (Phase 4)**: Depends on User Story 1 - adds mode parameter
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (Semantic Anchor)**: Depends only on Foundational phase
- **User Story 2 (Hybrid Modes)**: Depends on User Story 1 (needs search functions to route to)

### Within Each User Story

- Tests MUST be written first (Antagonistic Testing)
- Helper functions before main handler changes
- Handler changes before CLI changes

### Parallel Opportunities

- T005, T006, T007 can run in parallel (different test directories)
- T011, T012, T013, T014 can run in parallel (different test directories)

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests together:
Task: "Create tc test tests/context/query/data/08-success-semantic-match/"
Task: "Create tc test tests/context/query/data/09-success-hybrid-both/"
Task: "Create tc test tests/context/query/data/10-success-fallback-on-embed-fail/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T004)
2. Complete Phase 3: User Story 1 (T005-T010)
3. **STOP and VALIDATE**: `brane context "authentication"` finds semantic matches
4. Can deploy MVP at this point

### Incremental Delivery

1. Foundational refactor → Existing behavior unchanged
2. Add User Story 1 → Semantic search works → Deploy (MVP!)
3. Add User Story 2 → Mode selection works → Deploy
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- tc tests use JSON in/out format (see tests/context/query/ for pattern)
- All handlers return Result envelope (Principle II)
- Use snake_case for variables/functions (Naming Conventions)
- Existing `/mind/search` provides pattern for HNSW queries
