//
// ask.ts - conversational synthesis over accumulated knowledge
//
// Vector-searches concepts + episodes for relevant context,
// enriches with graph neighbors, sends to LLM for synthesis.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { ask_knowledge } from "../../lib/llm/ask.ts"
import { consume_llm_call } from "../../lib/rate-limit.ts"
import { is_mock_mode } from "../../lib/llm/index.ts"
import { sys } from "../../index.ts"
import { get_active_lens_prompts } from "../../lib/state.ts"

interface AskParams {
  question:  string
  limit?:    number     // max context items to load (default 20)
  agent_id?: string     // filter by agent
  after?:    string     // time range
  before?:   string
  lens?:     string     // lens prompt to shape the answer
}

interface AskResult {
  answer:    string
  citations: {
    concept_ids: number[]
    episode_ids: number[]
    edge_ids:    number[]
  }
  context_loaded: {
    concepts: number
    episodes: number
    edges:    number
  }
}

export async function handler(params: Params, emit?: Emit): Promise<Result<AskResult>> {
  const p = (params ?? {}) as AskParams

  if (!p.question || typeof p.question !== "string" || !p.question.trim()) {
    return error({ question: [{ code: "required", message: "question is required" }] })
  }

  const question = p.question.trim()
  const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 20
  const half = Math.ceil(limit / 2)
  const lens_prompt = typeof p.lens === "string" && p.lens.trim() ? p.lens.trim() : get_active_lens_prompts()

  emit?.("progress", { phase: "searching", question })

  // Step 1: Vector search for relevant concepts
  const concept_params: Record<string, unknown> = { query: question, limit: half }
  if (p.agent_id) concept_params.agent_id = p.agent_id
  if (p.after) concept_params.after = p.after
  if (p.before) concept_params.before = p.before

  const concept_result = await sys.call("/mind/search", concept_params)
  const concept_matches = concept_result.status === "success"
    ? ((concept_result.result as any)?.matches ?? []) as { id: number; name: string; type: string; score: number }[]
    : []

  // Step 2: Vector search for relevant episodes
  const episode_params: Record<string, unknown> = { query: question, limit: half }
  if (p.agent_id) episode_params.agent_id = p.agent_id
  if (p.after) episode_params.after = p.after
  if (p.before) episode_params.before = p.before

  const episode_result = await sys.call("/mind/episodes/search", episode_params)
  const episode_matches = episode_result.status === "success"
    ? ((episode_result.result as any)?.matches ?? []) as { id: number; observation: string; context?: string; tags?: string[]; score: number }[]
    : []

  // Step 3: Graph enrichment — get neighbors of matched concepts
  emit?.("progress", { phase: "enriching" })

  const seen_concept_ids = new Set(concept_matches.map(c => c.id))
  const all_edges: { id: number; source_name: string; target_name: string; relation: string }[] = []
  const neighbor_concepts: typeof concept_matches = []

  for (const concept of concept_matches.slice(0, 5)) {  // limit neighbor lookups
    const neighbors_result = await sys.call("/graph/neighbors", { id: concept.id })
    if (neighbors_result.status !== "success") continue

    const data = neighbors_result.result as any
    const neighbors = data?.neighbors ?? {}

    for (const n of (neighbors.incoming ?? [])) {
      all_edges.push({
        id: n.edge_id,
        source_name: n.name,
        target_name: concept.name,
        relation: n.relation,
      })
      if (!seen_concept_ids.has(n.id)) {
        seen_concept_ids.add(n.id)
        neighbor_concepts.push({ id: n.id, name: n.name, type: n.type, score: 0 })
      }
    }

    for (const n of (neighbors.outgoing ?? [])) {
      all_edges.push({
        id: n.edge_id,
        source_name: concept.name,
        target_name: n.name,
        relation: n.relation,
      })
      if (!seen_concept_ids.has(n.id)) {
        seen_concept_ids.add(n.id)
        neighbor_concepts.push({ id: n.id, name: n.name, type: n.type, score: 0 })
      }
    }
  }

  // Combine direct matches + neighbors (direct matches first)
  const all_concepts = [...concept_matches, ...neighbor_concepts]

  // If we have nothing at all, return early
  if (all_concepts.length === 0 && episode_matches.length === 0) {
    return success({
      answer: "I don't have any relevant knowledge to answer this question. Try digesting some content first with `brane digest`.",
      citations: { concept_ids: [], episode_ids: [], edge_ids: [] },
      context_loaded: { concepts: 0, episodes: 0, edges: 0 },
    })
  }

  // Step 4: Rate limit check
  if (!is_mock_mode()) {
    const rate = consume_llm_call()
    if (!rate.allowed) {
      return error({ rate_limit: [{ code: "rate_limit", message: rate.error ?? "rate limit exceeded" }] })
    }
  }

  // Step 5: LLM synthesis
  emit?.("progress", { phase: "synthesizing" })

  let result
  try {
    result = await ask_knowledge({
      question,
      concepts: all_concepts,
      edges: all_edges,
      episodes: episode_matches,
      lens_prompt,
    })
  } catch (e: any) {
    return error({ llm: [{ code: "synthesis_failed", message: e.message ?? "LLM synthesis failed" }] })
  }

  return success({
    answer: result.answer,
    citations: result.citations,
    context_loaded: {
      concepts: all_concepts.length,
      episodes: episode_matches.length,
      edges: all_edges.length,
    },
  })
}
