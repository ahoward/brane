# Tasks: Episodic Memory

**Input**: Design documents from `/specs/034-episodic-memory/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Following dev loop — whitebox spike first, then tc tests with Gemini review.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Schema migration and relation creation for episodes.

- [x] T001 Add v1.7.0→v1.8.0 migration to `src/lib/migrate.ts` — create `episodes` relation and `episodes:semantic` HNSW index, bump LATEST_VERSION to "1.8.0"
- [x] T002 Add `episodes` relation and `episodes:semantic` HNSW index to `create_schema()` in `src/handlers/mind/init.ts` for fresh databases, bump SCHEMA_VERSION to "1.8.0"
- [x] T003 Add `get_next_episode_id()` to `src/lib/mind.ts` — same counter pattern as concepts/edges/annotations

**Checkpoint**: Migration and schema ready. Fresh `mind init` creates episodes relation. Existing databases auto-migrate.

---

## Phase 2: Foundational

**Purpose**: Register handler routes so episodes endpoints are callable.

- [x] T004 Register episode handler routes in `src/index.ts` — add `/mind/episodes/create`, `/mind/episodes/list`, `/mind/episodes/get`, `/mind/episodes/delete`, `/mind/episodes/search`
- [x] T005 Write whitebox spike `try/episodes-spike.sh` — init workspace, create episodes, list, get, delete, search. Run with real embeddings (no mock).

**Checkpoint**: Routes registered, spike script ready (will fail until handlers are implemented).

---

## Phase 3: User Story 1 — Record an Episode (Priority: P1) MVP

**Goal**: Agents can create episodes with observation, agent_id, context, tags, and optional concept link. Auto-generates ID, timestamp, and embedding.

**Independent Test**: Create an episode, verify it returns with ID, timestamp, and all fields.

### Implementation for User Story 1

- [x] T006 [US1] Implement `/mind/episodes/create` handler in `src/handlers/mind/episodes/create.ts` — validate required fields (observation, agent_id), validate source_concept_id if provided, generate embedding from observation, store episode with auto-ID and timestamp
- [x] T007 [US1] Implement `/mind/episodes/get` handler in `src/handlers/mind/episodes/get.ts` — retrieve single episode by ID, parse tags JSON back to array
- [x] T008 [US1] Update spike `try/episodes-spike.sh` — test create with all fields, create with minimal fields, create with invalid source_concept_id, get by ID
- [x] T009 [US1] Rebuild binary and run spike to verify create+get work end-to-end

**Checkpoint**: Episodes can be created and retrieved. MVP functional.

---

## Phase 4: User Story 2 — Retrieve Episodes (Priority: P1)

**Goal**: Agents can list episodes with filters: agent_id, tag, time range, limit.

**Independent Test**: Create episodes with different agents/tags/timestamps, list with various filter combinations.

### Implementation for User Story 2

- [x] T010 [P] [US2] Implement `/mind/episodes/list` handler in `src/handlers/mind/episodes/list.ts` — support filters: agent_id, tag (JSON string contains), after, before (ISO timestamp comparison), limit (default 100)
- [x] T011 [US2] Update spike `try/episodes-spike.sh` — test list all, list by agent_id, list by tag, list by time range, list with combined filters
- [x] T012 [US2] Rebuild binary and run spike to verify list+filters work

**Checkpoint**: Full CRUD minus delete. Filtering works with all combinations.

---

## Phase 5: User Story 3 — Search Episodes by Meaning (Priority: P2)

**Goal**: Semantic search over episodes using embedded query text, returning results ranked by similarity.

**Independent Test**: Create topically diverse episodes, search with related query, verify ranking.

### Implementation for User Story 3

- [x] T013 [P] [US3] Implement `/mind/episodes/search` handler in `src/handlers/mind/episodes/search.ts` — embed query, HNSW search on episodes:semantic index, optional agent_id filter, return matches with scores
- [x] T014 [US3] Update spike `try/episodes-spike.sh` — test semantic search, search with agent_id filter, search with limit, empty results
- [x] T015 [US3] Rebuild binary and run spike to verify semantic search works

**Checkpoint**: Agents can find relevant past experiences by meaning, not just keywords.

---

## Phase 6: User Story 4 — Delete Episodes (Priority: P3)

**Goal**: Episodes can be removed by ID.

**Independent Test**: Create an episode, delete it, verify get returns not-found.

### Implementation for User Story 4

- [x] T016 [P] [US4] Implement `/mind/episodes/delete` handler in `src/handlers/mind/episodes/delete.ts` — delete by ID, return error if not found
- [x] T017 [US4] Update spike `try/episodes-spike.sh` — test delete existing, delete non-existent, verify get after delete
- [x] T018 [US4] Rebuild binary and run full spike + full test suite (334+ tests)

**Checkpoint**: Full CRUD + search complete. All existing tests still pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T019 Run Gemini antagonistic review on episode handlers and spike
- [x] T020 Write tc tests for all 5 episode handlers based on Gemini feedback in `tests/mind/episodes/`
- [x] T021 Run full test suite — verify all tests pass including new episode tests
- [x] T022 Add episode tools to MCP server in `src/mcp.ts` — episodes_create, episodes_list, episodes_search
- [x] T023 Update MCP spike `try/mcp-spike.sh` to test episode tools
- [x] T024 Run all spikes (episodes, migrate, dedup, mcp) and full test suite — final validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (routes need schema)
- **Phase 3 (US1 — Create+Get)**: Depends on Phase 2 — this is the MVP
- **Phase 4 (US2 — List+Filter)**: Depends on Phase 3 (needs episodes to list)
- **Phase 5 (US3 — Search)**: Can parallel with Phase 4 (independent handler)
- **Phase 6 (US4 — Delete)**: Can parallel with Phase 4/5 (independent handler)
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Blocks US2 (need create to test list)
- **US2 (P1)**: Independent after US1
- **US3 (P2)**: Independent after US1 (can parallel with US2)
- **US4 (P3)**: Independent after US1 (can parallel with US2/US3)

### Parallel Opportunities

- T010 (list) and T013 (search) and T016 (delete) can all run in parallel after US1 completes
- T006 and T007 can run in parallel (different handler files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) — schema + migration
2. Complete Phase 2: Foundational (T004-T005) — routes + spike
3. Complete Phase 3: US1 (T006-T009) — create + get
4. **STOP and VALIDATE**: Spike passes for create+get. Migration works.

### Incremental Delivery

1. Setup + Foundational → Schema ready
2. US1 → Create + Get → **MVP shippable**
3. US2 → List + Filter → Agents can review their memories
4. US3 → Semantic Search → Agents can find by meaning
5. US4 → Delete → Data hygiene
6. Polish → Gemini review, tc tests, MCP integration

---

## Notes

- Tags stored as JSON string in CozoDB (e.g., `'["preference","style"]'`). Parse on read.
- Optional string fields use `""` as null (CozoDB limitation). `source_concept_id` uses `0` as null.
- Embedding uses same model2vec backend as concepts. BRANE_EMBED_MOCK=1 for tests.
- Time range filtering uses lexicographic comparison on ISO 8601 strings.
