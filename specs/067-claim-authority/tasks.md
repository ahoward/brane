---
description: "Task list for 067-claim-authority"
---

# Tasks: First-Class Claim + Authority Model

**Input**: `/specs/067-claim-authority/` — spec.md, plan.md, research.md, data-model.md, contracts/
**Issue**: [#113](https://github.com/ahoward/brane/issues/113)

**Tests**: Required. Constitution IV — tc tests are authored and Gemini-reviewed **before**
implementation, and locked after review.

## Format: `[ID] [P?] [Story] Description`

- **[P]** — parallelizable (different files, no dependency)
- **[Story]** — the user story from spec.md (US1…US7), or `FND` for foundational

---

## Phase 1: Foundational — Schema & Migration (blocking)

⚠️ No story work begins until this phase is green.

- [ ] **T001** [FND] Add `claims` and `authorities` relations to `SCHEMA_QUERIES` in `src/handlers/mind/init.ts`, exactly as specified in data-model.md.
- [ ] **T002** [FND] Seed the five default authority tiers (D6 table) on init in `src/handlers/mind/init.ts`.
- [ ] **T003** [FND] Add the `contradictions` built-in rule to `BUILTIN_RULES` in `src/handlers/mind/init.ts` (body from data-model.md).
- [ ] **T004** [FND] Bump `SCHEMA_VERSION` to `1.13.0` in `src/handlers/mind/init.ts`.
- [ ] **T005** [FND] Add the v1.12.0 → v1.13.0 migration in `src/lib/migrate.ts`: create both relations, seed the five tiers, insert the `contradictions` rule. Bump `LATEST_VERSION` to `1.13.0`.
- [ ] **T006** [FND] Add `"contradictions"` to `BUILTIN_RULE_NAMES` in `src/lib/mind.ts`.
- [ ] **T007** [FND] Verify init-vs-migrate parity: a fresh v1.13.0 db and a migrated v1.12.0 db are indistinguishable (relations, seeded tiers, built-in rules). D9.

---

## Phase 2: Foundational — Shared Library (blocking)

- [ ] **T008** [FND] Create `src/lib/claims.ts` with constants: `SUBJECT_TYPES`, `CLAIM_MAX_PREDICATE_LENGTH` (256), `CLAIM_MAX_ASSERTION_LENGTH` (4096), `CLAIM_MAX_SOURCE_LENGTH` (1024), `AUTHORITY_MAX_NAME_LENGTH` (64), `DEFAULT_AUTHORITIES`.
- [ ] **T009** [FND] `get_next_claim_id(db)` in `src/lib/claims.ts` — same pattern as `get_next_annotation_id`.
- [ ] **T010** [FND] `authority_exists(db, name)` and `get_authorities(db)` in `src/lib/claims.ts`.
- [ ] **T011** [FND] `edge_exists(db, id)` in `src/lib/mind.ts` (mirrors the existing `concept_exists`); `subject_exists(db, subject_type, subject_id)` in `src/lib/claims.ts` dispatching to it.
- [ ] **T012** [FND] `find_claim(db, tuple)` in `src/lib/claims.ts` — the 5-tuple idempotency lookup (D4).
- [ ] **T013** [FND] `fetch_claims_with_rank(db, filters)` in `src/lib/claims.ts` — single query joining `claims` → `authorities` (D2).
- [ ] **T014** [FND] `group_conflicts(rows)` in `src/lib/claims.ts` — grouping, trim-then-exact comparison (D3), rank-desc/id-asc ordering, `resolution`, `unresolved` tie flag (D5).

---

## Phase 3: Tests (author BEFORE implementation — constitution IV)

- [ ] **T015** [P] Write `tests/mind/claims/run` covering US1–US4 and US7: create (success, edge subject, unregistered authority, missing subject, each missing field, free-form predicate accepted, over-cap assertion), idempotent re-assert, get, list (each filter, empty), resolve projection + no-write proof, delete (success, not found, conflict recompute), concept-delete cascade, edge-delete cascade.
- [ ] **T016** [P] Write `tests/mind/claims/data/NN-*/{params,result}.json` fixtures for every case in T015.
- [ ] **T017** [P] Write `tests/mind/authorities/run` covering US5: seeded defaults on fresh init, register new tier, upsert existing tier, delete unreferenced tier, refuse delete of referenced tier, invalid rank (negative, non-integer), empty name.
- [ ] **T018** [P] Write `tests/mind/authorities/data/NN-*/{params,result}.json` fixtures for every case in T017.
- [ ] **T019** [P] Extend `tests/mind/rules/` for US6: `contradictions` returns a concept with competing claims, omits a concept whose claims agree, and a user-defined rule joining `*claims`/`*authorities` executes.
- [ ] **T020** [P] Extend the verify suite: `contradictions` participates in `/mind/verify` output like any other rule.
- [ ] **T021** [P] Add a migration test: a v1.12.0 fixture db migrates to v1.13.0 preserving concepts, edges, provenance, annotations, rules, and episodes, and gains the seeded tiers (SC-006).
- [ ] **T022** Add the SC-001 end-to-end case: the refund 30/14/45 scenario from quickstart.md — three claims written, all three listed, one conflict group, `legal` as resolution, all three still present after `resolve`.
- [ ] **T023** ⛔ **Gemini antagonist review** of T015–T022. Incorporate findings. **Tests LOCK after this task.** Blocks Phase 4.

---

## Phase 4: Handlers — Claims (US1, US2, US3, US4, US7)

- [ ] **T024** [US1] `src/handlers/mind/claims/create.ts` — guard-early validation per contracts/claims.md, idempotent insert, returns `created` flag.
- [ ] **T025** [P] [US1] `src/handlers/mind/claims/get.ts` — by ID, with joined rank.
- [ ] **T026** [US2] [US4] `src/handlers/mind/claims/list.ts` — filters, `limit`, `resolve` projection, rank-desc/id-asc ordering, empty → count 0.
- [ ] **T027** [US3] `src/handlers/mind/claims/conflicts.ts` — conflict groups via `group_conflicts`, filters, no truncation.
- [ ] **T028** [P] [US7] `src/handlers/mind/claims/delete.ts` — by ID, not-found error.
- [ ] **T029** [US7] Cascade claims in `src/handlers/mind/concepts/delete.ts` (alongside the existing annotation cascade).
- [ ] **T030** [US7] Cascade claims in `src/handlers/mind/edges/delete.ts`.

---

## Phase 5: Handlers — Authorities (US5)

- [ ] **T031** [P] [US5] `src/handlers/mind/authorities/list.ts` — rank-desc, name-asc.
- [ ] **T032** [US5] `src/handlers/mind/authorities/create.ts` — upsert semantics, rank validation, returns `created` flag.
- [ ] **T033** [US5] `src/handlers/mind/authorities/delete.ts` — refuse with `conflict` when referenced (D8).

---

## Phase 6: Registration & CLI

- [ ] **T034** Register all 8 paths in `src/index.ts`.
- [ ] **T035** [P] `src/cli/commands/claim.ts` — `create|list|get|delete|conflicts` per quickstart.md flags.
- [ ] **T036** [P] `src/cli/commands/authority.ts` — `list|create|delete`.
- [ ] **T037** Wire `claim` and `authority` into `src/cli/main.ts` under `admin` plus the backward-compat top level, matching how `annotation` is wired.

---

## Phase 7: Green & Document

- [ ] **T038** Run `bun test`. Loop until green. If stuck after good-faith effort → ⛔ human checkpoint.
- [ ] **T039** Confirm no regressions across concepts, edges, provenance, annotations, episodes, rules, verify, lenses (SC-005).
- [ ] **T040** [P] Update `CLAUDE.md` Active Technologies + Recent Changes for `067-claim-authority`.
- [ ] **T041** [P] Mark `067-claim-authority` complete in `dna/product/ROADMAP.md` and move it to the Completed table.
- [ ] **T042** Comment the verdict on issue #113 and note what #114 inherits (the `observation` tier, the immutability rule, the 8-column arity coupling in the `contradictions` rule body).

---

## Dependencies

```
Phase 1 (T001–T007) ──┐
Phase 2 (T008–T014) ──┴──> Phase 3 tests (T015–T022) ──> T023 Gemini review [LOCK]
                                                              │
                                    ┌─────────────────────────┤
                                    v                         v
                            Phase 4 (T024–T030)       Phase 5 (T031–T033)
                                    └────────────┬────────────┘
                                                 v
                                         Phase 6 (T034–T037)
                                                 v
                                         Phase 7 (T038–T042)
```

- T011 blocks T024 (edge-subject validation).
- T013 blocks T026 and T027.
- T014 blocks T027.
- T032/T033 depend on T010.
- T029/T030 depend on Phase 1 (the relation must exist).
- **T023 blocks all of Phase 4 and 5.** No implementation before the antagonist review lands.

## Parallelization

Safe to run together: T015+T017+T019 (distinct test suites), T025+T028 (distinct handlers),
T031 alone in Phase 5's start, T035+T036 (distinct CLI files), T040+T041 (distinct docs).

Everything touching `src/handlers/mind/init.ts` (T001–T004) is sequential — same file.

## MVP boundary

Phases 1–4 plus T031 deliver the spec's P1 stories (US1, US2, US3) and are demonstrable on their own:
claims can be asserted, contradiction is held, and conflicts are queryable. US4–US7 complete the feature.

## Blocked

**T023 requires the `gemini` CLI, which is not installed on the current machine.** Either install it or
substitute a human antagonist before Phase 4 starts. Do not skip — constitution IV.
