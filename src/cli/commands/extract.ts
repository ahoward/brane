//
// extract.ts - brane extract (calabi/extract-llm)
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

    const result = await sys.call("/calabi/extract-llm", params)
    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any

      for (const file of data.files ?? []) {
        const display_path = file.file_url?.replace("file://", "") ?? file.file_url
        if (params.dry_run) {
          console.log(`extracting: ${display_path} (dry run)`)
          if (file.patch?.concepts?.length > 0) {
            console.log("  concepts:")
            for (const c of file.patch.concepts) {
              console.log(`    ${c.name} (${c.type})`)
            }
          }
          if (file.patch?.edges?.length > 0) {
            console.log("  edges:")
            for (const e of file.patch.edges) {
              const w = e.weight != null ? ` [${e.weight}]` : ""
              console.log(`    ${e.source_name} -> ${e.target_name} (${e.relation})${w}`)
            }
          }
          console.log("  (no changes applied)")
        } else {
          console.log(`extracting: ${display_path}`)
          console.log(`  concepts: ${file.concepts_extracted} extracted (${file.concepts_created} created, ${file.concepts_reused} reused)`)
          console.log(`  edges: ${file.edges_extracted} extracted (${file.edges_created} created)`)
          console.log(`  provenance: ${file.provenance_created} links`)
        }
      }
    }
  },
})
