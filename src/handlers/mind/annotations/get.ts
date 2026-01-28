//
// get.ts - get a single annotation by ID
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import {
  open_mind,
  is_mind_error,
  ensure_annotations_relation
} from "../../../lib/mind.ts"

interface GetParams {
  id?: number
}

interface Annotation {
  id:         number
  target:     number
  text:       string
  type:       string
  authority:  string
  created_at: string
}

export async function handler(params: Params): Promise<Result<Annotation>> {
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
    // Ensure annotations relation exists (for schema migration)
    await ensure_annotations_relation(db)

    // Query for annotation by ID
    const result = await db.run(`
      ?[id, target, text, type, authority, created_at] := *annotations[id, target, text, type, authority, created_at], id = ${p.id}
    `)

    const rows = result.rows as [number, number, string, string, string, string][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "annotation not found"
        }]
      })
    }

    const row = rows[0]

    db.close()

    return success({
      id:         row[0],
      target:     row[1],
      text:       row[2],
      type:       row[3],
      authority:  row[4],
      created_at: row[5]
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get annotation: ${message}`
      }]
    })
  }
}
