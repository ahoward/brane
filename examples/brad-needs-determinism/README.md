# brad-needs-determinism

> A working proof-of-concept for [Brad Feld's "stop saying honestly" problem](https://adventuresinclaude.ai/posts/honestly-stop-saying-honestly/) — built on brane.

## The problem

Brad's Claude kept dropping **"honestly"** into working chats — the filler word, not the virtue. He had a rule banning it. The rule had no teeth, so the word kept getting through.

> "We fixed it with a hook that reads Claude's own output after every message and forces a rewrite when a banned word slips past. The harder question was which words to leave alone. 'Robust,' 'navigate,' and 'leverage' are slop in marketing and exact in real engineering — a string match cannot tell the two apart, so banning them would block the actual work."

That last sentence is the whole game. Banning `honestly` is trivial. The interesting problem is **knowing which words to leave alone.**

## The fix — three moving parts

```
┌─────────────────┐   policy lives in    ┌──────────────────────────┐
│  brane memory   │ ◀────────────────────│  seed-policy.sh          │
│  (the policy)   │                       │  remember each word w/   │
│                 │                       │  a tier tag              │
│  honestly  ───────── tag: banned-word                             │
│  navigate  ───────── tag: dual-use                                │
└────────┬────────┘                       └──────────────────────────┘
         │ brane admin memory list --json
         ▼
┌─────────────────────────────────────────┐   blocks the turn   ┌──────────┐
│  .claude/hooks/no-slop.sh   (Stop hook)  │ ──────────────────▶ │  Claude  │
│  reads last message, scans, decides      │   reason = rewrite  │  rewrites│
└─────────────────────────────────────────┘                     └──────────┘
```

1. **The policy is a brane memory, not a hardcoded list.** Each banned word is a memory tagged `banned-word` (hard ban) or `dual-use` (context-aware). To change the policy you don't edit code — you `brane remember` a word. The policy is queryable (`brane recall "banned"`), auditable (every entry has a source and timestamp), and lives in a system of record.

2. **A `Stop` hook gives the rule teeth.** It fires when Claude finishes a turn, reads the last message from the transcript, fetches the policy from brane, and scans. Clean message → the turn ends. A violation → the hook returns `{"decision":"block","reason":"…rewrite without these…"}`, and Claude rewrites. It does not get to argue.

3. **Dual-use words are spared in real engineering use.** `navigate to src/` is fine. `navigate the landscape` is slop. The hook only flags a `dual-use` word when it sits next to slop-context trigger words (`landscape`, `journey`, `ecosystem`, `seamless`, `synergy`, …). Otherwise the word earns its keep, untouched.

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
| `seed-policy.sh` | Loads the two-tier policy into brane as tagged memories. |
| `demo.sh` | End-to-end proof against forged transcripts. |

## Tuning the context heuristic

The dual-use logic in `no-slop.sh` uses a `SLOP_CONTEXT` regex of trigger words — the abstract-noun company that slop keeps. It's a heuristic, deliberately: cheap, deterministic, no model call on every turn. Tighten it for your taste, or, if you want true semantic judgment, swap the regex check for a `brane recall` against a lens of known-slop phrases. The architecture doesn't change — only the discriminator does.
