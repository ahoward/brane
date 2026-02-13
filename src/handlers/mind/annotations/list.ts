//
// list.ts - list annotations with optional filters
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import {
  open_mind,
  is_mind_error,
  is_valid_annotation_type,
  ensure_annotations_relation,
  ANNOTATION_TYPES
} from "../../../lib/mind.ts"

interface ListParams {
  target?: number
  type?:   string
}

interface Annotation {
  id:         number
  target:     number
  text:       string
  type:       string
  authority:  string
  created_at: string
}

interface ListResult {
  annotations: Annotation[]
  count:       number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

  // Validate type filter if provided
  if (p.type !== undefined && p.type !== null && !is_valid_annotation_type(p.type)) {
    return error({
      type: [{
        code:    "invalid",
        message: `type must be one of: ${ANNOTATION_TYPES.join(", ")}`
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

    // Build query with optional filters
    let query = `?[id, target, text, type, authority, created_at] := *annotations[id, target, text, type, authority, created_at]`

    const conditions: string[] = []

    if (p.target !== undefined && p.target !== null) {
      conditions.push(`target = ${p.target}`)
    }

    if (p.type !== undefined && p.type !== null) {
      conditions.push(`type = '${p.type}'`)
    }

    if (conditions.length > 0) {
      query += `, ${conditions.join(", ")}`
    }

    const result = await db.run(query)
    const rows = result.rows as [number, number, string, string, string, string][]

    // Convert to annotation objects and sort by created_at descending
    const annotations: Annotation[] = rows
      .map(row => ({
        id:         row[0],
        target:     row[1],
        text:       row[2],
        type:       row[3],
        authority:  row[4],
        created_at: row[5]
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    db.close()

    return success({
      annotations: annotations,
      count:       annotations.length
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to list annotations: ${message}`
      }]
    })
  }
}
