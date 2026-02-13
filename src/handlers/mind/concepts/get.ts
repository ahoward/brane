//
// get.ts - get a concept by ID
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface GetParams {
  id?: number
}

interface Concept {
  id:   number
  name: string
  type: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<Concept>> {
  const p = (params ?? {}) as GetParams

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
    // Query concept by ID
    const result = await db.run(`
      ?[id, name, type] := *concepts[id, name, type, _], id = ${p.id}
    `)

    db.close()

    const rows = result.rows as (number | string)[][]

    if (rows.length === 0) {
      return error({
        id: [{
          code:    "not_found",
          message: "concept not found"
        }]
      })
    }

    const row = rows[0]

    return success({
      id:   row[0] as number,
      name: row[1] as string,
      type: row[2] as string
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get concept: ${message}`
      }]
    })
  }
}
