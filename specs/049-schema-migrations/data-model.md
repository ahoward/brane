# Data Model: Schema Migrations

## Entities

### Migration

A versioned step that transforms a mind.db schema from one version to the next.

| Field | Type | Description |
|-------|------|-------------|
| from | string (semver) | Source schema version |
| to | string (semver) | Target schema version |
| apply | async function | Receives CozoDb, applies schema changes |

**Constraints**:
- `from` must be a valid semver string
- `to` must be a valid semver string
- `to` must be exactly one version ahead of `from`
- `apply` must be idempotent (safe to re-run on a partially migrated database after backup restore)

### Migration Registry

An ordered array of Migration objects, sorted by `from` version ascending.

**Constraints**:
- The first migration's `from` must be "0.0.0" or the earliest supported version
- Each migration's `to` must equal the next migration's `from` (chain continuity)
- The last migration's `to` defines the "latest" schema version

### Schema Version (existing)

Stored in `schema_meta` relation in mind.db.

| Key | Value | Description |
|-----|-------|-------------|
| "version" | semver string | Current schema version (e.g., "1.7.0") |

### Backup

A CozoDB backup file created before migration.

| Attribute | Value |
|-----------|-------|
| Location | Same directory as mind.db |
| Naming | `mind.db.backup.v{version}` |
| Content | Full CozoDB native backup |

## State Transitions

```
Database opened
  → Read schema_meta version
  → Compare to LATEST_VERSION
  → If equal: no migration needed, return db
  → If behind: backup → migrate chain → update version → return db
  → If ahead: return error (binary too old)
  → If missing: treat as v0.0.0, run full chain
```

## Relationships

- Migration Registry → references LATEST_VERSION constant (from init.ts)
- open_mind() → calls migrate() → uses Migration Registry
- mind/init → creates schema at LATEST_VERSION (new databases skip migrations)
- Backup → created by CozoDb.backup() before first migration step
