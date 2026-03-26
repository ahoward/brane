# Tasks: Schema Migrations

**Input**: Design documents from `/specs/049-schema-migrations/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Following dev loop — whitebox spike first, then tc tests with Gemini review.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the migration module skeleton and version comparison utility.

- [x] T001 Create `src/lib/migrate.ts` with Migration interface, MigrateResult interface, empty MIGRATIONS array, and compare_versions() utility
- [x] T002 Add LATEST_VERSION constant to `src/lib/migrate.ts` (initially "1.7.0", matching current SCHEMA_VERSION)

**Checkpoint**: Migration module exists with types and version comparison. No behavioral changes yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core migration runner logic that all user stories depend on.

- [x] T003 Implement `get_schema_version()` in `src/lib/migrate.ts` — reads version from schema_meta, returns "0.0.0" if missing/error
- [x] T004 Implement `migrate()` function in `src/lib/migrate.ts` — version check, migration chain walk, version update after each step (backup included)
- [x] T005 Write whitebox spike `try/migrate-spike.sh` — create a v1.7.0 mind.db, verify migrate() returns `{ migrated: false }` when already current

**Checkpoint**: Migration runner works for the no-op case (current version). No backup, no real migrations yet.

---

## Phase 3: User Story 1 — Seamless Upgrade (Priority: P1) MVP

**Goal**: Existing mind.db databases auto-upgrade to latest schema version when any brane command runs.

**Independent Test**: Create a mind.db at v1.7.0 with data. Run a brane command. Verify schema upgraded and all data intact.

### Implementation for User Story 1

- [x] T006 [US1] Integrate migrate() into `open_mind()` in `src/lib/mind.ts` — call migrate after opening db, before returning. On migration error, close db and return MindError
- [x] T007 [US1] Handle version-ahead case in migrate() in `src/lib/migrate.ts` — if db version > LATEST_VERSION, throw error with "upgrade brane" message
- [x] T008 [US1] Add a no-op migration `{ from: "0.0.0", to: "1.7.0" }` to MIGRATIONS array in `src/lib/migrate.ts` — stamps version on pre-versioning databases
- [x] T009 [US1] Expand spike `try/migrate-spike.sh` — test version-ahead rejection, test no-migration-needed pass-through, test that existing handlers still work after migrate() integration
- [x] T010 [US1] Rebuild binary and run full test suite (`BRANE_EMBED_MOCK=1 bun run src/tc.ts`) — verify all 334 tests still pass with migrate() in open_mind()

**Checkpoint**: Auto-migration integrated into all handlers via open_mind(). No real schema changes yet (only stamps version), but the infrastructure is live. All existing tests pass.

---

## Phase 4: User Story 2 — Safe Rollback on Failure (Priority: P2)

**Goal**: Failed migrations restore the original mind.db from backup so no data is lost.

**Independent Test**: Inject a failing migration step, verify backup is restored and error message is clear.

### Implementation for User Story 2

- [x] T011 [US2] Add backup logic to migrate() in `src/lib/migrate.ts` — before first migration step, call `db.backup(backup_path)` to create CozoDB native backup
- [x] T012 [US2] Add restore logic to migrate() in `src/lib/migrate.ts` — on migration step failure: restore from backup using `db.restore()`
- [x] T013 [US2] Add backup_path to MigrateResult in `src/lib/migrate.ts` — return path to backup file when migration ran
- [x] T014 [US2] Expand spike `try/migrate-spike.ts` — tests backup creation, restore path, data preservation, version-ahead rejection
- [x] T015 [US2] Run full test suite to verify no regressions

**Checkpoint**: Migration failures are safe — backup created before, restored after. Error messages identify which step failed.

---

## Phase 5: User Story 3 — Pre-Migration Backup (Priority: P2)

**Goal**: Backup files are stored with identifiable names so users can manually recover.

**Independent Test**: Trigger a migration, verify backup file exists at expected path with correct naming.

### Implementation for User Story 3

- [x] T016 [US3] Implement backup naming convention in `src/lib/migrate.ts` — backup path is `{mind_db_dir}/mind.db.backup.v{from_version}`
- [x] T017 [US3] Expand spike `try/migrate-spike.ts` — verify backup file exists at expected path after migration, verify it's named with the source version
- [x] T018 [US3] Handle backup failure (disk full, permissions) in `src/lib/migrate.ts` — if backup() throws, abort migration with clear error, do not modify database

**Checkpoint**: Backups are predictable, discoverable, and safe. Users can find and use them manually.

---

## Phase 6: User Story 4 — Migration Status Visibility (Priority: P3)

**Goal**: Migration activity is logged to stderr so users know what happened.

**Independent Test**: Run a brane command on an outdated mind.db, verify stderr contains migration log lines.

### Implementation for User Story 4

- [x] T019 [US4] Add stderr logging to migrate() in `src/lib/migrate.ts` — log start, each step, completion/failure using `console.error("brane: ...")`
- [x] T020 [US4] Expand spike `try/migrate-spike.ts` — stderr logging verified (visible in spike output: "brane: migrating...", "brane: step...", "brane: migration complete")
- [x] T021 [US4] Verify `/mind/init` handler in `src/handlers/mind/init.ts` still returns schema_version in result (already does, just confirm)

**Checkpoint**: Users see clear migration activity on stderr. JSON output on stdout unaffected.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, Gemini review, and cleanup.

- [x] T022 Run Gemini antagonistic review on the migration spike and implementation (`gemini -p "review..."`)
- [x] T023 Address Gemini findings: narrowed catch in get_schema_version (only swallow relation-not-found), added version format validation, used parseInt for semver parsing
- [x] T024 Run full test suite — 334 passed, 0 failed
- [x] T025 SCHEMA_VERSION in init.ts and LATEST_VERSION in migrate.ts already in sync (both "1.7.0")
- [x] T026 Rebuild binary, run all spikes (migrate-spike.sh, migrate-spike.ts, dedup-spike.sh), all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1
- **Phase 3 (US1 — Seamless Upgrade)**: Depends on Phase 2 — this is the MVP
- **Phase 4 (US2 — Safe Rollback)**: Depends on Phase 3 (needs migrate() integrated)
- **Phase 5 (US3 — Backup Naming)**: Can run in parallel with Phase 4 (both modify backup logic)
- **Phase 6 (US4 — Logging)**: Can run in parallel with Phase 4/5 (adds logging only)
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Blocks all others — core migration integration
- **US2 (P2)**: Depends on US1 — adds backup/restore around existing migrate()
- **US3 (P2)**: Depends on US1 — refines backup naming (can parallel with US2)
- **US4 (P3)**: Depends on US1 — adds logging (can parallel with US2/US3)

### Parallel Opportunities

- T001 and T002 can run in parallel (both create content in same new file, but logically sequential)
- T016/T017/T018 (US3) can run in parallel with T011/T012/T013 (US2) after US1 is done
- T019/T020/T021 (US4) can run in parallel with US2 and US3

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T010)
4. **STOP and VALIDATE**: All 334 existing tests pass. Spike confirms no-op migration works.
5. This is shippable — migration infrastructure is live, no data loss risk.

### Incremental Delivery

1. Setup + Foundational → Migration module exists
2. US1 → migrate() integrated into open_mind() → **MVP shippable**
3. US2 → Backup/restore on failure → Safety net active
4. US3 → Predictable backup naming → User can manually recover
5. US4 → Logging → Observability
6. Polish → Gemini review, tc tests, full validation

---

## Notes

- All migrations are additive (new relations, new fields). No destructive changes.
- CozoDB's native `backup()` method handles RocksDB internals correctly.
- The migration registry starts empty (only the v0.0.0 → v1.7.0 stamp). Real migrations come from future issues (#34, #37, etc.).
- Each future schema change adds one entry to the MIGRATIONS array and bumps LATEST_VERSION.
