//
// delete.ts - delete provenance link(s)
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface DeleteParams {
  concept_id?: number
  file_url?:   string
}

interface DeleteSingleResult {
  deleted: boolean
}

interface DeleteByFileResult {
  deleted:  number
  file_url: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteSingleResult | DeleteByFileResult>> {
  const p = (params ?? {}) as DeleteParams

  // file_url is always required
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
    // If concept_id provided, delete single link
    if (p.concept_id !== undefined && p.concept_id !== null) {
      // Check if link exists
      const existing = await db.run(`
        ?[concept_id, file_url] := *provenance[concept_id, file_url],
          concept_id = ${p.concept_id},
          file_url = '${p.file_url.replace(/'/g, "''")}'
      `)

      const rows = existing.rows as [number, string][]

      if (rows.length === 0) {
        db.close()
        return error({
          provenance: [{
            code:    "not_found",
            message: "provenance link not found"
          }]
        })
      }

      // Delete single link
      await db.run(`
        ?[concept_id, file_url] <- [[${p.concept_id}, '${p.file_url.replace(/'/g, "''")}']]
        :rm provenance { concept_id, file_url }
      `)

      db.close()

      return success({
        deleted: true
      })
    }

    // Otherwise, delete all links for file
    // First, count how many links exist
    const existing = await db.run(`
      ?[concept_id, file_url] := *provenance[concept_id, file_url],
        file_url = '${p.file_url.replace(/'/g, "''")}'
    `)

    const rows = existing.rows as [number, string][]
    const count = rows.length

    if (count > 0) {
      // Delete all links for file
      await db.run(`
        ?[concept_id, file_url] := *provenance[concept_id, file_url],
          file_url = '${p.file_url.replace(/'/g, "''")}'
        :rm provenance { concept_id, file_url }
      `)
    }

    db.close()

    return success({
      deleted:  count,
      file_url: p.file_url
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to delete provenance: ${message}`
      }]
    })
  }
}
