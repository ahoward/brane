//
// get.ts - get a single rule by name
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, get_rule_by_name, type Rule } from "../../../lib/mind.ts"

interface GetParams {
  name?: string
}

export async function handler(params: Params): Promise<Result<Rule>> {
  const p = (params ?? {}) as GetParams

  // Validate name
  if (p.name === undefined || p.name === null || p.name === "") {
    return error({
      name: [{
        code:    "required",
        message: "name is required"
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
    // Get rule by name
    const rule = await get_rule_by_name(db, p.name)

    db.close()

    if (!rule) {
      return error({
        name: [{
          code:    "not_found",
          message: `rule not found: ${p.name}`
        }]
      })
    }

    return success(rule)
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to get rule: ${message}`
      }]
    })
  }
}
