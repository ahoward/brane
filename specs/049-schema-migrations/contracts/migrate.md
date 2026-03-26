# Contract: migrate()

## Internal API (not a sys.call handler)

### `migrate(db: CozoDb, db_path: string): Promise<MigrateResult>`

Called from `open_mind()` after successfully opening the database.

### Input

| Parameter | Type | Description |
|-----------|------|-------------|
| db | CozoDb | Already-open database handle |
| db_path | string | Filesystem path to mind.db (for backup) |

### Output: MigrateResult

```typescript
interface MigrateResult {
  migrated: boolean        // true if any migrations ran
  from_version: string     // version before migration
  to_version: string       // version after migration (or same if no migration)
  steps: number            // number of migration steps applied
  backup_path: string | null  // path to backup file (null if no migration needed)
}
```

### Error Cases

| Condition | Behavior |
|-----------|----------|
| Version is current | Return `{ migrated: false, from_version: v, to_version: v, steps: 0, backup_path: null }` |
| Version is ahead of binary | Throw error: "mind.db schema v{X} is newer than this binary supports (v{Y}). Upgrade brane." |
| Backup fails | Throw error: "failed to backup mind.db before migration: {reason}" |
| Migration step fails | Restore from backup, throw error: "migration v{X} -> v{Y} failed: {reason}. Database restored from backup." |
| No schema_meta | Treat as v0.0.0 |

### Logging

All migration activity logged to stderr via `console.error()`:
- `"brane: migrating mind.db v{from} -> v{to} ({N} steps)"`
- `"brane: step {i}/{N}: v{from} -> v{to}"`
- `"brane: migration complete (v{final})"`
- `"brane: migration failed at v{from} -> v{to}, restoring backup..."`

---

# Contract: compare_versions()

### `compare_versions(a: string, b: string): number`

Semver comparison utility.

### Input

Two semver strings (e.g., "1.7.0", "1.8.0").

### Output

- `-1` if a < b
- `0` if a === b
- `1` if a > b

---

# Contract: open_mind() changes

### Existing: `open_mind(): MindDb | MindError`

**New behavior**: After opening the database, call `migrate(db, path)`. If migration fails, close db and return MindError. If migration succeeds (or was not needed), return MindDb as before.

**New error codes**:
- `"version_ahead"` — Database is newer than binary supports
- `"migration_failed"` — Migration step failed (backup restored)
- `"backup_failed"` — Could not create backup before migration
