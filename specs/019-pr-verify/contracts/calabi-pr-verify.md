# Contract: /calabi/pr-verify

**Version**: 1.0.0
**Date**: 2026-01-28

## Endpoint

`POST /calabi/pr-verify`

## Description

Verifies the current workspace against defined rules, combining file change detection with rule execution. Returns both what files changed and whether those changes would pass verification.

## Request

### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `rules` | `string[]` | No | `[]` | Specific rules to run. Empty = all rules. |
| `dry_run` | `boolean` | No | `false` | If true, return scope without running verification. |
| `path` | `string` | No | `""` | Filter to specific path prefix for change detection. |

### Example Requests

**Run all rules:**
```json
{}
```

**Run specific rules:**
```json
{
  "rules": ["cycles", "orphans"]
}
```

**Dry run (preview scope):**
```json
{
  "dry_run": true
}
```

**Filter by path:**
```json
{
  "path": "src/"
}
```

## Response

### Success Response

```json
{
  "status": "success",
  "result": {
    "passed": true,
    "changes": {
      "modified": [
        { "url": "file:///path/to/file.ts", "old_hash": "abc123...", "new_hash": "def456..." }
      ],
      "deleted": [
        { "url": "file:///path/to/removed.ts" }
      ],
      "new": [
        { "path": "src/new-file.ts" }
      ],
      "summary": {
        "modified": 1,
        "deleted": 1,
        "new": 1,
        "clean": false
      }
    },
    "verification": {
      "summary": {
        "rules_passed": 2,
        "rules_failed": 0,
        "total_violations": 0
      },
      "rules": [
        { "name": "cycles", "passed": true, "violations": [], "error": null },
        { "name": "orphans", "passed": true, "violations": [], "error": null }
      ]
    }
  },
  "errors": null,
  "meta": {
    "path": "/calabi/pr-verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 150
  }
}
```

### Success with Violations

```json
{
  "status": "success",
  "result": {
    "passed": false,
    "changes": {
      "modified": [],
      "deleted": [],
      "new": [],
      "summary": { "modified": 0, "deleted": 0, "new": 0, "clean": true }
    },
    "verification": {
      "summary": {
        "rules_passed": 1,
        "rules_failed": 1,
        "total_violations": 2
      },
      "rules": [
        { "name": "cycles", "passed": true, "violations": [], "error": null },
        {
          "name": "orphans",
          "passed": false,
          "violations": [
            { "id": 5, "name": "OrphanConcept" },
            { "id": 7, "name": "AnotherOrphan" }
          ],
          "error": null
        }
      ]
    }
  },
  "errors": null,
  "meta": { "path": "/calabi/pr-verify", "timestamp": "...", "duration_ms": 120 }
}
```

### Dry Run Response

```json
{
  "status": "success",
  "result": {
    "passed": true,
    "changes": {
      "modified": [{ "url": "file:///path/to/file.ts", "old_hash": "...", "new_hash": "..." }],
      "deleted": [],
      "new": [{ "path": "src/new.ts" }],
      "summary": { "modified": 1, "deleted": 0, "new": 1, "clean": false }
    },
    "verification": null,
    "dry_run": true
  },
  "errors": null,
  "meta": { "path": "/calabi/pr-verify", "timestamp": "...", "duration_ms": 50 }
}
```

### Error Responses

**Body not initialized:**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "body": [{ "code": "not_initialized", "message": "brane not initialized (run brane init)" }]
  },
  "meta": { "path": "/calabi/pr-verify", "timestamp": "...", "duration_ms": 5 }
}
```

**Mind not initialized:**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "mind": [{ "code": "not_initialized", "message": "mind not initialized (run /mind/init)" }]
  },
  "meta": { "path": "/calabi/pr-verify", "timestamp": "...", "duration_ms": 10 }
}
```

**Rule not found:**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "rules": [{ "code": "not_found", "message": "rule not found: nonexistent" }]
  },
  "meta": { "path": "/calabi/pr-verify", "timestamp": "...", "duration_ms": 15 }
}
```

## Exit Codes

| Exit Code | Condition |
|-----------|-----------|
| 0 | `passed` is `true` (no violations) |
| 1 | `passed` is `false` (violations found) |
| 1 | Error response (body/mind not initialized, rule not found) |

## Notes

- The `passed` field is the top-level indicator for CI/CD integration
- `verification` is `null` when `dry_run: true`
- Changes are always computed, even if workspace is clean
- Rule execution continues even if some rules error (errors reported per-rule)
