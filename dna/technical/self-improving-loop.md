# The Self-Improving Loop

**Date:** 2026-08-27
**Status:** v2. Written independently, then posed to grok as an independent design question; this
version is the synthesis. Two of v1's central claims did not survive.
**Short version:** the loop is buildable and worth testing, but **nothing in the three rounds is
evidence that it compounds**, and v1's proposed optimisation target is gameable in one cycle. The
honest state is: a promising mechanism with an untested core, and a cheap experiment that would kill it.

**Where the two designs converged** (independent, so worth weighting): transfer is the decisive test;
the oracle's blind spot is the top failure mode; probes must not be authored by the regenerator; #119
(evaluations in the graph) is the hard prerequisite; #125 (an extractor that emits claims) is what makes
"emerges from the work" true or false; do not close #115 as proven.

---

## 1. The shape of it

Look at what we actually did over the last two days, stripped of narrative:

| Step | What it was |
|---|---|
| Load 102 claims into mind.db | initialise the parameters |
| Delete the module, regenerate from the graph | forward pass |
| Run 432 locked tests | compute the loss |
| Read the failure list and the regenerator's "decisions the graph did not determine" | compute the gradient |
| Write nine new claims encoding the missing obligation | apply the update |
| Delete and regenerate again | forward pass |
| 429 → 430, targeted failure eliminated | loss decreased |

That has the *shape* of a training loop. The graph is the parameter set, the oracle is the loss
function, and a claim is the unit of update.

> **v1 called this "three steps of a training loop and the loss went down." That overstates it, and the
> independent review was right to say so.**
>
> - **R1 and R2 used the same 102 claims.** The graph did not change between them. What changed was the
>   surrounding code. And behaviour *diverged* silently between the two runs on two probes. Same
>   parameters, different output — that is variance, not learning.
> - **R3 added a claim and recovered the test that claim was aimed at.** Specifications have always done
>   that. It demonstrates that a written requirement works, not that anything accumulated.
> - **The 29 → 21 → 22 drop in undetermined decisions is not a learning curve.** The findings doc says
>   why in its own text: fewer in R2 *because the integration points were more determined by the graph
>   than the module internals were*. Different task, not a better graph.
>
> **The category error underneath v1:** the Deletion Test is a **diagnostic**. It finds holes. v1 turned
> the hole it found into the training target and then reported that the target was hit. In ML terms that
> is evaluating on the training set. A training signal has to be out-of-sample; R3's was not.

So the loop is a thing you could build. It is not a thing we have evidence for. Everything below is
written to find out which.

---

## 2. The signal — and why v1's was the wrong one

The obvious signal is test failures. It is also the weaker one.

The richer signal is the thing we asked the regenerator for almost as an afterthought: **every decision
the graph did not determine.** It returned 29, 21 and 22 of them across the three rounds — places where
it had to invent a value, pick between plausible readings, or guess a convention.

Free variables matter more than failures because:

- **They precede failure.** A free variable is a place where the next regeneration may diverge. Of the
  29 in round 1, the oracle caught exactly one. The other 28 were silent — and two of them *did*
  diverge between rounds (`subject_type` trimming, tie-with-identical-assertions), invisibly.
- **They are dense.** One test failure gives you one bit. A list of 29 undetermined decisions gives you
  29 claim-shaped holes, each with the regenerator's own account of what it chose and what else was
  plausible — i.e. the claim is nearly pre-written.
- **They are the actual quantity of interest.** A specification's job is to determine the
  implementation. Free variables are precisely the extent to which it fails to.

> **v1 proposed minimising free variables as the objective. That is wrong and the review dismantled it
> cleanly:**
>
> - **The regenerator writes the list.** Minimise it by listing fewer items, guessing more confidently,
>   or emitting a claim per guess and declaring it determined. Gameable in one cycle.
> - **The oracle caught 0 of 29** (one surfaced only via a hand-written probe). So the count is
>   uncorrelated with the thing we actually care about.
> - **Some free variables should stay free.** First-error-wins vs. error accumulation is a
>   constitution-level convention (Principle II), not a fact about claims. Encoding it as a claim
>   pollutes the graph with global style. Helper names and factoring are design freedom; claiming them
>   ossifies one run's arbitrary choice as law.
>
> **The replacement objective: cross-regenerator agreement on a held-out probe set.** Run N independent
> regenerations from the same graph and measure pairwise behavioural agreement on probes the
> regenerator never sees. That is not self-reported, not gameable by the writer, and it measures the
> property we actually want — *does the graph determine the implementation?*
>
> The free-variable list survives as a **generator of candidate probes**, which is a genuinely good use
> for it. It just cannot be the loss.

So: **maximise cross-regenerator agreement on held-out probes, subject to the tests passing.**

---

## 3. It has to be two players, or it Goodharts

Here is the part we got right only by accident, and it is the part most likely to be skipped.

Run the loop as described and it converges to a graph that produces implementations passing 432 tests.
Then it stops. Forever. Meanwhile:

> `brane /mind/concepts/create '{"name": "O'Reilly Auth"}'` → error

54 broken interpolation sites, a bug class that breaks most English prose, in a system whose pitch is
ingesting prose — and **not one of 432 test cases contains an apostrophe** (#131). The loop would have
declared victory at 430/432 and sat there indefinitely, learning nothing, because the loss function
could not see the thing that was wrong.

The oracle is not ground truth. It is a model of ground truth with holes shaped like the imagination of
whoever wrote it.

So the loop needs a second player whose job is to attack the oracle rather than the graph:

```
         ┌──────────────── graph ────────────────┐
         │                                       │
    regenerate                              write claims
         │                                       │
         ▼                                       │
    implementation ──► oracle ──► failures ──────┘
                         ▲            │
                         │            ▼
                    new checks   free variables
                         │            │
                         └── antagonist ◄─┘
                        (attacks BOTH)
```

The antagonist's reward is finding what neither the graph nor the oracle knows. We have run this too:
Fable found three blockers in the locked tests before they locked, and grok found #129 (update
duplicates rows) and #131 (54 escaping sites) by checking claims against the tree instead of accepting
them. Both bugs were invisible to 432 tests and to the graph. Neither would have been found by a
single-player loop.

**Co-evolution, not optimisation.** Graph and oracle improve against each other, and the antagonist is
the pressure that keeps both honest.

---

## 4. What actually improves, and why that is the honest claim

The tempting story is "the LLM gets better at the task over time." That is not what happens and we
should not claim it.

Round 2 and round 3 used the same model, the same prompt, and the same task. One added claim changed
the outcome. **The improvement was in the environment, not the agent.**

What the graph provides is not reasoning. It is *retrieved constraint*: knowledge the model would
otherwise have to rediscover, guess, or get wrong.

The review sharpened this in a way worth keeping. In round 2, **the regenerator re-derived the Cozo
escaping rule on its own** — tested the parser against a live database, found the doubling broken,
switched its own module to bound parameters — and then declined to fix `rules/create.ts`. In round 3 the
same knowledge, written as a rank-100 claim, made it act.

So the graph did not supply the *knowledge*. The agent already had it. The graph supplied the **duty**.
That is a narrower and much more interesting function than "memory for agents": the substrate's job is
less to tell the model things it cannot work out, and more to tell it **which of the things it can work
out it is obliged to act on.** Authority is the mechanism, which is why #113's tier model did real work
here. That is a weaker claim than "self-improving AI" and
a much more defensible one — and it is also the more useful one commercially, because retrieved
constraint transfers across model versions while fine-tuned reasoning does not.

The interesting hypothesis, and the one worth testing, is about **transfer**: does a constraint learned
while regenerating module A reduce free variables when regenerating module B? The escaping rule was
learned from the claims feature; it applies to all 24 files that interpolate strings. If that kind of
knowledge accumulates and generalises, the graph is a compounding asset. If every claim only ever helps
its own module, the graph is a pile of per-module notes with extra ceremony.

**That is the load-bearing empirical question and nobody has answered it.**

---

## 5. How to test it

Eight experiments. The first two are cheap and either of them can kill the idea; run those before
building anything. Ordering matters more than completeness here.

### A — Flat-markdown control: is the *graph* doing anything?

**The cheapest possible falsifier, and v1 missed it entirely.**

Take the same 102 assertions as a numbered markdown list — no concepts, no edges, no authority tiers, no
database. Run the identical R2 protocol.

- **Predict, if structure matters:** the graph wins on integration discovery and on obligation-following;
  authority rank changes how willing the regenerator is to act out of scope.
- **Predict, if boring:** the numbers match. There is already evidence for this — three of fifteen
  concepts had no edges at all and were found by reading the flat concept list, which means the dump was
  functioning as a list for at least part of the run.
- **Falsifier for "substrate, not document":** markdown ≈ graph dump.

Costs one regeneration run. If it fails, everything downstream is about writing better specs, not about
building a substrate — which is still a real result, just a different product.

### B — Transfer: the compounding test

Both designs independently landed on this as decisive.

The escaping knowledge was learned while regenerating **claims**. It applies to 24 files. So: delete
`concepts/create.ts` (a writer that interpolates, unrelated to claims) and regenerate.

- **Conditions:** G2 (102 claims, no escaping obligation) · G3 (with it) · **G3-ablated** (escaping
  concepts kept, all claims-feature concepts removed — this is the one that separates portable
  constraint from feature documentation).
- **Probe:** can you create a concept named `O'Reilly`?
- **Predict, if compounding is real:** G3 and G3-ablated produce a correct writer; G2 does not.
- **Predict, if boring:** the regenerator treats blast-radius as out of scope again and `O'Reilly` still
  fails — which is *exactly what round 3 actually did* when it read the rank-20 blast-radius claim and
  declined to act.
- **Falsifier:** G3 does not beat G2 on a held-out writer. Then a claim is documentation of its own
  feature and the graph does not compound.

Run A and B before writing any loop infrastructure.

### C — Stability, not pass rate

N ≥ 5 independent regenerations from the same graph; measure pairwise behavioural agreement on probes
the regenerator never sees.

- **Baseline already exists and is bad:** R1 and R2 used the same 102 claims and split on two probes.
- **Predict, if the graph determines behaviour:** agreement rises as claims are added, for the specific
  behaviours claimed.
- **Falsifier:** agreement stays flat after adding claims. Then the graph is a hint, not a specification,
  and accumulation will not tighten implementations.

This replaces v1's free-variable count as the primary metric.

### D — Auto-promote vs. human R3

**The test of whether the *loop* works, as opposed to whether *a person writing a good claim* works.**

Give an automated promoter only the R2 failure (`rules/query/12`) and let it write claims. Regenerate.
Compare against human-authored R3.

- **Predict:** the promoter encodes the eval — "query/12 must pass" — or the local handler, rather than
  a portable caveat about interpolation. It recovers the target and nothing else.
- **Falsifier for self-improvement:** auto-promoted claims only ever recover the failure that generated
  them. That is the boring loop, and it is MDA with a robot doing the documenting.

### E — Can the loop find what the oracle cannot?

Hold #129 and #131 out of both graph and oracle. Run detect → propose → gate → regenerate.

- **Predict:** never finds them. The signal is oracle-shaped and both bugs live in its blind spot.
- **Fairer variant:** add two production-shaped probes (create `O'Reilly`; update then list and assert
  one row) *without* writing the explanatory claims. If the loop then produces a **portable** caveat that
  also fixes `edges/update` and `annotations`, that is the first genuine accumulation observed.
- **Falsifier:** after k cycles both bugs are still live and no claim mentions apostrophes or all-key
  `:put`. Currently true at k = 0.

### F — Emergence prerequisite

Run the existing extraction pipeline over `specs/067` plus the implementation. Count claims emitted.

- **Predict: zero.** No extractor emits a claim (#125).
- Not a compounding test. It is the test of whether the structural advantage over MDA exists *at all*.
  Every other experiment runs on a hand-fed graph and therefore overstates the product.

### G — Loop dynamics: terminate or diverge

M cycles of regenerate → measure → propose at `observation` → human gate → repeat. Per cycle record:
probe agreement (vs. original and vs. t−1), transfer score, `|claims|`, orphan and dead-claim counts,
verbatim failures, **fraction of claims at rank 100**, and fraction of new claims that are eval-overfit
("test N must pass").

- **Terminating well:** agreement ↑, transfer ↑, claim count grows more slowly than determined
  behaviours, rank distribution stays spread.
- **Diverging:** targeted evals pass, agreement and transfer flat, **rank inflation** (everything becomes
  `manual` 100), paraphrase failures persist, dead and orphan claims accumulate.
- **Kill criterion: if transfer has not moved after three cycles, stop the program.** Early enough to
  matter.

### H — Heterogeneous reasoning, not regeneration

The user's actual hypothesis is about reasoning across *heterogeneous* tasks, and A–G are all
regeneration. So: a set of questions that are not "reimplement 067."

> *Can I name a concept `O'Reilly`?* · *Product says 30 days, legal says 14 — who wins, and is the loser
> still stored?* · *Which files must change to ship claims?* · *What does a top-rank tie mean?*

Conditions: graph retrieval · `CLAUDE.md` · the raw spec files · nothing.

- **Predict, if the substrate improves reasoning:** the graph wins on authority and contradiction
  questions, and may *lose* on code-local questions until claims exist for them.
- **Falsifier:** the graph never beats the spec files it was transcribed from. Then it is an index.

### I — The floor test

{Haiku, Sonnet, Opus} × {no graph, trained graph}, same regeneration target.

- **Predict:** on project-specific knowledge, the graph buys more than a model tier does.
- **If true, that is the product** — "your cheap model plus your graph beats an expensive model without
  it" is a number you can put on a page. Kept from v1; the review did not propose it and it is cheap.

---

## 6. The metric that keeps it honest

One ratio, tracked every round:

```
compression = behaviours newly determined (by C's agreement measure) / claims added
```

v1 used *free variables eliminated* as the numerator; since the regenerator authors that count, it is
gameable, so the denominator-side concern survives but the numerator must come from cross-regenerator
agreement on held-out probes instead.

Above ~1, the graph is learning: each claim pins down more behaviour than it adds surface. Below 1 and
staying there, the graph is *transcribing* — growing into a verbose restatement of the implementation,
which is the cache-of-a-cache failure and exactly how MDA died.

**Secondary divergence indicators**, all cheap to compute and all suggested by the review:

- **rank inflation** — the fraction of claims at `manual` 100. If everything becomes maximum authority,
  authority has stopped carrying information and the promotion gate has failed.
- **eval-overfit fraction** — new claims that name a test rather than a behaviour.
- **dead and orphan claims** — unreachable by traversal, or specifying states no API can produce. Both
  already present in the 102 (`missing_tier` is unreachable; three concepts have no edges).

---

## 7. What to build

Less than it sounds, because the pieces exist.

1. **`brane regenerate <target>`** — the harness we ran three times by hand: snapshot, delete, dump the
   graph, invoke a blind agent, restore the oracle, score. A day's work; the procedure is already
   written down in `specs/069-regeneration-spike/`.
2. **Structured free-variable output.** Require the regenerator to return decisions as data, not prose,
   so they can be counted, diffed across rounds, and turned into claim stubs automatically. This is the
   single highest-value piece and it is nearly free.
3. **A claim-yield ledger.** Which claim was added in response to which failure, and what happened to
   that failure. This is causal provenance (#121) with an immediate use, which is the best argument for
   building #121 at all.
4. **The held-out split.** One config flag. Without it every number is suspect.

**Dependency:** #119 (evaluations as first-class objects). The loop's loss function currently lives in
`tests/`, outside the graph, which means the graph cannot reason about its own oracle — cannot ask
"which of my claims has no check?", cannot notice that no check contains an apostrophe. E4 and E5 both
need the oracle to be data. **This makes #119 the critical path, again, for the third independent
reason.**

---

## 8. Where it stops working

Stated plainly, because the boundary is the most useful part of the design.

- **The most likely killer, and it is detectable today without running anything:** the signal has the
  same shape as the oracle's test data. `grep -rl "'" tests/` finds no apostrophe in 432 cases;
  `concepts/update` is never re-read after a write. If the loop's update step is "promote oracle
  failures into claims," #129 and #131 can never enter the graph. Experiment E measures this; the
  `grep` predicts it for free.
- **No mechanical oracle, no loop.** Everything above depends on judging a regenerated artifact without
  a human. Code with tests is the easy case. Prose, design, strategy — no oracle, no gradient, and you
  are back to a wiki. This is precisely Fowler's "consequences" argument and it is the boundary
  condition of the entire idea.
- **The oracle's blind spots are inherited.** E4 and E5 mitigate; nothing eliminates.
- **Claim-writing is currently human.** Every claim in all three rounds was hand-written. Until
  something derives them from the work (#125), the loop's update step has a person in it and the
  economics are unproven — the loop is only worth running if writing the claim costs less than
  rediscovering the knowledge, and we have not measured either.
- **Irreducible ambiguity is real and should not be driven to zero.** Some free variables are design
  freedom. A specification that determines field ordering has stopped being a specification and become
  an implementation, which is the "when does a spec become a program" line. The plateau in E1 is a
  feature.

---

## 9. What the independent design changed

I wrote v1, then posed the same question to grok with the same evidence and no sight of v1. The
synthesis is above. Recording the delta, because the disagreements are more useful than the overlap.

**Independent convergence** — both designs, unprompted, landed on: transfer as the decisive test; the
oracle's blind spot as the top failure mode; probes must not be authored by the regenerator; #119 as the
hard prerequisite; #125 as what makes "emerges from the work" true or false; and do not close #115.

**Where v1 was wrong:**

| v1 claimed | Corrected |
|---|---|
| "Three steps of a training loop and the loss went down" | R1 and R2 used the *same* graph and diverged. R3 recovered the test its own claim targeted. No evidence of accumulation. |
| Minimise free variables | The regenerator authors that list, so it is gameable in one cycle; the oracle caught 0 of 29; and some free variables *should* stay free. Replaced by cross-regenerator agreement on held-out probes. |
| 29 → 21 was a learning curve | Different task. The findings doc says so in its own text. |
| The Deletion Test is a training step | It is a **diagnostic**. v1 turned the hole it found into the training target — evaluating on the training set. |

**What v1 missed entirely:** the flat-markdown control (A) — the cheapest experiment available and one
that could invalidate the whole substrate premise; auto-promote vs. human authorship (D) — which
separates "the loop works" from "a person wrote a good claim"; rank inflation as a divergence
indicator; and the observation that in R2 the agent **already knew** the escaping rule and simply did
not act, which reframes the graph's job from supplying knowledge to supplying obligation.

**What v1 contributed that the review did not:** the floor test (I), the two-player framing of the
antagonist as an attacker of the *oracle* rather than the graph, and the environment-not-agent framing
that the review then sharpened.

**Verdict, held jointly:** run A and B first. Either can kill it, both are one regeneration run each,
and neither requires building anything. If A shows markdown ≈ graph, this is a spec-writing practice
rather than a substrate. If B shows no transfer, it is documentation with a regeneration script.
