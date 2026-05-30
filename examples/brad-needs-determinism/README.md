# brad-needs-determinism

> A working proof-of-concept for [Brad Feld's "stop saying honestly" problem](https://adventuresinclaude.ai/posts/honestly-stop-saying-honestly/) — built on brane.

## The problem

Brad's Claude kept dropping **"honestly"** into working chats — the filler word, not the virtue. He had a rule banning it. The rule had no teeth, so the word kept getting through.

> "We fixed it with a hook that reads Claude's own output after every message and forces a rewrite when a banned word slips past. The harder question was which words to leave alone. 'Robust,' 'navigate,' and 'leverage' are slop in marketing and exact in real engineering — a string match cannot tell the two apart, so banning them would block the actual work."

That last sentence is the whole game. Banning `honestly` is trivial. The interesting problem is **knowing which words to leave alone.**

## The fix — three moving parts

```
┌─────────────────┐   policy + exemplars  ┌──────────────────────────┐
│  brane memory   │ ◀─────────────────────│  seed-policy.sh          │
│                 │                        │  remember each word +    │
│  honestly ──── banned-word               │  exemplar sentences w/   │
│  navigate ──── dual-use                  │  tier tags               │
│  "navigate to src/" ── exemplar,technical                          │
│  "navigate the landscape" ── exemplar,decorative                   │
└────────┬────────┘                        └──────────────────────────┘
         │ brane admin memory list --json
         ▼
┌─────────────────────────────────────────┐
│  .claude/hooks/no-slop.sh   (Stop hook)  │
│  reads last message, scans:              │
│   • banned-word → violation              │      ┌───────────────────────┐
│   • dual-use    → ask the judge ─────────┼─────▶│ classify-usage.ts     │
│                                          │      │ 1. embed vs centroids │
│                                          │◀─────┤ 2. LLM if uncertain   │
│   any violation → block + rewrite        │ dec/ │ 3. else fail-open     │
└────────────────────┬─────────────────────┘ tech└───────────────────────┘
                     │ {"decision":"block","reason":"…rewrite…"}
                     ▼
                 ┌──────────┐
                 │  Claude  │  rewrites (does not get to argue)
                 └──────────┘
```

1. **The policy is a brane memory, not a hardcoded list.** Each banned word is a memory tagged `banned-word` (hard ban) or `dual-use` (context-aware). To change the policy you don't edit code — you `brane remember` a word. The policy is queryable (`brane recall "banned"`), auditable (every entry has a source and timestamp), and lives in a system of record.

2. **A `Stop` hook gives the rule teeth.** It fires when Claude finishes a turn, reads the last message from the transcript, fetches the policy from brane, and scans. Clean message → the turn ends. A violation → the hook returns `{"decision":"block","reason":"…rewrite without these…"}`, and Claude rewrites. It does not get to argue.

3. **Dual-use words are judged by meaning, not pattern.** `navigate to src/` is fine. `navigate the landscape` is slop. The hook hands each dual-use occurrence to a semantic discriminator (`classify-usage.ts`) and only flags a **decorative** verdict. A technical use earns its keep, untouched.

## Why this is the "determinism" Brad wanted

A soft instruction is a probability. A hook is a guarantee. The model can't forget a hook, can't rationalize past it, can't have an off day. Enforcement moves out of the prompt (vibes) and into a program that runs every single turn (code). And because the *policy* lives in brane rather than inside that program, the guarantee is also legible and editable.

## Run it

No live Claude Code session needed — the hook is just a program (JSON in, JSON out), so the demo forges transcripts and runs the hook against them.

```bash
# from anywhere; uses brane from PATH, or set BRANE_BIN, or falls back to source
./demo.sh
```

You'll see four cases: `honestly` blocked, `navigate to src/` allowed, `navigate the landscape of robust seamless solutions` blocked, and a clean message allowed.

## Install into your own project

```bash
# 1. put the policy in brane (run once, in your project)
brane init                      # if you haven't already
./seed-policy.sh

# 2. copy the hook + settings into your project's .claude/
cp -r .claude/hooks/no-slop.sh   YOUR_PROJECT/.claude/hooks/
#    merge .claude/settings.json's "hooks" block into yours

# 3. add or remove words anytime — no code change
brane remember "synergy"  --from no-slop-policy -t banned-word,filler
brane remember "robust"   --from no-slop-policy -t dual-use,allow-in-engineering
```

## Files

| File | What it is |
|------|------------|
| `.claude/hooks/no-slop.sh` | The `Stop` hook. Reads the transcript, fetches the brane policy, decides block/allow. The heart of the thing. |
| `.claude/settings.json` | Wires the hook to the `Stop` event. |
| `classify-usage.ts` | The semantic discriminator: embed-then-LLM judgment of decorative vs technical use. |
| `seed-policy.sh` | Loads the two-tier policy **and the exemplars** into brane as tagged memories. |
| `demo.sh` | Narrative end-to-end proof against forged transcripts. |
| `test.sh` | Asserts the three discriminator tiers. Exit 0 = green. |

## The semantic discriminator (`classify-usage.ts`)

The interesting word is "navigate." Same word, opposite verdicts, decided by **meaning**:

```
$ echo '{"word":"navigate","sentence":"navigate to src/handlers and re-run the tests","exemplars":…}' | bun classify-usage.ts
{"verdict":"technical","how":"embed","reason":"embed: decorative=0.250 technical=0.580 (gap 0.331 ≥ 0.06)"}

$ echo '{"word":"navigate","sentence":"navigate the evolving landscape of robust seamless solutions","exemplars":…}' | bun classify-usage.ts
{"verdict":"decorative","how":"embed","reason":"embed: decorative=0.759 technical=0.351 (gap 0.408 ≥ 0.06)"}
```

Two tiers, cheap-first:

1. **Embed** — embed the offending sentence with brane's own local model (model2vec, 256-dim, **no API key**, ~200ms) and compare cosine similarity to two centroids: one built from known-**decorative** exemplar sentences, one from known-**technical** ones. If a clear winner emerges (`gap ≥ NOSLOP_MARGIN`, default 0.06), that's the verdict. No model call.

2. **LLM** — only when the margin is too small to trust does it escalate to a single `claude -p --json-schema` call (brane's existing shell-out pattern: `--output-format json`, structured output, nesting-env stripped) for a `{verdict, reason}` judgment.

**Fail-open, never guess.** If embeddings can't run *and* the LLM can't run, a dual-use word is **allowed**. We removed the old regex heuristic entirely — a dual-use word is innocent until a semantic judge convicts it. The price is honesty: real semantic judgment needs real embeddings or a real model, so `demo.sh` runs with real (local) embeddings rather than `BRANE_EMBED_MOCK` (which is random hashes with no meaning).

**The exemplars live in brane.** They're memories tagged `exemplar,decorative` / `exemplar,technical`. To sharpen the judge, add exemplars — no code change:

```bash
brane remember "Harden the parser to be robust against malformed input." \
  --from no-slop-exemplar -t exemplar,technical
```

That's the thesis in miniature: not just the *policy* but the *training signal* for the judgment lives in the agent's memory, queryable and auditable.
