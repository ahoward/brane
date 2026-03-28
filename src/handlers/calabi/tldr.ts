//
// tldr.ts - knowledge outline with synopses
//
// Loads the full graph (concepts, edges, episodes), sends to LLM
// for topical organization. Appends stats footer.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { tldr_knowledge } from "../../lib/llm/tldr.ts"
import { consume_llm_call } from "../../lib/rate-limit.ts"
import { is_mock_mode } from "../../lib/llm/index.ts"
import { get_active_lens_prompts } from "../../lib/state.ts"
import { sys } from "../../index.ts"

interface TldrParams {
  focus?:    string    // narrow to a topic
  limit?:    number    // max items to load (default 50)
  agent_id?: string
}

interface TldrTopic {
  title: string
  items: string[]
}

interface TldrResult {
  topics:      TldrTopic[]
  learnings:   string[]
  stats: {
    concepts:  number
    edges:     number
    episodes:  number
    topics:    number
  }
}

export async function handler(params: Params, emit?: Emit): Promise<Result<TldrResult>> {
  const p = (params ?? {}) as TldrParams

  const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 50
  const focus = typeof p.focus === "string" && p.focus.trim() ? p.focus.trim() : undefined
  const lens_prompt = get_active_lens_prompts()

  emit?.("progress", { phase: "loading" })

  // Load concepts
  let concepts: { id: number; name: string; type: string }[] = []

  if (focus) {
    const search_result = await sys.call("/mind/search", { query: focus, limit })
    concepts = search_result.status === "success"
      ? ((search_result.result as any)?.matches ?? []) as { id: number; name: string; type: string }[]
      : []
  }

  // Broad listing too
  const list_result = await sys.call("/mind/concepts/list", { limit })
  const listed = list_result.status === "success"
    ? ((list_result.result as any)?.concepts ?? []) as { id: number; name: string; type: string }[]
    : []

  const seen_ids = new Set(concepts.map(c => c.id))
  for (const c of listed) {
    if (!seen_ids.has(c.id)) {
      seen_ids.add(c.id)
      concepts.push(c)
    }
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
    ? ((episode_result.result as any)?.episodes ?? []) as { id: number; observation: string; context?: string; tags?: string[]; timestamp?: string }[]
    : []

  // Empty graph
  if (concepts.length === 0 && episodes.length === 0) {
    return success({
      topics: [],
      learnings: [],
      stats: { concepts: 0, edges: 0, episodes: 0, topics: 0 },
    })
  }

  // Rate limit
  if (!is_mock_mode()) {
    const rate = consume_llm_call()
    if (!rate.allowed) {
      return error({ rate_limit: [{ code: "rate_limit", message: rate.error ?? "rate limit exceeded" }] })
    }
  }

  emit?.("progress", { phase: "organizing" })

  let result
  try {
    result = await tldr_knowledge({
      concepts,
      edges,
      episodes,
      focus,
      lens_prompt,
    })
  } catch (e: any) {
    return error({ llm: [{ code: "tldr_failed", message: e.message ?? "LLM outline failed" }] })
  }

  return success({
    topics: result.topics,
    learnings: result.learnings,
    stats: {
      concepts: concepts.length,
      edges: edges.length,
      episodes: episodes.length,
      topics: result.topics.length,
    },
  })
}
