# Quickstart: Graph Explore

**Feature**: 027-graph-explore
**Date**: 2026-02-01

## Prerequisites

- Brane initialized (`brane init`)
- Some concepts and edges in the graph

## Setup Test Data

```bash
# Initialize
brane init

# Create some concepts
brane concept create -n "AuthService" -t "Entity"
brane concept create -n "Database" -t "Entity"
brane concept create -n "Logger" -t "Entity"
brane concept create -n "LoginHandler" -t "Entity"
brane concept create -n "MustAuth" -t "Rule"

# Create some edges
brane edge create -s 1 -t 2 -r "DEPENDS_ON"
brane edge create -s 1 -t 3 -r "USES"
brane edge create -s 4 -t 1 -r "USES"
brane edge create -s 5 -t 1 -r "APPLIES_TO"
```

## Basic Usage

### View Graph Summary

```bash
# Default command shows summary
$ brane graph

Concepts: 5
  Entity: 4
  Rule: 1

Edges: 4
  DEPENDS_ON: 1
  USES: 2
  APPLIES_TO: 1
```

### List Concepts

```bash
# All concepts
$ brane graph concepts
ID   NAME           TYPE
1    AuthService    Entity
2    Database       Entity
3    Logger         Entity
4    LoginHandler   Entity
5    MustAuth       Rule

# Filter by type
$ brane graph concepts --type Rule
ID   NAME           TYPE
5    MustAuth       Rule
```

### List Edges

```bash
# All edges
$ brane graph edges
ID   SOURCE   TARGET   RELATION     WEIGHT
1    1        2        DEPENDS_ON   1.0
2    1        3        USES         1.0
3    4        1        USES         1.0
4    5        1        APPLIES_TO   1.0

# Filter by relation
$ brane graph edges --relation USES
ID   SOURCE   TARGET   RELATION     WEIGHT
2    1        3        USES         1.0
3    4        1        USES         1.0
```

### Explore Neighbors

```bash
# See what's connected to AuthService (id 1)
$ brane graph neighbors 1

[AuthService] Entity

Incoming:
  ← USES [LoginHandler] Entity (edge 3)
  ← APPLIES_TO [MustAuth] Rule (edge 4)

Outgoing:
  → DEPENDS_ON [Database] Entity (edge 1)
  → USES [Logger] Entity (edge 2)

Total: 4 neighbors
```

### Visualize the Graph

```bash
# ASCII visualization (default)
$ brane graph viz
[AuthService] Entity
├── DEPENDS_ON → [Database] Entity
└── USES → [Logger] Entity

[Database] Entity
└── (no outgoing edges)

[Logger] Entity
└── (no outgoing edges)

[LoginHandler] Entity
└── USES → [AuthService] Entity

[MustAuth] Rule
└── APPLIES_TO → [AuthService] Entity

# Mermaid format (for docs/rendering)
$ brane graph viz --format mermaid
graph TD
    1["AuthService (Entity)"]
    2["Database (Entity)"]
    3["Logger (Entity)"]
    4["LoginHandler (Entity)"]
    5["MustAuth (Rule)"]
    1 -->|DEPENDS_ON| 2
    1 -->|USES| 3
    4 -->|USES| 1
    5 -->|APPLIES_TO| 1

# Centered on specific concept
$ brane graph viz --center 1
[AuthService] Entity
├── DEPENDS_ON → [Database] Entity
├── USES → [Logger] Entity
├── ← USES [LoginHandler] Entity
└── ← APPLIES_TO [MustAuth] Rule
```

## JSON Output

All commands support `--json` for machine-readable output:

```bash
$ brane graph --json
{
  "status": "success",
  "result": {
    "concepts": { "total": 5, "by_type": { "Entity": 4, "Rule": 1 } },
    "edges": { "total": 4, "by_relation": { "DEPENDS_ON": 1, "USES": 2, "APPLIES_TO": 1 } }
  },
  "errors": null,
  "meta": { ... }
}

$ brane graph neighbors 1 --json
{
  "status": "success",
  "result": {
    "concept": { "id": 1, "name": "AuthService", "type": "Entity" },
    "neighbors": {
      "incoming": [...],
      "outgoing": [...],
      "total": 4
    }
  },
  "errors": null,
  "meta": { ... }
}
```

## Test Scenarios

### Empty Graph

```bash
# Fresh init, no concepts
$ brane init --force
$ brane graph

Concepts: 0
Edges: 0

(empty graph)
```

### Large Graph Warning

```bash
# With 25+ concepts
$ brane graph viz
Warning: Graph has 25 nodes. Showing first 20.
Use --limit 25 to see all or --center ID to focus on specific concept.

[Concept1] Entity
...
```

### Error Cases

```bash
# Uninitialized workspace
$ rm -rf .brane && brane graph
Error: mind.db not initialized - run brane init first

# Invalid concept ID
$ brane graph neighbors 999
Error: concept with id 999 not found

# Invalid format
$ brane graph viz --format dot
Error: format must be 'ascii' or 'mermaid'
```
