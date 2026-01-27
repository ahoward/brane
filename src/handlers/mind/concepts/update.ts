//
// update.ts - update a concept
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type } from "../../../lib/mind.ts"

interface UpdateParams {
  id?:   number
  name?: string
  type?: string
}

interface Concept {
  id:   number
  name: string
  type: string
}

export async function handler(params: Params): Promise<Result<Concept>> {
  const p = (params ?? {}) as UpdateParams

  // Validate id
  if (p.id === undefined || p.id === null) {
    return error({
      id: [{
        code:    "required",
        message: "id is required"
      }]
    })
  }

  // Validate type if provided
  if (p.type !== undefined && p.type !== null && p.type !== "") {
    if (!is_valid_concept_type(p.type)) {
      return error({
        type: [{
          code:    "invalid",
          message: "type must be one of: Entity, Caveat, Rule"
        }]
      })
    }
  }

  // Open mind.db
  const mind = open_mind()

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
    // First get the existing concept
    const existing = await db.run(`
      ?[id, name, type] := *concepts[id, name, type], id = ${p.id}
    `)

    const rows = existing.rows as (number | string)[][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "concept not found"
        }]
      })
    }

    const current = {
      id:   rows[0][0] as number,
      name: rows[0][1] as string,
      type: rows[0][2] as string
    }

    // Apply updates
    const new_name = p.name !== undefined && p.name !== null && p.name !== "" ? p.name : current.name
    const new_type = p.type !== undefined && p.type !== null && p.type !== "" ? p.type : current.type

    // Update the concept
    await db.run(`
      ?[id, name, type] <- [[${p.id}, '${new_name.replace(/'/g, "''")}', '${new_type}']]
      :put concepts { id, name, type }
    `)

    db.close()

    return success({
      id:   p.id,
      name: new_name,
      type: new_type
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to update concept: ${message}`
      }]
    })
  }
}
