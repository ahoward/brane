//
// update.ts - update a concept
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type } from "../../../lib/mind.ts"
import { generate_embedding } from "../../../lib/embed.ts"

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
          message: "type must be a non-empty string"
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
    // First get the existing concept (including vector)
    const existing = await db.run(`
      ?[id, name, type, vector] := *concepts[id, name, type, vector], id = ${p.id}
    `)

    const rows = existing.rows as any[][]

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
      id:     rows[0][0] as number,
      name:   rows[0][1] as string,
      type:   rows[0][2] as string,
      vector: rows[0][3]
    }

    // Apply updates
    const new_name = p.name !== undefined && p.name !== null && p.name !== "" ? p.name : current.name
    const new_type = p.type !== undefined && p.type !== null && p.type !== "" ? p.type : current.type

    // Regenerate embedding if name changed
    let vector_str: string
    if (new_name !== current.name) {
      const embedding = await generate_embedding(new_name)
      vector_str = embedding !== null ? `vec(${JSON.stringify(embedding)})` : "null"
    } else {
      // Preserve existing vector
      vector_str = current.vector !== null ? `vec(${JSON.stringify(current.vector)})` : "null"
    }

    // Update the concept
    await db.run(`
      ?[id, name, type, vector] <- [[${p.id}, '${new_name.replace(/'/g, "''")}', '${new_type}', ${vector_str}]]
      :put concepts { id, name, type, vector }
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
