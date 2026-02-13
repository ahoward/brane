//
// stats.ts - return usage stats for types and relations
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_lens_stats, type LensStats } from "../../lib/lens.ts"

export async function handler(params: Params, emit?: Emit): Promise<Result<LensStats>> {
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

  // Parse params
  const candidates_only = params.candidates_only === true

  try {
    const stats = await get_lens_stats(db, candidates_only)
    db.close()
    return success(stats)
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "query_error",
        message: `failed to get lens stats: ${message}`
      }]
    })
  }
}
