//
// conflicts.ts - where does this graph contradict itself?
//
// A conflict group is one subject+predicate carrying two or more distinct
// assertions. Every competing claim stays in the group; the highest-rank one
// is named as the resolution, and a tie at the top does not resolve at all.
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import {
  SUBJECT_TYPES,
  is_valid_subject_type,
  fetch_claims_with_rank,
  group_conflicts,
  type ConflictGroup
} from "../../../lib/claims.ts"

interface ConflictsParams {
  subject_type?: string
  subject_id?:   number
  predicate?:    string
}

interface ConflictsResult {
  conflicts: ConflictGroup[]
  count:     number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ConflictsResult>> {
  const p = (params ?? {}) as ConflictsParams

  if (p.subject_type !== undefined && p.subject_type !== null && !is_valid_subject_type(p.subject_type)) {
    return error({
      subject_type: [{
        code:    "invalid",
        message: `subject_type must be one of: ${SUBJECT_TYPES.join(", ")}`
      }]
    })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    const claims = await fetch_claims_with_rank(db, {
      subject_type: p.subject_type ?? undefined,
      subject_id:   p.subject_id ?? undefined,
      predicate:    p.predicate ?? undefined
    })

    db.close()

    // groups are returned whole - no truncation, or the contradiction is hidden
    const conflicts = group_conflicts(claims)

    return success({ conflicts: conflicts, count: conflicts.length })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ conflicts: [{ code: "db_error", message }] })
  }
}
