# API Contract: /mind/prune

## Endpoint

`/mind/prune`

## Request

```json
{
  "dry_run": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dry_run` | boolean | no | `false` | Preview removals without modifying mind.db |

## Response (success)

```json
{
  "status": "success",
  "result": {
    "concepts_removed": 3,
    "edges_removed": 5,
    "provenance_removed": 4,
    "details": {
      "concepts": [
        { "id": 7, "name": "AuthService", "type": "Entity" },
        { "id": 8, "name": "LoginFlow", "type": "Entity" },
        { "id": 12, "name": "TokenManager", "type": "Entity" }
      ],
      "edges": [
        { "id": 3, "source": 7, "target": 8, "relation": "DEPENDS_ON" },
        { "id": 4, "source": 8, "target": 12, "relation": "CALLS" }
      ],
      "provenance": [
        { "concept_id": 7, "file_url": "file:///src/auth.ts" },
        { "concept_id": 8, "file_url": "file:///src/auth.ts" }
      ]
    }
  },
  "errors": null,
  "meta": {
    "path": "/mind/prune",
    "timestamp": "<timestamp>",
    "duration_ms": "<number>"
  }
}
```

## Response (dry_run)

Same shape. `concepts_removed`, `edges_removed`, `provenance_removed` reflect what WOULD be removed. mind.db is unchanged.

## Response (nothing to prune)

```json
{
  "status": "success",
  "result": {
    "concepts_removed": 0,
    "edges_removed": 0,
    "provenance_removed": 0,
    "details": {
      "concepts": [],
      "edges": [],
      "provenance": []
    }
  },
  "errors": null,
  "meta": {
    "path": "/mind/prune",
    "timestamp": "<timestamp>",
    "duration_ms": "<number>"
  }
}
```

## Response (error — not initialized)

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "brane": [{ "code": "not_initialized", "message": "brane not initialized (run brane init)" }]
  },
  "meta": {
    "path": "/mind/prune",
    "timestamp": "<timestamp>",
    "duration_ms": "<number>"
  }
}
```

## CLI

```bash
brane prune              # prune orphans
brane prune --dry-run    # preview what would be removed
brane prune --json       # JSON output
```
