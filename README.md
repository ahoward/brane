# brane

deterministic subjective memory for AI agents.

a local-first knowledge graph exposed via MCP. your agent remembers, learns, and reasons across sessions — no cloud, no API keys, no data leaving your machine.

```
agent ↔ MCP ↔ brane (body + mind)
                ├── body.db  (what exists: files, hashes)
                └── mind.db  (what it means: concepts, edges, episodes)
```

## quick start

### install

```bash
# curl
curl -fsSL https://raw.githubusercontent.com/ahoward/brane/main/scripts/install.sh | bash

# or build from source
git clone https://github.com/ahoward/brane.git && cd brane
bun install && bun run build
export PATH="$PWD/bin:$PATH"
```

### connect to Claude Code

```bash
# Add to ~/.claude/settings.json
cat <<'JSON'
{
  "mcpServers": {
    "brane": {
      "command": "brane",
      "args": ["mcp"]
    }
  }
}
JSON
```

### connect to Cursor

Settings → MCP Servers → Add:
```json
{
  "mcpServers": {
    "brane": {
      "command": "brane",
      "args": ["mcp"]
    }
  }
}
```

### use it

Your agent now has these tools:

| tool | what it does |
|------|-------------|
| `remember` | Store a memory (auto-tagged: decision, preference, fact, event, lesson, caveat) |
| `recall` | Search memories by meaning |
| `learn` | Ingest files into the knowledge graph (AST + LLM extraction) |
| `ask` | Query the knowledge graph with natural language |
| `reflect` | Summarize what brane knows |
| `relate` | Create relationships between concepts |
| `search` | Semantic vector search over concepts |
| `ingest_sessions` | Learn from Claude Code session logs |
| `consolidate` | Merge similar episodes into knowledge |
| `decay` | Score memories by relevance, prune stale ones |
| `forget` | Remove a specific memory |

The agent uses them automatically. No prompting required — brane exposes MCP prompts that teach the agent when to remember, recall, learn, and reflect.

## what makes brane different

| | brane | Mem0 | Letta | Zep | Anthropic MCP memory |
|---|---|---|---|---|---|
| **runs where** | local binary | cloud API | cloud/local | cloud API | local |
| **data stays** | on your machine | their servers | depends | their servers | on your machine |
| **storage** | knowledge graph (CozoDB) | vector DB | vector + relational | vector + graph | file-based |
| **provenance** | full (file → concept → edge) | none | partial | partial | none |
| **verification** | Datalog rules | none | none | none | none |
| **multi-agent** | per-agent lenses | shared | shared | shared | per-project |
| **auto-tagging** | yes (6 types) | no | no | no | no |
| **code extraction** | AST + LLM + adversarial | LLM only | LLM only | LLM only | none |
| **offline** | yes | no | depends | no | yes |
| **cost** | free (local embeddings) | per-API-call | per-API-call | per-API-call | free |

## how it works

### episodic memory (remember / recall)

Agents store observations as episodes with auto-detected type tags:

```
agent → "We decided to use PostgreSQL for the new service"
brane → stored as episode, auto-tagged: [decision]

agent → recall("database choice")
brane → [decision] "We decided to use PostgreSQL..." (similarity: 0.89)
```

### semantic knowledge (learn / ask)

Ingest files to build a knowledge graph:

```
brane learn ./src/
  → AST parse (tree-sitter)
  → sentinel generation (mandatory concepts)
  → LLM extraction (guided by lens)
  → adversarial re-extraction (missed sentinels)
  → coverage check

brane ask "how does authentication work?"
  → [AuthService] (score: 0.91)
  →   AuthService --DEPENDS_ON--> JwtTokenValidator
  →   AuthService --CALLS--> UserRepository
```

### verification (rules)

Datalog rules check structural properties:

```datalog
unguarded_minor_data[id, name] :=
  *concepts[id, name, 'Service', _],
  *edges[_, id, data_id, 'PROCESSES', _],
  *concepts[data_id, _, 'ProtectedData', _],
  *edges[_, id, ext_id, 'CALLS', _],
  *concepts[ext_id, _, 'ExternalService', _],
  not *edges[_, id, _, 'VERIFIED_BY', _]
```

### passive ingestion

Brane can learn from Claude Code session logs — extracting conversation turns and storing them as tagged episodic memories:

```
brane ingest_sessions
  → parses JSONL session logs
  → extracts human↔assistant exchanges
  → auto-tags and stores as episodes
  → tracks ingested sessions (no duplicates)
```

## architecture

split-brain. two databases.

```
.brane/
├── state.db                     # brane-wide config (active lens)
└── lens/
    ├── default/
    │   ├── body.db              # sqlite — files, hashes, FTS
    │   └── mind.db              # cozodb — concepts, edges, rules, episodes
    └── my-project/
        ├── body.db
        └── mind.db
```

**body** knows what exists. **mind** knows what it means. the CLI is the corpus callosum.

### lenses

different domains get different knowledge graphs:

```bash
brane lens create my-project
brane lens use my-project
brane ingest src/
```

agents get auto-isolated lenses via MCP (per `clientInfo.name`).

## cli

```
brane init                     initialize body + mind
brane ingest <path>            scan + extract + graph
brane search <query>           semantic concept search
brane verify                   run all rules
brane prune                    remove orphans
brane mcp                      start MCP server (stdio)
brane --version                print version

brane concept list|get|create|update|delete
brane edge list|get|create|delete
brane rule list|get|query
brane graph summary|neighbors|viz
brane lens create|use|list|show|delete
brane context query <q>
brane pr-verify
```

api mode: `echo '{"query":"auth"}' | brane /mind/search`

## stack

- **runtime:** [bun](https://bun.sh) — typescript
- **body:** bun:sqlite (WAL mode)
- **mind:** CozoDB (Datalog + vector search)
- **AST:** web-tree-sitter + tree-sitter-wasms
- **embeddings:** model2vec (pure TypeScript, local, no GPU)
- **LLM:** optional. shells out to CLI tools. no SDKs.
- **binary:** single file. zero runtime deps. works offline.

## safety

- **rate limiting:** circuit breaker for LLM-backed tools (configurable)
- **agent isolation:** per-agent lenses prevent cross-contamination
- **cost control:** `BRANE_LLM_RATE_LIMIT`, `BRANE_MAX_FILES_PER_LEARN` env vars
- **force override:** CLI only — agents cannot bypass circuit breakers via MCP
- **advisory locking:** prevents concurrent writes from multiple MCP servers

## development

```bash
bun install
bun run test:tc       # 349 tests
bun run build         # compile binary
bun run repl          # interactive mode
```

## more

- [dna/product/ROADMAP.md](dna/product/ROADMAP.md) — what's next
- [dna/product/vision-spec-machine.md](dna/product/vision-spec-machine.md) — where this is going: brane as the regenerative specification substrate
- [dna/product/prd.md](dna/product/prd.md) — full PRD
- [.specify/memory/constitution.md](.specify/memory/constitution.md) — project principles

---

```
$ brane verify
3 violations found

Good. Now you know something.
```

## references

- [MCP Specification](https://modelcontextprotocol.io)
- [IC Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community)
- [COPPA](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)

## license

Apache 2.0

## author

ara.t" howard <drawohara@drawohara.io>
