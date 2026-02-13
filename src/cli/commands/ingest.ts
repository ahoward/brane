//
// ingest.ts - brane ingest (calabi/ingest)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"
import { create_progress_emitter, finish_progress } from "../../lib/progress.ts"

export const ingest = defineCommand({
  meta: {
    name: "ingest",
    description: "Index files and extract knowledge in one step",
  },
  args: {
    path: { type: "positional", description: "Path to ingest (default: .)", required: false },
    "dry-run": { type: "boolean", description: "Preview without applying" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: any = {}
    if (args.path) params.path = args.path
    if (args["dry-run"]) params.dry_run = true

    const emit = create_progress_emitter({ enabled: !args.json && !args["dry-run"] })
    const result = await sys.call("/calabi/ingest", params, emit)
    // Clear progress line before output
    if (!args.json && !args["dry-run"] && result.status === "success") {
      const data = result.result as any
      const t = data?.totals
      if (t) {
        const elapsed = result.meta?.duration_ms ? `${(result.meta.duration_ms / 1000).toFixed(1)}s` : ""
        finish_progress(`done — ${t.files_scanned} files, ${t.concepts_created} concepts, ${t.edges_created} edges (${elapsed})`)
      }
    }

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "error") {
      output(result, {})
    } else {
      const data = result.result as any

      for (const file of data.files ?? []) {
        const display_path = file.file_url?.replace("file://", "") ?? file.file_url
        if (file.status === "error") {
          console.log(`ingesting: ${display_path} (error)`)
          console.log(`  ${file.error}`)
        } else if (file.status === "unchanged") {
          console.log(`ingesting: ${display_path} (unchanged, skipped)`)
        } else if (params.dry_run) {
          console.log(`ingesting: ${display_path} (${file.status}, dry run)`)
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
          console.log(`ingesting: ${display_path} (${file.status})`)
          console.log(`  concepts: ${file.concepts_extracted} extracted (${file.concepts_created} created, ${file.concepts_reused} reused)`)
          console.log(`  edges: ${file.edges_extracted} extracted (${file.edges_created} created)`)
          console.log(`  provenance: ${file.provenance_created} links`)
        }
      }

      // Summary line
      const t = data.totals
      if (t) {
        const skipped = t.files_unchanged > 0 ? `, ${t.files_skipped} skipped` : ""
        const errors = t.errors > 0 ? `, ${t.errors} errors` : ""
        console.log(`\nsummary: ${t.files_scanned} files scanned, ${t.files_extracted} extracted${skipped}${errors}`)
      }
    }
  },
})
