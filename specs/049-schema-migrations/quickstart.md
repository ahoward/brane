# Quickstart: Schema Migrations

## How It Works

The migration system is transparent — it runs automatically when any brane command opens mind.db.

### For Users

Nothing changes. Upgrade brane, run any command, and your database is automatically migrated. You'll see a message on stderr:

```
brane: migrating mind.db v1.7.0 -> v1.8.0 (1 step)
brane: migration complete (v1.8.0)
```

A backup is created at `.brane/mind.db.backup.v1.7.0` before any changes.

### For Developers Adding Schema Changes

1. Bump `SCHEMA_VERSION` in `src/handlers/mind/init.ts`
2. Add a migration function to `src/lib/migrate.ts`:

```typescript
async function migrate_1_7_to_1_8(db: CozoDb): Promise<void> {
  // Add new relation
  await db.run(`:create episodes { id: Int, content: String, ... }`)
  // Add new HNSW index
  await db.run(`::hnsw create episodes:semantic { ... }`)
}
```

3. Register it in the `MIGRATIONS` array:

```typescript
const MIGRATIONS: Migration[] = [
  { from: "1.7.0", to: "1.8.0", apply: migrate_1_7_to_1_8 },
]
```

4. Update `create_schema()` in init.ts to include the new relation (for fresh databases).

### Testing

- **Spike first**: Write a script in `try/` that creates a v1.7.0 database, runs the binary, and verifies migration.
- **tc tests**: Seed a pre-migration database, run a handler, verify both migration and handler succeed.
