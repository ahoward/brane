//
// enhance.ts - convergent refinement of existing knowledge
//
// Loads current graph state, asks LLM to identify:
// - Redundant concepts to merge
// - Missing edges between existing concepts
// - Contradictions, gaps, quality observations
//
// Does NOT add new topics. Only refines what's there.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { enhance_knowledge } from "../../lib/llm/enhance.ts"
import { consume_llm_call } from "../../lib/rate-limit.ts"
import { is_mock_mode } from "../../lib/llm/index.ts"
import { auto_tag } from "../../lib/auto-tag.ts"
import { sys } from "../../index.ts"
import { get_active_lens_prompts } from "../../lib/state.ts"

interface EnhanceParams {
  focus?:    string    // topic to focus refinement on
  rounds?:   number    // iterative passes (default 1)
  limit?:    number    // max context items (default 30)
  agent_id?: string
  dry_run?:  boolean
}

interface EnhanceRoundResult {
  round:              number
  merges_applied:     number
  edges_created:      number
  observations_added: number
  reasoning:          string
}

interface EnhanceResult {
  rounds_completed:     number
  total_merges:         number
  total_edges:          number
  total_observations:   number
  rounds:               EnhanceRoundResult[]
  dry_run:              boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<EnhanceResult>> {
  const p = (params ?? {}) as EnhanceParams

  const rounds = typeof p.rounds === "number" && p.rounds > 0 ? Math.min(p.rounds, 5) : 1
  const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 30
  const dry_run = p.dry_run === true
  const agent_id = typeof p.agent_id === "string" && p.agent_id.trim() ? p.agent_id.trim() : "cli"
  const focus = typeof p.focus === "string" && p.focus.trim() ? p.focus.trim() : undefined
  const lens_prompt = get_active_lens_prompts()

  const all_rounds: EnhanceRoundResult[] = []
  let total_merges = 0
  let total_edges = 0
  let total_observations = 0

  for (let round = 1; round <= rounds; round++) {
    emit?.("progress", { phase: "loading_context", round, total_rounds: rounds })

    // Load concepts — focused or broad
    let concepts: { id: number; name: string; type: string }[] = []

    if (focus) {
      const search_result = await sys.call("/mind/search", { query: focus, limit })
      concepts = search_result.status === "success"
        ? ((search_result.result as any)?.matches ?? []) as { id: number; name: string; type: string }[]
        : []
    }

    // Always include a broad sample too
    const list_result = await sys.call("/mind/concepts/list", { limit })
    const listed = list_result.status === "success"
      ? ((list_result.result as any)?.concepts ?? []) as { id: number; name: string; type: string }[]
      : []

    // Merge, dedup by id
    const seen_ids = new Set(concepts.map(c => c.id))
    for (const c of listed) {
      if (!seen_ids.has(c.id)) {
        seen_ids.add(c.id)
        concepts.push(c)
      }
    }

    // Nothing to refine
    if (concepts.length === 0) {
      return success({
        rounds_completed: 0,
        total_merges: 0,
        total_edges: 0,
        total_observations: 0,
        rounds: [],
        dry_run,
      })
    }

    // Load edges
    const edge_result = await sys.call("/mind/edges/list", { limit })
    const edges = edge_result.status === "success"
      ? ((edge_result.result as any)?.edges ?? []).map((e: any) => ({
          id: e.id,
          source_name: e.source_name ?? `concept#${e.source}`,
          target_name: e.target_name ?? `concept#${e.target}`,
          relation: e.relation,
        }))
      : []

    // Load episodes
    const episode_result = await sys.call("/mind/episodes/list", { limit: Math.ceil(limit / 2) })
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

    emit?.("progress", { phase: "analyzing", round, total_rounds: rounds })

    // LLM analysis
    let enhance_result
    try {
      enhance_result = await enhance_knowledge({
        concepts,
        edges,
        episodes,
        focus,
        round,
        total_rounds: rounds,
        lens_prompt,
      })
    } catch (e: any) {
      return error({ llm: [{ code: "enhance_failed", message: e.message ?? "LLM refinement failed" }] })
    }

    const ops = enhance_result.operations
    let merges_applied = 0
    let edges_created = 0
    let observations_added = 0

    // Apply merges (delete the redundant concept, keep the other)
    if (!dry_run) {
      for (const merge of ops.merge_concepts) {
        const remove = concepts.find(c => c.name === merge.remove_name)
        if (remove) {
          const del_result = await sys.call("/mind/concepts/delete", { id: remove.id })
          if (del_result.status === "success") {
            merges_applied++
          }
        }
      }
    } else {
      merges_applied = ops.merge_concepts.length
    }

    // Apply new edges
    if (!dry_run && ops.new_edges.length > 0) {
      const edge_items: { source: number; target: number; relation: string }[] = []
      for (const e of ops.new_edges) {
        const src = concepts.find(c => c.name === e.source_name)
        const tgt = concepts.find(c => c.name === e.target_name)
        if (src && tgt) {
          edge_items.push({ source: src.id, target: tgt.id, relation: e.relation })
        }
      }
      if (edge_items.length > 0) {
        const batch = await sys.call("/mind/edges/create-many", { items: edge_items })
        if (batch.status === "success") {
          edges_created = (batch.result as any)?.items?.length ?? 0
        }
      }
    } else if (dry_run) {
      edges_created = ops.new_edges.length
    }

    // Store observations as episodes
    if (!dry_run) {
      for (const obs of ops.observations) {
        const tags = auto_tag(obs.observation, obs.tags ?? [])
        const ep_result = await sys.call("/mind/episodes/create", {
          observation: obs.observation,
          context: obs.context ?? "enhance",
          tags,
          agent_id,
        })
        if (ep_result.status === "success") {
          observations_added++
        }
      }
    } else {
      observations_added = ops.observations.length
    }

    all_rounds.push({
      round,
      merges_applied,
      edges_created,
      observations_added,
      reasoning: enhance_result.reasoning,
    })

    total_merges += merges_applied
    total_edges += edges_created
    total_observations += observations_added
  }

  return success({
    rounds_completed: all_rounds.length,
    total_merges,
    total_edges,
    total_observations,
    rounds: all_rounds,
    dry_run,
  })
}
