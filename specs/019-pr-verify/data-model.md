# Data Model: PR Verify

**Feature**: 019-pr-verify
**Date**: 2026-01-28

## Overview

PR Verify does not introduce new database entities. It composes existing data:

- **body.db**: `files` table (existing) - provides tracked file state
- **mind.db**: `rules` relation (existing) - provides rule definitions
- **mind.db**: `concepts`, `edges` relations (existing) - rule execution targets

## Entities Used (Read-Only)

### From body.db

```sql
-- Existing table, not modified
CREATE TABLE files (
  id    INTEGER PRIMARY KEY,
  url   TEXT UNIQUE NOT NULL,
  hash  TEXT NOT NULL,
  size  INTEGER NOT NULL,
  mtime INTEGER NOT NULL
)
```

### From mind.db (CozoDB)

```datalog
-- Existing relations, not modified
:create rules { name: String, description: String, body: String, builtin: Bool }
:create concepts { id: Int, name: String, type: String }
:create edges { id: Int, source: Int, target: Int, relation: String, weight: Float }
```

## Output Types (TypeScript)

```typescript
// File change information (matches /body/files/status output)
interface ChangedFiles {
  modified: {
    url:      string
    old_hash: string
    new_hash: string
  }[]
  deleted: {
    url: string
  }[]
  new: {
    path: string
  }[]
  summary: {
    modified: number
    deleted:  number
    new:      number
    clean:    boolean
  }
}

// Rule violation (matches /mind/verify output)
interface Violation {
  id:   number
  name: string
}

// Single rule result (matches /mind/verify output)
interface RuleResult {
  name:       string
  passed:     boolean
  violations: Violation[]
  error:      string | null
}

// Verification summary (matches /mind/verify output)
interface VerificationSummary {
  rules_passed:     number
  rules_failed:     number
  total_violations: number
}

// Complete verification result
interface Verification {
  summary: VerificationSummary
  rules:   RuleResult[]
}

// PR Verify result (combined)
interface PrVerifyResult {
  passed:       boolean
  changes:      ChangedFiles
  verification: Verification | null  // null when dry_run
  dry_run?:     boolean
}
```

## Schema Changes

None required. This feature is read-only composition of existing data.
