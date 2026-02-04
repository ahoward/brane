NAME
----
  brane


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
  values (human)
      ↓ encode as
  knowledge graph (concepts + edges + rules)
      ↓ apply to
  content (code, prose, media, decisions)
      ↓ produces
  violations (specific, auditable, actionable)
      ↓ enables
  human review (targeted, efficient)
      ↓ creates
  attestations (provenance, accountability)
  ```

  the result: **auditable compliance**, not checkbox compliance.


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
```bash
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
brane concept create --name UserData --type ProtectedRight

# create relationships
brane edge create --from 1 --to 2 --rel AFFECTS

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

  organizations can publish, share, and compose lenses:

  | Lens | Domain |
  |------|--------|
  | `ethics-ic` | Intelligence Community |
  | `ethics-gdpr` | EU Data Protection |
  | `arch-clean` | Clean Architecture |
  | `security-owasp` | OWASP Top 10 |


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


MULTI-MODAL
-----------
  brane is content-agnostic. the same pattern works for:

  | Content | Extract | Verify |
  |---------|---------|--------|
  | Source code | functions, data flows | architecture, security |
  | Policy docs | entities, actions | completeness, consistency |
  | AI model cards | training data, uses | bias assessment, documentation |
  | Decisions | inputs, reasoning | human oversight, audit trail |


PHILOSOPHY
----------
  why "brane"?

  in M-theory, a brane is a membrane-like surface in eleven-dimensional
  spacetime. open strings must attach to branes—without them, strings
  have no reference frame. they drift in dimensional chaos.

  D-branes are where boundary conditions apply—string endpoints are *fixed*.
  this is what rules and constraints do. they're not arbitrary walls; they're
  ontological fixtures that make certain reasonings possible.

  an LLM without structure is a closed string—it propagates freely through
  embedding space, untethered. brane-attached reasoning is constrained,
  localized, meaningful.

  traditional linters are *syntactic*—they check form.
  brane is *semantic*—it checks meaning.

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
  create --from --to --rel
  list [--from] [--to]
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
  neighbors <id>               show connected concepts
  viz [--format] [--center]    visualize (ascii/mermaid)

brane lens                     manage ontology configurations
  show
  import <file>
  export <file>

brane context query <q>        graph-aware context retrieval
brane extract <path>           LLM concept extraction
brane pr-verify                verify PR changes against rules
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
