# Feature Specification: Schema Migrations

**Feature Branch**: `049-schema-migrations`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Schema migrations: versioned mind.db upgrades without data loss"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless Upgrade on Existing Workspace (Priority: P1)

A developer has been using brane for weeks and has accumulated a knowledge graph with concepts, edges, and provenance data. A new version of brane ships with new schema features (e.g., episodes relation). When the developer runs any brane command that opens mind.db, the system detects the outdated schema and automatically upgrades it to the latest version without losing any existing data.

**Why this priority**: Without this, every schema change is a breaking change that destroys user data. This is the entire reason migrations exist.

**Independent Test**: Create a mind.db at schema version 1.7.0 with known data. Run a brane command that triggers auto-migration. Verify schema is at latest version and all original data is intact.

**Acceptance Scenarios**:

1. **Given** a mind.db at schema v1.7.0 with concepts and edges, **When** the user runs any brane command, **Then** the schema is upgraded to the latest version and all existing concepts, edges, provenance, and annotations are preserved.
2. **Given** a mind.db already at the latest schema version, **When** the user runs any brane command, **Then** no migration is performed and the command executes normally with no delay.
3. **Given** a mind.db at an intermediate version (e.g., v1.8.0 when latest is v1.10.0), **When** the user runs a command, **Then** all intermediate migrations run in sequence (v1.8.0 -> v1.9.0 -> v1.10.0).

---

### User Story 2 - Safe Rollback on Migration Failure (Priority: P2)

A migration fails mid-execution (e.g., disk full, corrupted data, unexpected schema state). The system restores the original mind.db from a pre-migration backup so the user's data is not lost or corrupted.

**Why this priority**: Migrations that can fail without recovery are worse than no migrations at all. Users must trust that upgrades won't destroy their work.

**Independent Test**: Simulate a migration failure (e.g., inject an error in a migration step). Verify the original mind.db is restored from backup and the user sees a clear error message.

**Acceptance Scenarios**:

1. **Given** a mind.db that needs migration, **When** a migration step fails, **Then** the original mind.db is restored from the pre-migration backup.
2. **Given** a failed migration, **When** the user inspects the error output, **Then** they see which migration step failed and what the error was.
3. **Given** a restored backup after failure, **When** the user runs a brane command again, **Then** the system re-attempts migration (the backup does not block future attempts).

---

### User Story 3 - Pre-Migration Backup (Priority: P2)

Before any migration runs, the system creates a timestamped backup of mind.db so the user can manually recover even if automatic rollback fails.

**Why this priority**: Defense in depth. Even if automatic rollback works perfectly, users need the safety net of a manual backup for catastrophic scenarios.

**Independent Test**: Trigger a migration and verify a backup file exists at the expected location with the correct content.

**Acceptance Scenarios**:

1. **Given** a mind.db that needs migration, **When** migration begins, **Then** a backup is created at a predictable location before any schema changes occur.
2. **Given** a backup file from a previous migration, **When** the user lists the brane directory, **Then** the backup is identifiable by the schema version it was taken from.

---

### User Story 4 - Migration Status Visibility (Priority: P3)

The developer can see what schema version their mind.db is at, and whether migrations were applied. Migration activity is logged to stderr so it doesn't interfere with JSON output on stdout.

**Why this priority**: Observability helps debugging. Lower priority because it's informational, not functional.

**Independent Test**: Run a brane command on an outdated mind.db and verify migration log messages appear on stderr.

**Acceptance Scenarios**:

1. **Given** a mind.db that needs migration, **When** migration runs, **Then** each migration step is logged to stderr with the version transition (e.g., "migrating 1.7.0 -> 1.8.0").
2. **Given** `/mind/init` is called, **When** the result is returned, **Then** it includes the current schema version.

---

### Edge Cases

- What happens when the mind.db has no schema_meta relation at all (pre-versioning databases)? Treated as version "0.0.0".
- What happens when the mind.db reports a version newer than the current binary supports? Return a clear error advising the user to upgrade brane.
- What happens when mind.db file permissions prevent creating a backup? Abort migration with a clear error; do not modify the database.
- What happens when disk space is insufficient for the backup copy? Abort migration with a clear error; do not modify the database.
- What happens when multiple migrations need to run and one in the middle fails? Restore from the pre-migration backup (taken before the first migration step), not from an intermediate state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a registry of versioned migrations, each with a source version, target version, and migration function.
- **FR-002**: System MUST automatically detect when a mind.db schema version is behind the latest version on any database access.
- **FR-003**: System MUST execute all required migrations in sequence from the current version to the latest version.
- **FR-004**: System MUST create a backup of mind.db before executing any migration.
- **FR-005**: System MUST restore mind.db from backup if any migration step fails.
- **FR-006**: System MUST update the schema_meta version entry after each successful migration step.
- **FR-007**: System MUST log migration activity (start, each step, completion/failure) to stderr.
- **FR-008**: System MUST reject databases with a schema version newer than the binary supports, with a clear error message advising the user to upgrade brane.
- **FR-009**: System MUST handle databases without a schema_meta relation by treating them as version "0.0.0" (pre-versioning).
- **FR-010**: Migrations MUST be non-destructive by default - adding new relations and fields, not removing or renaming existing ones.
- **FR-011**: Backup files MUST be stored alongside the original mind.db with a name that includes the pre-migration version.

### Key Entities

- **Migration**: A versioned step that transforms a mind.db schema from one version to the next. Has a source version, target version, and apply function.
- **Migration Registry**: An ordered list of all known migrations from the oldest supported version to the latest.
- **Schema Version**: A semver string stored in schema_meta that identifies the current state of a mind.db's schema.
- **Backup**: A copy of mind.db taken before migration, named to identify the version it was taken from.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A mind.db created at any previously released schema version can be upgraded to the latest version with zero data loss (all concepts, edges, provenance, annotations preserved).
- **SC-002**: Migration of a typical mind.db (under 10,000 concepts) completes in under 5 seconds.
- **SC-003**: Failed migrations restore the original database with no data corruption in 100% of failure scenarios.
- **SC-004**: All existing 334 tests continue to pass after the migration system is integrated.
- **SC-005**: Users see clear, actionable messages when migrations run, fail, or when their binary is too old for their database.

## Assumptions

- CozoDB's `:create` command for new relations is safe to run alongside existing relations (additive only).
- mind.db files are small enough that a full file copy is an acceptable backup strategy (no incremental backup needed).
- Migrations run synchronously and serially; no concurrent migration support is needed.
- The migration system only handles mind.db. body.db (SQLite) schema changes are handled separately or are backward-compatible.
