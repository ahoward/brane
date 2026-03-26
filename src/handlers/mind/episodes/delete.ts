//
// delete.ts - delete an episode by ID
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface DeleteParams {
  id?: number
}

interface DeleteResult {
  deleted: boolean
  id:      number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

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
    // Check episode exists
    const check = await db.run(`
      ?[id] := *episodes[id, _, _, _, _, _, _, _, _], id = ${p.id}
    `)

    if ((check.rows as unknown[][]).length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "episode not found"
        }]
      })
    }

    // Delete
    await db.run(`
      ?[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id] :=
        *episodes[id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id],
        id = ${p.id}
      :rm episodes {
        id, agent_id, timestamp, observation, context, outcome, tags, vector, source_concept_id
      }
    `)

    db.close()

    return success({
      deleted: true,
      id:      p.id,
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to delete episode: ${message}`
      }]
    })
  }
}
