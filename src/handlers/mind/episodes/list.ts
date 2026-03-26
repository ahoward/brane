//
// list.ts - list episodes with optional filters
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface ListParams {
  agent_id?: string
  tag?:      string
  after?:    string
  before?:   string
  limit?:    number
}

interface Episode {
  id:                number
  agent_id:          string
  timestamp:         string
  observation:       string
  context:           string
  outcome:           string
  tags:              string[]
  source_concept_id: number
}

interface ListResult {
  episodes: Episode[]
  total:    number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

  const limit = p.limit ?? 100
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
    // Build filter conditions
    const conditions: string[] = []

    if (p.agent_id) {
      if (typeof p.agent_id !== "string") {
        db.close()
        return error({
          agent_id: [{ code: "invalid", message: "agent_id must be a string" }]
        })
      }
      conditions.push(`agent_id = '${p.agent_id.replace(/'/g, "''")}'`)
    }

    if (p.tag) {
      if (typeof p.tag !== "string") {
        db.close()
        return error({
          tag: [{ code: "invalid", message: "tag must be a string" }]
        })
      }
      // Use JSON.stringify to properly format the search fragment
      const search_fragment = JSON.stringify(p.tag).replace(/'/g, "''")
      conditions.push(`str_includes(tags, '${search_fragment}')`)
    }

    if (p.after) {
      conditions.push(`timestamp > '${p.after.replace(/'/g, "''")}'`)
    }

    if (p.before) {
      conditions.push(`timestamp < '${p.before.replace(/'/g, "''")}'`)
    }

    const filter_clause = conditions.length > 0 ? `, ${conditions.join(", ")}` : ""

    const result = await db.run(`
      ?[id, agent_id, timestamp, observation, context, outcome, tags, source_concept_id] :=
        *episodes[id, agent_id, timestamp, observation, context, outcome, tags, _, source_concept_id]${filter_clause}
      :order -timestamp
      :limit ${limit}
    `)

    const rows = result.rows as [number, string, string, string, string, string, string, number][]

    const episodes: Episode[] = rows.map(([id, agent_id, timestamp, observation, context, outcome, tags_json, source_concept_id]) => {
      let tags: string[] = []
      try {
        tags = JSON.parse(tags_json)
      } catch {
        // ignore
      }
      return { id, agent_id, timestamp, observation, context, outcome, tags, source_concept_id }
    })

    db.close()

    return success({
      episodes,
      total: episodes.length,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to list episodes: ${message}`
      }]
    })
  }
}
