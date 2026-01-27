//
// create.ts - create a new concept
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type, get_next_concept_id } from "../../../lib/mind.ts"

interface CreateParams {
  name?: string
  type?: string
}

interface Concept {
  id:   number
  name: string
  type: string
}

export async function handler(params: Params): Promise<Result<Concept>> {
  const p = (params ?? {}) as CreateParams

  // Validate name
  if (p.name === undefined || p.name === null || p.name === "") {
    return error({
      name: [{
        code:    "required",
        message: "name is required"
      }]
    })
  }

  // Validate type
  if (p.type === undefined || p.type === null || p.type === "") {
    return error({
      type: [{
        code:    "required",
        message: "type is required"
      }]
    })
  }

  if (!is_valid_concept_type(p.type)) {
    return error({
      type: [{
        code:    "invalid",
        message: "type must be one of: Entity, Caveat, Rule"
      }]
    })
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
    // Get next ID
    const id = await get_next_concept_id(db)

    // Insert concept
    await db.run(`
      ?[id, name, type] <- [[${id}, '${p.name.replace(/'/g, "''")}', '${p.type}']]
      :put concepts { id, name, type }
    `)

    db.close()

    return success({
      id:   id,
      name: p.name,
      type: p.type
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create concept: ${message}`
      }]
    })
  }
}
