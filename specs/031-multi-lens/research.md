# Research: Multi-Lens

## R1: Path Resolution Strategy

**Decision**: Centralized `resolve_lens_paths()` function in `src/lib/state.ts` that returns `{ body_db_path, mind_db_path }` for the active lens.

**Rationale**: Today, `open_mind()` and various handlers hardcode `resolve(process.cwd(), ".brane")`. Rather than modifying every handler, we modify `open_mind()` and `open_body()` to accept an optional path override. The new `state.ts` lib reads `.brane/state.db` to determine the active lens, resolves the paths, and passes them down. This is a single point of change — all 50+ handlers that call `open_mind()` get multi-lens support for free.

**Alternatives considered**:
- Environment variable (`BRANE_LENS=security`) — too fragile, doesn't persist
- Config file (`.brane/config.json`) — works but violates the "use SQLite not flat files" directive
- Pass lens name through every sys.call — invasive, changes every handler signature

## R2: Flat Layout Detection

**Decision**: `state.ts` checks for the old flat layout by testing `existsSync(".brane/body.db") && !existsSync(".brane/state.db")`. When detected, it returns the flat paths directly (`.brane/body.db`, `.brane/mind.db`) as the "default" lens without any migration.

**Rationale**: Zero-friction upgrade. Existing users don't need to run anything. The first time they run a multi-lens command (`brane lens create`, `brane lens use`), state.db gets created. Until then, the old paths work exactly as before.

**Alternatives considered**:
- Auto-migrate on first run — risky, moves files without consent
- Require explicit init — breaks existing workflows

## R3: state.db Schema

**Decision**: Single `config` table with key-value pairs. Initial schema:

```sql
CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO config (key, value) VALUES ('active_lens', 'default');
```

**Rationale**: Key-value is the simplest possible schema. No ORM, no migrations framework. Future settings (theme, defaults, etc.) just add rows. SQLite gives us atomic writes, WAL mode, and concurrent read safety.

**Alternatives considered**:
- Separate tables per concern — premature, YAGNI
- JSON blob — loses query ability, no benefit over KV

## R4: Lens Directory Layout

**Decision**: `.brane/lens/{name}/body.db` + `.brane/lens/{name}/mind.db`. The `lens/` directory is created on first `brane lens create`. The `default` lens in the new layout lives at `.brane/lens/default/`.

**Rationale**: Clean hierarchy. Each lens is a self-contained directory. Easy to backup, copy, or delete. `mind.db` is a RocksDB directory (not a single file), so each lens directory contains a `body.db` file and a `mind.db/` directory.

**Alternatives considered**:
- `.brane/{name}/` (flat alongside body.db) — confusing, namespace collision
- `.brane/db/{name}/` — `db` is redundant, `lens/` is clearer

## R5: Lens Name Validation

**Decision**: `/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/` — must start with alphanumeric, can contain alphanumeric, hyphens, underscores. No empty string. No dots, spaces, or slashes.

**Rationale**: Must be a valid directory name on all platforms. Starting with alphanumeric avoids hidden files (`.foo`). This matches the existing feature branch naming convention.

## R6: Migration Strategy

**Decision**: `brane lens migrate` moves `.brane/body.db` → `.brane/lens/default/body.db` and `.brane/mind.db` → `.brane/lens/default/mind.db`. Also creates state.db if it doesn't exist. Idempotent — running it twice is safe.

**Rationale**: Explicit opt-in migration. Users who want the clean layout can get it. Users who don't care can keep the flat layout forever (detected automatically by state.ts).

**Alternatives considered**:
- Symlinks — fragile across platforms, git doesn't track them
- Copy instead of move — doubles disk usage, synchronization nightmare
