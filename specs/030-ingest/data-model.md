# Data Model: Ingest

No new database schema. Ingest orchestrates writes to existing tables.

## Existing Entities (unchanged)

### body.db (SQLite)

- **files**: `id, url, hash, size, mtime` — file tracking registry

### mind.db (CozoDB)

- **concepts**: `id, name, type, vector` — knowledge nodes
- **edges**: `id, source, target, relation, weight` — relationships
- **provenance**: `concept_id, file_url` — file-to-concept links
- **golden_types**: `type, description, authority` — lens type config
- **golden_relations**: `rel, description, symmetric, authority` — lens relation config

## Handler POD Types

### IngestParams (input)

```
path?:     string   // file or directory path (default: ".")
dry_run?:  boolean  // preview without changes (default: false)
```

### IngestResult (output)

```
files: IngestFileResult[]
totals: {
  files_scanned:       number
  files_added:         number
  files_updated:       number
  files_unchanged:     number
  files_extracted:     number
  files_skipped:       number
  concepts_extracted:  number
  edges_extracted:     number
  concepts_created:    number
  concepts_reused:     number
  edges_created:       number
  provenance_created:  number
  errors:              number
}
```

### IngestFileResult (per-file)

```
file_url:            string
status:              "added" | "updated" | "unchanged" | "error"
concepts_extracted?: number
edges_extracted?:    number
concepts_created?:   number
concepts_reused?:    number
edges_created?:      number
provenance_created?: number
error?:              string
patch?:              { concepts: [], edges: [] }  // dry_run only
```
