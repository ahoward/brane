//
// list.ts - the authority registry, rank descending
//

import type { Params, Result, Emit } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"
import { get_authorities, type Authority } from "../../../lib/claims.ts"

interface ListResult {
  authorities: Authority[]
  count:       number
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const mind = await open_mind()

  if (is_mind_error(mind)) {
    return error({ mind: [{ code: mind.code, message: mind.message }] })
  }

  const { db } = mind

  try {
    const authorities = await get_authorities(db)
    db.close()

    return success({ authorities: authorities, count: authorities.length })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({ authorities: [{ code: "db_error", message }] })
  }
}
