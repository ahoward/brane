# Brane: The Regenerative Specification Substrate

**Version:** 4.1
**Date:** 2026-08-24 (v4.0: 2026-08-19)
**Supersedes framing of:** `vision.md` (v3.0, "The Subjective Linter") — which is now
understood as the *validation arm* of the system described here.
**Origin:** Chad Fowler, "The Specification Is Not a Document"
(https://aicoding.leaflet.pub/3mtgs36dnq22o); reframe tracked in
[#112](https://github.com/ahoward/brane/issues/112).
**Corrected by:** `series-review-phoenix-architecture.md` — v4.0 was written from that one article.
It is #22 of 26 in a series whose thesis starts a year earlier. v4.1 folds in the correction.

---

## The Shift

Brane was framed as **memory for agents**. That undersold it. The same substrate — a
local-first knowledge graph with provenance, Datalog rules, lenses, and emergent
extraction — is the thing Fowler argues software actually needs and does not have: a
**specification that is not a document.**

> "The codebase used to be where the system kept its memory. It doesn't have to be
> anymore."

The durable specification should not be a file you read top to bottom. It should be a
**connected graph of claims, evidence, and provenance** — queryable from any
perspective, emerging as a consequence of the work, and kept honest by consequences.

Brane already is ~70% of that machine. This document names the target and the gap.

---

## Why Documents Fail

A rule like *"retry failed authorizations three times"* relates to payments, reliability,
external processors, incidents, SLOs, and compliance at once. A document forces it into
one location and fractures the rest. Specs, architecture docs, and source code all impose
a single hierarchy on knowledge that is multidimensional.

So the future engineer does not ask *"where is the spec?"* They ask:

- Who depends on this?
- Why does this retry happen?
- What production evidence contradicts this assumption?

Different questions, different views, **one underlying model.** That is a query problem,
not a document problem — and brane is a query engine over a graph.

---

## The Principles (and where brane stands)

**1. Strict about authority, loose about vocabulary.**
The model records *who* asserts something and with what standing, not a single blessed
phrasing. → brane has provenance and trust tiers; it needs a first-class **claim +
authority** model.

**2. Contradiction is data, not a defect.**
When product says 30-day refunds, legal says 14, and the implementation shows 45, those
are **three claims with three authorities and three sources** — represented, not hidden by
document structure. → brane can hold competing concepts but does not yet model the
conflict as such.

**3. Knowledge emerges from the work.**
Prior model-driven approaches (MDA, Intentional Programming) died because someone had to
"stop and document." Brane's extraction pipeline (AST + LLM + adversarial, session
ingestion, consolidation) means the graph **accrues as a side effect of building.** This
is brane's structural advantage over every predecessor. → already true.

**4. Observations are promoted, not assumed.**
Most of what the graph holds are observations. A human **ratifies** the few that should
"constrain future behavior" — promoting an observation to a requirement. → brane has
episodes → consolidate → concepts; it needs the explicit **promotion gate** with
authority.

**5. Regeneration is the epistemic test.**
> "Production is not the specification. Production teaches the specification."

Regenerate the implementation from the graph. When it fails production/eval tests, the
failure reveals **knowledge the implementation had that the graph did not.** This gives
the specification something a wiki can never have: **consequences.** Stale docs languish;
an incomplete spec breaks the regenerated code. → this is the **keystone gap**; brane
validates but does not regenerate.

**6. Validators enforce contracts — including subjective ones.**
This is the v3.0 "Subjective Linter" vision, now in its proper place. Correctness is
objective *and* subjective: does it make money, is it legal, does it harm the people who
use it. Brane's Datalog rules already encode enforceable properties. In the regenerative
loop, **the rules are the validators** that decide whether a regeneration is acceptable.

---

## The Loop

```
human question
    → LLM (interface, not authority)
    → structured retrieval over the graph
    → authoritative knowledge (claims + provenance)
    → LLM
    → human-readable view

...and, closing the loop:

graph (intent + claims + rules)
    → regenerate implementation
    → run production / eval tests
    → failures = uncaptured knowledge
    → promote to claims (with provenance: "production taught this")
    → graph is now truer than before
```

The LLM is the **interface**. Production supplies **evidence**. Humans decide which
observations become **intent**. Brane is the durable middle that survives all three.

---

## Scored Against the Four Phoenix Primitives

Fowler: *"The architecture of a regenerative system is defined entirely by what you can't delete."*
He names four non-deletable primitives. v4.0 measured brane against one of them.

| Primitive | brane | State |
|---|---|---|
| Behavioral specification (the *generative source*) | concepts, edges, claims (#113) | Partial, and inverted — brane's graph *describes* code that exists; Fowler's spec *drives* code that does not |
| Evaluations (runnable contracts on the running system) | — | Missing (see the v4.1 correction above) |
| Context boundary (contracts neighbors depend on) | — | Absent; unrepresented and untracked before this review |
| Provenance record (causal: *which requirement demanded this*) | file→concept→edge, episodes, claims | Strongest, but attributive rather than causal |

**Roughly 1.5 of 4 on primitives.** The "70%" below is real but it measures *infrastructure* — graph,
storage, query, provenance plumbing. Infrastructure is genuinely there. It is not the same as holding
the four things you cannot delete.

## What Brane Already Is (the 70% — of infrastructure)

| Spec-machine requirement | brane primitive |
|---|---|
| spec as graph, not document | `mind.db` concepts + edges |
| facts with provenance | provenance chain file→concept→edge (#012) |
| enforceable properties / validators | Datalog rules, `verify/check`, `pr-verify` (#016/17/19) |
| many views of one model | lenses / multi-lens (#025/#031) |
| knowledge emerges from work | `learn`/`ingest`/`ingest_sessions`, AST+LLM+adversarial (#030/#034) |
| observation accumulation | episodes → consolidate → concepts, auto-tagging |
| queryable, not readable | `ask` / context-query / graph-explore (#015/#027) |

## Brane's Own Deletion Test

> *"If I deleted this codebase and regenerated it from scratch, what would I rely on to decide whether
> the result was correct?" If your honest answer is "the old code," you have a problem.*
> — The Deletion Test

**Brane's honest answer today is the tc suite, not mind.db.** 432 language-agnostic cases bound to the
sys.call boundary, written before the implementation and locked against it by antagonistic review.
That is very close to what Fowler calls a durable evaluation, and brane has been practicing the
discipline since `000-harness` without naming it.

This is both the indictment and the opening: the asset exists, it just is not in the graph.

## The Gap (the 30% that makes it *the* spec machine)

0. **Extraction emits the wrong kind of knowledge.** `AuthService DEPENDS_ON TokenStore` is
   *descriptive* — regenerating from it yields nothing the code did not already say. Regeneration
   needs *normative* content ("retries must be idempotent, because incident #4471"). #113 built the
   container; nothing produces it yet. The "knowledge emerges from the work" advantage does not
   currently extend to the only content that makes regeneration possible.

1. **Claim + authority model** — claims carrying authority tier and source; contradiction
   representable as data. ✅ Shipped (#113). Note: this implemented authority as *standing* (who
   asserts, ranked). Fowler also uses authority as *jurisdiction* (which component is allowed to
   decide what) — unmodelled, and it should inform #114.
2. **Observation → requirement promotion** — the human-ratification gate.
3. **Regeneration + consequences** — generate from the graph, test, feed failures back.
   The keystone. Also the research risk: this is where MDA/IP failed, and brane only
   dodges their failure because its graph *emerges* rather than being hand-maintained.
   Prove it on a small corpus before betting the identity on it.
4. **Production as teacher** — ingest traces / incidents / eval results as evidence that
   promotes or contradicts claims.

---

## Relationship to the Executable-Architecture Thesis

> Humans declare intent. Machines generate implementations. Validators enforce contracts.

Brane is the reference implementation:
- **declare intent** = the graph of ratified claims
- **generate implementations** = regeneration (gap #3)
- **enforce contracts** = the Datalog rules / subjective linter (v3.0, already built)

Closing gap #3 completes the triangle. Everything else brane already ships.

---

## Non-Goals / Guardrails

- Not a document generator with extra steps. If the graph does not *emerge from the work*
  and *carry consequences*, it is just a wiki and we have failed the way MDA failed.
- The LLM is never the authority. It reads and renders; humans and production decide.
- Local-first, provenance-complete, offline — unchanged from v3.0.
