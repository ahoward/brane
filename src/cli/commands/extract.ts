//
// extract.ts - brane extract (calabi/extract)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const extract = defineCommand({
  meta: {
    name: "extract",
    description: "Extract concepts from code using LLM",
  },
  args: {
    path: { type: "positional", description: "Path to extract from" },
    "dry-run": { type: "boolean", description: "Preview without applying" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: any = {}
    if (args.path) params.path = args.path
    if (args["dry-run"]) params.dry_run = true

    const result = await sys.call("/calabi/extract", params)
    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any
      console.log(`concepts created: ${data?.concepts_created || 0}`)
      console.log(`edges created: ${data?.edges_created || 0}`)
      if (data?.dry_run) {
        console.log("(dry run - no changes applied)")
      }
    }
  },
})
