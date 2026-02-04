# API Contract: Graph Explore

**Feature**: 027-graph-explore
**Date**: 2026-02-01

## Endpoints

### GET /graph/summary

Returns aggregate statistics about the knowledge graph.

**Request**:
```json
{}
```

**Response (success)**:
```json
{
  "status": "success",
  "result": {
    "concepts": {
      "total": 15,
      "by_type": {
        "Entity": 10,
        "Rule": 3,
        "Caveat": 2
      }
    },
    "edges": {
      "total": 20,
      "by_relation": {
        "DEPENDS_ON": 12,
        "IMPLEMENTS": 5,
        "USES": 3
      }
    }
  },
  "errors": null,
  "meta": {
    "path": "/graph/summary",
    "timestamp": "2026-02-01T12:00:00.000Z",
    "duration_ms": 15
  }
}
```

**Response (empty graph)**:
```json
{
  "status": "success",
  "result": {
    "concepts": {
      "total": 0,
      "by_type": {}
    },
    "edges": {
      "total": 0,
      "by_relation": {}
    }
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (not initialized)**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "mind": [{
      "code": "not_initialized",
      "message": "mind.db not initialized - run brane init first"
    }]
  },
  "meta": { ... }
}
```

---

### GET /graph/neighbors

Returns concepts directly connected to a specified concept.

**Request**:
```json
{
  "id": 1
}
```

**Response (success)**:
```json
{
  "status": "success",
  "result": {
    "concept": {
      "id": 1,
      "name": "AuthService",
      "type": "Entity"
    },
    "neighbors": {
      "incoming": [
        {
          "id": 3,
          "name": "LoginHandler",
          "type": "Entity",
          "direction": "incoming",
          "edge_id": 5,
          "relation": "USES",
          "weight": 1.0
        }
      ],
      "outgoing": [
        {
          "id": 2,
          "name": "Database",
          "type": "Entity",
          "direction": "outgoing",
          "edge_id": 1,
          "relation": "DEPENDS_ON",
          "weight": 1.0
        }
      ],
      "total": 2
    }
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (no neighbors)**:
```json
{
  "status": "success",
  "result": {
    "concept": {
      "id": 1,
      "name": "AuthService",
      "type": "Entity"
    },
    "neighbors": {
      "incoming": [],
      "outgoing": [],
      "total": 0
    }
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (concept not found)**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "id": [{
      "code": "not_found",
      "message": "concept with id 999 not found"
    }]
  },
  "meta": { ... }
}
```

**Response (missing id)**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "id": [{
      "code": "required",
      "message": "id is required"
    }]
  },
  "meta": { ... }
}
```

---

### GET /graph/viz

Returns a visualization of the graph in ASCII or Mermaid format.

**Request (default ASCII)**:
```json
{}
```

**Request (Mermaid format)**:
```json
{
  "format": "mermaid"
}
```

**Request (centered on concept)**:
```json
{
  "center": 1,
  "depth": 2
}
```

**Request (with limit)**:
```json
{
  "limit": 10
}
```

**Response (ASCII success)**:
```json
{
  "status": "success",
  "result": {
    "format": "ascii",
    "output": "[AuthService] Entity\n├── DEPENDS_ON → [Database] Entity\n└── USES → [Logger] Entity\n\n[Database] Entity\n└── (no outgoing edges)\n\n[Logger] Entity\n└── (no outgoing edges)\n",
    "nodes": 3,
    "edges": 2,
    "truncated": false
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (Mermaid success)**:
```json
{
  "status": "success",
  "result": {
    "format": "mermaid",
    "output": "graph TD\n    1[\"AuthService (Entity)\"]\n    2[\"Database (Entity)\"]\n    3[\"Logger (Entity)\"]\n    1 -->|DEPENDS_ON| 2\n    1 -->|USES| 3\n",
    "nodes": 3,
    "edges": 2,
    "truncated": false
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (truncated)**:
```json
{
  "status": "success",
  "result": {
    "format": "ascii",
    "output": "...",
    "nodes": 20,
    "edges": 35,
    "truncated": true,
    "message": "Graph truncated to 20 nodes. Use --limit to increase or --center to focus on specific concept."
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (empty graph)**:
```json
{
  "status": "success",
  "result": {
    "format": "ascii",
    "output": "(empty graph)",
    "nodes": 0,
    "edges": 0,
    "truncated": false
  },
  "errors": null,
  "meta": { ... }
}
```

**Response (invalid format)**:
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "format": [{
      "code": "invalid",
      "message": "format must be 'ascii' or 'mermaid'"
    }]
  },
  "meta": { ... }
}
```

---

## CLI Commands

### brane graph

Default: shows summary (equivalent to `brane graph summary`)

```bash
$ brane graph

Concepts: 15
  Entity: 10
  Rule: 3
  Caveat: 2

Edges: 20
  DEPENDS_ON: 12
  IMPLEMENTS: 5
  USES: 3
```

### brane graph summary

Same as `brane graph` but explicit.

### brane graph concepts

Delegates to `/mind/concepts/list` with table output.

```bash
$ brane graph concepts
ID   NAME           TYPE
1    AuthService    Entity
2    Database       Entity
3    Logger         Entity

$ brane graph concepts --type Entity
ID   NAME           TYPE
1    AuthService    Entity
2    Database       Entity
3    Logger         Entity
```

### brane graph edges

Delegates to `/mind/edges/list` with table output.

```bash
$ brane graph edges
ID   SOURCE   TARGET   RELATION     WEIGHT
1    1        2        DEPENDS_ON   1.0
2    1        3        USES         1.0

$ brane graph edges --relation DEPENDS_ON
ID   SOURCE   TARGET   RELATION     WEIGHT
1    1        2        DEPENDS_ON   1.0
```

### brane graph neighbors

```bash
$ brane graph neighbors 1

[AuthService] Entity

Incoming:
  ← USES [LoginHandler] Entity (edge 5)

Outgoing:
  → DEPENDS_ON [Database] Entity (edge 1)
  → USES [Logger] Entity (edge 2)

Total: 3 neighbors
```

### brane graph viz

```bash
$ brane graph viz
[AuthService] Entity
├── DEPENDS_ON → [Database] Entity
└── USES → [Logger] Entity

[Database] Entity
└── (no outgoing edges)

[Logger] Entity
└── (no outgoing edges)

$ brane graph viz --format mermaid
graph TD
    1["AuthService (Entity)"]
    2["Database (Entity)"]
    3["Logger (Entity)"]
    1 -->|DEPENDS_ON| 2
    1 -->|USES| 3

$ brane graph viz --center 1
[AuthService] Entity
├── DEPENDS_ON → [Database] Entity
└── USES → [Logger] Entity
```

### Common Flags

All commands support:
- `--json` / `-j` - Output raw JSON response
