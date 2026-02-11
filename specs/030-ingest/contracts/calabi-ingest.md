# Contract: /calabi/ingest

## Endpoint

`sys.call("/calabi/ingest", params)`

## Input

```json
{
  "path": "src/",
  "dry_run": false
}
```

| Field    | Type    | Required | Default | Description                          |
|----------|---------|----------|---------|--------------------------------------|
| path     | string  | no       | "."     | File or directory path to ingest     |
| dry_run  | boolean | no       | false   | Preview changes without applying     |

## Output (success)

```json
{
  "status": "success",
  "result": {
    "files": [
      {
        "file_url": "file:///abs/path/src/auth.ts",
        "status": "added",
        "concepts_extracted": 4,
        "edges_extracted": 3,
        "concepts_created": 4,
        "concepts_reused": 0,
        "edges_created": 3,
        "provenance_created": 4
      },
      {
        "file_url": "file:///abs/path/src/login.ts",
        "status": "unchanged"
      }
    ],
    "totals": {
      "files_scanned": 2,
      "files_added": 1,
      "files_updated": 0,
      "files_unchanged": 1,
      "files_extracted": 1,
      "files_skipped": 1,
      "concepts_extracted": 4,
      "edges_extracted": 3,
      "concepts_created": 4,
      "concepts_reused": 0,
      "edges_created": 3,
      "provenance_created": 4,
      "errors": 0
    }
  },
  "errors": null,
  "meta": {
    "path": "/calabi/ingest",
    "timestamp": "2026-02-10T00:00:00.000Z",
    "duration_ms": 5000
  }
}
```

## Output (error — not initialized)

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "body": [{ "code": "not_initialized", "message": "brane not initialized (run brane init)" }]
  },
  "meta": { "path": "/calabi/ingest", "timestamp": "...", "duration_ms": 0 }
}
```

## Output (dry_run)

Same structure as success, but:
- body.db and mind.db are not modified
- Files with status "added" or "updated" include a `patch` field with extracted concepts/edges
- `concepts_created`, `edges_created`, `provenance_created` are all 0

## Behavior

1. Resolve path to absolute. Default to "." if not provided.
2. Call `/body/scan` with the path to index files → get added/updated/unchanged lists
3. For each added or updated file:
   a. Read file content from disk
   b. Call LLM extraction (extract_from_file)
   c. Apply patch via `/calabi/extract` handler
4. Skip unchanged files (no LLM call)
5. Aggregate per-file results into totals
6. If extraction fails for a file, record error and continue with remaining files
