//
// storm.ts - CLI command: brane storm [seed]
//
// Divergent brainstorming over accumulated knowledge.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const storm = defineCommand({
  meta: {
    name: "storm",
    description: "Brainstorm — find gaps, connections, and blind spots in your knowledge",
  },
  args: {
    seed:   { type: "positional", description: "Optional topic to seed brainstorming", required: false },
    input:  { type: "string", alias: "i", description: "File to brainstorm against" },
    rounds: { type: "string", alias: "r", description: "Iterative deepening rounds (default: 1, max: 5)" },
    limit:  { type: "string", alias: "l", description: "Max context items per round (default: 20)" },
    agent:  { type: "string", alias: "a", description: "Agent ID for created items" },
    "dry-run": { type: "boolean", alias: "n", description: "Preview without writing to graph" },
    json:   { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {}
    if (args.seed) params.seed = args.seed
    if (args.input) params.input = args.input
    if (args.rounds) params.rounds = parseInt(String(args.rounds), 10) || 1
    if (args.limit) params.limit = parseInt(String(args.limit), 10) || 20
    if (args.agent) params.agent_id = args.agent
    if (args["dry-run"]) params.dry_run = true

    const result = await sys.call("/calabi/storm", params)

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
      total_concepts: number
      total_edges: number
      total_episodes: number
      suggestions: { kind: string; value: string; reason: string }[]
      rounds: { round: number; concepts_created: number; edges_created: number; episodes_created: number; suggestions: { kind: string; value: string; reason: string }[]; reasoning: string }[]
      dry_run: boolean
    }

    if (!data) return

    const prefix = data.dry_run ? "[dry-run] " : ""

    // Print per-round results
    for (const r of data.rounds) {
      if (data.rounds.length > 1) {
        console.log(`\n--- Round ${r.round} ---`)
      }
      console.log(r.reasoning)
      console.log("")
      console.log(`  ${prefix}+${r.concepts_created} concepts, +${r.edges_created} edges, +${r.episodes_created} episodes`)
    }

    // Print suggestions
    if (data.suggestions.length > 0) {
      console.log("")
      console.log("Suggestions:")
      for (const s of data.suggestions) {
        const icon = s.kind === "question" ? "?" : s.kind === "source" ? ">" : "*"
        console.log(`  ${icon} [${s.kind}] ${s.value}`)
        console.log(`    ${s.reason}`)
      }
    }

    // Summary
    console.log("")
    console.log(`${prefix}${data.rounds_completed} round(s): +${data.total_concepts} concepts, +${data.total_edges} edges, +${data.total_episodes} episodes, ${data.suggestions.length} suggestions`)
  },
})
