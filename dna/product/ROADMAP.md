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

## Current: Agent Memory Layer

**Goal:** Transform brane into a deterministic subjective memory layer for AI agents, exposed via MCP.

### Next — Agent Memory Critical Path

- [x] `035-mcp-remember-recall` — MCP tools: remember and recall for episodic memory ([#35](https://github.com/ahoward/brane/issues/35))
- [x] `036-mcp-learn-ask-reflect` — MCP tools: learn, ask, reflect for knowledge graph ([#36](https://github.com/ahoward/brane/issues/36))
- [x] `037-agent-id-tracking` — Tag concepts, edges, episodes with creator agent ([#37](https://github.com/ahoward/brane/issues/37))
- [x] `038-episode-consolidation` — Distill episodes into semantic knowledge ([#38](https://github.com/ahoward/brane/issues/38))
- [x] `039-intelligent-decay` — Automatic memory pruning by recency and relevance ([#39](https://github.com/ahoward/brane/issues/39))

### Next — MCP & Integration

- [x] `040-multi-agent-isolation` — Per-agent knowledge spaces via lens isolation ([#40](https://github.com/ahoward/brane/issues/40))
- [x] `041-mcp-resources` — Expose concepts, episodes, graph as MCP resources ([#41](https://github.com/ahoward/brane/issues/41))
- [x] `042-mcp-prompts` — Pre-built reasoning templates for agents ([#42](https://github.com/ahoward/brane/issues/42))
- [x] `044-integration-tests` — Brane MCP with Claude Code end-to-end ([#44](https://github.com/ahoward/brane/issues/44))
- [x] `046-temporal-queries` — Time-range filtering across all memory types ([#46](https://github.com/ahoward/brane/issues/46))

### Next — Infrastructure & Safety

- [x] `048-concurrency` — Database locking strategy for multi-process MCP ([#48](https://github.com/ahoward/brane/issues/48))
- [x] `050-context-truncation` — Max payload size on MCP tool responses ([#50](https://github.com/ahoward/brane/issues/50))
- [x] `051-cost-control` — Circuit breaker for LLM-backed tools ([#51](https://github.com/ahoward/brane/issues/51))

### Next — Polish & Distribution

- [x] `043-binary-distribution` — Standalone installable (homebrew, curl) ([#43](https://github.com/ahoward/brane/issues/43))
- [ ] `045-documentation` — Brane as agent memory layer (README, examples) ([#45](https://github.com/ahoward/brane/issues/45))
- [x] `052-passive-ingestion` — Learn from Claude Code session logs ([#52](https://github.com/ahoward/brane/issues/52))
- [x] `054-self-reinforcing-retrieval` — Batch-update access metadata on search ([#54](https://github.com/ahoward/brane/issues/54))
- [x] `055-richer-episode-types` — Decision, preference, fact, event tags ([#55](https://github.com/ahoward/brane/issues/55))

### Deferred

- [ ] `028-verifier-node` — Headless verification node
- [ ] `029-protocol-spec` — CTX token integration spec

---

## Completed

*Features move here when done.*

| Feature | PR | Date |
|---------|-----|------|
| `043-binary-distribution` | #74 | 2026-03-26 |
| `052-passive-ingestion` | #73 | 2026-03-26 |
| `054-self-reinforcing-retrieval` | #72 | 2026-03-26 |
| `055-richer-episode-types` | #71 | 2026-03-26 |
| `051-cost-control` | #70 | 2026-03-26 |
| `050-context-truncation` | #69 | 2026-03-26 |
| `048-concurrency` | #68 | 2026-03-26 |
| `046-temporal-queries` | #67 | 2026-03-26 |
| `042-mcp-prompts` | #65 | 2026-03-26 |
| `041-mcp-resources` | #64 | 2026-03-26 |
| `040-multi-agent-isolation` | #63 | 2026-03-26 |
| `039-intelligent-decay` | #62 | 2026-03-26 |
| `038-episode-consolidation` | #61 | 2026-03-26 |
| `037-agent-id-tracking` | #60 | 2026-03-26 |
| `036-mcp-learn-ask-reflect` | #59 | 2026-03-26 |
| `035-mcp-remember-recall` | #58 | 2026-03-26 |
| `034-episodic-memory` | #57 | 2026-03-26 |
| `053-fuzzy-dedup` | #55 | 2026-03-26 |
| `049-schema-migrations` | #56 | 2026-03-26 |
| `034-extraction-pipeline` | #32 | 2026-03-06 |
| `032-corpus` | — | 2026-03-05 |
| `033-prune` | — | 2026-03-05 |
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
- **033-prune complete!** — `brane prune` removes orphaned concepts/edges/provenance, Gemini-reviewed safety fix, 328 tests
- **032-corpus complete!** — Adversarial test material: surveillance, dark patterns, COPPA violations, alignment-washing
- **049-schema-migrations complete!** — Versioned mind.db upgrades with backup/restore, Gemini-reviewed
- **053-fuzzy-dedup complete!** — Length-scaled Levenshtein prevents false matches on short concept names
