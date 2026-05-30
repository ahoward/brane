#!/usr/bin/env bun
//
// classify-usage.ts — is a dual-use word being used decoratively or technically?
//
// This is the semantic discriminator the no-slop hook leans on. "navigate to
// src/" is technical (fine); "navigate the landscape" is decorative (slop).
// A substring match cannot tell them apart. Meaning can.
//
// Two tiers, cheap-first:
//
//   1. EMBED  — embed the offending sentence (brane's own model2vec, 256-dim)
//               and compare cosine similarity to two centroids built from
//               exemplar sentences: known-decorative vs known-technical.
//               If one clearly wins, that's the verdict. No LLM call.
//
//   2. LLM    — only when the margin is small (genuinely ambiguous), escalate
//               to a single `claude -p --json-schema` call for a judgment.
//               Mirrors brane's existing LLM shell-out pattern exactly.
//
// Fail-open: if embeddings can't run AND the LLM can't run, return "allow".
// We never fall back to guessing — a dual-use word is innocent until a
// semantic judge convicts it.
//
// Contract (the hook depends on this):
//   stdin : JSON { word, sentence, exemplars: { decorative: string[], technical: string[] } }
//   stdout: JSON { verdict: "decorative" | "technical", how: "embed" | "llm" | "fail-open", reason }
//   exit  : always 0 (the hook reads stdout, not the exit code)
//
// Env:
//   BRANE_EMBED_MOCK=1     deterministic embeddings (demo/test)
//   BRANE_LLM_MOCK=1       skip the real LLM tiebreak (demo/test) → treated as fail-open at tier 2
//   BRANE_LLM_CLI=claude   which CLI to shell out to (default: claude)
//   NOSLOP_MARGIN=0.06     min cosine margin to trust the embed tier (default 0.06)
//

import { generate_embedding } from "../../src/lib/embed.ts"
import { spawn } from "node:child_process"

interface Input {
  word: string
  sentence: string
  exemplars: { decorative: string[]; technical: string[] }
}

interface Verdict {
  verdict: "decorative" | "technical"
  how: "embed" | "llm" | "fail-open"
  reason: string
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d === 0 ? 0 : dot / d
}

function centroid(vecs: number[][]): number[] | null {
  if (vecs.length === 0) return null
  const dim = vecs[0].length
  const c = new Array(dim).fill(0)
  for (const v of vecs) for (let i = 0; i < dim; i++) c[i] += v[i]
  for (let i = 0; i < dim; i++) c[i] /= vecs.length
  return c
}

// ── Tier 2: LLM tiebreak, mirroring src/lib/llm/cli.ts ───────────────────────

const AGENT_NESTING_VARS = ["CLAUDECODE", "CLAUDE_CODE", "GEMINI_SESSION"]

function clean_env(): Record<string, string | undefined> {
  const env = { ...process.env }
  for (const k of AGENT_NESTING_VARS) delete env[k]
  return env
}

function run_cli(args: string[], stdin: string): Promise<{ stdout: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0], args.slice(1), { stdio: ["pipe", "pipe", "pipe"], env: clean_env() })
    let stdout = ""
    proc.stdout.on("data", (c: Buffer) => { stdout += c.toString() })
    proc.on("error", reject)
    proc.on("close", (code: number | null) => resolve({ stdout, code: code ?? 1 }))
    proc.stdin.write(stdin); proc.stdin.end()
  })
}

const VERDICT_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["decorative", "technical"] },
    reason:  { type: "string" },
  },
  required: ["verdict", "reason"],
})

async function llm_tiebreak(word: string, sentence: string): Promise<Verdict | null> {
  if (process.env.BRANE_LLM_MOCK === "1") return null  // no real call in mock → fail-open at tier 2
  const cli = process.env.BRANE_LLM_CLI ?? "claude"
  const system = `You judge whether a single word is used DECORATIVELY (vague, promotional, "slop") or TECHNICALLY (precise, load-bearing) in a given sentence. Engineering prose where the word names a real operation, property, or target is technical. Marketing/abstract prose where the word could be deleted with no loss of meaning is decorative.`
  const user = `Word: "${word}"\nSentence: "${sentence}"\n\nIs "${word}" used decoratively or technically here?`
  const args = [cli, "-p", "--output-format", "json", "--system-prompt", system, "--json-schema", VERDICT_SCHEMA, "--no-session-persistence"]
  try {
    const { stdout, code } = await run_cli(args, user)
    if (code !== 0) return null
    const env = JSON.parse(stdout)
    const out = env.structured_output ?? env.result ?? env
    if (out?.verdict === "decorative" || out?.verdict === "technical") {
      return { verdict: out.verdict, how: "llm", reason: String(out.reason ?? "llm judgment") }
    }
  } catch {
    // fall through to fail-open
  }
  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const raw = await Bun.stdin.text()
  let input: Input
  try { input = JSON.parse(raw) } catch {
    return emit({ verdict: "technical", how: "fail-open", reason: "bad input JSON" })
  }

  const margin = parseFloat(process.env.NOSLOP_MARGIN ?? "") || 0.06

  // Tier 1: embedding similarity to the two exemplar centroids.
  const sent_vec = await generate_embedding(input.sentence)
  const dec_vecs = (await Promise.all(input.exemplars.decorative.map(generate_embedding))).filter((v): v is number[] => v !== null)
  const tec_vecs = (await Promise.all(input.exemplars.technical.map(generate_embedding))).filter((v): v is number[] => v !== null)
  const dec_c = centroid(dec_vecs)
  const tec_c = centroid(tec_vecs)

  if (sent_vec && dec_c && tec_c) {
    const dec_sim = cosine(sent_vec, dec_c)
    const tec_sim = cosine(sent_vec, tec_c)
    const gap = Math.abs(dec_sim - tec_sim)
    if (gap >= margin) {
      const decorative = dec_sim > tec_sim
      return emit({
        verdict: decorative ? "decorative" : "technical",
        how: "embed",
        reason: `embed: decorative=${dec_sim.toFixed(3)} technical=${tec_sim.toFixed(3)} (gap ${gap.toFixed(3)} ≥ ${margin})`,
      })
    }
    // Ambiguous — escalate.
    const llm = await llm_tiebreak(input.word, input.sentence)
    if (llm) return emit(llm)
    // Tier 2 unavailable (mock/offline/error): fail open.
    return emit({ verdict: "technical", how: "fail-open", reason: `ambiguous (gap ${gap.toFixed(3)} < ${margin}) and no LLM tiebreak available` })
  }

  // Tier 1 unavailable (no embeddings). Try LLM, else fail open.
  const llm = await llm_tiebreak(input.word, input.sentence)
  if (llm) return emit(llm)
  return emit({ verdict: "technical", how: "fail-open", reason: "no embeddings and no LLM tiebreak available" })
}

function emit(v: Verdict) {
  process.stdout.write(JSON.stringify(v))
}

await main()
