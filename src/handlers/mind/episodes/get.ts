//
// get.ts - retrieve a single episode by ID
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface GetParams {
  id?: number
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

export async function handler(params: Params, emit?: Emit): Promise<Result<Episode>> {
  const p = (params ?? {}) as GetParams

  if (p.id === undefined || p.id === null) {
    return error({
      id: [{
        code:    "required",
        message: "id is required"
      }]
    })
  }

  if (typeof p.id !== "number" || !Number.isInteger(p.id)) {
    return error({
      id: [{
        code:    "invalid",
        message: "id must be an integer"
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
    const result = await db.run(`
      ?[id, agent_id, timestamp, observation, context, outcome, tags, source_concept_id] :=
        *episodes[id, agent_id, timestamp, observation, context, outcome, tags, _, source_concept_id],
        id = ${p.id}
    `)

    const rows = result.rows as [number, string, string, string, string, string, string, number][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "episode not found"
        }]
      })
    }

    const [id, agent_id, timestamp, observation, context, outcome, tags_json, source_concept_id] = rows[0]

    let tags: string[] = []
    try {
      tags = JSON.parse(tags_json)
    } catch {
      // tags stored as non-JSON — treat as empty
    }

    db.close()

    return success({
      id,
      agent_id,
      timestamp,
      observation,
      context,
      outcome,
      tags,
      source_concept_id,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get episode: ${message}`
      }]
    })
  }
}
