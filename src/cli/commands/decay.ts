//
// decay.ts - CLI command for memory decay (prune low-value episodes)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const decay = defineCommand({
  meta: {
    name: "decay",
    description: "Score memories by recency/relevance and prune low-value ones",
  },
  args: {
    agent:       { type: "string", alias: "a", description: "Agent ID (default: cli)" },
    mode:        { type: "string", alias: "m", description: "Decay mode: soft, hard, capacity (default: soft)" },
    "min-score": { type: "string", alias: "s", description: "Minimum retention score (default: 0.1)" },
    "max-episodes": { type: "string", description: "Max episodes to keep (capacity mode, default: 1000)" },
    "half-life": { type: "string", description: "Half-life in days for recency scoring (default: 30)" },
    "dry-run":   { type: "boolean", alias: "n", description: "Preview without applying" },
    json:        { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {
      agent_id:               args.agent ?? "cli",
      mode:                   args.mode ?? "soft",
      min_score:              args["min-score"] ? parseFloat(String(args["min-score"])) : 0.1,
      max_episodes:           args["max-episodes"] ? parseInt(String(args["max-episodes"]), 10) : 1000,
      recency_half_life_days: args["half-life"] ? parseFloat(String(args["half-life"])) : 30,
      dry_run:                args["dry-run"] ?? false,
    }

    const result = await sys.call("/mind/decay", params)

    if (args.json) {
      output(result, { json: true })
    } else if (result.status === "success") {
      const data = result.result as { scored?: any[]; archived?: number; deleted?: number; protected_count?: number } | null
      const scored = data?.scored ?? []

      if (scored.length === 0) {
        console.log("(no episodes to score)")
        return
      }

      const min = params.min_score as number
      console.log(`${scored.length} episodes scored (min_score=${min}, mode=${params.mode}):\n`)

      for (const ep of scored) {
        const status = ep.protected ? " [PROTECTED]" : (ep.score < min ? " [DECAY]" : "")
        const obs = ep.observation.length > 70 ? ep.observation.slice(0, 70) + "..." : ep.observation
        console.log(`  #${ep.id}  score=${ep.score.toFixed(3)}${status}  ${obs}`)
      }

      if (data?.archived !== undefined || data?.deleted !== undefined) {
        console.log(`\narchived: ${data?.archived ?? 0}, deleted: ${data?.deleted ?? 0}, protected: ${data?.protected_count ?? 0}`)
      } else {
        console.log(`\nRun without --dry-run to apply.`)
      }
    } else {
      output(result, {})
    }
  },
})
