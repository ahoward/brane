# Tasks: 025-lens-config

**Input**: Design documents from `/specs/025-lens-config/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lens-api.md

**Tests**: tc contract tests (JSON in/out) per Brane constitution - Antagonistic Testing (Principle IV)

**Organization**: Tasks organized by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Lens Storage, US2=Usage Tracking)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add js-yaml dependency and create lens module structure

- [x] T001 Add js-yaml dependency: `bun add js-yaml && bun add -d @types/js-yaml`
- [x] T002 [P] Create handler directory structure: `mkdir -p src/handlers/lens`
- [x] T003 [P] Create test directory structure: `mkdir -p tests/lens/{show,import,export,stats,bless}`

---

## Phase 2: Foundational (Schema Migration)

**Purpose**: Update mind.db schema to v1.6.0 with lens relations - MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add lens relations to schema in `src/handlers/mind/init.ts`:
  - `lens_meta` relation (key → value)
  - `golden_types` relation (type → description, authority)
  - `golden_relations` relation (rel → description, symmetric, authority)
  - `consolidation_map` relation (source_type → target_type)
  - `type_usage` relation (type → count, first_seen, last_seen, golden)
  - `relation_usage` relation (rel → count, first_seen, last_seen, golden)
- [x] T005 Add default lens seeding to `src/handlers/mind/init.ts`:
  - Insert default lens_meta (name, version, description)
  - Insert golden_types (Entity, Caveat, Rule)
  - Insert golden_relations (DEPENDS_ON, CONFLICTS_WITH, DEFINED_IN)
- [x] T006 Update SCHEMA_VERSION to "1.6.0" in `src/handlers/mind/init.ts`
- [x] T007 Create shared lens utilities in `src/lib/lens.ts`:
  - `open_mind()` helper (reuse from mind.ts)
  - `is_golden_type(db, type)` function
  - `is_golden_relation(db, rel)` function
  - TypeScript interfaces (LensConfig, GoldenType, GoldenRelation, etc.)

**Checkpoint**: Schema v1.6.0 ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Lens Storage & Basic Operations (Priority: P1) 🎯 MVP

**Goal**: Store lens configuration in mind.db, import/export YAML

**Independent Test**: `brane init && brane lens show` displays default lens; `brane lens export | brane lens import` round-trips

### Tests for User Story 1

- [x] T008 [P] [US1] Create tc tests for `/lens/show` in `tests/lens/show/`:
  - `data/00-success-default-lens/` (params.json, result.json)
  - `data/01-error-not-initialized/` (params.json, result.json)
  - `run` script
- [x] T009 [P] [US1] Create tc tests for `/lens/import` in `tests/lens/import/`:
  - `data/00-success-basic/` with sample lens.yml
  - `data/01-success-merge-mode/`
  - `data/02-success-replace-mode/`
  - `data/03-error-file-not-found/`
  - `data/04-error-invalid-yaml/`
  - `data/05-error-missing-name/`
  - `data/06-error-not-initialized/`
  - `run` script
- [x] T010 [P] [US1] Create tc tests for `/lens/export` in `tests/lens/export/`:
  - `data/00-success-basic/`
  - `data/01-error-not-initialized/`
  - `run` script

### Implementation for User Story 1

- [x] T011 [US1] Implement `/lens/show` handler in `src/handlers/lens/show.ts`:
  - Query lens_meta for name, version, description
  - Query golden_types for all types
  - Query golden_relations for all relations
  - Query consolidation_map for mappings
  - Return LensConfig POD
- [x] T012 [US1] Implement `/lens/import` handler in `src/handlers/lens/import.ts`:
  - Read file from path parameter
  - Parse YAML with js-yaml (safe load)
  - Validate required fields (name, version)
  - Upsert lens_meta, golden_types, golden_relations, consolidation_map
  - Support merge (default) and replace modes
  - Return import summary
- [x] T013 [US1] Implement `/lens/export` handler in `src/handlers/lens/export.ts`:
  - Query all lens data from mind.db
  - Build LensConfig object
  - Serialize to YAML with js-yaml
  - Return yaml string
- [x] T014 [US1] Register lens handlers in `src/sys.ts`:
  - `/lens/show` → show handler
  - `/lens/import` → import handler
  - `/lens/export` → export handler
- [x] T015 [US1] Create CLI command in `src/cli/commands/lens.ts`:
  - `brane lens show` subcommand (calls /lens/show, pretty prints)
  - `brane lens import <file>` subcommand (calls /lens/import)
  - `brane lens export` subcommand (calls /lens/export, outputs to stdout)
  - Support --json flag for all subcommands
- [x] T016 [US1] Register lens command in `src/cli.ts` (add to main command)

**Checkpoint**: User Story 1 complete - lens show/import/export working

---

## Phase 4: User Story 2 - Usage Tracking & Stats (Priority: P2)

**Goal**: Silently track type/relation usage, surface candidates for blessing

**Independent Test**: Create concepts with custom types → `brane lens stats` shows usage counts; `brane lens bless` promotes to golden

### Tests for User Story 2

- [x] T017 [P] [US2] Create tc tests for `/lens/stats` in `tests/lens/stats/`:
  - `data/00-success-empty/` (no usage yet)
  - `data/01-success-with-usage/` (mixed golden/non-golden)
  - `data/02-success-candidates-only/` (filter to non-golden)
  - `data/03-error-not-initialized/`
  - `run` script
- [x] T018 [P] [US2] Create tc tests for `/lens/bless` in `tests/lens/bless/`:
  - `data/00-success-type/`
  - `data/01-success-relation/`
  - `data/02-success-relation-symmetric/`
  - `data/03-error-missing-description/`
  - `data/04-error-neither-type-nor-rel/`
  - `data/05-error-not-initialized/`
  - `run` script

### Implementation for User Story 2

- [x] T019 [US2] Create usage tracking helpers in `src/lib/lens.ts`:
  - `update_type_usage(db, type)` - upsert type_usage with increment
  - `update_relation_usage(db, rel)` - upsert relation_usage with increment
- [x] T020 [US2] Modify `/mind/concepts/create` in `src/handlers/mind/concepts/create.ts`:
  - After successful insert, call `update_type_usage(db, type)`
- [x] T021 [US2] Modify `/mind/concepts/update` in `src/handlers/mind/concepts/update.ts`:
  - If type changed, call `update_type_usage(db, new_type)`
- [x] T022 [US2] Modify `/mind/edges/create` in `src/handlers/mind/edges/create.ts`:
  - After successful insert, call `update_relation_usage(db, relation)`
- [x] T023 [US2] Modify `/mind/edges/update` in `src/handlers/mind/edges/update.ts`:
  - If relation changed, call `update_relation_usage(db, new_relation)`
- [x] T024 [US2] Implement `/lens/stats` handler in `src/handlers/lens/stats.ts`:
  - Query type_usage for all entries (or filter to golden=false if candidates_only)
  - Query relation_usage similarly
  - Return LensStats POD
- [x] T025 [US2] Implement `/lens/bless` handler in `src/handlers/lens/bless.ts`:
  - Validate params (type xor rel, description required)
  - Upsert to golden_types or golden_relations with authority="manual"
  - Update type_usage/relation_usage to set golden=true
  - Return blessed entry
- [x] T026 [US2] Register stats and bless handlers in `src/sys.ts`:
  - `/lens/stats` → stats handler
  - `/lens/bless` → bless handler
- [x] T027 [US2] Add CLI subcommands in `src/cli/commands/lens.ts`:
  - `brane lens stats` (calls /lens/stats, tabular output)
  - `brane lens stats --candidates` (passes candidates_only=true)
  - `brane lens bless --type <type> --description <desc>`
  - `brane lens bless --rel <rel> --description <desc> [--symmetric]`

**Checkpoint**: User Story 2 complete - usage tracking and blessing working

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, documentation

- [x] T028 Run all tc tests: `bun run src/tc.ts` - verify 0 failures (246 passed)
- [x] T029 Run example scripts: `bash examples/run-all.sh` - verify all pass (13 passed)
- [x] T030 [P] Create example script `examples/12-lens.sh`:
  - Demonstrate lens show, import, export
  - Demonstrate lens stats, bless workflow
- [ ] T031 Rebuild brane binary: `bun build src/cli.ts --compile --outfile brane`
- [ ] T032 Validate quickstart.md scenarios manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - can start once schema is ready
- **User Story 2 (Phase 4)**: Depends on Foundational - can start in parallel with US1
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (Lens Storage)**: Independent - no dependencies on US2
- **User Story 2 (Usage Tracking)**: Independent - no dependencies on US1
  - Uses same lens.ts library functions
  - Modifies existing handlers (concepts/edges create/update)

### Within Each User Story

- Tests MUST be written first (Antagonistic Testing)
- Handlers before CLI commands
- Register in sys.ts before CLI can call them

### Parallel Opportunities

- T002, T003 can run in parallel (directory creation)
- T008, T009, T010 can run in parallel (different test directories)
- T017, T018 can run in parallel (different test directories)
- US1 and US2 can be worked in parallel after Foundational is complete

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests together:
Task: "Create tc tests for /lens/show in tests/lens/show/"
Task: "Create tc tests for /lens/import in tests/lens/import/"
Task: "Create tc tests for /lens/export in tests/lens/export/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: User Story 1 (T008-T016)
4. **STOP and VALIDATE**: `brane lens show/import/export` work
5. Can deploy MVP at this point

### Incremental Delivery

1. Setup + Foundational → Schema v1.6.0 ready
2. Add User Story 1 → Test lens CRUD → Deploy (MVP!)
3. Add User Story 2 → Test stats/bless → Deploy
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- tc tests use JSON in/out format (see tests/ping/ for pattern)
- All handlers return Result envelope (Principle II)
- Use snake_case for variables/functions (Naming Conventions)
