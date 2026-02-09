PROSE EXAMPLES
==============

Three problems brane solves for writers. Each script is runnable proof.


01 — PLOT HOLES
---------------

**Problem:** You're 200 pages into a murder mystery. The Butler is
interviewed in London in Chapter 12. His alibi in Chapter 15 says he
never left Edinburgh. No spellchecker catches this. No grammar tool
catches this. It's a structural contradiction — the kind that lives in
the gaps between chapters, invisible until a reader emails you about it.

**What brane does:** Model characters, locations, and events as
concepts. Connect them with edges. The graph makes contradictions
visible — The Butler is `PRESENT_AT` both London and Edinburgh.
`brane verify` catches Lady Ashworth as an orphan — mentioned in the
cast but never connected to any scene.

```bash
./01-plot-holes.sh
```


02 — DISCOVERY
--------------

**Problem:** You're revising King Aldric's death scene. You know about
the King. But do you know that his death breaks the Iron Treaty with
the Dwarven Holds? That it triggers the Succession Crisis? That the
Prophecy names his son? You thought you were editing one scene. You're
touching four plot threads.

**What brane does:** `brane search "king"` finds semantically related
concepts — not just exact name matches. `brane graph neighbors 1`
shows everything connected to Aldric: the treaty he guarantees, the
crisis his death triggers, the curse that targets him. The graph shows
you what your memory can't hold: every thread that unravels when you
pull one.

```bash
./02-discovery.sh
```


03 — CONTINUITY
---------------

**Problem:** Your editor says "cut Handler Diaz, she's boring." Before
you delete 40 pages, you need to know: what breaks? The Mole's entire
arc — manipulating Diaz to feed disinformation — collapses. Director
Yuen has no one to command. CIA Headquarters becomes set dressing for
no scene. She's not boring. She's load-bearing.

**What brane does:** `brane graph neighbors 2` shows Diaz has 6
connections. Compare that to the Mole (1 connection) and Director Yuen
(1 connection) — both connected to the story *only* through Diaz.
You didn't have to reread 300 pages to see this. The graph already
knew.

```bash
./03-continuity.sh
```


RUNNING
-------

All three scripts are self-contained. They create a temp workspace,
build a knowledge graph, demonstrate the problem, and clean up.

```bash
# run one
./01-plot-holes.sh

# run all three
for f in ./0*.sh; do echo "=== $f ===" && $f && echo ""; done
```

Requires the `brane` binary (run `bun run build` from the repo root).
