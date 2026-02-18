NAME
----
  brane


TL;DR
-----
  the subjective linter.

  brane turns your values — ethics, policy, safety, intent — into a
  knowledge graph that fails the build when you violate them.

  ```
  values (human)  →  knowledge graph  →  violations  →  human review
  ```

  existing linters catch syntax errors. brane catches value errors.


WHY
---
  every linter encodes values. ESLint says "semicolons matter." security
  scanners say "CVEs matter." but none of them can answer:

  **"does this align with *our* values?"**

  that question matters when the stakes aren't semicolons:

  - a children's app pipes location data to an ad network — no parental consent gate in the call chain. that's a COPPA violation. $50,000 per incident.
  - an LLM drafts a blog post that frames surveillance as safety — without acknowledging civil liberties tradeoffs. it contradicts your published editorial guidelines.
  - a recommendation engine surfaces age-restricted content to minors because nobody modeled the age-gating requirement as a structural constraint.
  - a hiring algorithm correlates with protected characteristics. the bias assessment edge is missing from the graph. EEOC exposure.

  today, these are caught by humans reading everything. or they aren't
  caught at all.

  **ethics without enforcement is theater.**

  brane makes values machine-readable. encode them once. verify forever.


CATCH IT BEFORE IT SHIPS
-------------------------
  ```bash
  brane init
  brane ingest src/
  brane verify
  ```

  that's the workflow. ingest extracts structure from your code and
  prose automatically. verify checks it against your rules. three
  commands.

  when it fails, it tells you exactly what and why:

  ```
  $ brane verify

  ✗ unguarded_minor_data
    LocationTracker processes MinorUserData
    and calls AdNetworkAPI — no consent verification in the pipeline.
    COPPA Rule 312.5 requires verifiable parental consent.
    Provenance: src/tracking/location.ts

  ✗ unbalanced_framing
    Claim "AI Monitoring improves public safety"
    references SurveillanceTechnology but has no
    ACKNOWLEDGES edge to civil liberties concerns.
    Provenance: drafts/ai-safety-post.md

  2 violations found
  ```

  a human reviewer might miss this in 50,000 lines of code.
  the graph won't.


HOW IT WORKS
------------
  brane extracts meaning from your files into a knowledge graph of
  concepts and edges. then it runs Datalog rules against that graph.

  extraction is LLM-powered — brane shells out to any CLI tool you
  have installed (claude, gemini, llama). no SDK, no API keys in
  brane itself. no LLM? manual curation works too. most workflows
  are: ingest automatically, curate the edges, verify continuously.

  a rule is 3-6 lines of Datalog:

  ```datalog
  -- services handling minor data must have consent verification
  unguarded_minor_data[id, name] :=
    *concepts[id, name, 'Service', _],
    *edges[_, id, data_id, 'PROCESSES', _],
    *concepts[data_id, _, 'ProtectedData', _],
    *edges[_, id, ext_id, 'CALLS', _],
    *concepts[ext_id, _, 'ExternalService', _],
    not *edges[_, id, _, 'VERIFIED_BY', _]
  ```

  this isn't grep. grep finds strings. brane finds structural violations
  across relationships that span your entire codebase. the
  `LocationTracker → MinorUserData → AdNetworkAPI` chain might cross
  ten files. the missing `VERIFIED_BY` edge is the absence of something
  that should exist. you can't grep for what isn't there.


EXAMPLE: PROSE THAT VIOLATES INTERNAL GUIDELINES
-------------------------------------------------
  your organization publishes ethical AI content guidelines. one rule:
  never frame surveillance as safety without acknowledging civil
  liberties tradeoffs.

  an LLM drafts a blog post. brane ingests it:

  ```bash
  brane ingest drafts/ai-safety-post.md

  brane verify   # ✗ FAILED: unbalanced_framing: "AI Monitoring System"
  ```

  the rule fired because the extracted graph has a Claim ("AI Monitoring
  System improves safety") linked to a SurveillanceTechnology concept,
  but no edge acknowledges the civil liberties dimension.

  the LLM wrote something that *sounds* reasonable. the graph caught
  that it contradicts your published values. before it shipped.


EXAMPLE: ADVERSARIAL ROBUSTNESS
-------------------------------
  [LLMs have word models, not world models.](https://www.latent.space/p/adversarial-reasoning)
  they produce artifacts that *look* expert but collapse under
  adversarial pressure.

  ```bash
  brane ingest contracts/vendor-proposal.md

  brane verify   # ✗ FAILED: unchallenged_claims: "Below-Market Pricing"
  ```

  the LLM-generated proposal claims "below-market pricing" — but
  nobody on the other side has been modeled to challenge it. their
  procurement will demand comps. their legal will scrutinize the
  methodology. the model didn't think about that — but the graph
  caught it.

  | | chess-like (code, proofs) | poker-like (negotiation, contracts) |
  |---|---|---|
  | **info** | perfect — all state visible | imperfect — hidden incentives |
  | **LLM** | excels | produces exploitable patterns |
  | **brane** | built-in rules (`cycles`, `orphans`) | adversarial lens (model the counterparty) |


CI/CD
-----
  brane fits your existing pipeline:

  ```yaml
  # .github/workflows/verify.yml
  - name: Verify values alignment
    run: |
      brane ingest src/
      brane verify --exit-code
  ```

  values violations fail the build, same as lint errors or test
  failures. catch them in PR review, not in production.


LENSES
------
  different domains have different values. **lenses** are independent
  knowledge graphs — each with its own body.db and mind.db — that encode
  domain-specific concept types, relations, and rules.

  ```bash
  brane lens create child-safety
  brane lens create content-ethics
  brane lens use child-safety

  # work in isolation — each lens has its own graph
  brane ingest src/
  brane verify

  brane lens use content-ethics
  brane ingest drafts/
  brane verify

  brane lens list
  ```

  organizations publish, share, and compose lenses:

  | Lens | Domain | Checks |
  |------|--------|--------|
  | `child-safety` | COPPA / minor protection | data collection, consent, age gating |
  | `content-ethics` | editorial guidelines | framing, balance, accuracy |
  | `adversarial` | LLM output robustness | unchallenged claims, missing counterparties |
  | `ethics-ic` | Intelligence Community | human oversight, bias assessment |
  | `ethics-gdpr` | EU Data Protection | legal basis, data minimization |
  | `arch-clean` | software architecture | dependency rules, layer violations |
  | `security-owasp` | application security | injection, access control |


MULTI-MODAL
-----------
  brane is content-agnostic. the graph doesn't care what you model:

  | Content | Extract | Verify |
  |---------|---------|--------|
  | source code | services, data flows, APIs | safety, architecture, access control |
  | prose / content | claims, entities, framing | brand alignment, ethical guidelines |
  | policy docs | rights, obligations, processes | completeness, consistency |
  | AI/ML systems | models, datasets, decisions | bias, consent, human oversight |
  | LLM output | claims, agents, incentives | adversarial robustness, accuracy |


ARCHITECTURE
------------
  split-brain. two databases, each optimized for its domain.

  ```
  .brane/
  ├── state.db                     # brane-wide config (active lens)
  └── lens/
      ├── default/
      │   ├── body.db              # sqlite — files, hashes, FTS
      │   └── mind.db              # cozodb — concepts, edges, rules
      ├── child-safety/
      │   ├── body.db
      │   └── mind.db
      └── content-ethics/
          ├── body.db
          └── mind.db
  ```

  **body** knows what exists. paths, hashes, sizes, content.

  **mind** knows what it means. concepts, relationships, constraints.

  the CLI is the corpus callosum. it reads body, extracts meaning,
  writes to mind, queries mind to verify body.


WHY LOCAL-FIRST
---------------
  your values graph should be as portable as your code.

  - **single binary, zero dependencies** — no Docker, no Postgres, no API keys
  - **works offline** — airplane, SCIF, air-gapped network
  - **data stays local** — `.brane/` lives in your repo
  - **git-native** — branch, diff, merge your knowledge graph
  - **embeds locally** — model2vec (pure TypeScript, no ONNX, no GPU)
  - **LLM-optional** — extraction uses CLI tools, not SDKs. works without any LLM.


INSTALL
-------
  requires [bun](https://bun.sh). [direnv](https://direnv.net) optional.

  ```bash
  git clone https://github.com/ahoward/brane.git
  cd brane
  bun install
  bun run build
  direnv allow                    # adds ./bin to PATH (if using direnv)
  export PATH="$PWD/bin:$PATH"   # or do this manually
  brane --help
  ```


USAGE
-----
  ```bash
  # setup
  brane init
  brane lens create my-project

  # ingest and verify
  brane ingest src/
  brane verify

  # explore
  brane search "authentication"
  brane graph viz
  brane graph neighbors AuthService

  # curate
  brane concept create --name AuthService --type Service
  brane edge create --from AuthService --to UserData --rel PROCESSES
  brane rule list

  # manage lenses
  brane lens use my-project
  brane lens list
  brane lens show
  ```

  short aliases:
  ```bash
  brane c list          # concept
  brane e list          # edge
  brane r list          # rule
  brane g viz           # graph
  ```

  api mode for machines:
  ```bash
  echo '{"query":"auth"}' | brane /mind/search
  ```


COMMANDS
--------
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
    summary                      counts and distributions
    concepts [--type]            list concepts
    edges [--relation]           list edges
    neighbors <id|name>          show connected concepts
    viz [--format] [--center]    visualize (ascii/mermaid)

  brane lens                     manage lenses
    create <name>                create a new lens
    use <name>                   switch active lens
    list                         list all lenses
    show [name]                  show lens configuration
    delete <name>                delete a lens

  brane context query <q>        graph-aware context retrieval
  brane pr-verify                verify PR changes against rules
  ```


DEVELOPMENT
-----------
  ```bash
  bun run test          # run tests (321 tests)
  bun run repl          # interactive mode
  bun run build         # compile binary
  ```


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
  - [COPPA — Children's Online Privacy Protection Act](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
  - [Experts Have World Models. LLMs Have Word Models.](https://www.latent.space/p/adversarial-reasoning)


LICENSE
-------
  Apache 2.0


AUTHOR
------
  ara.t" howard <drawohara@drawohara.io>
