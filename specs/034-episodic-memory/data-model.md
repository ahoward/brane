# Data Model: Episodic Memory

## Entities

### Episode

A timestamped record of an agent's experience.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | auto | Unique sequential ID |
| agent_id | string | yes | Which agent created this (e.g., "claude-code") |
| timestamp | string | auto | UTC ISO 8601 (auto-generated on create) |
| observation | string | yes | What the agent noticed/learned |
| context | string | no | What was happening (task, file, conversation) |
| outcome | string | no | What happened as a result |
| tags | string (JSON array) | no | User/agent-defined labels, stored as JSON |
| vector | float array (256) | auto | Embedding of observation text (nullable) |
| source_concept_id | integer | no | Optional link to a related concept |

**Validation Rules**:
- `observation` must be non-empty
- `agent_id` must be non-empty
- `source_concept_id`, if provided, must reference an existing concept
- `tags`, if provided, must be a JSON array of non-empty strings
- `timestamp` is always server-generated, never user-supplied

### Relationships

- Episode → Concept (optional, via `source_concept_id`): An episode can reference a concept it relates to
- Episode → Agent (via `agent_id` string): Identifies the creating agent (no foreign key, just a label)

## CozoDB Relation

```
episodes {
  id: Int,
  agent_id: String,
  timestamp: String,
  observation: String,
  context: String,
  outcome: String,
  tags: String,
  vector: <F32; 256>?,
  source_concept_id: Int
}
```

Note: Optional string fields use empty string `""` as null (CozoDB doesn't support nullable strings natively). `source_concept_id` uses `0` as null. `vector` is natively nullable.

## HNSW Index

```
episodes:semantic {
  dim: 256,
  m: 50,
  dtype: F32,
  fields: [vector],
  distance: Cosine,
  ef_construction: 100
}
```

Same configuration as `concepts:semantic`.
