# Tasks: Multi-Lens

**Input**: Design documents from `/specs/031-multi-lens/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)

---

## Phase 1: Setup

**Purpose**: No new dependencies. Wire up handler registrations and test infrastructure for new endpoints.

- [ ] T001 Register new handlers in src/index.ts: /state/init, /lens/create, /lens/use, /lens/list, /lens/delete, /lens/migrate
- [ ] T002 Add test seed helpers for multi-lens in tests/lib.sh: init_state, create_lens, use_lens

---

## Phase 2: Foundational — state.db + Path Resolution

**Purpose**: The keystone. Every user story depends on `src/lib/state.ts` existing and `open_mind()`/`open_body()` being lens-aware.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Implement src/lib/state.ts — resolve_lens_paths(), get_active_lens(), set_active_lens(), open_state(), has_state(), is_valid_lens_name(), list_lenses() per contracts/api.md internal API
- [ ] T004 Implement /state/init handler in src/handlers/state/init.ts — create state.db with config table (key/value), seed active_lens=default
- [ ] T005 Modify src/lib/mind.ts — open_mind() uses resolve_lens_paths() to determine mind.db location instead of hardcoded .brane/mind.db
- [ ] T006 Modify src/lib/body.ts — file_exists_in_body() uses resolve_lens_paths() to determine body.db location instead of hardcoded .brane/body.db
- [ ] T007 Modify src/handlers/body/init.ts — accept optional path param to create body.db at a specific directory (for lens creation)
- [ ] T008 Modify src/handlers/mind/init.ts — accept optional path param to create mind.db at a specific directory (for lens creation)
- [ ] T009 Modify src/cli/commands/init.ts — also call /state/init to create state.db during brane init
- [ ] T010 Run existing 290+ test suite to verify zero regressions from path resolution changes

**Checkpoint**: Existing tests pass. open_mind()/open_body() resolve via state.ts. Flat layout detected transparently.

---

## Phase 3: User Story 1 + 3 — Create, Use, and Backward Compatibility (Priority: P1)

**Goal**: Users can create named lenses, switch between them, and existing flat-layout projects work without changes.

**Independent Test**: Create a lens "security", switch to it, verify it has its own body.db + mind.db. Switch back to default. Verify flat layout auto-detection.

### Implementation

- [ ] T011 [US1] Implement /lens/create handler in src/handlers/lens/create.ts — validate name, mkdir .brane/lens/{name}/, call /body/init and /mind/init with lens path, ensure state.db exists
- [ ] T012 [US1] Implement /lens/use handler in src/handlers/lens/use.ts — validate lens exists, update active_lens in state.db
- [ ] T013 [P] [US3] Verify flat layout detection in src/lib/state.ts — when .brane/body.db exists but no state.db, resolve_lens_paths() returns flat paths
- [ ] T014 [P] [US3] Verify hybrid layout detection — when state.db exists with active_lens=default but .brane/lens/default/ does not exist, resolve_lens_paths() returns flat .brane/body.db + .brane/mind.db paths
- [ ] T015 [US1] Implement brane lens create and brane lens use CLI subcommands in src/cli/commands/lens.ts
- [ ] T016 [US1] Modify src/handlers/calabi/ingest.ts — resolve body.db path via state.ts instead of hardcoded .brane/body.db for invalidate_body_hash and scan operations
- [ ] T017 [US1] Write tc tests for /lens/create: tests/lens/create/run + data/ — success-basic, success-with-dashes, error-missing-name, error-invalid-name, error-already-exists, error-not-initialized
- [ ] T018 [US1] Write tc tests for /lens/use: tests/lens/use/run + data/ — success-basic, success-switch-back, error-missing-name, error-not-found, error-not-initialized
- [ ] T019 [US3] Write tc tests for backward compat: tests verifying all existing seeds (mind, mind_populated, etc.) still work with the new path resolution
- [ ] T020 [US1] Run full test suite (existing + new) to confirm lens isolation and backward compat

**Checkpoint**: Can create lenses, switch between them. Flat layout works. All existing tests pass.

---

## Phase 4: User Story 2 — List and Inspect Lenses (Priority: P2)

**Goal**: Users can see what lenses exist, which is active, and inspect a specific lens's stats.

**Independent Test**: Create multiple lenses, run brane lens list, verify active marker. Run brane lens show on a specific lens.

### Implementation

- [ ] T021 [P] [US2] Implement /lens/list handler in src/handlers/lens/list.ts — scan .brane/lens/ dirs + detect flat layout default, mark active from state.db
- [ ] T022 [P] [US2] Modify /lens/show handler in src/handlers/lens/show.ts — accept optional name param, open that lens's mind.db instead of active
- [ ] T023 [US2] Implement /lens/delete handler in src/handlers/lens/delete.ts — validate not default, not active, rm -rf .brane/lens/{name}/
- [ ] T024 [US2] Implement brane lens list, brane lens show, brane lens delete CLI subcommands in src/cli/commands/lens.ts
- [ ] T025 [P] [US2] Write tc tests for /lens/list: tests/lens/list/run + data/ — success-default-only, success-multiple-lenses, success-flat-layout, error-not-initialized
- [ ] T026 [P] [US2] Write tc tests for /lens/delete: tests/lens/delete/run + data/ — success-basic, error-is-default, error-is-active, error-not-found, error-not-initialized
- [ ] T027 [US2] Run full test suite

**Checkpoint**: Can list, inspect, and delete lenses. All existing + new tests pass.

---

## Phase 5: User Story 3 (cont.) — Explicit Migration (Priority: P1)

**Goal**: Users with the old flat layout can explicitly migrate to `.brane/lens/default/`.

**Independent Test**: Start with flat layout, run brane lens migrate, verify files moved to .brane/lens/default/. Run again, verify idempotent.

### Implementation

- [ ] T028 [US3] Implement /lens/migrate handler in src/handlers/lens/migrate.ts — move body.db + mind.db to .brane/lens/default/, create state.db if missing, idempotent
- [ ] T029 [US3] Implement brane lens migrate CLI subcommand in src/cli/commands/lens.ts
- [ ] T030 [P] [US3] Write tc tests for /lens/migrate: tests/lens/migrate/run + data/ — success-basic, success-idempotent, error-no-flat-layout, error-already-migrated, error-not-initialized
- [ ] T031 [US3] Run full test suite

**Checkpoint**: Migration works. Idempotent. All tests pass.

---

## Phase 6: User Story 4 — Initialize Lens from Config (Priority: P3)

**Goal**: Create a lens pre-loaded with golden types and relations from a YAML config file.

**Independent Test**: Create lens with --config, verify mind.db has the YAML's golden types and relations.

### Implementation

- [ ] T032 [US4] Extend /lens/create handler to accept optional config param — after creating lens, call /lens/import with the YAML path targeting the new lens's mind.db
- [ ] T033 [US4] Extend brane lens create CLI to accept --config flag in src/cli/commands/lens.ts
- [ ] T034 [P] [US4] Write tc tests for /lens/create with config: tests/lens/create/data/ — success-with-config, error-config-not-found, error-config-invalid-yaml
- [ ] T035 [US4] Run full test suite

**Checkpoint**: Lens creation with YAML config works. All tests pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T036 Write whitebox spike try/multi-lens.sh — end-to-end: init, create lens, use lens, ingest, search, switch back, verify isolation (no mocks, real LLM if available)
- [ ] T037 [P] Update tests/lib.sh seed helpers if any existing seeds need state.db awareness
- [ ] T038 Run full test suite one final time — all existing 290+ tests plus all new multi-lens tests
- [ ] T039 Update CLAUDE.md Active Technologies and Recent Changes sections

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1+US3 core)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2, can run in parallel with Phase 3
- **Phase 5 (US3 migrate)**: Depends on Phase 2, can run in parallel with Phase 3/4
- **Phase 6 (US4)**: Depends on Phase 3 (/lens/create must exist)
- **Phase 7 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (Create/Use)**: Depends on Foundational (Phase 2) only
- **US2 (List/Inspect)**: Depends on Foundational only — can parallel with US1
- **US3 (Backward Compat)**: Core detection in Phase 2; migration in Phase 5 — independent of US1/US2
- **US4 (Config)**: Depends on US1 (/lens/create handler)

### Parallel Opportunities

- T013 + T014 can run in parallel (both verify state.ts detection logic, different test scenarios)
- T021 + T022 can run in parallel (different handler files)
- T025 + T026 can run in parallel (different test suites)
- Phase 4 can run in parallel with Phase 3 after Foundational complete

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3)

1. Complete Phase 1: Setup (handler registration, test helpers)
2. Complete Phase 2: Foundational (state.ts, open_mind/open_body lens-aware, state/init)
3. Complete Phase 3: US1+US3 (create, use, backward compat)
4. **STOP and VALIDATE**: Run all 290+ existing tests + new tests
5. This is a shippable MVP — users can create and switch lenses, flat layout works

### Incremental Delivery

1. MVP (Phases 1-3) → create, use, backward compat ✓
2. Add Phase 4 (US2) → list, inspect, delete ✓
3. Add Phase 5 (US3 cont.) → explicit migration ✓
4. Add Phase 6 (US4) → YAML config creation ✓
5. Phase 7 → polish, final validation ✓

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Commit after each task or logical group
- Run test suite at every checkpoint
- The keystone is T003 (state.ts) — everything flows from it
- Total: 39 tasks across 7 phases
