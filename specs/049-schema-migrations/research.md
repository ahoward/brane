# Research: Schema Migrations

## R1: CozoDB Backup Strategy

**Decision**: Use CozoDB's native `backup_db()` method for pre-migration backups.

**Rationale**: The `CozoDb` wrapper already exposes `backup(path: string): Promise<void>` which calls the native RocksDB backup. This is atomic and handles all internal RocksDB SST files correctly. A filesystem-level copy of a RocksDB directory risks capturing inconsistent state.

**Alternatives considered**:
- `cp -r mind.db mind.db.backup` — Risky with RocksDB (multiple SST files, WAL). Could capture mid-compaction state.
- `export_relations` + `import_relations` — More portable but much slower for large databases, and doesn't preserve internal indexes.

## R2: Migration Trigger Point

**Decision**: Migrate in `open_mind()`, not in individual handlers.

**Rationale**: `open_mind()` is the single entry point for all mind.db access across all handlers. Migrating here means every handler automatically gets migration support. The alternative (migrating per-handler or on first use) creates race conditions and code duplication.

**Alternatives considered**:
- Per-handler migration check — Duplicates check in 30+ handlers. Violates YAGNI.
- Startup migration (in CLI entry) — Doesn't cover library usage. Also, CLI entry doesn't always need mind.db.
- Separate `brane migrate` command — Requires user action. Breaks "just works" UX.

## R3: Migration Registry Design

**Decision**: Simple ordered array of `{ from, to, apply }` objects. Linear walk from current version to latest.

**Rationale**: Brane's schema changes are strictly sequential (v1.7.0 → v1.8.0 → v1.9.0). No branching versions, no parallel release tracks. A simple array is the minimum viable design. Each migration function receives the open CozoDb instance and runs CozoDB commands.

**Alternatives considered**:
- Graph-based migrations (like Rails/Django) — Over-engineered for a single-track version line.
- SQL file based migrations — CozoDB uses Datalog, not SQL. Would need a custom parser anyway.
- Declarative schema diffing — CozoDB doesn't support schema introspection at the relation-field level.

## R4: Backup File Location and Naming

**Decision**: Store backups alongside mind.db as `mind.db.backup.v{version}` in the same directory.

**Rationale**: Keeping backups co-located with the database makes them discoverable. The version suffix lets users identify which version the backup came from. Only one backup per version is kept (latest overwrites previous).

**Alternatives considered**:
- Separate `.brane/backups/` directory — Extra directory management for no benefit.
- Timestamped backups — Accumulates backups. Users don't need multiple backups of the same version.

## R5: Version Comparison

**Decision**: Use semver-style comparison (split on `.`, compare major/minor/patch numerically).

**Rationale**: Schema versions are already semver strings ("1.7.0"). Comparing version strings lexicographically would fail ("1.10.0" < "1.9.0" lexicographically). Simple numeric comparison of split components is correct and trivial to implement.

**Alternatives considered**:
- npm `semver` package — External dependency for 10 lines of code. YAGNI.
- Integer-only versions — Would require migrating existing "1.7.0" strings. Breaking change for no benefit.

## R6: Handling Existing Databases with No schema_meta

**Decision**: Databases where `schema_meta` query throws or returns no version are treated as v0.0.0. The first migration (v0.0.0 → v1.7.0) is a no-op that just stamps the version.

**Rationale**: All existing brane databases have schema_meta with version "1.7.0". The v0.0.0 path is purely defensive, covering corrupted or manually created databases. Making it a no-op keeps things simple.

## R7: CozoDB `:create` Idempotency

**Decision**: CozoDB `:create` throws if the relation already exists. Migrations must use existence checks or catch-and-ignore for additive schema changes.

**Rationale**: Tested empirically — running `:create concepts {...}` twice throws "relation already exists". Migrations adding new relations should use try/catch. Migrations adding data (`:put`) are naturally idempotent.
