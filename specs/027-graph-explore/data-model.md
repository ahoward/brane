# Data Model: Graph Explore

**Feature**: 027-graph-explore
**Date**: 2026-02-01

## Overview

This feature adds read-only exploration of the existing knowledge graph. No new relations are created - we query the existing `concepts` and `edges` relations.

## Existing Relations (Reference)

### concepts

```
concepts[id, name, type, vector]
```

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key, auto-increment |
| name | String | Concept name |
| type | String | Concept type (freeform) |
| vector | F32[384]? | Optional embedding vector |

### edges

```
edges[id, source, target, relation, weight]
```

| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key, auto-increment |
| source | Int | Source concept ID (FK) |
| target | Int | Target concept ID (FK) |
| relation | String | Relationship type (freeform) |
| weight | Float | Edge weight (default 1.0) |

## Response Types

### GraphSummary

Returned by `/graph/summary`:

```typescript
interface GraphSummary {
  concepts: {
    total: number
    by_type: Record<string, number>
  }
  edges: {
    total: number
    by_relation: Record<string, number>
  }
}
```

### NeighborResult

Returned by `/graph/neighbors`:

```typescript
interface Neighbor {
  id: number
  name: string
  type: string
  direction: "incoming" | "outgoing"
  edge_id: number
  relation: string
  weight: number
}

interface NeighborResult {
  concept: {
    id: number
    name: string
    type: string
  }
  neighbors: {
    incoming: Neighbor[]
    outgoing: Neighbor[]
    total: number
  }
}
```

### VizResult

Returned by `/graph/viz`:

```typescript
interface VizResult {
  format: "ascii" | "mermaid"
  output: string
  nodes: number
  edges: number
  truncated: boolean
  message?: string  // Warning if truncated
}
```

## Query Patterns

### Summary Aggregates

```datalog
# Concept count
?[total] := total = count(id), *concepts[id, _, _, _]

# Concepts by type
?[type, count] := count = count(id), *concepts[id, _, type, _]

# Edge count
?[total] := total = count(id), *edges[id, _, _, _, _]

# Edges by relation
?[relation, count] := count = count(id), *edges[id, _, _, relation, _]
```

### Neighbor Query

```datalog
# Combined incoming and outgoing
?[direction, edge_id, neighbor_id, neighbor_name, neighbor_type, relation, weight] :=
    *edges[edge_id, source, target, relation, weight],
    source = $id,
    *concepts[target, neighbor_name, neighbor_type, _],
    neighbor_id = target,
    direction = 'outgoing'

?[direction, edge_id, neighbor_id, neighbor_name, neighbor_type, relation, weight] :=
    *edges[edge_id, source, target, relation, weight],
    target = $id,
    *concepts[source, neighbor_name, neighbor_type, _],
    neighbor_id = source,
    direction = 'incoming'
```

### Full Graph Query (for Viz)

```datalog
# All concepts (limited)
?[id, name, type] := *concepts[id, name, type, _] :limit $limit

# All edges between included concepts
?[id, source, target, relation, weight] :=
    *edges[id, source, target, relation, weight],
    *concepts[source, _, _, _],
    *concepts[target, _, _, _]
    :limit $limit
```

## Validation Rules

### neighbors

- `id` must be a positive integer
- `id` must exist in concepts relation
- Returns empty neighbors arrays if concept exists but has no edges

### viz

- `format` must be "ascii" or "mermaid" (default: "ascii")
- `limit` must be positive integer (default: 20 for ascii, 100 for mermaid)
- `center` must be valid concept ID if provided
- When `center` provided, only show neighbors within `depth` hops (default: 1)

## State Transitions

None - all operations are read-only queries against existing data.
