# API Contract: /mind/verify

**Feature**: 017-verify-check
**Date**: 2026-01-28

## Endpoint

`/mind/verify`

## Description

Run all or selected rules against the knowledge graph and return a verification report.

## Request

### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| rules | string[] | No | [] | Rule names to run. Empty = all rules |

### Examples

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

**Run single rule:**
```json
{
  "rules": ["cycles"]
}
```

## Response

### Success (no violations)

```json
{
  "status": "success",
  "result": {
    "passed": true,
    "summary": {
      "rules_passed": 2,
      "rules_failed": 0,
      "total_violations": 0
    },
    "rules": [
      {
        "name": "cycles",
        "passed": true,
        "violations": [],
        "error": null
      },
      {
        "name": "orphans",
        "passed": true,
        "violations": [],
        "error": null
      }
    ]
  },
  "errors": null,
  "meta": {
    "path": "/mind/verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 150.5
  }
}
```

### Success (with violations)

```json
{
  "status": "success",
  "result": {
    "passed": false,
    "summary": {
      "rules_passed": 1,
      "rules_failed": 1,
      "total_violations": 3
    },
    "rules": [
      {
        "name": "cycles",
        "passed": false,
        "violations": [
          {"id": 1, "name": "AuthService"},
          {"id": 2, "name": "UserService"},
          {"id": 3, "name": "SessionService"}
        ],
        "error": null
      },
      {
        "name": "orphans",
        "passed": true,
        "violations": [],
        "error": null
      }
    ]
  },
  "errors": null,
  "meta": {
    "path": "/mind/verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 250.3
  }
}
```

### Success (rule execution error)

When a custom rule has a runtime error, it's reported but doesn't stop other rules.

```json
{
  "status": "success",
  "result": {
    "passed": false,
    "summary": {
      "rules_passed": 1,
      "rules_failed": 1,
      "total_violations": 0
    },
    "rules": [
      {
        "name": "cycles",
        "passed": true,
        "violations": [],
        "error": null
      },
      {
        "name": "bad_custom_rule",
        "passed": false,
        "violations": [],
        "error": "Datalog execution error: undefined relation 'foo'"
      }
    ]
  },
  "errors": null,
  "meta": {
    "path": "/mind/verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 100.2
  }
}
```

### Success (no rules defined)

```json
{
  "status": "success",
  "result": {
    "passed": true,
    "summary": {
      "rules_passed": 0,
      "rules_failed": 0,
      "total_violations": 0
    },
    "rules": []
  },
  "errors": null,
  "meta": {
    "path": "/mind/verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 10.5
  }
}
```

### Error: Mind not initialized

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "mind": [
      {
        "code": "not_initialized",
        "message": "mind not initialized (run brane mind init)"
      }
    ]
  },
  "meta": {
    "path": "/mind/verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 1.2
  }
}
```

### Error: Rule not found

When a specific rule is requested but doesn't exist.

```json
{
  "status": "error",
  "result": null,
  "errors": {
    "rules": [
      {
        "code": "not_found",
        "message": "rule not found: nonexistent_rule"
      }
    ]
  },
  "meta": {
    "path": "/mind/verify",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "duration_ms": 5.3
  }
}
```

## Exit Codes

| Condition | Exit Code |
|-----------|-----------|
| No violations (passed: true) | 0 |
| Violations found (passed: false) | 1 |
| Error (status: "error") | 1 |

## Test Cases

| ID | Scenario | Input | Expected |
|----|----------|-------|----------|
| 00 | No violations | Graph with no cycles/orphans | passed: true, rules_failed: 0 |
| 01 | With violations | Graph with cycle | passed: false, violations listed |
| 02 | Specific rules | {"rules": ["cycles"]} | Only cycles rule executed |
| 03 | No rules defined | Empty rules table | passed: true, rules: [] |
| 04 | Not initialized | No mind.db | error: not_initialized |
| 05 | Rule not found | {"rules": ["nonexistent"]} | error: not_found |
| 06 | Rule execution error | Bad custom rule | error in rule result, others continue |
