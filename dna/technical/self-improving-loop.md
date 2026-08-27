# The Self-Improving Loop

**Date:** 2026-08-27
**Status:** Design sketch, grounded in three completed runs of the Deletion Test (#115)
**Short version:** the Deletion Test is not an experiment we ran. It is one step of a training loop we
ran by hand, three times, and the loss went down when we expected it to.

---

## 1. The loop already happened

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

That is a training loop. The graph is the parameter set, the oracle is the loss function, and a claim is
the unit of update. We did three steps of it manually and got a clean causal result: remove the
accidental survivor and the failure appears; state the obligation and it disappears.

The self-improving system is not a new idea to invent. It is this, automated, with two things added
that we did by hand and by luck.

---

## 2. The gradient is better than the loss

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

So the loop's objective function is not "make the tests pass." It is **minimise free variables subject
to the tests passing.** Tests are a constraint; determinism is the objective.

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
otherwise have to rediscover, guess, or get wrong. That is a weaker claim than "self-improving AI" and
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

Six experiments, ordered by cost. Each has a prediction and a falsifier, because a loop you cannot
falsify is a belief system.

### E1 — Convergence

Run the loop N times on one module, writing claims from the free-variable list each round.

- **Measure:** free variables per round; test failures per round; claims added per round.
- **Predict:** free variables fall steeply, then plateau at *irreducible* ambiguity — genuine design
  freedom the spec should not remove (field ordering, internal factoring).
- **The interesting number is the plateau height,** not the slope. It is the floor of how determined a
  specification can make an implementation, and nobody knows what it is.
- **Falsified if:** the plateau is immediate, or free variables do not fall at all.

### E2 — Ablation (claim yield)

For each claim in the graph, remove it and regenerate.

- **Measure:** which tests break, which free variables reappear. That is the claim's *yield*.
- We ran one of these by accident: R2 vs R3 is a single-claim-cluster ablation with a clean result.
- **Use:** yield ranks claims. Zero-yield claims are candidates for deletion — this is the compaction
  discipline (#122) applied to the graph itself, with a number attached.
- **Falsified if:** yields are uniformly near zero, meaning the graph is decorative.

### E3 — Transfer (**the important one**)

Learn on module A, evaluate on module B.

- Train the graph by looping on `claims`. Then, *without adding anything module-specific*, regenerate
  `episodes` or `annotations`.
- **Measure:** free variables and failures on B, versus a control run against a graph that never saw A.
- **Predict:** convention-level and engine-level claims (escaping, id allocation, envelope shape,
  all-key `:rm`) transfer strongly; domain claims do not transfer at all.
- **This is the test of the "heterogeneous tasks" hypothesis.** If transfer is zero, the whole
  compounding story collapses and brane is a documentation tool.
- **Falsified if:** B's numbers are indistinguishable from control.

### E4 — Held-out oracle (anti-Goodhart)

Split the 432 cases. Loop against half. Score on the other half, never shown to the loop.

- **Measure:** the gap between training-half and held-out failures.
- **Predict:** a gap opens, because the loop learns the oracle as well as the domain. The size of the
  gap is how much of the "improvement" is overfitting.
- **This is the control that #131 proves we need.** Without it, 430/432 looks like success.
- **Falsified if:** held-out tracks training exactly — which would be a *good* result and would mean the
  claims are genuinely general.

### E5 — Adversarial yield

Run the antagonist each round, rewarded only for defects **outside** the current oracle.

- **Measure:** novel defects per round, and whether they are graph gaps or oracle gaps.
- Baseline exists: two rounds of Fable produced 3 blockers + 11 should-fixes; one grok pass produced two
  live bugs (#129, #131).
- **Predict:** yield decays but does not reach zero, because the antagonist is attacking a moving target.
- **Falsified if:** yield hits zero early — meaning the antagonist has learned the same blind spots and
  the loop is now closed in the bad sense.

### E6 — The floor test (cheapest, most commercially interesting)

Regenerate the same module with a small model and a rich graph, versus a large model and an empty graph.

- **Measure:** failures and free variables for {Haiku, Sonnet, Opus} × {no graph, trained graph}.
- **Predict:** the graph buys more than a model tier does, on tasks where the knowledge is
  project-specific rather than general.
- **If true, that is the product.** "Your cheap model plus your graph beats an expensive model without
  it" is a claim you can put a number on, and it is the strongest possible argument for the substrate.
- **Falsified if:** model capability dominates and the graph adds noise.

---

## 6. The metric that keeps it honest

One number, tracked every round:

```
compression = free variables eliminated / claims added
```

If this stays above ~1, the graph is *learning* — each claim removes more ambiguity than it introduces
surface. If it falls below 1 and stays there, the graph is *transcribing*: growing into a verbose
restatement of the implementation, which is the cache-of-a-cache failure and exactly how MDA died.

Pair it with total claim count. A loop that drives free variables to zero by writing 10,000 claims has
not built a specification; it has built an obfuscated copy of the code.

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
