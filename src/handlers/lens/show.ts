//
// show.ts - return current lens configuration
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_lens_config, type LensConfig } from "../../lib/lens.ts"

export async function handler(params: Params): Promise<Result<LensConfig>> {
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
    const config = await get_lens_config(db)
    db.close()
    return success(config)
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "query_error",
        message: `failed to get lens config: ${message}`
      }]
    })
  }
}
