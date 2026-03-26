//
// search.ts - semantic search over episodes using vector similarity
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import { generate_embedding } from "../../../lib/embed.ts"

interface SearchParams {
  query?:    string
  limit?:    number
  agent_id?: string
  after?:    string
  before?:   string
}

interface EpisodeMatch {
  id:                number
  agent_id:          string
  timestamp:         string
  observation:       string
  context:           string
  outcome:           string
  tags:              string[]
  source_concept_id: number
  score:             number
}

interface SearchResult {
  matches: EpisodeMatch[]
}

export async function handler(params: Params, emit?: Emit): Promise<Result<SearchResult>> {
  const p = (params ?? {}) as SearchParams

  if (!p.query || typeof p.query !== "string" || p.query.trim() === "") {
    return error({
      query: [{
        code:    "required",
        message: "query is required"
      }]
    })
  }

  const limit = p.limit ?? 10
  if (typeof limit !== "number" || limit < 1 || !Number.isInteger(limit)) {
    return error({
      limit: [{
        code:    "invalid",
        message: "limit must be a positive integer"
      }]
    })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({
      mind: [{
        code:    mind.code,
        message: mind.message
      }]
    })
  }

  const { db } = mind

  try {
    const query_embedding = await generate_embedding(p.query)

    if (query_embedding === null) {
      db.close()
      return error({
        query: [{
          code:    "embedding_failed",
          message: "failed to generate embedding for query"
        }]
      })
    }

    const vector_str = JSON.stringify(query_embedding)

    // When filtering by agent_id post-search, fetch more candidates
    // to compensate for results that will be filtered out
    const fetch_k = p.agent_id ? limit * 5 : limit

    // HNSW search on episodes:semantic
    const result = await db.run(`
      ?[id, agent_id, timestamp, observation, context, outcome, tags, source_concept_id, archived, distance] :=
        ~episodes:semantic{
          id, agent_id, timestamp, observation, context, outcome, tags, source_concept_id, archived |
          query: vec(${vector_str}),
          k: ${fetch_k},
          ef: 50,
          bind_distance: distance
        }
    `)

    const rows = result.rows as [number, string, string, string, string, string, string, number, boolean, number][]

    let matches: EpisodeMatch[] = rows
      .filter(([_id, _aid, _ts, _obs, _ctx, _out, _tags, _src, archived]) => !archived)
      .map(([id, agent_id, timestamp, observation, context, outcome, tags_json, source_concept_id, _archived, distance]) => {
      let tags: string[] = []
      try {
        tags = JSON.parse(tags_json)
      } catch {
        // ignore
      }
      return {
        id,
        agent_id,
        timestamp,
        observation,
        context,
        outcome,
        tags,
        source_concept_id,
        score: Math.round((1 - distance) * 1000) / 1000,
      }
    })

    // Post-filters (HNSW doesn't support inline filters)
    if (p.agent_id) {
      matches = matches.filter(m => m.agent_id === p.agent_id)
    }
    if (p.after) {
      matches = matches.filter(m => m.timestamp > p.after!)
    }
    if (p.before) {
      matches = matches.filter(m => m.timestamp < p.before!)
    }
    matches = matches.slice(0, limit)

    db.close()

    return success({ matches })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to search episodes: ${message}`
      }]
    })
  }
}
