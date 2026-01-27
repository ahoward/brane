//
// list.ts - list all concepts
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type } from "../../../lib/mind.ts"

interface ListParams {
  type?: string
}

interface Concept {
  id:   number
  name: string
  type: string
}

interface ListResult {
  concepts: Concept[]
  total:    number
}

export async function handler(params: Params): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

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
    // Query concepts
    let query: string

    if (p.type) {
      query = `?[id, name, type] := *concepts[id, name, type], type = '${p.type}'`
    } else {
      query = `?[id, name, type] := *concepts[id, name, type]`
    }

    const result = await db.run(query)

    db.close()

    const rows = result.rows as (number | string)[][]

    const concepts: Concept[] = rows.map(row => ({
      id:   row[0] as number,
      name: row[1] as string,
      type: row[2] as string
    }))

    return success({
      concepts: concepts,
      total:    concepts.length
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to list concepts: ${message}`
      }]
    })
  }
}
