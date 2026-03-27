//
// storm.ts - divergent brainstorming over accumulated knowledge
//
// Loads context (vector search or broad sample), generates new
// concepts/edges/episodes + suggestions via LLM. Supports multi-round
// deepening where each round sees previous round's additions.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { storm_knowledge } from "../../lib/llm/storm.ts"
import { consume_llm_call } from "../../lib/rate-limit.ts"
import { is_mock_mode } from "../../lib/llm/index.ts"
import { auto_tag } from "../../lib/auto-tag.ts"
import { sys } from "../../index.ts"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

interface StormParams {
  seed?:     string    // topic to brainstorm about
  input?:    string    // file path to brainstorm against
  rounds?:   number    // iterative rounds (default 1)
  limit?:    number    // max context items per round (default 20)
  agent_id?: string
  dry_run?:  boolean
}

interface StormRoundResult {
  round:              number
  concepts_created:   number
  edges_created:      number
  episodes_created:   number
  suggestions:        { kind: string; value: string; reason: string }[]
  reasoning:          string
}

interface StormResult {
  rounds_completed:   number
  total_concepts:     number
  total_edges:        number
  total_episodes:     number
  suggestions:        { kind: string; value: string; reason: string }[]
  rounds:             StormRoundResult[]
  dry_run:            boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<StormResult>> {
  const p = (params ?? {}) as StormParams

  const rounds = typeof p.rounds === "number" && p.rounds > 0 ? Math.min(p.rounds, 5) : 1
  const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 20
  const dry_run = p.dry_run === true
  const agent_id = typeof p.agent_id === "string" && p.agent_id.trim() ? p.agent_id.trim() : "cli"
  const seed = typeof p.seed === "string" && p.seed.trim() ? p.seed.trim() : undefined

  // Load input file if provided
  let input_content: string | undefined
  if (typeof p.input === "string" && p.input.trim()) {
    const input_path = resolve(p.input.trim())
    if (!existsSync(input_path)) {
      return error({ input: [{ code: "not_found", message: `File not found: ${p.input}` }] })
    }
    try {
      input_content = readFileSync(input_path, "utf-8")
      if (input_content.length > 100_000) {
        input_content = input_content.slice(0, 100_000) + "\n\n[... truncated at 100KB ...]"
      }
    } catch (e: any) {
      return error({ input: [{ code: "read_failed", message: e.message ?? "Failed to read input file" }] })
    }
  }

  const all_rounds: StormRoundResult[] = []
  let total_concepts = 0
  let total_edges = 0
  let total_episodes = 0
  let all_suggestions: { kind: string; value: string; reason: string }[] = []

  for (let round = 1; round <= rounds; round++) {
    emit?.("progress", { phase: "loading_context", round, total_rounds: rounds })

    // Load context — seeded search or broad sample
    const query = seed ?? "knowledge graph overview"
    const half = Math.ceil(limit / 2)

    const concept_result = await sys.call("/mind/concepts/list", { limit: half })
    const concepts = concept_result.status === "success"
      ? ((concept_result.result as any)?.concepts ?? []) as { id: number; name: string; type: string }[]
      : []

    // Also vector search if we have a seed
    if (seed) {
      const search_result = await sys.call("/mind/search", { query: seed, limit: half })
      const matches = search_result.status === "success"
        ? ((search_result.result as any)?.matches ?? []) as { id: number; name: string; type: string }[]
        : []
      // Merge, dedup by id
      const seen = new Set(concepts.map(c => c.id))
      for (const m of matches) {
        if (!seen.has(m.id)) {
          seen.add(m.id)
          concepts.push(m)
        }
      }
    }

    // Load edges for context
    const edge_result = await sys.call("/mind/edges/list", { limit: half })
    const edges = edge_result.status === "success"
      ? ((edge_result.result as any)?.edges ?? []).map((e: any) => ({
          id: e.id,
          source_name: e.source_name ?? `concept#${e.source}`,
          target_name: e.target_name ?? `concept#${e.target}`,
          relation: e.relation,
        }))
      : []

    // Load episodes
    const episode_result = await sys.call("/mind/episodes/list", { limit: half })
    const episodes = episode_result.status === "success"
      ? ((episode_result.result as any)?.episodes ?? []) as { id: number; observation: string; context?: string; tags?: string[] }[]
      : []

    // Rate limit check
    if (!is_mock_mode()) {
      const rate = consume_llm_call()
      if (!rate.allowed) {
        return error({ rate_limit: [{ code: "rate_limit", message: rate.error ?? "rate limit exceeded" }] })
      }
    }

    emit?.("progress", { phase: "brainstorming", round, total_rounds: rounds })

    // LLM brainstorm
    let storm_result
    try {
      storm_result = await storm_knowledge({
        seed,
        input: input_content,
        concepts,
        edges,
        episodes,
        round,
        total_rounds: rounds,
      })
    } catch (e: any) {
      return error({ llm: [{ code: "storm_failed", message: e.message ?? "LLM brainstorming failed" }] })
    }

    // Write results to graph (unless dry run)
    let concepts_created = 0
    let edges_created = 0
    let episodes_created = 0

    if (!dry_run && storm_result.concepts.length > 0) {
      const batch = await sys.call("/mind/concepts/create-many", {
        items: storm_result.concepts.map(c => ({
          name: c.name,
          type: c.type,
          agent_id,
        })),
      })
      if (batch.status === "success") {
        concepts_created = (batch.result as any)?.items?.length ?? 0
      }
    }

    if (!dry_run && storm_result.edges.length > 0) {
      // Resolve edge names to IDs — look up concepts by name
      const edge_items: { source: number; target: number; relation: string }[] = []
      for (const e of storm_result.edges) {
        const src = await resolve_concept_id(e.source_name)
        const tgt = await resolve_concept_id(e.target_name)
        if (src && tgt) {
          edge_items.push({ source: src, target: tgt, relation: e.relation })
        }
      }

      if (edge_items.length > 0) {
        const batch = await sys.call("/mind/edges/create-many", { items: edge_items })
        if (batch.status === "success") {
          edges_created = (batch.result as any)?.items?.length ?? 0
        }
      }
    }

    if (!dry_run && storm_result.episodes.length > 0) {
      for (const ep of storm_result.episodes) {
        const tags = auto_tag(ep.observation, ep.tags ?? [])
        const ep_result = await sys.call("/mind/episodes/create", {
          observation: ep.observation,
          context: ep.context ?? "storm",
          tags,
          agent_id,
        })
        if (ep_result.status === "success") {
          episodes_created++
        }
      }
    }

    const round_result: StormRoundResult = {
      round,
      concepts_created: dry_run ? storm_result.concepts.length : concepts_created,
      edges_created: dry_run ? storm_result.edges.length : edges_created,
      episodes_created: dry_run ? storm_result.episodes.length : episodes_created,
      suggestions: storm_result.suggestions,
      reasoning: storm_result.reasoning,
    }

    all_rounds.push(round_result)
    total_concepts += round_result.concepts_created
    total_edges += round_result.edges_created
    total_episodes += round_result.episodes_created
    all_suggestions = [...all_suggestions, ...storm_result.suggestions]

    // Clear input for subsequent rounds (only use on first round)
    input_content = undefined
  }

  return success({
    rounds_completed: all_rounds.length,
    total_concepts,
    total_edges,
    total_episodes,
    suggestions: all_suggestions,
    rounds: all_rounds,
    dry_run,
  })
}

//
// Resolve a concept name to its ID
//
async function resolve_concept_id(name: string): Promise<number | null> {
  const result = await sys.call("/mind/concepts/list", { limit: 200 })
  if (result.status !== "success") return null
  const items = (result.result as any)?.concepts ?? []
  const match = items.find((c: any) => c.name === name)
  return match?.id ?? null
}
