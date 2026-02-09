# API Contract: Mind Rules

**Feature**: 016-rules-define
**Date**: 2026-01-28

All endpoints follow the standard `sys.call` envelope:

```typescript
{
  status: "success" | "error",
  result: T | null,
  errors: ErrorMap | null,
  meta: { path, timestamp, duration_ms }
}
```

---

## POST /mind/rules/create

Create a custom rule.

### Request

```typescript
interface CreateParams {
  name: string        // Required, unique identifier
  description: string // Required, human-readable
  body: string        // Required, Datalog query
}
```

### Response (Success)

```typescript
interface Rule {
  name: string
  description: string
  body: string
  builtin: boolean  // Always false for created rules
}
```

### Errors

| Code | Field | Condition |
|------|-------|-----------|
| required | name | Name not provided |
| required | description | Description not provided |
| required | body | Body not provided |
| invalid_syntax | body | Datalog syntax invalid |
| duplicate | name | Rule with name already exists |
| not_initialized | mind | mind.db not initialized |

---

## POST /mind/rules/delete

Delete a custom rule.

### Request

```typescript
interface DeleteParams {
  name: string  // Required, rule to delete
}
```

### Response (Success)

```typescript
interface DeleteResult {
  deleted: true
  name: string
}
```

### Errors

| Code | Field | Condition |
|------|-------|-----------|
| required | name | Name not provided |
| not_found | name | No rule with that name |
| protected | name | Cannot delete built-in rule |
| not_initialized | mind | mind.db not initialized |

---

## GET /mind/rules/get

Get a single rule by name.

### Request

```typescript
interface GetParams {
  name: string  // Required
}
```

### Response (Success)

```typescript
interface Rule {
  name: string
  description: string
  body: string
  builtin: boolean
}
```

### Errors

| Code | Field | Condition |
|------|-------|-----------|
| required | name | Name not provided |
| not_found | name | No rule with that name |
| not_initialized | mind | mind.db not initialized |

---

## GET /mind/rules/list

List all rules (built-in and custom).

### Request

```typescript
interface ListParams {
  // No parameters - returns all rules
}
```

### Response (Success)

```typescript
interface ListResult {
  rules: Rule[]
  count: number
}

interface Rule {
  name: string
  description: string
  builtin: boolean
  // Note: body not included in list for brevity
}
```

### Errors

| Code | Field | Condition |
|------|-------|-----------|
| not_initialized | mind | mind.db not initialized |

---

## POST /mind/rules/query

Execute a rule and return matching concepts.

### Request

```typescript
interface QueryParams {
  name: string  // Required, rule to execute
}
```

### Response (Success)

```typescript
interface QueryResult {
  rule: string
  matches: ConceptMatch[]
  count: number
}

interface ConceptMatch {
  id: number
  name: string
}
```

### Errors

| Code | Field | Condition |
|------|-------|-----------|
| required | name | Name not provided |
| not_found | name | No rule with that name |
| query_error | rule | Rule execution failed |
| not_initialized | mind | mind.db not initialized |

---

## Built-in Rules

These rules are automatically available after `mind/init`:

### cycles

Detects circular dependencies via DEPENDS_ON edges.

```typescript
// Query
{ "name": "cycles" }

// Result example
{
  "rule": "cycles",
  "matches": [
    { "id": 1, "name": "AuthService" },
    { "id": 2, "name": "UserService" },
    { "id": 3, "name": "SessionService" }
  ],
  "count": 3
}
```

### orphans

Detects concepts with no edges (disconnected from graph).

```typescript
// Query
{ "name": "orphans" }

// Result example
{
  "rule": "orphans",
  "matches": [
    { "id": 42, "name": "DeprecatedHelper" }
  ],
  "count": 1
}
```
