//
// list.ts - list claims, optionally projected to the winner per subject+predicate
//
// `resolve` is a read-time projection. It never writes, and it never removes
// the losing claims from an unresolved query.
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import {
  SUBJECT_TYPES,
  is_valid_subject_type,
  fetch_claims_with_rank,
  resolve_claims,
  type Claim
} from "../../../lib/claims.ts"

const DEFAULT_LIMIT = 100

interface ListParams {
  subject_type?: string
  subject_id?:   number
  predicate?:    string
  authority?:    string
  resolve?:      boolean
  limit?:        number
}

interface ListResult {
  claims:   Claim[]
  count:    number
  resolved: boolean
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const p = (params ?? {}) as ListParams

  if (p.subject_type !== undefined && p.subject_type !== null && !is_valid_subject_type(p.subject_type)) {
    return error({
      subject_type: [{
        code:    "invalid",
        message: `subject_type must be one of: ${SUBJECT_TYPES.join(", ")}`
      }]
    })
  }

  const limit = p.limit ?? DEFAULT_LIMIT

  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    return error({ limit: [{ code: "invalid", message: "limit must be a positive integer" }] })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    let claims = await fetch_claims_with_rank(db, {
      subject_type: p.subject_type ?? undefined,
      subject_id:   p.subject_id ?? undefined,
      predicate:    p.predicate ?? undefined,
      authority:    p.authority ?? undefined
    })

    const resolved = p.resolve === true

    if (resolved) {
      claims = resolve_claims(claims)
    }

    db.close()

    const page = claims.slice(0, limit)

    return success({
      claims:   page,
      count:    page.length,
      resolved: resolved
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ claims: [{ code: "db_error", message }] })
  }
}
