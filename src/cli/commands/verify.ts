//
// verify.ts - brane verify (convenience: mind verify)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const verify = defineCommand({
  meta: {
    name: "verify",
    description: "Verify knowledge graph against rules",
  },
  args: {
    rule: { type: "string", alias: "r", description: "Run specific rule only" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: any = {}
    if (args.rule) {
      params.rules = [args.rule]
    }

    const result = await sys.call("/mind/verify", params)

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any
      if (data?.passed) {
        console.log("OK: all rules passed")
      } else {
        console.log(`FAILED: ${data?.summary?.total_violations || 0} violations`)
        for (const rule of data?.rules || []) {
          if (!rule.passed) {
            console.log(`\n${rule.name}:`)
            if (rule.error) {
              console.log(`  error: ${rule.error}`)
            }
            for (const v of rule.violations || []) {
              console.log(`  - ${v.name} (id: ${v.id})`)
            }
          }
        }
        process.exit(1)
      }
    }
  },
})
