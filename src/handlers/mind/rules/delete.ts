//
// delete.ts - delete a custom rule
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, get_rule_by_name, is_builtin_rule } from "../../../lib/mind.ts"

interface DeleteParams {
  name?: string
}

interface DeleteResult {
  deleted: true
  name:    string
}

export async function handler(params: Params): Promise<Result<DeleteResult>> {
  const p = (params ?? {}) as DeleteParams

  // Validate name
  if (p.name === undefined || p.name === null || p.name === "") {
    return error({
      name: [{
        code:    "required",
        message: "name is required"
      }]
    })
  }

  // Check if trying to delete built-in rule
  if (is_builtin_rule(p.name)) {
    return error({
      name: [{
        code:    "protected",
        message: "cannot delete built-in rule"
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
    // Check if rule exists
    const existing = await get_rule_by_name(db, p.name)
    if (!existing) {
      db.close()
      return error({
        name: [{
          code:    "not_found",
          message: `rule not found: ${p.name}`
        }]
      })
    }

    // Delete rule - CozoDB requires selecting full row to delete
    const escapedName = p.name.replace(/"/g, '\\"')
    await db.run(`
      ?[name, description, body, builtin] := *rules[name, description, body, builtin], name = "${escapedName}"
      :rm rules { name, description, body, builtin }
    `)

    db.close()

    return success({
      deleted: true,
      name:    p.name
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to delete rule: ${message}`
      }]
    })
  }
}
