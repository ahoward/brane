# API Contracts: Extraction Pipeline

## New Endpoint: `/calabi/extract-ast`

AST-only extraction for a single file. No LLM involved.

### Request
```json
{
  "file_url": "file:///project/src/auth.ts",
  "content": "import { AdNetworkAPI } from './vendors'...",
  "language": "typescript"
}
```

- `language` is optional — auto-detected from file extension

### Response (success)
```json
{
  "status": "success",
  "result": {
    "file_url": "file:///project/src/auth.ts",
    "language": "typescript",
    "imports": ["./vendors/ad-network", "./vendors/le-gateway"],
    "symbols": [
      {
        "kind": "interface",
        "name": "UserProfile",
        "signature": null,
        "line": 8,
        "children": []
      },
      {
        "kind": "class",
        "name": "BehaviorTracker",
        "signature": null,
        "line": 24,
        "children": [
          { "kind": "method", "name": "trackUser", "signature": "(profile: UserProfile | MinorProfile)", "line": 29, "children": [] },
          { "kind": "method", "name": "buildShadowProfile", "signature": "(deviceIds: string[])", "line": 47, "children": [] }
        ]
      }
    ],
    "sentinels": ["AdNetworkAPI", "LawEnforcementGateway", "UserProfile", "MinorProfile", "BehaviorTracker"],
    "coverage": null
  },
  "errors": null,
  "meta": { "path": "/calabi/extract-ast", "timestamp": "...", "duration_ms": 12 }
}
```

### Response (unsupported language)
```json
{
  "status": "success",
  "result": {
    "file_url": "file:///project/README.md",
    "language": null,
    "imports": [],
    "symbols": [],
    "sentinels": [],
    "coverage": null
  },
  "errors": null
}
```

## Modified Endpoint: `/calabi/ingest`

Existing ingest gains pipeline stages. Per-file result adds coverage data.

### Modified Per-File Result
```json
{
  "file_url": "file:///project/src/auth.ts",
  "status": "added",
  "concepts_extracted": 8,
  "edges_extracted": 3,
  "concepts_created": 6,
  "concepts_reused": 2,
  "edges_created": 3,
  "provenance_created": 6,
  "coverage": {
    "total_sentinels": 10,
    "matched_sentinels": 8,
    "coverage_pct": 80,
    "missing": ["LawEnforcementGateway", "MinorProfile"]
  },
  "extraction_sources": {
    "ast": 4,
    "llm": 3,
    "adversarial": 1
  }
}
```

### New Ingest Flags

- `--no-adversarial` / `no_adversarial: true` — skip the adversarial re-extraction pass
- `--ast-only` / `ast_only: true` — skip LLM extraction entirely, AST + sentinels only

## New Endpoint: `/calabi/coverage`

Get coverage metrics for already-ingested files.

### Request
```json
{
  "file_url": "file:///project/src/auth.ts"
}
```

### Response
```json
{
  "status": "success",
  "result": {
    "file_url": "file:///project/src/auth.ts",
    "language": "typescript",
    "total_sentinels": 10,
    "matched_sentinels": 8,
    "coverage_pct": 80,
    "missing": ["LawEnforcementGateway", "MinorProfile"],
    "sentinels": [
      { "name": "AdNetworkAPI", "source": "import", "matched": true },
      { "name": "LawEnforcementGateway", "source": "import", "matched": false },
      { "name": "UserProfile", "source": "interface", "matched": true },
      { "name": "MinorProfile", "source": "interface", "matched": false },
      { "name": "BehaviorTracker", "source": "class", "matched": true }
    ]
  },
  "errors": null
}
```
