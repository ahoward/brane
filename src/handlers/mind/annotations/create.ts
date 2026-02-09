//
// create.ts - create a new annotation on a concept
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import {
  open_mind,
  is_mind_error,
  concept_exists,
  get_next_annotation_id,
  is_valid_annotation_type,
  ensure_annotations_relation,
  ANNOTATION_TYPES,
  ANNOTATION_AUTHORITY,
  ANNOTATION_MAX_TEXT_LENGTH
} from "../../../lib/mind.ts"

interface CreateParams {
  target?: number
  text?:   string
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

export async function handler(params: Params): Promise<Result<Annotation>> {
  const p = (params ?? {}) as CreateParams

  // Validate target
  if (p.target === undefined || p.target === null) {
    return error({
      target: [{
        code:    "required",
        message: "target is required"
      }]
    })
  }

  // Validate text
  if (p.text === undefined || p.text === null || p.text === "") {
    return error({
      text: [{
        code:    "required",
        message: "text is required"
      }]
    })
  }

  if (p.text.length > ANNOTATION_MAX_TEXT_LENGTH) {
    return error({
      text: [{
        code:    "invalid",
        message: `text must be ${ANNOTATION_MAX_TEXT_LENGTH} characters or less`
      }]
    })
  }

  // Validate type (default to "caveat")
  const type = p.type ?? "caveat"
  if (!is_valid_annotation_type(type)) {
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

    // Check target concept exists
    if (!await concept_exists(db, p.target)) {
      db.close()
      return error({
        target: [{
          code:    "not_found",
          message: "concept not found"
        }]
      })
    }

    // Get next ID
    const id = await get_next_annotation_id(db)

    // Generate timestamp
    const created_at = new Date().toISOString()

    // Insert annotation
    const escaped_text = p.text.replace(/'/g, "''")
    await db.run(`
      ?[id, target, text, type, authority, created_at] <- [[${id}, ${p.target}, '${escaped_text}', '${type}', '${ANNOTATION_AUTHORITY}', '${created_at}']]
      :put annotations { id, target, text, type, authority, created_at }
    `)

    db.close()

    return success({
      id:         id,
      target:     p.target,
      text:       p.text,
      type:       type,
      authority:  ANNOTATION_AUTHORITY,
      created_at: created_at
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create annotation: ${message}`
      }]
    })
  }
}
