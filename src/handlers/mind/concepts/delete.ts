//
// delete.ts - delete a concept
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface DeleteParams {
  id?: number
}

interface DeleteResult {
  deleted: boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

  // Validate id
  if (p.id === undefined || p.id === null) {
    return error({
      id: [{
        code:    "required",
        message: "id is required"
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
    // First check if concept exists
    const existing = await db.run(`
      ?[id, name, type] := *concepts[id, name, type, _], id = ${p.id}
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

    // Delete the concept (need all fields for :rm)
    await db.run(`
      ?[id, name, type, vector] := *concepts[id, name, type, vector], id = ${p.id}
      :rm concepts { id, name, type, vector }
    `)

    db.close()

    return success({
      deleted: true
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to delete concept: ${message}`
      }]
    })
  }
}
