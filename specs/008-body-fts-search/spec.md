# Feature Specification: body-fts-search

**Feature Branch**: `008-body-fts-search`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Full-text search across indexed files

## User Scenarios & Testing

### User Story 1 - Basic Search (Priority: P1)

A developer wants to find all files containing a specific term.
They run `brane search "TODO"` and brane returns matching files with
snippets showing the match context.

**Why this priority**: Core functionality - this is why we built the index.

**Independent Test**: Index files, search for term, verify matches returned.

**Acceptance Scenarios**:

1. **Given** indexed files containing "TODO", **When** `brane search "TODO"` is called,
   **Then** matching files are returned with context snippets.

2. **Given** no files contain search term, **When** search is called,
   **Then** empty results are returned (not an error).

3. **Given** search term appears multiple times in a file, **When** search is called,
   **Then** file appears once with relevant snippets.

---

### User Story 2 - Search with Path Filter (Priority: P2)

A developer wants to search only within a specific directory.
They run `brane search "function" --path src/` and only src/ files are searched.

**Why this priority**: Focused search is faster and reduces noise.

**Independent Test**: Index files in multiple directories, search with path filter,
verify only filtered path results returned.

**Acceptance Scenarios**:

1. **Given** files in `src/` and `tests/`, **When** `brane search "test" --path src/` is called,
   **Then** only `src/` matches are returned.

---

### User Story 3 - Search with Limit (Priority: P3)

A developer wants to limit the number of results.
They run `brane search "import" --limit 10` and get at most 10 results.

**Why this priority**: Performance and usability for common terms.

**Independent Test**: Search for common term with limit, verify result count.

**Acceptance Scenarios**:

1. **Given** many matching files, **When** `--limit 5` is used,
   **Then** at most 5 results are returned.

---

### Edge Cases

- What happens when `.brane/` is not initialized?
  → Return error with code `not_initialized`

- What happens when no files are indexed?
  → Return success with empty matches array

- What happens with empty search query?
  → Return error with code `invalid` for query

- What happens with FTS5 special syntax (AND, OR, NOT)?
  → Pass through to FTS5 - advanced users can use it

## Requirements

### Functional Requirements

- **FR-001**: System MUST search across files_fts using FTS5 MATCH
- **FR-002**: System MUST return file URL and matching snippets
- **FR-003**: System MUST support path parameter for filtered search
- **FR-004**: System MUST support limit parameter
- **FR-005**: System MUST return results ranked by relevance (FTS5 bm25)
- **FR-006**: System MUST require initialized `.brane/` directory
- **FR-007**: System MUST require non-empty query
- **FR-008**: System MUST handle FTS5 syntax errors gracefully

### Key Entities

- **SearchResult**: Search operation result
  - `matches`: Array of matching files
  - `total`: Total number of matches (before limit)

- **SearchMatch**: Single file match
  - `url`: File URL
  - `snippet`: Context snippet with match highlighted
  - `score`: Relevance score (higher = more relevant)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Search of 1000 indexed files completes in <100ms
- **SC-002**: All tc tests pass
- **SC-003**: FTS5 syntax (AND, OR, NOT) works correctly

## sys.call Interface

```typescript
// Basic search
sys.call("/body/fts/search", { query: "TODO" })

// Search with path filter
sys.call("/body/fts/search", { query: "function", path: "src/" })

// Search with limit
sys.call("/body/fts/search", { query: "import", limit: 10 })

// Advanced FTS5 syntax
sys.call("/body/fts/search", { query: "error AND NOT warning" })

// Success result
{
  status: "success",
  result: {
    matches: [
      {
        url: "file:///project/src/main.ts",
        snippet: "...found a TODO here that needs...",
        score: 1.5
      },
      {
        url: "file:///project/src/util.ts",
        snippet: "...another TODO item for later...",
        score: 1.2
      }
    ],
    total: 2
  },
  errors: null,
  meta: { path: "/body/fts/search", timestamp, duration_ms }
}

// No matches (success, not error)
{
  status: "success",
  result: {
    matches: [],
    total: 0
  },
  errors: null,
  meta: { path: "/body/fts/search", timestamp, duration_ms }
}

// Error (not initialized)
{
  status: "error",
  result: null,
  errors: {
    brane: [{ code: "not_initialized", message: "brane not initialized (run brane init)" }]
  },
  meta: { path: "/body/fts/search", timestamp, duration_ms }
}

// Error (empty query)
{
  status: "error",
  result: null,
  errors: {
    query: [{ code: "required", message: "query is required" }]
  },
  meta: { path: "/body/fts/search", timestamp, duration_ms }
}
```

## CLI Interface

```bash
# Basic search
brane search "TODO"
brane search "function definition"

# Search with path filter
brane search "test" --path src/
brane search "error" -p lib/

# Search with limit
brane search "import" --limit 10
brane search "const" -n 5

# Advanced FTS5 syntax
brane search "error AND NOT warning"
brane search "function OR method"

# Raw mode
brane call /body/fts/search '{"query": "TODO"}'
brane call /body/fts/search '{"query": "test", "path": "src/"}'
brane call /body/fts/search '{"query": "import", "limit": 10}'
```

## Implementation Notes

### FTS5 Query

```sql
SELECT
  url,
  snippet(files_fts, 1, '>>>', '<<<', '...', 32) as snippet,
  bm25(files_fts) as score
FROM files_fts
WHERE files_fts MATCH ?
ORDER BY score
LIMIT ?
```

### Snippet Format

FTS5 `snippet()` function:
- Column 1 (content)
- Highlight start: `>>>`
- Highlight end: `<<<`
- Ellipsis: `...`
- Token limit: 32

### Path Filtering

Path filtering is done after FTS5 search by filtering results where
`url LIKE 'file://{resolved_path}%'`. This leverages the index effectively
since FTS5 handles the content search.
