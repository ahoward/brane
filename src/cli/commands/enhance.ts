//
// enhance.ts - CLI command: brane enhance [focus]
//
// Convergent refinement of existing knowledge.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const enhance = defineCommand({
  meta: {
    name: "enhance",
    description: "Refine knowledge — merge duplicates, add missing edges, surface contradictions",
  },
  args: {
    focus:  { type: "positional", description: "Topic to focus refinement on", required: false },
    rounds: { type: "string", alias: "r", description: "Iterative refinement rounds (default: 1, max: 5)" },
    limit:  { type: "string", alias: "l", description: "Max context items (default: 30)" },
    agent:  { type: "string", alias: "a", description: "Agent ID for created items" },
    "dry-run": { type: "boolean", alias: "n", description: "Preview without writing" },
    json:   { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {}
    if (args.focus) params.focus = args.focus
    if (args.rounds) params.rounds = parseInt(String(args.rounds), 10) || 1
    if (args.limit) params.limit = parseInt(String(args.limit), 10) || 30
    if (args.agent) params.agent_id = args.agent
    if (args["dry-run"]) params.dry_run = true

    const result = await sys.call("/calabi/enhance", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      rounds_completed: number
      total_merges: number
      total_edges: number
      total_observations: number
      rounds: { round: number; merges_applied: number; edges_created: number; observations_added: number; reasoning: string }[]
      dry_run: boolean
    }

    if (!data) return

    const prefix = data.dry_run ? "[dry-run] " : ""

    if (data.rounds_completed === 0) {
      console.log("Nothing to refine — knowledge graph is empty.")
      return
    }

    for (const r of data.rounds) {
      if (data.rounds.length > 1) {
        console.log(`\n--- Round ${r.round} ---`)
      }
      console.log(r.reasoning)
      console.log("")
      console.log(`  ${prefix}${r.merges_applied} merges, +${r.edges_created} edges, +${r.observations_added} observations`)
    }

    console.log("")
    console.log(`${prefix}${data.rounds_completed} round(s): ${data.total_merges} merges, +${data.total_edges} edges, +${data.total_observations} observations`)
  },
})
