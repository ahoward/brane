//
// status.ts - brane status dashboard
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { resolve_lens_paths, get_active_lens } from "../../lib/state.ts"
import { get_version } from "../../version.ts"
import { output } from "../output.ts"
import { existsSync, statSync } from "node:fs"

function file_size(path: string): string {
  try {
    if (!existsSync(path)) return "-"
    const bytes = statSync(path).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } catch {
    return "-"
  }
}

export const status = defineCommand({
  meta: {
    name: "status",
    description: "Show brane status: lens, schema, concepts, episodes, disk usage",
  },
  args: {
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    // Gather data
    const version = get_version()
    let lens_name = "default"
    let body_db = ""
    let mind_db = ""
    let brane_path = ""

    try {
      const paths = resolve_lens_paths()
      lens_name = paths.lens_name
      body_db = paths.body_db_path
      mind_db = paths.mind_db_path
      brane_path = paths.brane_path
    } catch {
      // Not initialized
    }

    // Graph summary
    const summary_result = await sys.call("/graph/summary", {})
    const summary = summary_result.status === "success"
      ? summary_result.result as {
          concepts?: { total?: number; by_type?: Record<string, number> }
          edges?: { total?: number; by_relation?: Record<string, number> }
        }
      : null

    // Episode count
    const episodes_result = await sys.call("/mind/episodes/list", { limit: 5 })
    const episodes_data = episodes_result.status === "success"
      ? episodes_result.result as { episodes?: { id: number; observation: string; tags: string[]; timestamp: string }[] }
      : null

    // Schema version — read from mind.db directly (avoid init side effects)
    let schema_version = "?"
    try {
      const { open_mind, is_mind_error } = await import("../../lib/mind.ts")
      const mind = await open_mind()
      if (!is_mind_error(mind)) {
        try {
          const rows = await mind.db.run("?[value] := *schema_meta['schema_version', value]")
          if (rows.rows?.length > 0) {
            schema_version = String(rows.rows[0][0])
          }
        } catch {}
        mind.db.close()
      }
    } catch {}

    const status_data = {
      version,
      lens: lens_name,
      brane_path,
      body_db_size: file_size(body_db),
      mind_db_size: file_size(mind_db),
      schema_version,
      total_concepts: summary?.concepts?.total ?? 0,
      total_edges: summary?.edges?.total ?? 0,
      concepts_by_type: summary?.concepts?.by_type ?? {},
      edges_by_relation: summary?.edges?.by_relation ?? {},
      recent_episodes: (episodes_data?.episodes ?? []).slice(0, 5).map(ep => ({
        id: ep.id,
        timestamp: ep.timestamp,
        observation: ep.observation.length > 80 ? ep.observation.slice(0, 80) + "..." : ep.observation,
        tags: ep.tags,
      })),
    }

    if (args.json) {
      console.log(JSON.stringify({ status: "success", result: status_data }, null, 2))
      return
    }

    // Pretty print
    console.log(`brane ${version}`)
    console.log("")
    console.log(`  Lens:     ${lens_name}`)
    console.log(`  Path:     ${brane_path || "(not initialized)"}`)
    console.log(`  Schema:   ${schema_version}`)
    console.log(`  Body DB:  ${file_size(body_db)}`)
    console.log(`  Mind DB:  ${file_size(mind_db)}`)
    console.log("")

    const tc = status_data.total_concepts
    const te = status_data.total_edges
    console.log(`  Concepts: ${tc}`)

    const types = status_data.concepts_by_type
    if (Object.keys(types).length > 0) {
      const type_parts = Object.entries(types).map(([t, n]) => `${t}: ${n}`).join(", ")
      console.log(`            ${type_parts}`)
    }

    console.log(`  Edges:    ${te}`)

    const rels = status_data.edges_by_relation
    if (Object.keys(rels).length > 0) {
      const rel_parts = Object.entries(rels).map(([r, n]) => `${r}: ${n}`).join(", ")
      console.log(`            ${rel_parts}`)
    }

    const recent = status_data.recent_episodes
    if (recent.length > 0) {
      console.log("")
      console.log(`  Recent memories (${recent.length}):`)
      for (const ep of recent) {
        const tags = ep.tags?.length > 0 ? ` [${ep.tags.join(", ")}]` : ""
        const ts = ep.timestamp.slice(0, 10)
        console.log(`    #${ep.id}  ${ts}  ${ep.observation}${tags}`)
      }
    }
  },
})
