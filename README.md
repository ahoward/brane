# brane

the subjective linter. deterministic subjective bias.

encode your values as a knowledge graph. verify code and prose against them. fail the build when they're violated.

```
values (human)  →  knowledge graph  →  violations  →  human review
```

every linter has bias. brane makes the bias explicit, auditable, and deterministic.

## tl;dr

```bash
brane init
brane ingest src/
brane verify
```

that's it. ingest extracts structure. verify checks rules. three commands.

```
$ brane verify

✗ unguarded_minor_data
  LocationTracker processes MinorUserData and calls AdNetworkAPI
  — no consent verification in the pipeline.
  Provenance: src/tracking/location.ts

✗ unbalanced_framing
  Claim "AI Monitoring improves public safety" references
  SurveillanceTechnology but has no ACKNOWLEDGES edge to
  civil liberties concerns.
  Provenance: drafts/ai-safety-post.md

2 violations found
```

## what this is

- **not a syntax checker.** a semantic checker. meaning, not form.
- **not objective.** subjective by design. your values, your rules, your graph.
- **not a cloud service.** single binary. `.brane/` in your repo. works offline.

## how it works

extract meaning from files into a knowledge graph. run Datalog rules against it.

extraction shells out to any LLM CLI you have (claude, gemini, llama). no SDK, no API keys in brane. no LLM? manual curation works too.

a rule is 3-6 lines of Datalog:

```datalog
unguarded_minor_data[id, name] :=
  *concepts[id, name, 'Service', _],
  *edges[_, id, data_id, 'PROCESSES', _],
  *concepts[data_id, _, 'ProtectedData', _],
  *edges[_, id, ext_id, 'CALLS', _],
  *concepts[ext_id, _, 'ExternalService', _],
  not *edges[_, id, _, 'VERIFIED_BY', _]
```

this isn't grep. grep finds strings. brane finds structural violations across relationships. you can't grep for what isn't there.

## what it catches

| content | extract | verify |
|---------|---------|--------|
| source code | services, data flows, APIs | safety, architecture, access control |
| prose / content | claims, entities, framing | brand alignment, ethical guidelines |
| policy docs | rights, obligations, processes | completeness, consistency |
| AI/ML systems | models, datasets, decisions | bias, consent, human oversight |
| LLM output | claims, agents, incentives | adversarial robustness, accuracy |

## lenses

different domains have different values. lenses are independent knowledge graphs.

```bash
brane lens create child-safety
brane lens use child-safety
brane ingest src/
brane verify

brane lens create content-ethics
brane lens use content-ethics
brane ingest drafts/
brane verify
```

| lens | domain | checks |
|------|--------|--------|
| `child-safety` | COPPA / minor protection | data collection, consent, age gating |
| `content-ethics` | editorial guidelines | framing, balance, accuracy |
| `adversarial` | LLM output robustness | unchallenged claims, missing counterparties |
| `ethics-ic` | Intelligence Community | human oversight, bias assessment |
| `ethics-gdpr` | EU Data Protection | legal basis, data minimization |
| `arch-clean` | software architecture | dependency rules, layer violations |
| `security-owasp` | application security | injection, access control |

## ci/cd

```yaml
- name: Verify values alignment
  run: |
    brane ingest src/
    brane verify --exit-code
```

## architecture

split-brain. two databases.

```
.brane/
├── state.db                     # brane-wide config (active lens)
└── lens/
    ├── default/
    │   ├── body.db              # sqlite — files, hashes, FTS
    │   └── mind.db              # cozodb — concepts, edges, rules
    └── child-safety/
        ├── body.db
        └── mind.db
```

**body** knows what exists. **mind** knows what it means. the CLI is the corpus callosum.

## stack

- **runtime:** [bun](https://bun.sh) — typescript
- **body:** bun:sqlite (WAL mode)
- **mind:** CozoDB (Datalog + vector)
- **embeddings:** model2vec (pure TypeScript, no ONNX, no GPU)
- **LLM:** optional. shells out to CLI tools. no SDKs.
- **binary:** ~85 MB. zero runtime deps. works offline.

## quick start

```bash
git clone https://github.com/ahoward/brane.git
cd brane
bun install
bun run build
export PATH="$PWD/bin:$PATH"
brane --help
```

## commands

```
brane init                     initialize body + mind
brane ingest <path>            scan files + extract knowledge
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
  summary | concepts | edges | neighbors | viz

brane lens                     manage lenses
  create <name> | use <name> | list | show [name] | delete <name>

brane context query <q>        graph-aware context retrieval
brane pr-verify                verify PR changes against rules
```

short aliases: `brane c list`, `brane e list`, `brane r list`, `brane g viz`

api mode: `echo '{"query":"auth"}' | brane /mind/search`

## development

```bash
bun run test          # 321 tests
bun run repl          # interactive mode
bun run build         # compile binary
```

## more

- [dna/product/ROADMAP.md](dna/product/ROADMAP.md) — what's next
- [dna/product/prd.md](dna/product/prd.md) — full PRD
- [.specify/memory/constitution.md](.specify/memory/constitution.md) — project principles

---

```
$ brane verify
3 violations found

Good. Now you know something.
```

## references

- [IC Principles of AI Ethics](https://www.intel.gov/principles-of-artificial-intelligence-ethics-for-the-intelligence-community)
- [ICD-505: Artificial Intelligence](https://www.dni.gov/files/documents/ICD/ICD-505-Artificial-Intelligence.pdf)
- [NSM-25 AI Framework](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2024/10/24/fact-sheet-biden-harris-administration-outlines-coordinated-approach-to-harness-power-of-ai-for-u-s-national-security/)
- [COPPA](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
- [Experts Have World Models. LLMs Have Word Models.](https://www.latent.space/p/adversarial-reasoning)

## license

Apache 2.0

## author

ara.t" howard <drawohara@drawohara.io>
