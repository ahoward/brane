# Contracts: Episode Handlers

## `/mind/episodes/create`

### Input
```json
{
  "agent_id": "claude-code",
  "observation": "User prefers snake_case naming",
  "context": "code review of auth module",
  "outcome": "applied snake_case to all new variables",
  "tags": ["preference", "style"],
  "source_concept_id": 42
}
```

Required: `agent_id`, `observation`
Optional: `context`, `outcome`, `tags`, `source_concept_id`

### Success Output
```json
{
  "status": "success",
  "result": {
    "id": 1,
    "agent_id": "claude-code",
    "timestamp": "2026-03-26T12:00:00.000Z",
    "observation": "User prefers snake_case naming",
    "context": "code review of auth module",
    "outcome": "applied snake_case to all new variables",
    "tags": ["preference", "style"],
    "source_concept_id": 42
  }
}
```

### Error Cases
- Missing `observation`: `{ "observation": [{ "code": "required", "message": "observation is required" }] }`
- Missing `agent_id`: `{ "agent_id": [{ "code": "required", "message": "agent_id is required" }] }`
- Invalid `source_concept_id`: `{ "source_concept_id": [{ "code": "not_found", "message": "concept not found" }] }`

---

## `/mind/episodes/list`

### Input
```json
{
  "agent_id": "claude-code",
  "tag": "preference",
  "after": "2026-03-01T00:00:00.000Z",
  "before": "2026-03-31T23:59:59.999Z",
  "limit": 50
}
```

All fields optional. Default limit: 100.

### Success Output
```json
{
  "status": "success",
  "result": {
    "episodes": [
      {
        "id": 1,
        "agent_id": "claude-code",
        "timestamp": "2026-03-26T12:00:00.000Z",
        "observation": "User prefers snake_case naming",
        "context": "code review",
        "outcome": "applied snake_case",
        "tags": ["preference", "style"],
        "source_concept_id": 42
      }
    ],
    "total": 1
  }
}
```

---

## `/mind/episodes/get`

### Input
```json
{ "id": 1 }
```

### Success Output
Same shape as a single episode from list.

### Error Cases
- Missing `id`: `{ "id": [{ "code": "required", "message": "id is required" }] }`
- Not found: `{ "id": [{ "code": "not_found", "message": "episode not found" }] }`

---

## `/mind/episodes/delete`

### Input
```json
{ "id": 1 }
```

### Success Output
```json
{
  "status": "success",
  "result": { "deleted": true, "id": 1 }
}
```

### Error Cases
- Missing `id`: `{ "id": [{ "code": "required", "message": "id is required" }] }`
- Not found: `{ "id": [{ "code": "not_found", "message": "episode not found" }] }`

---

## `/mind/episodes/search`

### Input
```json
{
  "query": "authentication problems",
  "limit": 10,
  "agent_id": "claude-code"
}
```

Required: `query`
Optional: `limit` (default 10), `agent_id`

### Success Output
```json
{
  "status": "success",
  "result": {
    "matches": [
      {
        "id": 3,
        "agent_id": "claude-code",
        "timestamp": "2026-03-25T10:00:00.000Z",
        "observation": "Token expiry causing login failures",
        "context": "debugging auth service",
        "outcome": "increased token TTL to 24h",
        "tags": ["bug", "auth"],
        "source_concept_id": 0,
        "score": 0.847
      }
    ]
  }
}
```

### Error Cases
- Missing `query`: `{ "query": [{ "code": "required", "message": "query is required" }] }`
