//
// query.ts - execute a rule and return matching concepts
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error, get_rule_by_name } from "../../../lib/mind.ts"

interface QueryParams {
  name?: string
}

interface ConceptMatch {
  id:   number
  name: string
}

interface QueryResult {
  rule:    string
  matches: ConceptMatch[]
  count:   number
}

export async function handler(params: Params): Promise<Result<QueryResult>> {
  const p = (params ?? {}) as QueryParams

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

    if (!rule) {
      db.close()
      return error({
        name: [{
          code:    "not_found",
          message: `rule not found: ${p.name}`
        }]
      })
    }

    // Execute the rule with entry point
    // Rule body defines `rulename[id, name] := ...`
    // We add `?[id, name] := rulename[id, name]` as entry
    const query = `?[id, name] := ${rule.name}[id, name]\n${rule.body}`
    const result = await db.run(query)
    const rows = result.rows as [number, string][]

    const matches: ConceptMatch[] = rows.map(row => ({
      id:   row[0],
      name: row[1]
    }))

    db.close()

    return success({
      rule:    p.name,
      matches: matches,
      count:   matches.length
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      rule: [{
        code:    "query_error",
        message: `rule execution failed: ${message}`
      }]
    })
  }
}
