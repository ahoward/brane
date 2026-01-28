# Quickstart: Manual Annotations

**Feature**: 018-annotate

## Prerequisites

```bash
# Initialize brane and mind
brane /body/init '{}'
brane /mind/init '{}'

# Create a concept to annotate
brane /mind/concepts/create '{"name": "Auth", "type": "Entity"}'
# Returns: {"id": 1, "name": "Auth", "type": "Entity"}
```

## Basic Usage

### Create an Annotation

```bash
# Add a caveat (default type)
brane /mind/annotations/create '{
  "target": 1,
  "text": "Do not touch - legacy authentication system scheduled for Q3 replacement"
}'

# Response:
{
  "status": "success",
  "result": {
    "id": 1,
    "target": 1,
    "text": "Do not touch - legacy authentication system scheduled for Q3 replacement",
    "type": "caveat",
    "authority": "infinity",
    "created_at": "2026-01-28T12:00:00.000Z"
  }
}
```

### Specify Annotation Type

```bash
# Create a note
brane /mind/annotations/create '{
  "target": 1,
  "text": "Refactored in Q2 2026 - see design doc in /docs/auth-redesign.md",
  "type": "note"
}'

# Create a todo
brane /mind/annotations/create '{
  "target": 1,
  "text": "Add unit tests before Q3 migration",
  "type": "todo"
}'
```

### List Annotations

```bash
# List all annotations
brane /mind/annotations/list '{}'

# Response:
{
  "status": "success",
  "result": {
    "annotations": [
      {
        "id": 3,
        "target": 1,
        "text": "Add unit tests before Q3 migration",
        "type": "todo",
        "authority": "infinity",
        "created_at": "2026-01-28T12:02:00.000Z"
      },
      {
        "id": 2,
        "target": 1,
        "text": "Refactored in Q2 2026...",
        "type": "note",
        "authority": "infinity",
        "created_at": "2026-01-28T12:01:00.000Z"
      },
      {
        "id": 1,
        "target": 1,
        "text": "Do not touch...",
        "type": "caveat",
        "authority": "infinity",
        "created_at": "2026-01-28T12:00:00.000Z"
      }
    ],
    "count": 3
  }
}
```

### Filter Annotations

```bash
# Filter by target concept
brane /mind/annotations/list '{"target": 1}'

# Filter by type
brane /mind/annotations/list '{"type": "caveat"}'

# Combine filters
brane /mind/annotations/list '{"target": 1, "type": "todo"}'
```

### Get Specific Annotation

```bash
brane /mind/annotations/get '{"id": 1}'

# Response:
{
  "status": "success",
  "result": {
    "id": 1,
    "target": 1,
    "text": "Do not touch - legacy authentication system...",
    "type": "caveat",
    "authority": "infinity",
    "created_at": "2026-01-28T12:00:00.000Z"
  }
}
```

### Delete Annotation

```bash
brane /mind/annotations/delete '{"id": 3}'

# Response:
{
  "status": "success",
  "result": {
    "deleted": true,
    "id": 3
  }
}
```

## Common Patterns

### Mark Component as Frozen

```bash
# Create concept
brane /mind/concepts/create '{"name": "PaymentProcessor", "type": "Entity"}'
# id: 2

# Add caveat
brane /mind/annotations/create '{
  "target": 2,
  "text": "FROZEN - PCI compliance audit in progress. No changes until 2026-03-01.",
  "type": "caveat"
}'
```

### Document Technical Debt

```bash
# Add todo for tech debt
brane /mind/annotations/create '{
  "target": 2,
  "text": "TODO: Replace synchronous payment calls with async queue",
  "type": "todo"
}'
```

### Leave Architecture Notes

```bash
# Add explanatory note
brane /mind/annotations/create '{
  "target": 2,
  "text": "Uses Strategy pattern for payment providers. Add new providers in /src/payments/providers/",
  "type": "note"
}'
```

## Error Handling

### Concept Not Found

```bash
brane /mind/annotations/create '{"target": 999, "text": "test"}'

# Response:
{
  "status": "error",
  "result": null,
  "errors": {
    "target": [{
      "code": "not_found",
      "message": "concept not found"
    }]
  }
}
```

### Text Too Long

```bash
# Text over 4096 characters
brane /mind/annotations/create '{"target": 1, "text": "..."}'  # 5000 chars

# Response:
{
  "status": "error",
  "result": null,
  "errors": {
    "text": [{
      "code": "invalid",
      "message": "text must be 4096 characters or less"
    }]
  }
}
```

### Invalid Type

```bash
brane /mind/annotations/create '{"target": 1, "text": "test", "type": "invalid"}'

# Response:
{
  "status": "error",
  "result": null,
  "errors": {
    "type": [{
      "code": "invalid",
      "message": "type must be one of: caveat, note, todo"
    }]
  }
}
```

## Integration with Verify

Annotations with `authority: "infinity"` signal to automated tools that human judgment takes precedence. When `/mind/verify` runs rules:

1. Rules can query annotations to understand human-declared constraints
2. LLM scans (future) will see annotations and respect them
3. Annotations persist even if verification fails - they're human intent

```bash
# Example: Check for caveats on a concept before modifying
brane /mind/annotations/list '{"target": 1, "type": "caveat"}'

# If caveats exist, think twice before automated changes!
```
