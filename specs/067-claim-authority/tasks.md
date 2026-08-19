---
description: "Task list for 067-claim-authority"
---

# Tasks: First-Class Claim + Authority Model

**Input**: `/specs/067-claim-authority/` — spec.md, plan.md, research.md, data-model.md, contracts/
**Issue**: [#113](https://github.com/ahoward/brane/issues/113)

**Tests**: Required and **first**. Constitution IV — tc tests are authored and Gemini-reviewed before
any implementation task, including the shared library, and locked after review.

## Format: `[ID] [P?] [Story] Description`

- **[P]** — parallelizable (different files, no dependency)
- **[Story]** — the user story from spec.md (US1…US7), or `FND` for foundational

---

## Phase 1: Test Design (BEFORE any implementation — constitution IV)

- [ ] **T001** [P] Write `tests/mind/claims/run` + `data/NN-*/{params,result}.json` covering US1–US4 and US7:
  create (success, edge subject, unregistered authority, missing subject, each missing field, free-form
  predicate accepted, over-cap assertion, whitespace trimmed on write), idempotent re-assert (including
  re-assert whose only difference is untrimmed whitespace), get, list (each filter, limit, empty),
  `resolve` projection, delete (success, not found, conflict recomputes), read-then-remove on the all-key
  relation.
- [ ] **T002** [P] Write `tests/mind/authorities/run` + fixtures covering US5: seeded defaults on fresh
  init, register new tier, upsert existing tier, **upsert omitting `description` preserves it**, delete
  unreferenced tier, refuse delete of referenced tier, invalid rank (negative, non-integer), empty name.
- [ ] **T003** ⛔ **Human-approved fixture reconciliation** (research D11). Update the locked fixtures that
  a third built-in rule and a schema bump necessarily break. Get explicit approval before touching them:
  - `tests/mind/verify/data/{00,01,02,03,06}-*/result.json` — `rules_passed`/`rules_failed` and the rule list
  - `tests/mind/rules/list/data/{00,01}-*/result.json` — counts 2 → 3 and 3 → 4
  - `tests/mind/init/data/{00,01,02}-*/result.json` — `schema_version` 1.12.0 → 1.13.0
  - `tests/mind/concepts/delete/data/00-success-delete/result.json` — `cascade` gains `claims_removed`
- [ ] **T004** [P] [US6] Extend `tests/mind/rules/`: `contradictions` returns a concept with competing
  claims, omits a concept whose claims agree, **executes with `error: null`** (the arity-break safety net,
  research D7), and a user-defined rule joining `*claims`/`*authorities` for rank executes.
- [ ] **T005** [P] Extend the verify suite: `contradictions` participates in `/mind/verify` like any other
  rule, and fires even when the contradiction resolves cleanly by rank (spec US6, research D7).
- [ ] **T006** [P] Cascade tests: deleting a concept removes its claims **and the claims on the edges that
  deletion cascades away** (research D8 trap 1); deleting an edge removes its claims; `prune` removes
  claims for pruned concepts and edges (trap 2).
- [ ] **T007** Migration test (SC-006). Mechanism, since the binary ships at 1.13.0 and a RocksDB fixture
  directory cannot be checked in: init fresh, downgrade in place (`::remove claims`, `::remove
  authorities`, `:rm` the `contradictions` rule row, stamp `schema_meta` to `1.12.0`), then reopen through
  a handler that calls `open_mind` — note `/mind/init` does **not** migrate; only `open_mind` does. Assert
  concepts, edges, provenance, annotations, rules, and episodes survive and the five tiers appear.
- [ ] **T008** SC-001 end-to-end: the refund 30/14/45 scenario from quickstart.md — three claims written,
  all three listed, one conflict group, `legal` as resolution, all three still present after `resolve`.
- [ ] **T009** ⛔ **Gemini antagonist review** of T001–T008. Incorporate findings. **Tests LOCK here.**
  Blocks every task below.

---

## Phase 2: Schema & Migration

- [ ] **T010** [FND] Add `claims` and `authorities` relations to `SCHEMA_QUERIES` in
  `src/handlers/mind/init.ts`, exactly as declared in data-model.md (all-key `claims`, `=>`-keyed
  `authorities`).
- [ ] **T011** [FND] Seed the five default authority tiers (research D6) on init.
- [ ] **T012** [FND] Add the `contradictions` built-in rule to `BUILTIN_RULES` in `init.ts`.
- [ ] **T013** [FND] Bump `SCHEMA_VERSION` to `1.13.0` in `init.ts`.
- [ ] **T014** [FND] Add the v1.12.0 → v1.13.0 migration in `src/lib/migrate.ts`: both relations, the five
  tiers, the `contradictions` rule. Bump `LATEST_VERSION`.
- [ ] **T015** [FND] Add `"contradictions"` to `BUILTIN_RULE_NAMES` in `src/lib/mind.ts`.
- [ ] **T016** [FND] Verify init-vs-migrate parity: a fresh v1.13.0 db and a migrated v1.12.0 db are
  indistinguishable — relations, seeded tiers, built-in rules (research D9).

T010–T013 are sequential: same file.

---

## Phase 3: Shared Library

- [ ] **T017** [FND] Create `src/lib/claims.ts` with constants: `SUBJECT_TYPES`,
  `CLAIM_MAX_PREDICATE_LENGTH` (256), `CLAIM_MAX_ASSERTION_LENGTH` (4096), `CLAIM_MAX_SOURCE_LENGTH`
  (1024), `AUTHORITY_MAX_NAME_LENGTH` (64), `DEFAULT_AUTHORITIES`.
- [ ] **T018** [FND] `get_next_claim_id(db)` — same pattern as `get_next_annotation_id`.
- [ ] **T019** [FND] `authority_exists(db, name)` and `get_authorities(db)`.
- [ ] **T020** [FND] `edge_exists(db, id)` in `src/lib/mind.ts` (mirrors `concept_exists`);
  `subject_exists(db, subject_type, subject_id)` in `claims.ts` dispatching to it.
- [ ] **T021** [FND] `normalize_claim_fields(params)` — trim `predicate`/`assertion`/`authority`/`source`
  at the boundary so every downstream comparison is exact equality (FR-016b, research D3).
- [ ] **T022** [FND] `find_claim(db, tuple)` — the 5-tuple idempotency lookup on stored (trimmed) values.
- [ ] **T023** [FND] `fetch_claims_with_rank(db, filters)` — single query joining `claims` → `authorities`.
- [ ] **T024** [FND] `group_conflicts(rows)` — grouping, exact assertion comparison, rank-desc/id-asc
  ordering, `resolution`, `unresolved` tie flag (research D5).
- [ ] **T025** [FND] `cascade_claims(db, subject_type, ids)` — the single cascade path used by all four
  deletion sites (research D8). Read-then-`:rm` on the all-key relation.

---

## Phase 4: Handlers — Claims (US1–US4, US7)

- [ ] **T026** [US1] `src/handlers/mind/claims/create.ts` — guard-early validation per contracts, trim via
  T021, idempotent insert, `created` flag.
- [ ] **T027** [P] [US1] `src/handlers/mind/claims/get.ts` — by ID, with joined rank.
- [ ] **T028** [US2] [US4] `src/handlers/mind/claims/list.ts` — filters, `limit`, `resolve` projection,
  rank-desc/id-asc ordering, empty → count 0.
- [ ] **T029** [US3] `src/handlers/mind/claims/conflicts.ts` — groups via `group_conflicts`, filters, no
  truncation.
- [ ] **T030** [P] [US7] `src/handlers/mind/claims/delete.ts` — read-then-remove by ID, not-found error.

---

## Phase 5: Cascades (US7, FR-015)

- [ ] **T031** [US7] `src/handlers/mind/concepts/delete.ts` — call `cascade_claims` for the concept **and
  for the edge IDs the handler already collects to `:rm`** (research D8 trap 1). Report
  `cascade.claims_removed`.
- [ ] **T032** [P] [US7] `src/handlers/mind/edges/delete.ts` — `cascade_claims` for the edge; report
  `claims_removed`.
- [ ] **T033** [US7] `src/handlers/mind/prune.ts` — `cascade_claims` for pruned concepts and edges
  (research D8 trap 2).
- [ ] **T034** [US7] `src/handlers/calabi/extract.ts` — `cascade_claims` on the re-extraction delete path.

---

## Phase 6: Handlers — Authorities (US5)

- [ ] **T035** [P] [US5] `src/handlers/mind/authorities/list.ts` — rank-desc, name-asc.
- [ ] **T036** [US5] `src/handlers/mind/authorities/create.ts` — upsert, rank validation, `created` flag,
  **description preserved when omitted on update**.
- [ ] **T037** [US5] `src/handlers/mind/authorities/delete.ts` — refuse with `conflict` when referenced.

---

## Phase 7: Registration & CLI

- [ ] **T038** Register all 8 paths in `src/index.ts`.
- [ ] **T039** [P] `src/cli/commands/claim.ts` — `create|list|get|delete|conflicts`.
- [ ] **T040** [P] `src/cli/commands/authority.ts` — `list|create|delete`.
- [ ] **T041** Wire both into `src/cli/main.ts` under `admin` plus the backward-compat top level, matching
  how `annotation` is wired.

---

## Phase 8: Green & Document

- [ ] **T042** Run `bun test`. Loop until green. If stuck after good-faith effort → ⛔ human checkpoint.
- [ ] **T043** Confirm no behavioral regressions across concepts, edges, provenance, annotations,
  episodes, rules, verify, lenses (SC-005). The only fixture diffs should be the T003 set.
- [ ] **T044** [P] Update `CLAUDE.md` Recent Changes + the Spec Machine table status for `067`.
- [ ] **T045** [P] Mark `067-claim-authority` complete in `dna/product/ROADMAP.md` and move it to the
  Completed table.
- [ ] **T046** Comment the verdict on #113 and note what #114 inherits: the `observation` tier, claim
  immutability, the 8-column arity coupling in the `contradictions` rule body, and the `cascade_claims`
  seam.

---

## Dependencies

```
Phase 1 tests (T001–T008) ──> T009 Gemini review [LOCK]
                                    │
                                    v
                          Phase 2 schema (T010–T016)
                                    v
                          Phase 3 lib (T017–T025)
                          ┌─────────┴─────────┬──────────────┐
                          v                   v              v
                  Phase 4 claims       Phase 5 cascades  Phase 6 authorities
                  (T026–T030)          (T031–T034)       (T035–T037)
                          └─────────┬─────────┴──────────────┘
                                    v
                          Phase 7 CLI (T038–T041)
                                    v
                          Phase 8 green (T042–T046)
```

- **T009 blocks everything below it.** No implementation — including the library — before the lock.
- T003 needs human approval before the fixtures are touched (constitution IV).
- T020 blocks T026 (edge-subject validation).
- T023 blocks T028 and T029; T024 blocks T029.
- T025 blocks T031–T034.
- T019 blocks T036/T037.

## Parallelization

Safe together: T001+T002+T004+T005+T006 (distinct suites), T027+T030, T032 alongside T031's
non-overlapping files, T039+T040, T044+T045.

Sequential: T010–T013 (same file), T031 and T033 if prune reuses concept-delete internals.

## MVP boundary

Phases 1–4 plus T035 deliver the P1 stories (US1, US2, US3): claims can be asserted, contradiction is
held, conflicts are queryable. Phases 5–7 complete the feature.

## Blocked

**T009 requires the `gemini` CLI, which is not installed on the current machine.** Install it or
substitute a human antagonist. Do not skip — constitution IV.
