//
// delete.ts - delete an annotation by ID
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import {
  open_mind,
  is_mind_error,
  ensure_annotations_relation
} from "../../../lib/mind.ts"

interface DeleteParams {
  id?: number
}

interface DeleteResult {
  deleted: boolean
  id:      number
}

export async function handler(params: Params): Promise<Result<DeleteResult>> {
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
    // Ensure annotations relation exists (for schema migration)
    await ensure_annotations_relation(db)

    // First check if annotation exists and get all columns (required for :rm)
    const existing = await db.run(`
      ?[id, target, text, type, authority, created_at] := *annotations[id, target, text, type, authority, created_at], id = ${p.id}
    `)

    const rows = existing.rows as (number | string)[][]

    if (rows.length === 0) {
      db.close()
      return error({
        id: [{
          code:    "not_found",
          message: "annotation not found"
        }]
      })
    }

    // Delete annotation (CozoDB requires all columns)
    await db.run(`
      ?[id, target, text, type, authority, created_at] := *annotations[id, target, text, type, authority, created_at], id = ${p.id}
      :rm annotations { id, target, text, type, authority, created_at }
    `)

    db.close()

    return success({
      deleted: true,
      id:      p.id
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to delete annotation: ${message}`
      }]
    })
  }
}
