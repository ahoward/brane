//
// verify.ts - run all or selected rules and report violations
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_rule_by_name, type Rule } from "../../lib/mind.ts"
import type { CozoDb } from "cozo-node"

interface VerifyParams {
  rules?: string[]
}

interface Violation {
  id:   number
  name: string
}

interface RuleResult {
  name:       string
  passed:     boolean
  violations: Violation[]
  error:      string | null
}

interface Summary {
  rules_passed:     number
  rules_failed:     number
  total_violations: number
}

interface VerifyResult {
  passed:  boolean
  summary: Summary
  rules:   RuleResult[]
}

// Execute a single rule and return its result
async function execute_rule(db: CozoDb, rule: Rule): Promise<RuleResult> {
  try {
    // Execute the rule with entry point
    // Rule body defines `rulename[id, name] := ...`
    // We add `?[id, name] := rulename[id, name]` as entry
    const query = `?[id, name] := ${rule.name}[id, name]\n${rule.body}`
    const result = await db.run(query)
    const rows = result.rows as [number, string][]

    const violations: Violation[] = rows.map(row => ({
      id:   row[0],
      name: row[1]
    }))

    return {
      name:       rule.name,
      passed:     violations.length === 0,
      violations: violations,
      error:      null
    }
  } catch (err) {
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return {
      name:       rule.name,
      passed:     false,
      violations: [],
      error:      message
    }
  }
}

// Get all rules from the database
async function get_all_rules(db: CozoDb): Promise<Rule[]> {
  const result = await db.run(`
    ?[name, description, body, builtin] := *rules[name, description, body, builtin]
  `)
  const rows = result.rows as [string, string, string, boolean][]

  return rows.map(row => ({
    name:        row[0],
    description: row[1],
    body:        row[2],
    builtin:     row[3]
  }))
}

export async function handler(params: Params): Promise<Result<VerifyResult>> {
  const p = (params ?? {}) as VerifyParams
  const requested_rules = p.rules ?? []

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
    // Get rules to execute
    let rules_to_run: Rule[] = []

    if (requested_rules.length === 0) {
      // Run all rules
      rules_to_run = await get_all_rules(db)
    } else {
      // Run only specified rules - validate they exist first
      for (const name of requested_rules) {
        const rule = await get_rule_by_name(db, name)
        if (!rule) {
          db.close()
          return error({
            rules: [{
              code:    "not_found",
              message: `rule not found: ${name}`
            }]
          })
        }
        rules_to_run.push(rule)
      }
    }

    // Execute each rule
    const rule_results: RuleResult[] = []
    for (const rule of rules_to_run) {
      const result = await execute_rule(db, rule)
      rule_results.push(result)
    }

    db.close()

    // Compute summary
    const rules_passed = rule_results.filter(r => r.passed).length
    const rules_failed = rule_results.filter(r => !r.passed).length
    const total_violations = rule_results.reduce((sum, r) => sum + r.violations.length, 0)

    const summary: Summary = {
      rules_passed,
      rules_failed,
      total_violations
    }

    const passed = rules_failed === 0

    return success({
      passed,
      summary,
      rules: rule_results
    })
  } catch (err) {
    db.close()
    // CozoDB throws plain objects with a message property, not Error instances
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      mind: [{
        code:    "query_error",
        message: `verification failed: ${message}`
      }]
    })
  }
}
