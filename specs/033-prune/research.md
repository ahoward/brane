# Research: 033-prune

## Decision: Cross-database orphan detection

**Decision**: Query body.db (SQLite) for valid file_urls, then query mind.db (CozoDB) for provenance records, compute orphans in TypeScript.

**Rationale**: body.db and mind.db are different database engines (SQLite vs CozoDB). No cross-db join is possible. The approach is:
1. Open body.db → `SELECT url FROM files` → get Set of valid file_urls
2. Open mind.db → query all provenance → get all `{concept_id, file_url}` pairs
3. In TypeScript: find concept_ids where ALL provenance file_urls are NOT in the valid set
4. Delete orphan concepts, their edges, and stale provenance via CozoDB `:rm` queries

**Alternatives considered**:
- CozoDB-only approach (store file tracking in mind.db) — rejected, violates split-brain architecture
- Shell out to sqlite3 CLI — rejected, unnecessary complexity when bun:sqlite is available

## Decision: Deletion order

**Decision**: Delete in order: edges first, then provenance, then concepts.

**Rationale**: CozoDB stored relations don't enforce referential integrity, but deleting in this order is logically clean — remove references before removing the referenced entity. Edges referencing pruned concept IDs would become dangling if concepts were deleted first.

## Decision: Batch deletion via CozoDB

**Decision**: Use CozoDB's `:rm` with inline data for batch deletions.

**Rationale**: CozoDB supports `?[id] <- [[1], [2], [3]] :rm concepts {id}` pattern for batch removal. This is efficient for removing multiple rows in a single query. Existing codebase uses this pattern in provenance/delete.ts.

## Decision: Prune handler path

**Decision**: `/mind/prune` handler at `src/handlers/mind/prune.ts`

**Rationale**: Prune operates on mind.db data (concepts, edges, provenance) using body.db only as a reference. It belongs in the mind namespace. CLI command is `brane prune` (top-level, like `brane verify`).

## Decision: No automatic pruning during ingest

**Decision**: Prune is manual-only. Not called automatically during `brane ingest`.

**Rationale**: Ingest is additive. Prune is destructive. Coupling them risks accidental data loss. Users explicitly choose when to prune. This matches the git model — `git gc` is separate from `git commit`.

## Schema reference

```
-- body.db (SQLite)
files(url TEXT PRIMARY KEY, hash TEXT, size INTEGER, modified INTEGER)

-- mind.db (CozoDB)
concepts{id: Int, name: String, type: String, vector: <F32;256>?}
edges{id: Int, source: Int, target: Int, relation: String, weight: Float}
provenance{concept_id: Int, file_url: String}
```

Provenance is keyed on `(concept_id, file_url)` — a concept can have multiple provenance records (extracted from multiple files), and a file can produce multiple concepts.
