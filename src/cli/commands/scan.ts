//
// scan.ts - brane scan (convenience: body scan)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const scan = defineCommand({
  meta: {
    name: "scan",
    description: "Scan files into Brane",
  },
  args: {
    path: { type: "positional", description: "Path to scan", required: false },
    "dry-run": { type: "boolean", description: "Preview changes without applying" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const result = await sys.call("/body/scan", {
      path: args.path || ".",
      dry_run: args["dry-run"],
    })

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any
      const summary = data?.summary
      if (summary) {
        console.log(`added: ${summary.added}`)
        console.log(`updated: ${summary.updated}`)
        console.log(`unchanged: ${summary.unchanged}`)
        if (summary.errors > 0) {
          console.log(`errors: ${summary.errors}`)
        }
      }
    }
  },
})
