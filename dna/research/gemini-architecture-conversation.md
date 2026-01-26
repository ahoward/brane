# Gemini Architecture Conversation

**Source:** https://gemini.google.com/share/e6070ba982de
**Date:** January 24-26, 2026
**Model:** Gemini Pro

This document captures the research conversation that shaped the Brane architecture.

---

## Key Insights

### 1. Weighted Graph Model for Knowledge Search

The foundational insight: both nodes AND edges should have "strength" values for sorting/relevancy.

**Scoring Formula:**
```
Score = (Node_A.score × Edge.weight × Node_B.score)
```

### 2. Directional Links (Reification)

Connections themselves are concepts. Use a star topology:

```
[Concept A] --(STARTS_AT)--> [Connection Node] --(ENDS_AT)--> [Concept B]
```

This enables:
- Metadata on edges (confidence, source, creation date)
- Hyper-connections (linking connections to other connections)
- Asymmetry (A→B strong, B→A weak)

### 3. SQLite for Graph Queries

Key insight: SQLite + Recursive CTEs can handle graph traversal efficiently.

```sql
WITH RECURSIVE traverse(current_id, path_string, depth, total_score) AS (
    -- BASE CASE
    SELECT id, '/' || name, 0, inherent_score
    FROM concepts WHERE id = ?

    UNION ALL

    -- RECURSIVE STEP
    SELECT e.target_id, t.path_string || '/' || c.name, t.depth + 1,
           t.total_score * e.strength * c.inherent_score * r_type.inherent_score
    FROM edges e
    JOIN traverse t ON e.source_id = t.current_id
    JOIN concepts c ON e.target_id = c.id
    JOIN concepts r_type ON e.type_id = r_type.id
    WHERE t.depth < 3
)
SELECT current_id, path_string, total_score
FROM traverse ORDER BY total_score DESC;
```

### 4. Ontological Fingerprints

Documents get a "signature" - a weighted edge list representing their semantic structure:

```json
[
  { "s": 101, "t": 505, "r": 88, "w": 1.0 },
  { "s": 505, "t": 999, "r": 12, "w": 0.8 }
]
```

This enables **structural matching** - finding documents with similar *relationships* not just similar *words*.

### 5. The Split-Brain Architecture

**The Body (SQLite):** Physical reality - files, hashes, FTS.
**The Mind (CozoDB):** Semantic reality - concepts, relationships, inference.

Why two databases:
- SQLite excels at flat lookups, hashing, FTS5
- CozoDB (Datalog) excels at recursive logic and inference
- They link via `provenance` (concept_id ↔ file_id)

### 6. CozoDB Advantages

Datalog vs SQL for graph queries:

```sql
-- SQLite: Complex recursive CTE
WITH RECURSIVE traverse(id) AS (...)
SELECT * FROM traverse WHERE ...

-- CozoDB: One line of Datalog
cycle[x] := path[x, x]
```

CozoDB also provides:
- Native vector search (HNSW)
- Time travel queries ("What did the graph look like Tuesday?")
- Built-in inference rules

### 7. The Calabi Projection

Named after Calabi-Yau manifolds (hidden dimensions in M-theory).

The process of mapping 2D text → N-dimensional graph:
1. Scanner detects file changes
2. Chunker splits by AST/headers
3. LLM extracts structured graph patches
4. Resolver normalizes concepts (deduplication)
5. Writer commits to Mind, links to Body

### 8. PR Analysis (The Immune System)

Semantic CI - checking *intent* not just *syntax*:

1. **Fork:** Create in-memory copy of mind.db
2. **Patch:** Apply PR's structural changes
3. **Reason:** Run Datalog rules (cycles, orphans, conflicts)
4. **Verdict:** Pass/fail with explanation

Checks:
- Architectural integrity (no forbidden dependencies)
- Concept rot (orphaned logic)
- Documentation debt (complexity without explanation)

### 9. Write-Back Protocol

Agents can update the graph:
- `brane update <file> --intent "..."` - resync after changes
- `brane annotate --target X --caveat "..."` - leave notes
- `brane refactor --merge "A" "B"` - rename concepts

### 10. Tri-Brid Business Model

1. **OSS (Free):** Local CLI, become the standard
2. **SaaS ($20/seat/mo):** Sync, visualization, RBAC
3. **Protocol (Token fees):** Decentralized verification for bounties

---

## Competitive Landscape

| Category | Players | Brane Differentiator |
|----------|---------|---------------------|
| Enterprise GraphRAG | Microsoft, Neo4j | Serverless, local-first |
| Agent Orchestrators | Gas Town, OpenDevin | Persistent shared memory |
| Code Search | Sourcegraph, Greptile | Read-write, not read-only |
| Agent Memory | Zep, Mem0 | Structure, not just facts |

---

## Technology Decisions

**Chosen Stack:**
- Runtime: Bun.js (speed, TypeScript native)
- Body: SQLite (ubiquity, FTS5, stability)
- Mind: CozoDB (Datalog inference, vectors, time-travel)

**Rejected:**
- KuzuDB: Archived/dead as of Oct 2025
- Pure SQLite: Recursive CTEs too painful for complex logic
- Pure CozoDB: Wrong tool for file metadata

---

*This research informed PRD v2.0*
