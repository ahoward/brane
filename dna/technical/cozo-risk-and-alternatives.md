# CozoDB: Maintenance Risk, Alternatives, and the SQLite Question

**Date:** 2026-08-27
**Status:** v2 — **recommendation reversed** after adversarial review (grok). See §7 for what changed
and why. The first draft argued for extracting a storage port and probably migrating to SQLite. That
was wrong, and the review found a live data-corruption bug while proving it.
**Question posed:** nobody is maintaining CozoDB. What are the alternatives, and should we roll our own
layer on SQLite? If we did, could we serve brane's goals better?

---

## 1. The facts, not the vibe

Pulled from the GitHub API today.

| Repo | Last push | Last release | Stars | State |
|---|---|---|---|---|
| `cozodb/cozo` (upstream) | **2024-12-04** | **v0.7.6, 2023-12-11** | 4,097 | not archived, 50 open issues |
| `cozo-community/cozo` (the community fork) | 2024-12-12 | — | 10 | effectively dormant |
| `ahoward/cozo` (**our** fork) | 2026-01-28 | — | 0 | the most recently touched of the three |

**Upstream has been silent for 21 months. The last tagged release is 32 months old.** The community fork
that was meant to carry it forward has ten stars and stopped a week after upstream did.

The third row is the one that matters: **we are already the most active maintainer of the CozoDB
lineage we depend on.** `package.json` pins `cozo-node` to `github:ahoward/cozo#feat/bundler-entry-point`
— we forked because upstream would not ship a bundler entry point. That happened before this question
was asked. The maintenance transfer already occurred; it just was not named.

So the risk is not "the project might die." It died. The live question is whether we keep paying to
own a Rust+RocksDB Datalog engine.

### The niche is empty

The obvious escape route closed while nobody was looking:

| Candidate | State | Verdict |
|---|---|---|
| **KuzuDB** — embedded graph, Cypher, vector index | **ARCHIVED 2025-10** (4,026 stars) | Dead. This was the strongest drop-in. |
| **SurrealDB** — embeddable, multi-model | Active (33k stars, pushed yesterday) | Alive, but a much larger dependency, its own query language, and a company-backed licence trajectory. Swapping one bespoke engine for another bespoke engine. |
| **DuckDB** — embedded analytical, recursive CTEs, VSS extension | Very active (41k stars) | Real option. But it is an OLAP engine; our workload is small, transactional, point-lookup heavy. Wrong shape. |
| **Oxigraph** — embedded RDF/SPARQL | Active (1.8k stars) | Genuinely interesting for a *claims* graph — RDF is a triple store and claims are nearly triples. But SPARQL is a bigger conceptual leap than SQL and the ecosystem is small. |
| **Datalevin / XTDB / Datahike** | Active-ish | JVM. Non-starter for a single-binary Bun CLI. |
| **SQLite + our own layer** | SQLite is the most-deployed database on earth | The subject of §3. |

There is no embedded-Datalog project to migrate *to*. That materially changes the calculus: this is not
"pick a better maintained equivalent," it is "own a dead engine, or stop needing one."

---

## 2. What do we actually use Cozo for?

Measured, not remembered:

- **232 `db.run()` call sites across 62 files.** That is the migration surface, and it is not small.
- `:put` 59 · `:rm` 32 · `:create` 27 · `<-` (inline literals) 56 · `::hnsw` 7 · `::remove` 6 · `::relations` 2 · `::explain` 2
- **Recursive Datalog appears exactly once in the entire codebase**: the built-in `cycles` rule, via a
  two-line `reachable` transitive closure.

> **Overreach, corrected.** The first draft concluded from this: "we are paying for an engine whose
> distinguishing feature we use once." That is survivorship bias. We chose Datalog, wrote everything in
> Datalog, and then counted recursion as if recursion were the reason we bought it.
>
> The features brane *actually* depends on are different and less replaceable:
> **stored programs as data** (rule bodies live in a relation and are executed by concatenation in
> `verify.ts` / `rules/query.ts`), **stratified negation** (`orphans` uses `not *edges[...]`),
> **HNSW over typed fixed-width vectors**, and **native backup/restore of a RocksDB tree**
> (`db.backup` / `db.restore` in `migrate.ts`, which is how migration safety works today).
>
> Also: the 232 figure mixes engines. `state.ts`, `memories.ts` and parts of calabi ingest are
> `bun:sqlite`. The Cozo surface is roughly 210, and a third of it is in four library files
> (`migrate.ts` 30, `mind.ts` 20, `lens.ts` 14, `claims.ts` 13), not spread evenly across handlers.

What survives the correction: recursion is used once, and much of the aggregation and ranking work
(`group_conflicts`, `resolve_claims`, tie-breaking) we already do in TypeScript on purpose (#113
research D5). Those are real. They are an argument that the query language is underused, not that the
engine is wrong.

### The one genuine capability

`/mind/rules/create` accepts an **arbitrary user-authored Datalog body** and executes it. That is a real
product feature — the "subjective linter," the validator arm of the whole spec-machine thesis — and it
is the only thing here that a SQLite port would genuinely change rather than merely re-implement.

Under SQLite, a user-authored rule becomes a `SELECT id, name FROM ...` returning the same `[id, name]`
contract, with `WITH RECURSIVE` available for the closure cases. Whether that is a downgrade depends on
your audience. Datalog is more elegant for graph reachability. **SQL is known by approximately everyone**,
and brane's rules are written by users and by LLMs — both of which know SQL far better than they know
Cozo's dialect of Datalog, which has no training corpus to speak of.

### The scar-tissue argument

The Deletion Test (#115) produced a specific, measured piece of evidence here. Of the four
"implementation remembers" items it surfaced, **three were Cozo idiosyncrasies**:

1. Cozo string literals use backslash escapes, not SQL doubling — a latent bug that silently rejected
   any rule body containing an apostrophe, undiscovered for months.

   > **This one is self-inflicted, not the engine's fault.** `CozoDb.run(script, params)` has taken a
   > parameter object all along (`src/lib/cozo.ts:22,58`), and CozoScript supports `$name`
   > placeholders. The round-2 regenerator in the Deletion Test used them and had no escaping problem
   > at all. Production code interpolates strings anyway, and several places still SQL-double
   > (`get_rule_by_name`, `lens.ts`, `lens/import.ts`, `concepts/create.ts`). The lesson is **stop
   > interpolating**, not **leave the engine**.
2. A relation declared without `=>` makes *all* columns the key, so `:rm` requires the full row —
   producing read-then-remove code in every delete path.
3. Positional arity coupling: the `contradictions` rule body hardcodes 8 columns, so adding a field to
   `claims` silently breaks a stored rule.

(2) and (3) are real engine rent. (1) is not — see the correction above.

And the review that produced these corrections found a **fourth** item of the same family, live in
production: `/mind/concepts/update` and `/mind/edges/update` do a bare `:put` on an all-key relation,
which is *insert*, not upsert. Renaming a concept leaves two rows with the same id. Filed as
[#129](https://github.com/ahoward/brane/issues/129); reproducible in three commands; the existing update
tests pass against it because they assert the returned envelope and never re-read the relation.

That cuts both ways. It is the strongest evidence yet that all-key relations are a footgun — and it is
also proof that the scar tissue is not contained or understood well enough to be traded away in a
migration. You do not port a store you have live corruption bugs in.

---

## 3. If we rolled our own on SQLite

### It is less of a rewrite than it looks

brane is **already mostly SQLite**. `body.db` (files, FTS5), `state.db` (brane-wide config), and
`memories.db` (the Hippocampus audit trail) are all SQLite via `bun:sqlite`. `mind.db` is the only
CozoDB store. The "Split-Brain Architecture" in the constitution — SQLite body, CozoDB mind — describes
a 3-to-1 split, not a 1-to-1 one.

Consolidating would mean: one embedded engine, one connection story, one backup story, one migration
story, one query language, and the ability to **join across body and mind in a single query** — which
today requires two round trips and a manual join in TypeScript (see the provenance path, and
`/context/query`).

### The schema is nearly mechanical

> **Corrected.** The first draft claimed "every Cozo relation is already a flat, typed, rectangular
> table." That is false. `concepts.vector` and `episodes.vector` are `<F32; 256>?` — a typed
> fixed-width vector with two HNSW indexes over them, which is not a SQL column. Ten relations use
> Cozo's `key => value` split. The `CREATE TABLE` sketch below silently drops the vector column, which
> makes it an illustration, not a migration plan.

With that caveat, the non-vector relations are ordinary — `edges` is a table with `source` and `target`
integer columns and traversal is a join.

```sql
CREATE TABLE concepts (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
  agent_id TEXT NOT NULL DEFAULT ''
);
CREATE TABLE edges (
  id INTEGER PRIMARY KEY, source INTEGER NOT NULL REFERENCES concepts(id),
  target INTEGER NOT NULL REFERENCES concepts(id),
  relation TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1.0, agent_id TEXT NOT NULL DEFAULT ''
);
CREATE TABLE claims (
  id INTEGER PRIMARY KEY, subject_type TEXT NOT NULL, subject_id INTEGER NOT NULL,
  predicate TEXT NOT NULL, assertion TEXT NOT NULL,
  authority TEXT NOT NULL REFERENCES authorities(name),
  source TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (subject_type, subject_id, predicate, assertion, authority, source)
);
```

Note what falls out for free in three lines that cost us real work under Cozo:

- `INTEGER PRIMARY KEY` replaces the hand-rolled `schema_meta` id counters (three of them: annotations,
  episodes, claims). The Deletion Test flagged the counter key name as an undetermined, silently
  data-corrupting decision — it ceases to exist.
- `UNIQUE(...)` makes #113's idempotency a schema guarantee instead of a pre-insert lookup.
- ~~`REFERENCES` + `ON DELETE CASCADE` makes `cascade_claims()` a declaration.~~ **Wrong.** Claims are
  polymorphic — `subject_id` points at `concepts` *or* `edges` depending on `subject_type`. SQLite
  cannot express one FK against two tables. You need two nullable FK columns, a trigger, or the
  function that already exists. #113's D8 traps do not disappear.

**The `contradictions` rule becomes:**

```sql
SELECT DISTINCT c.id, c.name FROM concepts c
JOIN claims a ON a.subject_type='concept' AND a.subject_id=c.id
JOIN claims b ON b.subject_type='concept' AND b.subject_id=c.id
WHERE a.predicate=b.predicate AND a.id<b.id AND a.assertion<>b.assertion;
```

**And `cycles`:**

```sql
WITH RECURSIVE reach(x,y) AS (
  SELECT source,target FROM edges WHERE relation='DEPENDS_ON'
  UNION SELECT r.x,e.target FROM reach r JOIN edges e ON e.source=r.y AND e.relation='DEPENDS_ON')
SELECT c.id,c.name FROM concepts c JOIN reach r ON r.x=c.id AND r.y=c.id;
```

That is the entire recursive-Datalog surface, replaced.

### Vectors

`sqlite-vec` (8,047 stars, pushed 2026-05-18) provides `vec0` virtual tables with KNN. It is a single
loadable extension, MIT, and more maintained than Cozo has been since 2023.

> **Corrected.** The first draft said "384-dim" — that came from a stale line in `CLAUDE.md`.
> `EMBED_DIM = 256` (`src/lib/embed.ts`), model2vec, not fastembed. **CLAUDE.md is wrong and should be
> fixed.**
>
> It also called HNSW "premature optimisation we have never measured," which is glib. HNSW is used by
> `/mind/search`, `/context/query` (`search_semantic`) and `/mind/episodes/search`; two migrations
> (v1.9.0, v1.10.0) drop and rebuild the indexes; nullable vectors are the graceful-degradation path
> when embedding fails. And `sqlite-vec` is another native artifact under `bun build --compile` — the
> exact class of problem that caused the `ahoward/cozo` fork in the first place. Swapping one native
> packaging headache for another is not a win.

### Where it gets hard — and this is the real cost

1. **232 call sites.** Even mechanical, that is a large, risky diff touching 62 files. The tc suite
   (432 cases) is the thing that makes it survivable, and it is genuinely good enough for the job —
   this is exactly the "durable evaluations let you regenerate with confidence" claim, and we would be
   cashing it in.
2. **Stored user rules break.** Every Datalog rule body in every existing `mind.db` becomes invalid.

   > **Corrected.** The first draft said "and every exported lens." Lens export emits YAML of golden
   > types and relations (`src/handlers/lens/export.ts`) and contains no Datalog. That padded the
   > scare. The stored-rule-bodies cost is real; the lens cost is invented.

   Worse than the migration: **the tc suite is not engine-agnostic here.** Locked fixtures carry
   CozoScript in `params.json` (`rules/create/00`, `rules/query/04`, `rules/query/12`). "Race both
   adapters against all 432 cases" fails by construction on every rules and verify case, and changing
   those fixtures needs a human under constitution IV.
3. **Loadable extensions and single-binary compilation.** `bun build --compile` currently bundles a
   native `.node` for Cozo. `sqlite-vec` is a different native artifact with the same class of
   cross-platform packaging problem we already forked Cozo to solve. Not obviously better; possibly
   avoidable by skipping the extension entirely (see above).
4. **Transactions and concurrency.** Cozo gave us MVCC via RocksDB. SQLite in WAL mode gives
   single-writer/multi-reader, which is what our MCP-server concurrency story (#48) already assumes and
   already implements with a lock file for `body.db`.
5. **Conceptual mass, in both directions.** #122 says compact before adding. A storage rewrite is the
   largest possible expansion event — *unless* it retires more than it adds, which here it plausibly
   does: minus one engine, minus one query language, minus three id allocators, minus a bespoke cascade
   function, minus the escaping helper, minus the arity coupling.

---

## 4. Does SQLite serve the spec-machine goals *better*?

This is the part that actually decides it, and the answer is yes — because of what #118–#128 need.

| Coming requirement | Under Cozo | Under SQLite |
|---|---|---|
| **#121 content-addressed ids** that survive regeneration | Hand-rolled alongside the existing integer counters | `TEXT` hash column with a `UNIQUE` index; trivial |
| **#120 claim lifecycle + selective invalidation** | Requires recursive Datalog over a dependency graph, or (realistically) another TypeScript projection | `WITH RECURSIVE` over `depends_on`, expressed once, executed in-engine |
| **#119 evaluations as first-class, linked to claims** | Another relation, another set of positional rule bodies | A table with a foreign key |
| **#127 semantic contradiction detection** | HNSW over claims — but Cozo's HNSW is per-relation and we would need a second index and vector column on `claims` | `vec0` table joined to `claims`, or brute force |
| **#128 cross-cutting obligations** | Edges + positional rules that break on schema change | Named-column joins that do not |
| **#124 verbatim assertions** | Escaping is the *reason* this failed; interpolation mangles whitespace | Parameter binding preserves bytes by construction |

> **Discounted after review.** This table is advocacy on unscheduled work. #118–#128 are findings from
> a spike; the committed roadmap is #114/#115/#116. Foreign keys do not implement a promotion gate and
> bound parameters do not implement regeneration. A content-addressed id column can be added to Cozo
> tomorrow. And #124/#128 were caused by *our* interpolation, not by the engine's — Cozo takes bound
> parameters.
>
> What survives: several of these are genuinely more pleasant with foreign keys and named columns. That
> is a tiebreaker for a future decision, not a reason to make one now.

There is also a thesis-level argument, and it is the one that holds up best. brane's pitch is that it is
the durable substrate implementations are regenerated from. **A substrate whose engine has not shipped a
release in 32 months is a claim we would have to defend to anyone considering adopting brane.**

The honest answer to that is not "so migrate to SQLite this quarter." It is: pin the fork, vendor the
binary, say plainly that we maintain it, and keep the migration path open by not building anything that
depends on Cozo semantics we cannot reproduce. That is a defensible position today and it costs a day,
not two quarters.

---

## 5. Recommendation (revised)

**Do not extract a storage port. Do not race adapters. Stay on the fork and fix what is actually
broken.**

The first draft recommended "extract the port now, build a SQLite adapter behind it, race them." The
adversarial review dismantled it and it deserved dismantling:

- **`sys.call` already is the hexagonal port.** Constitution III says *"sys.call is the public API"* and
  *"handlers are thin adapters."* I quoted the adapters line to justify a *second* port underneath, which
  inverts the principle. A repository interface built to host one hypothetical implementation is exactly
  the premature abstraction Principle VI forbids.
- **The race cannot be run as described.** The tc suite is not engine-agnostic where it matters: locked
  fixtures carry CozoScript in `params.json`. Every rules and verify case fails on a SQL adapter by
  construction, and relocking them needs a human under constitution IV.
- **"Twelve functions" was wishful.** Aggregations (`count(id)` grouped), query options (`:order`,
  `:limit`), inline relations (`input[id] <- [...]` then join), `str_includes`, HNSW with `k`
  over-fetch — a port either leaks CozoScript through the interface or absorbs every query, which *is*
  the rewrite Phase 1 claimed to defer.
- **It is the worst of both worlds**: pay the abstraction tax now and the migration tax later, while
  #114/#115/#116 wait.

### What to do instead, in order

**1. Fix [#129](https://github.com/ahoward/brane/issues/129) (this week).** Live data corruption on two shipped endpoints. Add tests that re-read
the relation after an update — the current ones would pass against the broken code.

**2. Stop interpolating strings into CozoScript.** `db.run()` has always taken a params object;
`$name` placeholders work. Convert the interpolation sites, delete the `esc_cozo` /
`.replace(/'/g, "''")` paths. This retires the entire escaping failure class **without changing
engines**, and it is what the Deletion Test's round-2 regenerator did unprompted when it met the problem
fresh. It also means [#128](https://github.com/ahoward/brane/issues/128)'s obligation is better stated as "never interpolate" than "fix
rules/create."

**3. Own the fork explicitly.** Pin `ahoward/cozo` to a commit rather than a branch, vendor the
prebuilt `.node`, verify we can still build it from source on current toolchains, and write down in
`dna/technical/` that upstream is dead and we are the maintainer. This is cheap and it is the actual
mitigation for the actual risk.

**4. Consider `id` as the declared key** for `concepts`, `edges`, `episodes` and `claims` — `:create
concepts { id: Int => name, type, vector, agent_id }`. That makes `:put` a genuine upsert, fixes #129
structurally, and removes the read-then-remove pattern everywhere. Not free: it is a schema migration
and it changes the arity of every positional rule body, including `contradictions`. Worth scoping as its
own feature, after #129 is stopped by the cheap fix.

**5. Get back to the roadmap.** #114 (promotion gate), #115 (regeneration), #116 (production as
teacher) are the scheduled work. #118–#128 are findings from a spike, not committed features, and using
them to justify a storage migration was advocacy dressed as requirements.

### On the SQLite question specifically

A SQLite or DuckDB `mind.db` remains a legitimate *future* move, and several of the arguments in §3 and
§4 survive review: the id-counter races, the polymorphic-cascade bookkeeping, the missing foreign keys,
the fact that RocksDB gave us a lockfile and a `sleep(10)` rather than the MVCC we imagined
(`multiTransact` is defined in `src/lib/cozo.ts` and called from nowhere; `calabi/scan.ts` sleeps
"to ensure RocksDB lock is released"). SQLite WAL would genuinely be an upgrade there.

But the way to do it, if we ever do, is to **rewrite handlers behind `sys.call`** — the port that
already exists — and relock the rules fixtures with human approval. Not to build a repository layer
first.

And DuckDB deserved better than "wrong shape." At a few thousand 256-dimension rows the OLTP/OLAP
distinction is cargo cult. If we ever leave Cozo, DuckDB is the only candidate that keeps recursion,
vectors and SQL without a loadable-extension circus as bad as `sqlite-vec`-inside-a-compiled-Bun-binary.

### The trigger list

Revisit the engine when one of these actually happens — not before:

- A Bun or Node ABI change breaks the prebuilt `.node` and we cannot rebuild it.
- A RocksDB or Cozo security issue we cannot patch in our fork.
- Measured performance failure at real corpus size.
- User-authored Datalog rules prove to be an unadopted feature — **currently unmeasured, and worth
  measuring**, because it is the one capability a SQL engine would genuinely change.

---

## 6. What would change my mind (back)

- We hit one of the triggers above.
- Converting to bound parameters turns out to be blocked or awkward across a large fraction of the
  ~210 Cozo sites — that would mean the escaping problem really is engine rent after all.
- The `id: Int =>` migration proves impossible without breaking stored user rules, which would say the
  positional-arity coupling is structural rather than incidental.

## 7. What the adversarial review changed

Recorded because the reversal is the useful artifact, not the original argument.

**Factual errors it caught in v1:**

| Claim in v1 | Reality |
|---|---|
| Parameter binding is a reason to prefer SQLite | Cozo has had `db.run(script, params)` and `$name` all along; we simply never used it |
| Every mind.db relation is flat and rectangular | `concepts.vector` / `episodes.vector` are `<F32; 256>?` with HNSW indexes; ten relations use `key => value` |
| `ON DELETE CASCADE` replaces `cascade_claims()` | Claims are polymorphic across two tables; SQLite cannot express that in one FK |
| Exported lenses would be invalidated | Lens export is YAML of golden types/relations, no Datalog |
| Vectors are 384-dim | 256, model2vec (`CLAUDE.md` is stale and should be fixed) |
| The tc suite is engine-agnostic, so race both adapters | Locked fixtures embed CozoScript; the race is unrunnable as described |
| 232 call sites, all Cozo, spread across handlers | ~210 Cozo, a third of them concentrated in four library files |
| HNSW is unmeasured premature optimisation | Used by three endpoints, rebuilt by two migrations, with a documented degradation path |

**Reasoning errors:** "recursive Datalog used once" is survivorship bias; the scar-tissue argument
over-attributed self-inflicted wounds to the engine; constitution III was quoted to justify the
abstraction it forbids; #118–#128 are spike findings, not scheduled requirements.

**And it found a live bug** — [#129](https://github.com/ahoward/brane/issues/129), update-duplicates-rows — by reading the code the memo was
arguing about instead of accepting the memo's account of it. That is the whole case for adversarial
review, and it is the same discipline as the antagonist step in the development loop: the reviewer's
job is to check the claims against the tree, not to agree with the argument.
