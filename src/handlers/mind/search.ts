//
// search.ts - semantic search for concepts using vector similarity
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { generate_embedding, EMBED_DIM } from "../../lib/embed.ts"

interface SearchParams {
  query?:    string
  limit?:    number
  agent_id?: string
}

interface Match {
  id:    number
  name:  string
  type:  string
  score: number
}

interface SearchResult {
  matches: Match[]
}

export async function handler(params: Params, emit?: Emit): Promise<Result<SearchResult>> {
  const p = (params ?? {}) as SearchParams

  // Validate query
  if (p.query === undefined || p.query === null || p.query === "") {
    return error({
      query: [{
        code:    "required",
        message: "query is required"
      }]
    })
  }

  // Validate limit
  const limit = p.limit ?? 10
  if (typeof limit !== "number" || limit < 1 || !Number.isInteger(limit)) {
    return error({
      limit: [{
        code:    "invalid",
        message: "limit must be a positive integer"
      }]
    })
  }

  // Open mind.db
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
    // Generate embedding for query
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

    // Search using HNSW index
    // CozoDB HNSW search syntax uses vec() function for query vector
    const vector_str = JSON.stringify(query_embedding)

    // Over-fetch if agent_id filter is present (HNSW doesn't support WHERE)
    const has_agent_filter = typeof p.agent_id === "string" && p.agent_id.length > 0
    const fetch_k = has_agent_filter ? limit * 5 : limit

    const result = await db.run(`
      ?[id, name, type, agent_id, distance] := ~concepts:semantic{ id, name, type, agent_id | query: vec(${vector_str}), k: ${fetch_k}, ef: 50, bind_distance: distance }
    `)

    const rows = result.rows as [number, string, string, string, number][]

    // Convert distance to similarity score (cosine distance -> similarity)
    // Cosine distance is 1 - cos(a, b), so similarity = 1 - distance
    let matches: Match[] = rows.map(([id, name, type, _agent_id, distance]) => ({
      id,
      name,
      type,
      score: Math.round((1 - distance) * 1000) / 1000  // 3 decimal places
    }))

    // Post-filter by agent_id if specified
    if (has_agent_filter) {
      const agent_ids_by_id = new Map(rows.map(([id, , , agent_id]) => [id, agent_id]))
      matches = matches.filter(m => agent_ids_by_id.get(m.id) === p.agent_id)
      matches = matches.slice(0, limit)
    }

    db.close()

    return success({
      matches
    })
  } catch (err) {
    db.close()
    // CozoDB errors may be objects with display property or nested structure
    let message: string
    if (err instanceof Error) {
      message = err.message
    } else if (typeof err === "object" && err !== null) {
      message = JSON.stringify(err)
    } else {
      message = String(err)
    }
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to search: ${message}`
      }]
    })
  }
}
