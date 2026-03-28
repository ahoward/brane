//
// rebuild.ts - CLI command: brane rebuild
//
// Re-extract all sources through current lenses.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const rebuild = defineCommand({
  meta: {
    name: "rebuild",
    description: "Re-extract all digested sources through current active lenses",
  },
  args: {
    lens:      { type: "string", alias: "l", description: "Override lens prompt for rebuild" },
    agent:     { type: "string", alias: "a", description: "Agent ID" },
    "dry-run": { type: "boolean", alias: "n", description: "Show what would be rebuilt" },
    json:      { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {}
    if (args.lens) params.lens = args.lens
    if (args.agent) params.agent_id = args.agent
    if (args["dry-run"]) params.dry_run = true

    const result = await sys.call("/calabi/rebuild", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      sources_total: number
      sources_rebuilt: number
      sources_skipped: number
      sources_failed: number
      details: { label: string; status: string; reason?: string }[]
      dry_run: boolean
    }

    if (!data) return

    const prefix = data.dry_run ? "[dry-run] " : ""

    if (data.sources_total === 0) {
      console.log("No digested sources to rebuild.")
      return
    }

    for (const d of data.details) {
      const icon = d.status === "rebuilt" ? "+" : d.status === "skipped" ? "-" : "!"
      const reason = d.reason ? ` (${d.reason})` : ""
      console.log(`  ${icon} ${d.label}${reason}`)
    }

    console.log("")
    console.log(`${prefix}${data.sources_total} sources: ${data.sources_rebuilt} rebuilt, ${data.sources_skipped} skipped, ${data.sources_failed} failed`)
  },
})
