//
// create.ts - create a custom rule
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, get_rule_by_name, is_builtin_rule, validate_rule_syntax, type Rule } from "../../../lib/mind.ts"

interface CreateParams {
  name?:        string
  description?: string
  body?:        string
}

export async function handler(params: Params): Promise<Result<Rule>> {
  const p = (params ?? {}) as CreateParams

  // Validate name
  if (p.name === undefined || p.name === null || p.name === "") {
    return error({
      name: [{
        code:    "required",
        message: "name is required"
      }]
    })
  }

  // Validate description
  if (p.description === undefined || p.description === null || p.description === "") {
    return error({
      description: [{
        code:    "required",
        message: "description is required"
      }]
    })
  }

  // Validate body
  if (p.body === undefined || p.body === null || p.body === "") {
    return error({
      body: [{
        code:    "required",
        message: "body is required"
      }]
    })
  }

  // Check if trying to overwrite built-in rule
  if (is_builtin_rule(p.name)) {
    return error({
      name: [{
        code:    "protected",
        message: "cannot overwrite built-in rule"
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
    // Check if rule already exists
    const existing = await get_rule_by_name(db, p.name)
    if (existing) {
      db.close()
      return error({
        name: [{
          code:    "duplicate",
          message: `rule already exists: ${p.name}`
        }]
      })
    }

    // Validate syntax
    const validation = await validate_rule_syntax(db, p.body)
    if (!validation.valid) {
      db.close()
      return error({
        body: [{
          code:    "invalid_syntax",
          message: `Datalog parse error: ${validation.error}`
        }]
      })
    }

    // Insert rule
    const escapedName = p.name.replace(/'/g, "''")
    const escapedDesc = p.description.replace(/'/g, "''")
    const escapedBody = p.body.replace(/'/g, "''")
    await db.run(`
      ?[name, description, body, builtin] <- [['${escapedName}', '${escapedDesc}', '${escapedBody}', false]]
      :put rules { name, description, body, builtin }
    `)

    db.close()

    return success({
      name:        p.name,
      description: p.description,
      body:        p.body,
      builtin:     false
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to create rule: ${message}`
      }]
    })
  }
}
