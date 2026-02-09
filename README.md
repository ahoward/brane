NAME
----
  brane


TL;DR
-----
  brane is a local knowledge graph that finds structural problems in
  code **and** prose. model anything as concepts + edges. define rules.
  `brane verify`.

### code: catch a circular dependency

  ```bash
  brane init

  # model your services
  brane concept create --name AuthService --type Service
  brane concept create --name UserService --type Service

  # AuthService depends on UserService
  brane edge create --from AuthService --to UserService --rel DEPENDS_ON

  brane verify   # ✓ all rules passed

  # 6 months later, someone adds the reverse dependency
  brane edge create --from UserService --to AuthService --rel DEPENDS_ON

  brane verify   # ✗ FAILED: cycles: AuthService, UserService
  ```

  `cycles` is a built-in rule — 3 lines of Datalog. not a 500-line
  ESLint plugin.

### prose: catch a dangling character

  ```bash
  brane init

  # model a murder mystery
  brane concept create --name "Detective Marsh" --type Character
  brane concept create --name "Lord Ashworth" --type Character
  brane concept create --name "The Butler" --type Character
  brane concept create --name "The Murder" --type Event

  # wire up the story
  brane edge create --from "Lord Ashworth" --to "The Murder" --rel VICTIM_OF
  brane edge create --from "Detective Marsh" --to "The Murder" --rel INVESTIGATES
  brane edge create --from "The Butler" --to "The Murder" --rel SUSPECT_IN

  brane verify   # ✓ all rules passed

  # 50 pages later, you introduce a new character but forget her scene
  brane concept create --name "Lady Ashworth" --type Character

  brane verify   # ✗ FAILED: orphans: Lady Ashworth
  ```

  Lady Ashworth exists in your cast but connects to nothing — no
  event, no location, no other character. is she a red herring you
  forgot to set up, or a character you forgot to write?

  a human can't hold 200 pages in their head. the graph can.

  **[runnable scripts: code](examples/code/) | [prose](examples/prose/)**


SYNOPSIS
--------
  the subjective linter.

  every linter encodes values. ESLint says "semicolons matter." security
  scanners say "CVEs matter." but they can't answer "does this align with
  *our* values?"

  brane checks alignment with human-defined values—ethics, policy,
  architecture, intent—encoded as a knowledge graph with verifiable rules.

  **the git of ethics.**


THESIS
------
  AI ethics documents are PDFs that get filed and ignored.

  ICD-505. GDPR. Acceptable Use Policies. The NSM-25 AI Framework. They're
  read once and forgotten. When code ships, nobody checks it against the
  ethics PDF. When an LLM generates content, nobody verifies it against
  policy. When an AI makes decisions, the audit trail is logs, not reasoning.

  **ethics without enforcement is theater.**

  brane makes values machine-readable:

  ```
  values (human)  →  knowledge graph  →  violations  →  human review
  ```

  encode your values as concepts, edges, and rules. run `brane verify`.
  get specific, auditable, actionable results. not checkbox compliance.


EXAMPLE: IC AI ETHICS
---------------------
  the Intelligence Community's six AI ethics principles become Datalog rules:

  ```datalog
  -- Principle 4: Human-Centered
  -- Automated decisions on rights need human review
  violations[id, name, 'missing_human_loop'] :=
    *concepts[id, name, 'AutomatedDecision', _],
    *edges[_, id, right_id, 'IMPACTS', _],
    *concepts[right_id, _, 'ConstitutionalRight', _],
    not *edges[_, id, _, 'REQUIRES_HUMAN_REVIEW', _]
  ```

  now `brane verify` checks content against ethics—not vibes.


INSTALL
-------
  requires [bun](https://bun.sh). [direnv](https://direnv.net) optional.

```bash
git clone https://github.com/ahoward/brane.git
cd brane
bun install
bun run build
direnv allow        # adds ./bin to PATH
brane --help
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
brane concept create --name UserData --type ProtectedRight

# create relationships (by name, not ID)
brane edge create --from AuthService --to UserData --rel AFFECTS

# verify against rules
brane verify

# semantic search
brane search "authentication"

# visualize the graph
brane graph viz
brane graph viz --format mermaid
```

short aliases:
```bash
brane c list          # concept
brane e list          # edge
brane r list          # rule
brane g viz           # graph
```

json output for scripting:
```bash
brane concept list --json
```

api mode for machines:
```bash
echo '{"query":"auth"}' | brane /mind/search
```


LENSES
------
  different domains have different values. **lenses** are shareable ontology
  configurations that encode domain-specific concept types, relations, and rules.

  ```yaml
  # ethics-ic.lens.yaml
  name: "IC AI Ethics Framework"
  source: "ICD-505 / NSM-25"

  concept_types:
    - Action
    - Decision
    - AutomatedDecision
    - ProtectedRight

  rules:
    - name: human_loop_required
      severity: error
      principle: "4. Human-Centered"
  ```

  the idea: organizations publish, share, and compose lenses.

  | Lens | Domain | Status |
  |------|--------|--------|
  | `default` | general-purpose (ships with brane) | available |
  | `ethics-ic` | Intelligence Community | planned |
  | `ethics-gdpr` | EU Data Protection | planned |
  | `arch-clean` | Clean Architecture | planned |
  | `security-owasp` | OWASP Top 10 | planned |


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

  the CLI is the corpus callosum. it reads body, extracts meaning,
  writes to mind, queries mind to verify body.


WHY LOCAL-FIRST
---------------
  knowledge graphs are having a moment. [obie fernandez built one in four
  days](https://obie.medium.com/what-used-to-take-months-now-takes-days-cc8883cc21e9)
  — an organizational memory system that distills Slack threads and Claude
  Code transcripts into queryable knowledge. it's genuinely impressive work.

  it also requires Rails, Postgres, Oxigraph (a SPARQL triple store),
  pgvector, OpenRouter API keys, a Docker container managed by Overmind,
  and a Render deployment. to remember what happened in Slack.

  brane takes the opposite approach:

  | | nexus (fernandez) | brane |
  |---|---|---|
  | **graph engine** | Oxigraph (SPARQL) | CozoDB (Datalog) |
  | **vector store** | Postgres + pgvector | built-in (model2vec, pure TS) |
  | **LLM dependency** | OpenRouter (required) | none (optional extraction) |
  | **deployment** | Docker + Render | single binary, zero deps |
  | **query language** | SPARQL via LLM translation | Datalog (3-line rules) |
  | **data location** | cloud postgres | `.brane/` in your repo |
  | **works offline** | no | yes |
  | **binary size** | N/A (server) | ~85 MB |

  nexus is a *memory service* — it watches your conversations and builds
  a graph in the cloud. brane is a *structural tool* — it lives in your
  repo and catches architectural violations before they ship. same idea
  (knowledge graphs are useful), different philosophy (your graph should
  be as portable as your code).

  you don't need a Render account to know that AuthService depends on
  UserService. you need a `.brane/` directory and three seconds.


MULTI-MODAL
-----------
  brane is content-agnostic. the graph doesn't care what you model:

  | Content | Extract | Verify |
  |---------|---------|--------|
  | source code | functions, data flows | architecture, security |
  | prose / fiction | characters, events | continuity, structure |
  | policy docs | entities, actions | completeness, consistency |
  | research | theories, evidence | contradictions, gaps |


PHILOSOPHY
----------
  in physics, a brane is where boundary conditions apply — string
  endpoints are fixed. without branes, strings drift in dimensional
  chaos. rules and constraints do the same thing for reasoning.

  traditional linters are *syntactic* — they check form.
  brane is *semantic* — it checks meaning.

  but meaning is subjective. "good code" depends on context. "ethical AI"
  depends on values. "compliant" depends on jurisdiction.

  brane doesn't pretend objectivity. it makes subjectivity *explicit*:

  - **your values** are encoded in lenses
  - **your rules** define what violations mean
  - **your attestations** create the audit trail
  - **your provenance** links everything to source

  the subjectivity is the feature, not the bug.


COMMANDS
--------
```
brane init                     initialize body + mind
brane scan <path>              scan files into body
brane search <query>           semantic concept search
brane verify                   run all rules

brane concept                  manage concepts
  create --name --type
  list [--type]
  get <id>
  update <id>
  delete <id>

brane edge                     manage relationships
  create --from <id|name> --to <id|name> --rel <rel>
  list [--from] [--to] [--rel]
  get <id>
  delete <id>

brane rule                     manage verification rules
  list
  get <name>
  query <name>

brane graph                    explore the graph
  summary                      counts and distributions
  concepts [--type]            list concepts
  edges [--relation]           list edges
  neighbors <id|name>           show connected concepts
  viz [--format] [--center]    visualize (ascii/mermaid)

brane lens                     manage ontology configurations
  show
  stats
  bless --type|--rel
  import <file>
  export

brane context query <q>        graph-aware context retrieval
brane extract <path>           LLM concept extraction (planned)
brane pr-verify                verify PR changes against rules (planned)
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


REFERENCES
----------
  - [IC Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community)
  - [ICD-505: Artificial Intelligence](https://www.dni.gov/files/documents/ICD/ICD-505-Artificial-Intelligence.pdf)
  - [NSM-25 AI Framework](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2024/10/24/fact-sheet-biden-harris-administration-outlines-coordinated-approach-to-harness-power-of-ai-for-u-s-national-security/)


LICENSE
-------
  Apache 2.0


AUTHOR
------
  ara.t" howard <drawohara@drawohara.io>
