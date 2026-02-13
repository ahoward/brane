//
// create.ts - create a provenance link between concept and file
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, concept_exists } from "../../../lib/mind.ts"
import { file_exists_in_body } from "../../../lib/body.ts"

interface CreateParams {
  concept_id?: number
  file_url?:   string
}

interface Provenance {
  concept_id: number
  file_url:   string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<Provenance>> {
  const p = (params ?? {}) as CreateParams

  // Validate concept_id
  if (p.concept_id === undefined || p.concept_id === null) {
    return error({
      concept_id: [{
        code:    "required",
        message: "concept_id is required"
      }]
    })
  }

  // Validate file_url
  if (p.file_url === undefined || p.file_url === null || p.file_url === "") {
    return error({
      file_url: [{
        code:    "required",
        message: "file_url is required"
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
    // Check concept exists
    if (!await concept_exists(db, p.concept_id)) {
      db.close()
      return error({
        concept_id: [{
          code:    "not_found",
          message: "concept not found"
        }]
      })
    }

    // Check file exists in body.db
    if (!file_exists_in_body(p.file_url)) {
      db.close()
      return error({
        file_url: [{
          code:    "not_found",
          message: "file not found in body.db"
        }]
      })
    }

    // Create provenance link (idempotent - put handles duplicates)
    await db.run(`
      ?[concept_id, file_url] <- [[${p.concept_id}, '${p.file_url.replace(/'/g, "''")}' ]]
      :put provenance { concept_id, file_url }
    `)

    db.close()

    return success({
      concept_id: p.concept_id,
      file_url:   p.file_url
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create provenance: ${message}`
      }]
    })
  }
}
