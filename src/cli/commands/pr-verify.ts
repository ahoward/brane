//
// pr-verify.ts - brane pr-verify (calabi/pr-verify)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const prVerify = defineCommand({
  meta: {
    name: "pr-verify",
    description: "Verify workspace changes against rules",
  },
  args: {
    rule: { type: "string", alias: "r", description: "Run specific rule only" },
    "dry-run": { type: "boolean", description: "Show changes only, skip verification" },
    path: { type: "string", alias: "p", description: "Filter by path" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: any = {}
    if (args.rule) params.rules = [args.rule]
    if (args["dry-run"]) params.dry_run = true
    if (args.path) params.path = args.path

    const result = await sys.call("/calabi/pr-verify", params)
    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any
      const changes = data?.changes

      // Show changes
      if (changes) {
        const { modified, deleted, new: newFiles } = changes
        if (modified?.length > 0) {
          console.log(`modified: ${modified.length}`)
        }
        if (deleted?.length > 0) {
          console.log(`deleted: ${deleted.length}`)
        }
        if (newFiles?.length > 0) {
          console.log(`new: ${newFiles.length}`)
        }
        if (changes.summary?.clean) {
          console.log("clean: no file changes")
        }
      }

      // Show verification (if not dry run)
      if (data?.verification) {
        const v = data.verification
        if (v.summary?.rules_failed === 0) {
          console.log(`\nOK: ${v.summary.rules_passed} rules passed`)
        } else {
          console.log(`\nFAILED: ${v.summary.total_violations} violations`)
          for (const rule of v.rules || []) {
            if (!rule.passed) {
              console.log(`\n${rule.name}:`)
              for (const violation of rule.violations || []) {
                console.log(`  - ${violation.name} (id: ${violation.id})`)
              }
            }
          }
          process.exit(1)
        }
      }

      if (!data?.passed && !args["dry-run"]) {
        process.exit(1)
      }
    }
  },
})
