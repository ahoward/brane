# Data Model: Verify Check

**Feature**: 017-verify-check
**Date**: 2026-01-28

## Overview

This feature does not add new persistent data. It composes existing data from the `rules` relation to produce verification results.

## Entities

### VerifyResult (Output Only)

The complete output of running verification. Not persisted—returned directly.

| Field | Type | Description |
|-------|------|-------------|
| passed | boolean | True if all rules passed (no violations) |
| summary | Summary | Aggregate statistics |
| rules | RuleResult[] | Per-rule breakdown |

### Summary (Embedded)

Aggregate statistics for quick assessment.

| Field | Type | Description |
|-------|------|-------------|
| rules_passed | number | Count of rules with no violations |
| rules_failed | number | Count of rules with violations or errors |
| total_violations | number | Sum of all violations across all rules |

### RuleResult (Embedded)

Result of executing a single rule.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Rule name (e.g., "cycles", "orphans") |
| passed | boolean | True if no violations and no error |
| violations | Violation[] | Concepts matching the rule |
| error | string \| null | Error message if rule execution failed |

### Violation (Embedded)

A concept that matched a rule's criteria.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Concept ID |
| name | string | Concept name |

## Existing Entities Used

### Rule (from 016-rules-define)

| Field | Type | Description |
|-------|------|-------------|
| name | string | Primary key |
| description | string | Human-readable description |
| body | string | Datalog query body |
| builtin | boolean | True for cycles/orphans |

## Relationships

```
VerifyResult
    └── Summary (1:1, embedded)
    └── RuleResult[] (1:N, embedded)
            └── Violation[] (1:N, embedded)
                    └── Concept (reference by id/name)
```

## No Schema Changes

This feature does not modify the mind.db schema. It reads from the existing `rules` and `concepts` relations.
