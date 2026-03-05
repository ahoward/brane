//
// prune.ts - brane prune (convenience: mind prune)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const prune = defineCommand({
  meta: {
    name: "prune",
    description: "Remove orphaned concepts, edges, and stale provenance",
  },
  args: {
    "dry-run": { type: "boolean", alias: "n", description: "Preview what would be removed" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: any = {}
    if (args["dry-run"]) {
      params.dry_run = true
    }

    const result = await sys.call("/mind/prune", params)

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any
      const prefix = params.dry_run ? "(dry run) " : ""

      if (data.concepts_removed === 0 && data.edges_removed === 0 && data.provenance_removed === 0) {
        console.log(`${prefix}nothing to prune`)
      } else {
        console.log(`${prefix}pruned:`)
        console.log(`  concepts:   ${data.concepts_removed}`)
        console.log(`  edges:      ${data.edges_removed}`)
        console.log(`  provenance: ${data.provenance_removed}`)

        if (data.details?.concepts?.length > 0) {
          console.log("\nremoved concepts:")
          for (const c of data.details.concepts) {
            console.log(`  - ${c.name} (${c.type}, id: ${c.id})`)
          }
        }
      }
    }
  },
})
