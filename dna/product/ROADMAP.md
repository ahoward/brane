# Brane Roadmap

**Driving Document** — All development flows from this roadmap.

## How This Works

```
ROADMAP.md (this file)
    ↓ pick "Next" item
specs/{NN-feature}/spec.md      ← /speckit.specify → PR for human review
    ↓ approved
specs/{NN-feature}/plan.md      ← /speckit.plan
specs/{NN-feature}/tasks.md     ← /speckit.tasks
    ↓
Gemini review                   ← Antagonistic test review (tc tests)
    ↓
Implementation                  ← /speckit.implement
    ↓
If stuck → Human checkpoint     ← Cannot make tests pass
    ↓
✅ Complete → Update ROADMAP.md
```

**Human Checkpoints:**
1. **Before work begins** — Review spec PR, salt to taste
2. **If stuck** — Tests cannot pass after good-faith effort

---

## Current: MVP Sprint

**Goal:** Complete core CLI functionality before any service/infrastructure work.

### Next

- [ ] `033-prune` — `brane prune` command to clean orphaned concepts/edges from mind.db when source files are deleted or re-extracted
- [ ] `032-corpus` — Organized test/sample material in `corpus/prose/` and `corpus/code/` for development and examples
- [ ] `028-verifier-node` — Headless verification node
- [ ] `029-protocol-spec` — CTX token integration spec

---

## Completed

*Features move here when done.*

| Feature | PR | Date |
|---------|-----|------|
| `031-multi-lens` | #31 | 2026-02-18 |
| `030-ingest` | — | 2026-02-10 |
| `027-graph-explore` | — | 2026-02-03 |
| `026-context-vector` | #29 | 2026-02-01 |
| `025-lens-config` | #28 | 2026-02-01 |
| `024-prose-support` | — | 2026-01-31 |
| `023-cli-dx` | — | 2026-01-30 |
| `022-whitebox-scripts` | — | 2026-01-30 |
| `021-vector-search` | #26 | 2026-01-30 |
| `019-pr-verify` | #23 | 2026-01-29 |
| `018-annotate` | #22 | 2026-01-28 |
| `017-verify-check` | #21 | 2026-01-28 |
| `016-rules-define` | #20 | 2026-01-28 |
| `tc-refactor` | — | 2026-01-28 |
| `015-context-query` | #18 | 2026-01-28 |
| `014-calabi-scan` | #17 | 2026-01-28 |
| `013-calabi-extract` | #16 | 2026-01-28 |
| `012-mind-provenance` | #15 | 2026-01-28 |
| `011-mind-edges` | #14 | 2026-01-28 |
| `010-mind-concepts` | #11 | 2026-01-27 |
| `009-mind-init` | #10 | 2026-01-27 |
| `008-body-fts-search` | #9 | 2026-01-27 |
| `007-body-fts-index` | #8 | 2026-01-27 |
| `006-body-scan` | #7 | 2026-01-27 |
| `005-body-files-hash` | #6 | 2026-01-27 |
| `004-body-files-status` | #5 | 2026-01-27 |
| `003-body-files-list` | #4 | 2026-01-27 |
| `002-body-files-add` | #3 | 2026-01-27 |
| `001-body-init` | #2 | 2026-01-27 |
| `000-harness` | — | 2026-01-27 |

---

## Notes

- Feature IDs are `NNN-kebab-name` format
- Each feature gets a `specs/{NNN-feature}/` directory
- Branch names match feature IDs
- Never skip a feature without updating this roadmap
- Phase transitions require all prior features complete
- **Phase 2 complete!** — Mind and Calabi extraction now operational
- **tc refactor complete!** — Hybrid TypeScript + shell test infrastructure with hooks and default runner
- **Phase 3 complete!** — Logic enforcement and governance now operational
- **021-vector-search complete!** — Semantic concept search with local embeddings (fastembed-js)
- **024-prose-support complete!** — Freeform concept types and edge relations for prose/creative use
- **025-lens-config complete!** — Shareable ontology configs with usage tracking and blessing workflow
- **026-context-vector complete!** — Semantic search for context queries with hybrid mode
- **027-graph-explore complete!** — CLI graph visualization with summary, neighbors, viz (ASCII/Mermaid)
- **030-ingest complete!** — Unified `brane ingest` (scan + extract in one step), Gemini-reviewed, 290 tests
- **031-multi-lens complete!** — Named lenses as independent knowledge graphs, state.db, security hardened, README rewrite, 321 tests
