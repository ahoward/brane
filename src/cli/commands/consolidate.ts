//
// consolidate.ts - CLI command for episode consolidation
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const consolidate = defineCommand({
  meta: {
    name: "consolidate",
    description: "Cluster similar episodes into semantic concepts",
  },
  args: {
    agent:     { type: "string", alias: "a", description: "Agent ID (default: cli)" },
    threshold: { type: "string", alias: "t", description: "Similarity threshold 0-1 (default: 0.85)" },
    "min-size":{ type: "string", alias: "m", description: "Minimum cluster size (default: 2)" },
    "dry-run": { type: "boolean", alias: "n", description: "Preview without writing" },
    json:      { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {
      agent_id:  args.agent ?? "cli",
      threshold: args.threshold ? parseFloat(String(args.threshold)) : 0.85,
      min_size:  args["min-size"] ? parseInt(String(args["min-size"]), 10) : 2,
      dry_run:   args["dry-run"] ?? false,
    }

    const result = await sys.call("/mind/consolidate", params)

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "success") {
      const data = result.result as { clusters?: any[]; concepts_created?: number; episodes_archived?: number } | null
      const clusters = data?.clusters ?? []

      if (clusters.length === 0) {
        console.log("(no episode clusters found)")
        return
      }

      for (const [i, cluster] of clusters.entries()) {
        console.log(`\nCluster ${i + 1} (${cluster.episode_ids.length} episodes, similarity ${cluster.similarity}):`)
        for (const [j, obs] of cluster.observations.entries()) {
          const short = obs.length > 80 ? obs.slice(0, 80) + "..." : obs
          console.log(`  - #${cluster.episode_ids[j]}: ${short}`)
        }
        if (cluster.proposed_concept) {
          console.log(`  → ${cluster.proposed_concept.name} (${cluster.proposed_concept.type})`)
        }
      }

      if (data?.concepts_created !== undefined) {
        console.log(`\n${data.concepts_created} concepts created, ${data.episodes_archived} episodes archived`)
      } else {
        console.log(`\n${clusters.length} cluster(s) found. Run without --dry-run to apply.`)
      }
    } else {
      output(result, {})
    }
  },
})
