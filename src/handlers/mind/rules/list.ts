//
// list.ts - list all rules (built-in and custom)
//

import type { Params, Result } from "../../../lib/types.ts"
import { success, error } from "../../../lib/result.ts"
import { open_mind, is_mind_error } from "../../../lib/mind.ts"

interface RuleSummary {
  name:        string
  description: string
  builtin:     boolean
}

interface ListResult {
  rules: RuleSummary[]
  count: number
}

export async function handler(params: Params): Promise<Result<ListResult>> {
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
    // Query all rules (body not included for brevity)
    const result = await db.run(`
      ?[name, description, builtin] := *rules[name, description, _, builtin]
    `)
    const rows = result.rows as [string, string, boolean][]

    const rules: RuleSummary[] = rows.map(row => ({
      name:        row[0],
      description: row[1],
      builtin:     row[2]
    }))

    db.close()

    return success({
      rules: rules,
      count: rules.length
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `failed to list rules: ${message}`
      }]
    })
  }
}
