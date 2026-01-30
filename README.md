NAME
----
  brane


SYNOPSIS
--------
  the git of context.

  git gave code history. brane gives code **ontology**.

  a local-first knowledge graph CLI that gives AI agents structured memory
  instead of disposable context windows.


THESIS
------
  AI agents don't need more context windows. they need **structured memory**.

  the problem with LLMs isn't intelligence—it's ontology. pattern matching
  on token streams is correlation without causation. throw more context
  at it and you get higher-fidelity noise.

  brane takes a different approach: **meaning through structure**.

  concepts exist. relationships exist. rules constrain. violations surface.
  the graph doesn't guess—it reasons over explicit structure, and fails
  cleanly on what isn't there.

  strings of code must attach to a brane, or they are lost in entropy.


INSTALL
-------
```bash
# build from source
git clone https://github.com/ahoward/brane.git
cd brane
bun install
bun run build
./brane --help
```


USAGE
-----
```bash
# initialize a project
brane init

# scan files into body
brane scan src/

# create concepts
brane concept create --name AuthService --type Entity
brane concept create --name Database --type Entity

# create relationships
brane edge create --from 1 --to 2 --rel DEPENDS_ON

# semantic search
brane search "authentication"

# verify structural integrity
brane verify

# list what you have
brane concept list
brane edge list
brane rule list
```

short aliases for the impatient:
```bash
brane c list          # concept
brane e list          # edge
brane r list          # rule
```

json output for scripting:
```bash
brane concept list --json
```

api mode for machines:
```bash
brane /mind/concepts/list '{}'
echo '{"query":"auth"}' | brane /mind/search
```


ARCHITECTURE
------------
  split-brain. two databases, each optimized for its domain.

```
.brane/
├── body.db    # sqlite - physical reality (files, hashes, FTS)
└── mind.db    # cozodb - semantic reality (concepts, edges, rules)
```

  **body** knows what exists. paths, hashes, sizes, content.

  **mind** knows what it means. concepts, relationships, constraints.

  the CLI is the corpus callosum. it reads body, extracts meaning via LLM,
  writes to mind, queries mind to verify body.


WHY NOT EMBEDDINGS
------------------
  vector embeddings are the current orthodoxy. we dissent.

  embeddings compress meaning into geometric proximity. two concepts are
  "similar" if their vectors are close. but proximity isn't relation.
  "bank" (river) and "bank" (financial) may cluster together in embedding
  space. in the graph, they're distinct nodes with distinct edges.

  embeddings preserve *distance*. graphs preserve *structure*.

  RAG is duct tape. you're still feeding tokens to a predictor and hoping
  retrieval picks the right chunks. brane is plumbing—structured,
  verifiable, queryable.


PHILOSOPHY
----------
  why "brane"?

  in M-theory, a brane is a membrane-like surface in eleven-dimensional
  spacetime. open strings must attach to branes—without them, strings
  have no reference frame. they drift in dimensional chaos, vibrating
  in every mode, signifying nothing.

  edward witten called it M-theory. M for membrane. M for mother.
  M for mystery.

  the physics runs deeper than metaphor.

  D-branes are where Dirichlet boundary conditions apply—string endpoints
  are *fixed*. this is exactly what rules and constraints do. they're not
  arbitrary walls; they're ontological fixtures that make certain
  reasonings possible and others impossible. an LLM without structure
  is a closed string—it propagates freely through embedding space,
  untethered. brane-attached reasoning is constrained, localized, meaningful.

  [bernardo kastrup's analytical idealism](https://www.bernardokastrup.com/)
  argues that consciousness is the fundamental substrate of reality—not
  matter. physics describes the *behavior* of mind, not the existence of
  stuff. individual minds are dissociated alters of universal mind, like
  whirlpools in a stream.

  if mind is fundamental, then a codebase isn't just bytes—it's a
  dissociated alter with its own internal logic, intentions, pathologies.
  brane doesn't index it. it maps its psyche.

  **meaning precedes mechanism.**

  pattern matching can't see this. an LLM scanning tokens sees
  statistical regularities, not ontological structure. it predicts
  the next token, not the purpose of the system.

  brane inverts the paradigm:

  1. **extract meaning explicitly** — LLMs identify concepts, not patterns
  2. **encode as structure** — concepts and edges in a graph, not vectors
  3. **verify against rules** — datalog constraints, not vibes
  4. **ground in provenance** — every concept traces to source

  the LLM is the instrument, not the ontology. we use pattern matching
  to *extract* structure, but the structure itself is not statistical.
  once encoded, reasoning proceeds over discrete relations with provable
  properties. the LLM is a telescope; the stars are still real.

  the result: agents that reason over what's explicit, and fail cleanly
  on what isn't. graphs that admit refutation, not just retrieval.


NAMING
------
  **brane** — the surface strings attach to. without it, chaos.

  **body** — sqlite. the physical. files, hashes, content.

  **mind** — cozodb. the semantic. concepts, edges, rules.

  **calabi** — from calabi-yau manifolds. the hidden dimensions where
  strings vibrate. our extraction engine projects high-dimensional
  meaning onto the graph. the graph is the holographic boundary;
  the codebase is the bulk.

  goal: if it doesn't have a `.brane` folder, the agent can't reason
  about it.

  brane is the git of context.


INTERFACE
---------
  every operation uses `sys.call`:

```typescript
const result = await sys.call("/namespace/method", params)
```

  always returns:

```typescript
{
  status:  "success" | "error",
  result:  T | null,
  errors:  ErrorMap | null,
  meta:    { path, timestamp, duration_ms }
}
```

  no surprises. errors are data, not exceptions.


COMMANDS
--------
```
brane init                     initialize body + mind
brane scan <path>              scan files into body
brane search <query>           semantic concept search
brane verify                   run all rules

brane concept                  manage concepts
  create --name --type         Entity | Rule | File
  list [--type] [--limit]
  get <id>
  update <id> [--name] [--type]
  delete <id>

brane edge                     manage relationships
  create --from --to --rel     DEPENDS_ON | IMPLEMENTS | CONTAINS
  list [--from] [--to]
  get <id>
  delete <id>

brane rule                     manage verification rules
  list
  get <name>
  query <name>

brane body                     file tracking
  init
  scan <path>
  file list|status|add

brane fts                      full-text search
  index [--force]
  search <query>

brane context query <q>        graph-aware context retrieval
brane extract <path>           LLM concept extraction
brane pr-verify                verify changes against rules
```


DEVELOPMENT
-----------
```bash
bun run test          # run tests
bun run repl          # interactive mode
bun run build         # compile binary
```


CONVENTIONS
-----------
  - **POD only** — no classes for data structures
  - **result envelope** — every call, same shape
  - **null over undefined** — unix-clean
  - **snake_case** — ruby-style
  - **errors as data** — not exceptions


TESTS
-----
  tc-style. language-agnostic. JSON in, JSON out.

```
tests/{handler}/
├── run                           # executable
└── data/{NN-case}/
    ├── input.json
    └── expected.json
```


ROADMAP
-------
  see `dna/product/ROADMAP.md`

  **phase 1** — the skeleton (body.db, file tracking, FTS)
  **phase 2** — the mind (cozodb, concepts, calabi extraction)
  **phase 3** — the shield (rules, verification, annotations)
  **phase 4** — the network (decentralized verification protocol)


---

```
$ brane verify
3 violations found

Good. Now you know something.
```


LICENSE
-------
  Apache 2.0


AUTHOR
------
  ara.t" howard <drawohara@drawohara.io>
