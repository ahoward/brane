# API Contract: Mind Annotations

**Feature**: 018-annotate
**Base Path**: `/mind/annotations`

## Endpoints

### POST /mind/annotations/create

Create a new annotation on a concept.

**Request**
```json
{
  "target": 1,
  "text": "Do not touch - legacy system",
  "type": "caveat"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| target | integer | yes | - | Concept ID to annotate |
| text | string | yes | - | Annotation content (1-4096 chars) |
| type | string | no | "caveat" | One of: caveat, note, todo |

**Success Response (status: "success")**
```json
{
  "status": "success",
  "result": {
    "id": 1,
    "target": 1,
    "text": "Do not touch - legacy system",
    "type": "caveat",
    "authority": "infinity",
    "created_at": "2026-01-28T12:00:00.000Z"
  },
  "errors": null,
  "meta": {
    "path": "/mind/annotations/create",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 5
  }
}
```

**Error: Concept Not Found**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "target": [{
      "code": "not_found",
      "message": "concept not found"
    }]
  },
  "meta": { ... }
}
```

**Error: Validation Failed**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "text": [{
      "code": "required",
      "message": "text is required"
    }]
  },
  "meta": { ... }
}
```

**Error: Text Too Long**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "text": [{
      "code": "invalid",
      "message": "text must be 4096 characters or less"
    }]
  },
  "meta": { ... }
}
```

---

### GET /mind/annotations/list

List annotations with optional filters.

**Request**
```json
{
  "target": 1,
  "type": "caveat"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| target | integer | no | Filter by concept ID |
| type | string | no | Filter by annotation type |

**Success Response**
```json
{
  "status": "success",
  "result": {
    "annotations": [
      {
        "id": 2,
        "target": 1,
        "text": "Needs refactoring",
        "type": "todo",
        "authority": "infinity",
        "created_at": "2026-01-28T13:00:00.000Z"
      },
      {
        "id": 1,
        "target": 1,
        "text": "Do not touch",
        "type": "caveat",
        "authority": "infinity",
        "created_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "count": 2
  },
  "errors": null,
  "meta": { ... }
}
```

**Notes**:
- Results sorted by created_at descending (newest first)
- Empty array if no annotations match filters

---

### GET /mind/annotations/get

Get a single annotation by ID.

**Request**
```json
{
  "id": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | yes | Annotation ID |

**Success Response**
```json
{
  "status": "success",
  "result": {
    "id": 1,
    "target": 1,
    "text": "Do not touch - legacy system",
    "type": "caveat",
    "authority": "infinity",
    "created_at": "2026-01-28T12:00:00.000Z"
  },
  "errors": null,
  "meta": { ... }
}
```

**Error: Not Found**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "id": [{
      "code": "not_found",
      "message": "annotation not found"
    }]
  },
  "meta": { ... }
}
```

---

### DELETE /mind/annotations/delete

Delete an annotation by ID.

**Request**
```json
{
  "id": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | yes | Annotation ID |

**Success Response**
```json
{
  "status": "success",
  "result": {
    "deleted": true,
    "id": 1
  },
  "errors": null,
  "meta": { ... }
}
```

**Error: Not Found**
```json
{
  "status": "error",
  "result": null,
  "errors": {
    "id": [{
      "code": "not_found",
      "message": "annotation not found"
    }]
  },
  "meta": { ... }
}
```

---

## Common Errors

### Mind Not Initialized

All endpoints return this when mind.db doesn't exist:

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "mind": [{
      "code": "not_initialized",
      "message": "mind not initialized (run brane mind init)"
    }]
  },
  "meta": { ... }
}
```

### Invalid Type

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "type": [{
      "code": "invalid",
      "message": "type must be one of: caveat, note, todo"
    }]
  },
  "meta": { ... }
}
```
