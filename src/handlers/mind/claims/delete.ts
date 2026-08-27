//
// delete.ts - remove a claim by id
//
// claims is an all-key relation, so :rm needs the full row: read, then remove.
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface DeleteParams {
  id?: number
}

interface DeleteResult {
  id:      number
  deleted: boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

  if (p.id === undefined || p.id === null) {
    return error({ id: [{ code: "required", message: "id is required" }] })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    const match = `*claims[id, subject_type, subject_id, predicate, assertion, authority, source, created_at], id = ${p.id}`

    const existing = await db.run(`
      ?[id, subject_type, subject_id, predicate, assertion, authority, source, created_at] := ${match}
    `)

    if ((existing.rows as unknown[][]).length === 0) {
      db.close()
      return error({ id: [{ code: "not_found", message: `claim not found: ${p.id}` }] })
    }

    await db.run(`
      ?[id, subject_type, subject_id, predicate, assertion, authority, source, created_at] := ${match}
      :rm claims { id, subject_type, subject_id, predicate, assertion, authority, source, created_at }
    `)

    db.close()

    return success({ id: p.id, deleted: true })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ claim: [{ code: "db_error", message }] })
  }
}
