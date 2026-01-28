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

## Current: Phase 2 — The Mind

**Goal:** Connect `mind.db` (CozoDB) and the Calabi extraction engine.

### Next

- [ ] `011-mind-edges` — CRUD for edges (relationships between concepts)

### Backlog (Phase 2)
- [ ] `012-mind-provenance` — Link concepts to body files
- [ ] `013-calabi-extract` — LLM extraction: file → concepts + edges
- [ ] `014-calabi-scan` — Scan dirty files, extract to mind.db
- [ ] `015-context-query` — Vector search + graph expansion for context retrieval

---

## Phase 3 — The Shield

**Goal:** Logic enforcement and governance.

*Locked until Phase 2 complete.*

### Backlog (Phase 3)

- [ ] `016-rules-define` — Define Datalog rules (cycles, orphans, etc.)
- [ ] `017-verify-check` — Run rules against mind.db, report violations
- [ ] `018-annotate` — Manual annotations with infinite authority
- [ ] `019-pr-verify` — Simulate PR changes and verify against rules

---

## Phase 4 — The Network

**Goal:** Decentralized verification protocol.

*Locked until Phase 3 complete.*

### Backlog (Phase 4)

- [ ] `020-verifier-node` — Headless verification node
- [ ] `021-protocol-spec` — CTX token integration spec

---

## Completed

*Features move here when done.*

| Feature | PR | Date |
|---------|-----|------|
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
