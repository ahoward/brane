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

## Current: Phase 3.5 — The Brain

**Goal:** Real AI-powered extraction and semantic search.

### Next

- [ ] `020-llm-extract` — Real LLM-powered concept extraction (replace stub)

### Backlog (Phase 3.5)

- [ ] `021-vector-search` — Vector embeddings and semantic search
- [ ] `022-config` — .brane/config.json support (API keys, model selection)

---

## Deferred: Phase 4 — The Network

**Goal:** Distributed verification and protocol.

*Deferred until core functionality is solid.*

- [ ] `023-verifier-node` — Headless verification node
- [ ] `024-protocol-spec` — CTX token integration spec

---

## Completed

*Features move here when done.*

| Feature | PR | Date |
|---------|-----|------|
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
