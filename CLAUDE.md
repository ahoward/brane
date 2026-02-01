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
- `./.specify/memory/constitution.md` - Project principles (6 core rules)
- `./dna/technical/development-loop.md` - Antagonistic Testing process
- `./ai/MEMORY.md` - AI's long-term memory
- `./specs/` - Feature specifications (created by /speckit.specify)

## Development Process: Antagonistic Testing

**See:** `./dna/technical/development-loop.md` and `.specify/memory/constitution.md`

1. Design interface → 2. Design tests (Claude) → 3. Review tests (Gemini)
4. Implement → 5. Loop until green → 6. **⛔ HUMAN CHECKPOINT** (only if stuck)

**Gemini** = antagonist agent. Reviews tests, finds blind spots.
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
5. Review tests with Gemini (antagonist)
6. Implement via `/speckit.implement`
7. If stuck (tests won't pass) → Human checkpoint
8. On completion → Update ROADMAP.md, mark feature complete

## Don't

- Use classes for data
- Throw exceptions for control flow
- Return different shapes from handlers
- Skip the Result envelope
- Implement without tests
- Skip Gemini review
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

## Recent Changes
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
