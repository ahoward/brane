//
// list.ts - list provenance links by concept or file
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface ListParams {
  concept_id?: number
  file_url?:   string
}

interface Provenance {
  concept_id: number
  file_url:   string
}

interface ListResult {
  links: Provenance[]
  total: number
}

export async function handler(params: Params): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

  // Must provide at least one filter
  if ((p.concept_id === undefined || p.concept_id === null) &&
      (p.file_url === undefined || p.file_url === null || p.file_url === "")) {
    return error({
      params: [{
        code:    "required",
        message: "concept_id or file_url is required"
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
    let query: string

    if (p.concept_id !== undefined && p.concept_id !== null) {
      query = `
        ?[concept_id, file_url] := *provenance[concept_id, file_url], concept_id = ${p.concept_id}
      `
    } else {
      query = `
        ?[concept_id, file_url] := *provenance[concept_id, file_url], file_url = '${p.file_url!.replace(/'/g, "''")}'
      `
    }

    const result = await db.run(query)
    const rows = result.rows as [number, string][]

    const links: Provenance[] = rows.map(([concept_id, file_url]) => ({
      concept_id,
      file_url
    }))

    db.close()

    return success({
      links,
      total: links.length
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to list provenance: ${message}`
      }]
    })
  }
}
