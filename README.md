NAME
----
  brane


SYNOPSIS
--------
  the semantic nervous system for software projects.

  a local-first knowledge graph CLI that bridges raw code (entropy) and
  architectural intent (order) using a split-brain architecture.


THESIS
------
  AI agents don't need more context windows. they need **structured memory**.

  strings of code must attach to a brane, or they are lost in entropy.


INSTALL
-------
```bash
# clone it
git clone https://github.com/ahoward/brane.git
cd brane

# bun is required
curl -fsSL https://bun.sh/install | bash

# install deps
bun install

# run it
bun run repl
```


USAGE
-----
```bash
# repl
bun run repl

# call a handler directly
bun run cli /ping '{"echo": "hello"}'

# pipe json
echo '{"echo": "hello"}' | bun run cli /ping

# from file
bun run cli /ping @input.json

# run tests
bun run test
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


CONVENTIONS
-----------
  - **POD only** — no classes for data structures
  - **result envelope** — every call, same shape
  - **null over undefined** — unix-clean, not js-clean
  - **snake_case** — ruby-style, not camelCase
  - **params/result** — not "data" (too generic)


TESTS
-----
  tc-style. language-agnostic. JSON in, JSON out.

```
tests/{handler}/
├── run                           # executable
├── skip                          # optional skip marker
└── data/{NN-case}/
    ├── input.json
    └── expected.json
```

```bash
bun run test          # parallel (8 workers)
bun run test:s        # sequential
bun run test:v        # verbose
```


ROADMAP
-------
  see `dna/product/ROADMAP.md`

  **phase 1** — the skeleton (body.db, file tracking, FTS)

  **phase 2** — the mind (cozodb, concepts, calabi extraction)

  **phase 3** — the shield (rules, verification, annotations)

  **phase 4** — the network (decentralized verification protocol)


DEVELOPMENT
-----------
  antagonistic testing. claude designs tests, gemini challenges them.

```
ROADMAP.md → /speckit.specify → PR (you review) → approved →
/speckit.plan → /speckit.tasks → gemini review → implement →
stuck? → human checkpoint → done → update ROADMAP.md
```

  human checkpoints:
  1. before work begins (spec PR)
  2. if stuck (tests won't pass)


FILES
-----
```
src/
├── index.ts          # entry
├── repl.ts           # REPL
├── sys.ts            # sys.call implementation
├── tc.ts             # test runner
├── handlers/         # by path: /body/files → handlers/body/files.ts
└── lib/              # shared utilities

tests/                # tc test suites
specs/                # feature specifications
dna/                  # project knowledge
  ├── product/        # PRD, ROADMAP
  └── technical/      # conventions, development loop
.specify/             # spec-kit templates
  └── memory/         # constitution
```


NAMING
------
  **brane** — from M-theory. the surface strings attach to.

  **calabi** — the extraction engine. projects structure from chaos.

  if your code doesn't have a `.brane` folder, the agent can't work on it.


LICENSE
-------
  Apache 2.0


AUTHOR
------
  ara.t" howard <ara@dojo4.com>
