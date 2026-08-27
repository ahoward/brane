//
// get.ts - fetch a single claim by id, with its authority rank
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import { fetch_claims_with_rank, type Claim } from "../../../lib/claims.ts"

interface GetParams {
  id?: number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<Claim>> {
  const p = (params ?? {}) as GetParams

  if (p.id === undefined || p.id === null) {
    return error({ id: [{ code: "required", message: "id is required" }] })
  }

  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    const claims = await fetch_claims_with_rank(db, { id: p.id })
    db.close()

    if (claims.length === 0) {
      return error({ id: [{ code: "not_found", message: `claim not found: ${p.id}` }] })
    }

    return success(claims[0])
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ claim: [{ code: "db_error", message }] })
  }
}
