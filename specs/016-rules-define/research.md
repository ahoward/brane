# Research: Define Datalog Rules

**Feature**: 016-rules-define
**Date**: 2026-01-28

## 1. CozoDB Datalog Syntax for Cycle Detection

### Decision
Use CozoDB's native recursive rule syntax with transitive closure.

### Datalog Implementation

```datalog
# Reachability: can we get from X to Y following DEPENDS_ON edges?
reachable[x, y] := *edges[_, x, y, 'DEPENDS_ON', _]
reachable[x, y] := *edges[_, x, z, 'DEPENDS_ON', _], reachable[z, y]

# Cycle: a node is in a cycle if it can reach itself
cycles[id, name] := *concepts[id, name, _], reachable[id, id]
```

### Rationale
- CozoDB supports recursive rules natively (Datalog's strength)
- Transitive closure is computed efficiently by the Datalog engine
- No need for custom graph traversal code
- This is exactly what Datalog was designed for

### Alternatives Considered
1. **Iterative BFS/DFS in TypeScript**: Rejected - reinvents what Datalog does better
2. **SQL recursive CTEs**: Rejected - CozoDB is already our graph DB, use its strengths

---

## 2. CozoDB Datalog Syntax for Orphan Detection

### Decision
Use negation to find concepts with no edges.

### Datalog Implementation

```datalog
# Orphan: concept has no outgoing AND no incoming edges
orphans[id, name] := *concepts[id, name, _],
                     not *edges[_, id, _, _, _],
                     not *edges[_, _, id, _, _]
```

### Rationale
- Simple set difference operation
- CozoDB supports stratified negation (`not`)
- Single pass over data

### Alternatives Considered
1. **LEFT JOIN with NULL check**: Possible but less readable
2. **Count-based approach**: More complex, same result

---

## 3. Rule Storage Schema

### Decision
Store rules in a new `rules` relation in mind.db.

### Schema

```datalog
:create rules {
  name: String,
  description: String,
  body: String,
  builtin: Bool default false
}
```

### Rationale
- `name` is the primary key (unique identifier)
- `description` for human-readable explanation
- `body` contains the actual Datalog query
- `builtin` flag distinguishes system rules from user rules

### Built-in Rules (seeded on init)
1. `cycles` - "Detects circular dependencies via DEPENDS_ON edges"
2. `orphans` - "Detects concepts with no edges (disconnected)"

---

## 4. Syntax Validation Approach

### Decision
Validate by attempting a dry-run parse with CozoDB.

### Implementation

```typescript
async function validate_rule_syntax(db: CozoDb, body: string): Promise<boolean> {
  try {
    // Explain query validates syntax without executing
    await db.run(`::explain { ${body} }`)
    return true
  } catch {
    return false
  }
}
```

### Rationale
- CozoDB's `::explain` parses the query without executing
- Returns syntax errors if invalid
- No side effects, safe for validation

### Alternatives Considered
1. **Regex-based validation**: Rejected - can't catch semantic errors
2. **Execute then rollback**: Rejected - unnecessary overhead

---

## 5. Query Execution and Result Format

### Decision
Execute rule body and join with concepts to get names.

### Implementation Pattern

```typescript
// For stored rule with body: "cycles[id, name] := ..."
// Execute directly and return results
const result = await db.run(rule.body)
// Result rows are already [id, name] tuples
```

### Result Format

```json
{
  "status": "success",
  "result": {
    "rule": "cycles",
    "matches": [
      { "id": 1, "name": "AuthService" },
      { "id": 2, "name": "UserService" }
    ],
    "count": 2
  }
}
```

### Rationale
- Rule body already defines output columns
- Keep it simple - return what the rule returns
- Include count for quick summary

---

## 6. Built-in Rule Initialization

### Decision
Seed built-in rules when mind.db is initialized (or on first access if missing).

### Implementation
Add to `mind/init.ts`:

```typescript
const BUILTIN_RULES = [
  {
    name: "cycles",
    description: "Detects circular dependencies via DEPENDS_ON edges",
    body: `cycles[id, name] := *concepts[id, name, _], reachable[id, id]
           reachable[x, y] := *edges[_, x, y, 'DEPENDS_ON', _]
           reachable[x, y] := *edges[_, x, z, 'DEPENDS_ON', _], reachable[z, y]`,
    builtin: true
  },
  {
    name: "orphans",
    description: "Detects concepts with no edges (disconnected)",
    body: `orphans[id, name] := *concepts[id, name, _],
                               not *edges[_, id, _, _, _],
                               not *edges[_, _, id, _, _]`,
    builtin: true
  }
]
```

### Rationale
- Built-in rules are always available
- Initialization is idempotent (check if exists first)
- Schema version bump to 1.2.0 for `rules` relation

---

## 7. Migration Strategy

### Decision
Add `rules` relation in schema version 1.2.0. Existing mind.db databases will need re-init or migration.

### Implementation
1. Check schema version on open
2. If < 1.2.0 and rules relation missing, create it
3. Seed built-in rules if not present

### Rationale
- Backward compatible - old databases get upgraded
- No data loss - concepts, edges, provenance unchanged
- Automatic migration on first access

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Cycle detection | Recursive Datalog with transitive closure |
| Orphan detection | Negation-based Datalog query |
| Rule storage | New `rules` relation (name, description, body, builtin) |
| Syntax validation | CozoDB `::explain` for dry-run parse |
| Result format | Rule name + matches array + count |
| Built-in init | Seed on mind/init, idempotent |
| Migration | Auto-upgrade schema on access |
