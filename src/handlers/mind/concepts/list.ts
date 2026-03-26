//
// list.ts - list all concepts
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, is_valid_concept_type } from "../../../lib/mind.ts"

interface ListParams {
  type?:     string
  agent_id?: string
}

interface Concept {
  id:       number
  name:     string
  type:     string
  agent_id: string | null
}

interface ListResult {
  concepts: Concept[]
  total:    number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
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
    // Query concepts with optional filters
    const conditions: string[] = []

    if (p.type) {
      conditions.push(`type = '${p.type}'`)
    }

    if (typeof p.agent_id === "string" && p.agent_id.length > 0) {
      conditions.push(`agent_id = '${p.agent_id.replace(/'/g, "''")}'`)
    }

    const where_clause = conditions.length > 0 ? `, ${conditions.join(", ")}` : ""
    const query = `?[id, name, type, agent_id] := *concepts[id, name, type, _, agent_id]${where_clause}`

    const result = await db.run(query)

    db.close()

    const rows = result.rows as (number | string)[][]

    const concepts: Concept[] = rows.map(row => ({
      id:       row[0] as number,
      name:     row[1] as string,
      type:     row[2] as string,
      agent_id: (row[3] as string) || null,
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
