# The Deletion Test, Run on Brane

**Issue:** [#115](https://github.com/ahoward/brane/issues/115) — the keystone spike
**Date:** 2026-08-25
**Verdict:** The loop round-trips — twice, under two difficulty settings. **But the graph was not the
only thing making it work**, and the second run showed exactly what the graph does not carry.

- **Round 1** — delete the module, keep everything that imports it. **430 / 432.**
- **Round 2** — delete the module *and* every trace of its integration. **429 / 432**, three stable
  failures, one of which is the scar-tissue bug round 1 got for free.

---

## The experiment

Fowler's question, from *The Deletion Test*:

> "If I deleted this codebase and regenerated it from scratch, what would I rely on to decide whether
> the result was correct?" If your honest answer is "the old code," you have a problem.

Run against the `067-claim-authority` feature, which had just shipped and had a locked oracle.

**Setup**

1. Loaded **102 claims** across 15 concepts into a scratch `mind.db`. Every claim was transcribed from
   `specs/067-claim-authority/*.md` only. Nothing from the implementation — putting implementation
   knowledge into the graph would have rigged the result.
2. **Deleted** `src/lib/claims.ts` and `src/handlers/mind/{claims,authorities}/` — 1,140 lines across
   nine files. Confirmed the build broke.
3. **Sealed the leaks.** Moved the 75 locked tc cases and the spec directory out of reach, and
   redacted two prose caches that #113 had created outside the graph: the Claims section of
   `CLAUDE.md` and the gotchas list in `ai/MEMORY.md`. Both contained implementation knowledge; leaving
   them would have meant testing our documentation, not our graph.
4. Handed a **blind agent** a 295-line dump of the graph — produced by querying mind.db, not by
   reading files — plus the surviving source, and forbade git history, the hidden directories, the
   tests, and the spec.
5. Restored the oracle afterward and ran the full suite.

The regenerator was blind by construction: it never saw the deleted code, and it had no author's
memory of it. That is the only way this experiment means anything.

---

## Results

**Build:** clean, first pass.

**Oracle: 430 / 432.**

| Suite | Result |
|---|---|
| `mind/claims` (52 cases) | 52 / 52 |
| `mind/authorities` (15 cases) | 15 / 15 |
| `mind/migration` (8 cases) | 7 / 8 |
| `mind/rules/get` | 1 failure |
| everything else (~350) | pass |

**Both failures are the same string.** The stored body of the `contradictions` built-in rule:

```
expected: "contradictions[id, name] :=\n  *concepts[...],\n  ..."   (multi-line)
actual:   "contradictions[id, name] := *concepts[...], ..."          (one line)
```

Semantically identical — the rule executes correctly and every rule-behavior test passes. It fails
because the body is *stored and compared as a string*, and my transcription flattened a multi-line
literal into one line when writing the claim.

That is a fidelity loss in the spec→claim step, not a limit of the model: brane can store newlines
fine. But it is exactly the class of thing that will happen every time a human or an extractor
paraphrases something whose exact bytes are load-bearing.

**Probes of behavior the oracle does not cover: 8 of 9 identical.**

| Probe | Original | Regenerated |
|---|---|---|
| id counter key name | `claim_next_id` | `claim_next_id` ✓ |
| resolve, tie with identical assertions | collapses to 1 | collapses to 1 ✓ |
| `limit` applied before or after resolution | after | after ✓ |
| over-long authority name on create | `not_found` | `not_found` ✓ |
| two missing fields at once | first only | first only ✓ |
| **`subject_type: " concept"` (untrimmed)** | **accepted** | **rejected** ✗ |
| backslash in an assertion | round-trips | round-trips ✓ |
| filter by unregistered tier | empty success | empty success ✓ |
| invalid `subject_type` in list | error | error ✓ |

One divergence, invisible to 432 tests. The original trims `subject_type`; the regeneration does not.
Neither behavior is specified anywhere.

---

## Why it worked — and why that is the uncomfortable part

A 430/432 result reads like a win for the graph. It is not, or not only. Pull the experiment apart and
the regeneration leaned on **four** sources, of which the graph was one.

**1. The graph (102 claims).** Carried the semantics: relation shapes, resolution rules, tie behavior,
error codes, exact error message strings, cascade obligations, seeded tiers and their ranks. This is
real and it is the thing #113 built. Without it there is no regeneration at all.

**2. The surviving importers — the context boundary.** `init.ts`, `migrate.ts`, `prune.ts`,
`extract.ts`, `concepts/delete.ts`, `edges/delete.ts` and `index.ts` all still imported the deleted
module. Between them they pin the exact export names, arities, and handler paths. The regenerator did
not have to *guess* that `cascade_claims(db, subject_type, ids) => Promise<number>` exists; the
callers stated it.

This is Fowler's third primitive, the one brane does not model at all ([#118](https://github.com/ahoward/brane/issues/118)). In this
experiment it was supplied for free by the surrounding code. In a real regeneration — where you
delete a whole service — it would not be.

**3. Surviving sibling code, which carried at least one load-bearing secret.**

Prediction #1 in the issue was that the regeneration would fail on Cozo's string escaping:
`'it''s'` is a parse error, Cozo wants backslashes. That knowledge was in no claim. The regeneration
got it right anyway — because `esc_cozo()` lives in `src/lib/mind.ts`, a surviving file, with the
explanatory comment attached.

And it lives there **only because of an accident**: during #113 the escaping bug was found in
`rules/create.ts`, and the fix hoisted the helper out of `claims.ts` into `mind.ts`. Had that bug not
surfaced, the helper would have stayed inside the deleted file and the regeneration would have
repeated the SQL-doubling mistake — silently, since no test covers an apostrophe in a claim.

The scar tissue survived deletion by luck of factoring, not by design. That is precisely
*The Implementation Remembers*: "every mature system carries lessons no one remembers writing down."

**4. The oracle.** 75 locked cases, adversarially reviewed, pinning exact error strings and orderings.
It is what made the result *checkable*. And note what it did **not** catch: 28 of the 29 decisions the
regenerator had to invent.

---

## The 29 free variables

The regenerator was asked to list every decision the graph did not determine. It listed 29. The oracle
caught one of them (the `subject_type` trim, and even that only because I probed for it manually — no
test covers it).

The consequential ones:

- **Where the id counter lives and what its key is called.** Guessed `claim_next_id` correctly by
  analogy to `annotation_next_id`. A wrong guess would restart ids at 1 on an existing database and no
  test would notice, because every test starts from a fresh db.
- **Whether a top-rank tie with *identical* assertions collapses or returns all tied claims.** The
  spec qualifies the tie rule as "between different assertions" and says nothing about the other case.
- **Whether `limit` applies before or after resolution.** Changes which groups appear.
- **First-error-wins vs. accumulating all field errors.** The constitution's "error mirror" convention
  arguably invites accumulation; the original does first-error-wins; nothing says so.
- **Guard ordering** — subject-existence before authority-registration. Swapping them changes which
  error a doubly-invalid request receives.
- **Whether the five seeded tiers are protected from deletion** the way built-in rules are. The
  original does not protect them. Nothing says either way.

None of these are exotic. They are the ordinary underspecification of a spec written in prose by
someone who also had the code in front of them — and this was the *best case*: 1,525 lines of spec for
1,140 lines of implementation, written days earlier, by a careful author, with adversarial review.

---

## What this says about the reframe

**The loop closes.** Regeneration from a claim graph produced a working, oracle-passing implementation
of a non-trivial feature on the first try. That is a real result and it is more than I expected. The
MDA/Intentional-Programming failure mode did not appear.

**But brane's version of the thesis is too narrow.** The experiment did not validate "the spec graph
is the durable asset." It validated Fowler's actual claim — that **four** things must survive — by
showing that the regeneration silently drew on three of them:

| Primitive | Supplied by | brane models it? |
|---|---|---|
| Behavioral specification | the 102 claims | yes (#113) |
| Context boundary | surviving importers | **no** ([#118](https://github.com/ahoward/brane/issues/118)) |
| Evaluations | the locked tc suite | **no** ([#119](https://github.com/ahoward/brane/issues/119)) |
| Provenance | (not exercised) | attributive only ([#121](https://github.com/ahoward/brane/issues/121)) |

Remove the surviving importers and the export surface becomes 20 more guesses. Remove the oracle and
there is no way to know any of this worked. brane supplied one column of that table.

**And the graph was hand-written.** 102 claims, transcribed by someone who had just built the thing.
Nothing in brane produced them — no extractor emits a claim. The "knowledge emerges from the work"
advantage, which is brane's genuine structural edge over MDA, does not currently extend to the only
content that made this regeneration possible. That gap is the single most important thing to close.

---

---

# Round 2: delete the importers too

Round 1's biggest caveat was that seven surviving files still imported the deleted module, handing the
regenerator the exact export surface for free. Round 2 removes that.

## Setup

Every file `067-claim-authority` touched was reverted to the pre-feature commit — `init.ts`,
`migrate.ts`, `mind.ts`, `prune.ts`, `extract.ts`, both delete handlers, `index.ts`, `cli/main.ts`,
`rules/create.ts` — and all eleven added files deleted. **Zero occurrences of "claim" remained in
`src/`.** The codebase built clean at 156 modules: a coherent system with no trace of the feature.

Two consequences worth noting up front:

- `esc_cozo()` ceased to exist, and `rules/create.ts` went back to its SQL-doubling escaping bug. The
  accident that saved round 1 was undone.
- The oracle was sealed properly this time. Round 1 left 32 fixtures and run scripts visible that
  mention the feature — including `rules/get/data/05`, which contains the exact multi-line rule body
  the regenerator was supposed to derive. It reported not opening them, but they should not have been
  reachable. Round 2 moved all of them out.

Same 102-claim graph. Harder task: the regenerator now had to work out *where* things wire in.

## Results

**Build:** clean, 167 modules. **Oracle: 429 / 432** — three stable failures across three runs (a
fourth, `mind/edges/get/01`, was flaky and appeared in one run of three).

| Suite | Result |
|---|---|
| `mind/claims` (52) | 52 / 52 |
| `mind/authorities` (15) | 15 / 15 |
| `mind/migration` (8) | 7 / 8 |
| `mind/rules/get` | 1 failure |
| `mind/rules/query` | 1 failure |

Two failures are the same rule-body whitespace as round 1.

**The third is prediction #1, fired.** `mind/rules/query/12` — the case that creates a user-defined
rule whose body contains `'concept'` — fails with a Cozo parse error, because `rules/create.ts` is
back to `.replace(/'/g, "''")`.

## What round 2 actually showed

**1. The graph carried the integration.** This was the open question and the answer is yes. With
nothing in the codebase referencing the feature, the regenerator located every wiring point:
`SCHEMA_QUERIES` and `BUILTIN_RULES` in `init.ts`, the migration chain tail in `migrate.ts`,
`BUILTIN_RULE_NAMES` in `mind.ts`, the four cascade sites, and all eight `sys.register` calls. It
worked them out from the `path`, `SchemaMigration`, `ClaimCascade` and `ContradictionsRule` claims.

It also derived two things the graph only gestured at: that built-in protection needed *only* the
constant (because `rules/create` and `rules/delete` already consume it), and that `verify`,
`rules/query` and `pr-verify` need no changes at all because they read the `rules` relation
dynamically. Both correct.

**2. The scar tissue was re-derivable — but its scope was not.** The regenerator independently
discovered that the repo's escaping convention is broken. It tested Cozo's parser empirically, found
`'it''s'` rejected, and switched its own module to bound query parameters (`$name`) — arguably a better
fix than the original's `esc_cozo`.

Then it deliberately left the pre-existing bug in `rules/create.ts` alone, "rather than widen the blast
radius." Entirely reasonable, and the oracle failed anyway.

So the knowledge was recoverable from first principles by experiment. What was *not* recoverable was
that this bug and the claims feature are connected at all — that a user-defined rule joining `*claims`
needs quoted literals, so shipping claims means fixing rules/create. Nothing in the graph links them,
because that link exists only in the history of how the feature was built.

That is a sharper version of the round-1 finding. Round 1: the knowledge survived by luck of factoring.
Round 2: the knowledge was re-derivable, but the *obligation* was not.

**3. Two runs, two different silent divergences.** Re-running the nine uncovered-behavior probes:

| Probe | Original | Round 1 | Round 2 |
|---|---|---|---|
| `subject_type: " concept"` | accepted | **rejected** | accepted |
| resolve, tie with identical assertions | 1 claim | 1 claim | **2 claims** |
| other seven | — | match | match |

Different regenerations of the same graph diverged in different places, and the 432-case oracle caught
neither. The tie case is not even the regenerator's fault: the graph genuinely contradicts itself here.
`ConflictGroup.tie_unresolved` says a top-rank tie means *no resolution*; `ClaimsList.resolve_tie` says
it means *return all tied claims*. Both were implemented literally, and they disagree about what a tie
is.

**4. The graph has structural defects the regenerations exposed.**

- `ClaimsGet`, `ClaimsDelete` and `AuthoritiesList` have **no edges at all**. They are unreachable by
  traversal and were found only by reading the flat concept list. A graph whose nodes cannot be reached
  from other nodes is a list with extra steps.
- `AuthorityTier.missing_tier` specifies behavior — null rank, sorts last, never wins — that **no
  supported sequence of API calls can produce**, because a claim can only be written under a registered
  tier and a referenced tier cannot be deleted. Both regenerators implemented it; it is dead code.
- Two claims are attached to the wrong subject (`ClaimsList.no_overwrite` is a property of the relation;
  `ClaimsConflicts.empty_is_success` is a property of the envelope convention).

**5. One leak I did not seal.** The regenerator got the CLI command names — `brane claim`,
`brane authority` — from `CLAUDE.md`'s "Recent Changes" line, which I redacted the Claims section of
but not the changelog entry. **The graph says nothing about a CLI surface.** Without that line the CLI
would have been pure invention; the flag names were invented anyway. Recording it because the honest
version of this experiment matters more than a clean number.

## Round 2 by the numbers

- 1,731 lines added across 21 files (vs. #113's original ~1,300 across 20).
- 21 decisions the graph did not determine (round 1: 29 — fewer, because integration points were
  *more* determined by the graph than the module internals were).
- Every integration point found. One surface (CLI) came from a leak. One (`output.ts` formatting) was
  a pure guess the regenerator flagged as such.

---

## Recommendations

1. **Do not close #115 as "proven."** Round 2 removed the context-boundary crutch and the loop still
   closed — that is a stronger result than round 1. But the oracle was still supplied from outside, and
   both rounds diverged silently in places no test covers. The honest claim is: *regeneration from a
   claim graph works, and the graph is not sufficient on its own.*
2. **[#119](https://github.com/ahoward/brane/issues/119) (evaluations) is now the critical path**, not a nice-to-have. The oracle is what made this
   legible, and it lives in `tests/`, not in the graph.
3. **[#118](https://github.com/ahoward/brane/issues/118) (context boundaries) is load-bearing**, not lower-priority. It was invisibly doing half the
   work here.
4. **Claims need a verbatim mode** ([#124](https://github.com/ahoward/brane/issues/124)). Assertions whose exact bytes matter — rule bodies, schemas,
   regexes, format strings — cannot survive prose transcription. Two failures in both rounds.
5. **An extractor that emits claims** ([#125](https://github.com/ahoward/brane/issues/125)). Until something produces normative claims from the work,
   the graph is hand-fed and the emergence advantage is theoretical.
6. ~~Re-run with the boundary removed.~~ **Done — round 2 above.**
7. **New: claims need to carry obligations that cross feature boundaries.** The escaping bug is the
   case in point: shipping claims *requires* fixing `rules/create.ts`, and nothing in the graph could
   say so. A claim can assert a fact about its own subject; it has no way to say "and therefore that
   other thing must change too." That is the causal-provenance gap ([#121](https://github.com/ahoward/brane/issues/121)) with teeth.
8. **New: the graph needs connectivity discipline.** Three of fifteen concepts had no edges and were
   unreachable by traversal. `orphans` already detects this for concepts — it should be a quality gate
   on any graph intended to drive regeneration.
9. **New: a contradiction the graph held but nobody noticed.** `tie_unresolved` and `resolve_tie`
   disagree about what a top-rank tie means. brane shipped `contradictions` in #113 and this pair sat in
   the graph undetected, because they are claims on *different* subjects with *different* predicates —
   exactly the shape #113's exact-match detector cannot see. Worth a follow-up on semantic conflict
   detection, which #113 explicitly deferred.

---

## Reproduction

```
scratchpad/spike/
├── load.sh          # builds the 102-claim graph from the spec docs
├── graph-dump.md    # the regenerator's only specification input (295 lines)
├── probe.sh         # the 9 uncovered-behavior probes
├── original/        # the deleted implementation, archived for diffing
└── tc-regen.log     # full suite output against the regenerated code
```

The regenerated implementation came in at 1,158 lines against the original's 1,140 — near-identical
volume, substantially different factoring (`conflicts.ts` 69 → 158 lines; `create.ts` 217 → 178).
