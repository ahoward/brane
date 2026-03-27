//
// digest.ts - CLI command: brane digest <source>
//
// Consume URLs, files, directories, or stdin into the knowledge graph.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const digest = defineCommand({
  meta: {
    name: "digest",
    description: "Consume a URL, file, directory, or stdin into the knowledge graph",
  },
  args: {
    source:  { type: "positional", description: "File, directory, URL, or \"-\" for stdin", required: true },
    lens:    { type: "string", alias: "l", description: "Lens prompt to shape extraction" },
    agent:   { type: "string", alias: "a", description: "Agent ID (default: cli)" },
    dryRun:  { type: "boolean", alias: "n", description: "Preview without writing" },
    json:    { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {
      source: args.source,
    }
    if (args.lens) params.lens = args.lens
    if (args.agent) params.agent_id = args.agent
    if (args.dryRun) params.dry_run = true

    const result = await sys.call("/calabi/digest", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      sources_found: number
      sources_digested: number
      sources_skipped: number
      concepts_created: number
      edges_created: number
      episodes_created: number
      dry_run: boolean
      details: { label: string; concepts_created: number; edges_created: number; episodes_created: number; skipped: boolean; reason?: string }[]
    }

    if (!data) return

    const prefix = data.dry_run ? "[dry-run] " : ""

    if (data.sources_found === 0) {
      console.log(`${prefix}no content found`)
      return
    }

    // Show per-source details
    for (const d of data.details ?? []) {
      if (d.skipped) {
        console.log(`  skip  ${d.label}  (${d.reason})`)
      } else if (data.dry_run) {
        console.log(`  ${prefix}would digest: ${d.label}`)
      } else {
        const parts = []
        if (d.concepts_created > 0) parts.push(`${d.concepts_created} concepts`)
        if (d.edges_created > 0) parts.push(`${d.edges_created} edges`)
        if (d.episodes_created > 0) parts.push(`${d.episodes_created} episodes`)
        const summary = parts.length > 0 ? parts.join(", ") : "no new knowledge"
        console.log(`  ✓     ${d.label}  → ${summary}`)
      }
    }

    console.log("")
    console.log(`${prefix}${data.sources_digested} digested, ${data.sources_skipped} skipped`)
    if (!data.dry_run) {
      console.log(`  ${data.concepts_created} concepts, ${data.edges_created} edges, ${data.episodes_created} episodes`)
    }
  },
})
