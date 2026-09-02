# Brane - Claude Code Context

## What This Is

Brane is the "Semantic Nervous System" for software projects - a local-first Knowledge Graph CLI using a Split-Brain Architecture (SQLite Body + CozoDB Mind).

## Core Architecture: sys.call

All operations use a single, consistent interface:

```typescript
const result = await sys.call("/namespace/method", data)
```

**Always returns:**
```typescript
{
  status: "success" | "error",
  result: T | null,
  errors: ErrorMap | null,  // mirrors result structure
  meta: { path, timestamp, duration_ms }
}
```

## Key Files

- `./dna/product/ROADMAP.md` - **START HERE** — Driving task list for all development
- `./dna/product/prd.md` - Full PRD (Split-Brain architecture)
- `./dna/product/vision-spec-machine.md` - **Vision v4.0** — brane as the regenerative specification substrate (#112)
- `./.specify/memory/constitution.md` - Project principles (6 core rules)
- `./dna/technical/development-loop.md` - Antagonistic Testing process
- `./ai/MEMORY.md` - AI's long-term memory
- `./specs/` - Feature specifications (created by /speckit.specify)

## Development Process: Antagonistic Testing

**See:** `./dna/technical/development-loop.md` and `.specify/memory/constitution.md`

1. Design interface → 2. Design tests (Claude) → 3. Review tests (Fable)
4. Implement → 5. Loop until green → 6. **⛔ HUMAN CHECKPOINT** (only if stuck)

**Fable** = antagonist agent. Reviews tests, finds blind spots. Run as a subagent
(Agent tool, `model: fable`), not an external CLI.
Human checkpoint is for failure resolution, not pre-approval.

## Coding Conventions Summary

1. **POD only** - Plain Old Data in/out, no classes for data
2. **Result envelope** - Every call returns same shape
3. **Error mirror** - Errors mirror result structure with arrays at leaves
4. **Guard early** - Return errors at function top
5. **Handlers by path** - `src/handlers/body/files/hash.ts` → `/body/files/hash`
6. **tc tests** - Language-agnostic JSON in/out

## Commands

```bash
bun run repl          # Start REPL
bun test              # Run tc tests
```

## Directory Structure

```
src/
├── index.ts          # entry
├── repl.ts           # REPL
├── sys.ts            # sys.call implementation
├── handlers/         # by path: /body/files/hash → handlers/body/files/hash.ts
└── lib/              # shared utilities
tests/                # tc test suites
specs/                # feature specs (from /speckit.specify)
dna/                  # project knowledge
ai/                   # AI agent resources
.specify/             # spec-kit templates and memory
```

## Workflow: Picking Up Work

1. Read `dna/product/ROADMAP.md` — find "Next" item
2. Run `/speckit.specify` — creates `specs/{feature}/spec.md`
3. Open PR for human review
4. After approval: `/speckit.plan` → `/speckit.tasks`
5. Review tests with Fable (antagonist)
6. Implement via `/speckit.implement`
7. If stuck (tests won't pass) → Human checkpoint
8. On completion → Update ROADMAP.md, mark feature complete

## Don't

- Use classes for data
- Throw exceptions for control flow
- Return different shapes from handlers
- Skip the Result envelope
- Implement without tests
- Skip the antagonist review
- Change tests after review without human approval

## Active Technologies
- TypeScript (Bun 1.x) + CozoDB (Datalog), existing mind.ts utilities (016-rules-define)
- CozoDB mind.db (new `rules` relation) (016-rules-define)
- TypeScript (Bun runtime) + CozoDB (mind.db), existing `/mind/rules/*` handlers from 016-rules-define (017-verify-check)
- mind.db (CozoDB with RocksDB backend) (017-verify-check)
- TypeScript (Bun runtime) + CozoDB (cozo-node), existing mind.ts utilities (018-annotate)
- CozoDB `.brane/mind.db` (RocksDB backend) (018-annotate)
- TypeScript 5.x (Bun runtime) + bun:sqlite, cozo-node (existing) (019-pr-verify)
- SQLite (body.db), CozoDB (mind.db) - both existing (019-pr-verify)
- TypeScript (Bun runtime) + fastembed-js (ONNX-based local embeddings), CozoDB (HNSW vector index) (021-vector-search)
- Bash (POSIX-compatible where possible) + Brane CLI (compiled binary), standard Unix utilities (echo, cat, mkdir, rm, mktemp) (022-whitebox-scripts)
- N/A (scripts create temporary directories) (022-whitebox-scripts)
- TypeScript 5.x (Bun 1.x runtime) + CozoDB (cozo-node), citty (CLI), js-yaml (YAML parsing) (025-lens-config)
- CozoDB mind.db (RocksDB backend) - new relations for lens data (025-lens-config)
- TypeScript 5.x (Bun 1.x runtime) + cozo-node (CozoDB), fastembed-js (embeddings), existing mind.ts utilities (026-context-vector)
- CozoDB mind.db (RocksDB backend) - existing `concepts:semantic` HNSW index (026-context-vector)
- TypeScript 5.x (Bun 1.x runtime) + citty (CLI), CozoDB (cozo-node), existing mind.ts utilities (027-graph-explore)
- CozoDB mind.db (RocksDB backend) - no schema changes required (027-graph-explore)
- TypeScript 5.x (Bun 1.x runtime) + CozoDB (cozo-node), bun:sqlite, citty (CLI), existing mind.ts/body.ts utilities (030-ingest)
- SQLite body.db (file tracking), CozoDB mind.db (knowledge graph) — both existing (030-ingest)
- TypeScript 5.x (Bun 1.x runtime) + cozo-node (CozoDB), bun:sqlite, citty (CLI), js-yaml (YAML parsing) — all existing (031-multi-lens)
- SQLite `.brane/state.db` (new, brane-wide config); SQLite `.brane/lens/{name}/body.db` (per-lens file tracking); CozoDB `.brane/lens/{name}/mind.db` (per-lens knowledge graph) (031-multi-lens)
- TypeScript 5.x (Bun 1.x runtime) + cozo-node (CozoDB), bun:sqlite, citty (CLI), existing mind.ts/body.ts/state.ts utilities (033-prune)
- SQLite `.brane/lens/{name}/body.db` (file tracking), CozoDB `.brane/lens/{name}/mind.db` (knowledge graph) — both existing (033-prune)
- TypeScript 5.x (Bun 1.x runtime) + tree-sitter (web-tree-sitter WASM), existing cozo-node, bun:sqlite, citty CLI, existing LLM CLI shell-out (034-extraction-pipeline)
- CozoDB mind.db (existing concepts/edges/provenance), SQLite body.db (existing files) (034-extraction-pipeline)
- TypeScript 5.x (Bun 1.x runtime) + cozo-node (CozoDB with RocksDB backend), existing mind.ts utilities (049-schema-migrations)
- CozoDB mind.db (RocksDB backend) — schema_meta relation for version tracking (049-schema-migrations)
- TypeScript 5.x (Bun 1.x runtime) + cozo-node (CozoDB with RocksDB backend), existing mind.ts/embed.ts utilities, migrate.ts (from #49) (034-episodic-memory)
- CozoDB mind.db (RocksDB backend) — new `episodes` relation + HNSW index (034-episodic-memory)

## Recent Changes
- 067-claim-authority: First-class claims carrying authority tier + source; contradiction representable as data (#113). Schema v1.13.0, 8 sys.call paths, `contradictions` built-in rule, `brane claim` / `brane authority` CLI
- 021-vector-search: Added semantic search via `/mind/search` endpoint with local embeddings (fastembed-js BGESmallEN, 384 dims)
- 016-rules-define: Added TypeScript (Bun 1.x) + CozoDB (Datalog), existing mind.ts utilities

## Vector Search (021-vector-search)

Concepts now support semantic similarity search via vector embeddings:

- **Schema v1.5.0**: concepts relation includes `vector: <F32; 384>?` field
- **HNSW Index**: `concepts:semantic` for fast approximate nearest neighbor search
- **Auto-embedding**: concepts get embeddings automatically on create/update
- **Local-first**: fastembed-js (ONNX) runs locally, no API calls needed
- **Mock mode**: `BRANE_EMBED_MOCK=1` for deterministic test vectors

### Key Files
- `src/lib/embed.ts` - Embedding generation (fastembed-js wrapper)
- `src/handlers/mind/search.ts` - `/mind/search` endpoint
- `src/handlers/mind/init.ts` - Schema v1.5.0 with HNSW index

### Usage
```bash
# Create concepts (auto-generates embeddings)
echo '{"name": "AuthService", "type": "Entity"}' | bun run src/cli.ts /mind/concepts/create

# Search for similar concepts
echo '{"query": "authentication", "limit": 5}' | bun run src/cli.ts /mind/search
```

### Search Response
```json
{
  "status": "success",
  "result": {
    "matches": [
      { "id": 1, "name": "AuthService", "type": "Entity", "score": 0.254 }
    ]
  }
}
```


## Spec Machine Reframe (#112)

**See:** `dna/product/vision-spec-machine.md` (v4.0)

Brane is being repositioned from "memory for agents" to **the regenerative specification substrate** —
the durable, queryable, provenance-backed graph that implementations are generated FROM and validated
AGAINST. The existing graph, provenance, Datalog rules, lenses, and extraction pipeline are ~70% of it.

Four gaps close the rest:

| Gap | Feature | Issue | Status |
|---|---|---|---|
| Claim + authority model (contradiction as data) | `067-claim-authority` | [#113](https://github.com/ahoward/brane/issues/113) | ✅ Done (PR #117) |
| Observation → requirement promotion gate | `068-promotion-gate` | [#114](https://github.com/ahoward/brane/issues/114) | Next — #113 is done, so it is unblocked |
| Regeneration → test → feedback (**keystone**) | `069-regeneration-spike` | [#115](https://github.com/ahoward/brane/issues/115) | Unblocked; not started |
| Production-as-teacher ingestion | `070-production-teacher` | [#116](https://github.com/ahoward/brane/issues/116) | Unblocked; not started |

Two principles govern the claim work and should be preserved by anything built on it:

1. **Strict about authority, loose about vocabulary.** Authority tiers are registered and ranked;
   predicates and assertions are never validated against a vocabulary.
2. **Contradiction is data, not a defect.** Competing claims coexist. Resolution is a read-time
   projection by authority rank — never a write-time deletion. Ties do not resolve.

### Claims (067-claim-authority)

```bash
brane claim create --concept 1 --predicate refund_window \
  --assertion "30 days" --authority product --source dna/product/prd.md
brane claim conflicts          # where the graph contradicts itself
brane claim list --concept 1 --resolve   # one answer, losers still stored
brane authority list           # observation < implementation < product < legal < manual
brane verify --rule contradictions
```

Invariants anything built on claims must preserve:

- Authority tiers are registered and ranked (**strict**); predicates and assertions are never
  validated against a vocabulary (**loose**).
- Rank is joined at read time; claims store the tier *name* only, so re-ranking never rewrites history.
- Resolution is a read-time projection. Ties at the top rank do **not** resolve.
- Claims are immutable — correction is delete + re-assert.
- `cascade_claims()` in `src/lib/claims.ts` is the single deletion seam. Every path that removes a
  concept or edge (delete handlers, `prune`, re-extraction) calls it.
- The `contradictions` rule body positionally matches the 8-column `claims` relation. Adding a column
  (#114's binding flag) means updating that body in the same migration.

**Cozo gotcha:** string literals use backslash escapes, not SQL doubling. Use `esc_cozo()` from
`src/lib/mind.ts`. `'it''s'` is a parse error.
