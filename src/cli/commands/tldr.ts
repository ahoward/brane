//
// tldr.ts - CLI command: brane tldr
//
// Knowledge outline with synopses.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const tldr = defineCommand({
  meta: {
    name: "tldr",
    description: "Show a structured outline of what brane knows",
  },
  args: {
    focus: { type: "string", alias: "f", description: "Focus on a topic area" },
    limit: { type: "string", alias: "l", description: "Max items to load (default: 50)" },
    json:  { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {}
    if (args.focus) params.focus = args.focus
    if (args.limit) params.limit = parseInt(String(args.limit), 10) || 50

    const result = await sys.call("/calabi/tldr", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      topics: { title: string; items: string[] }[]
      learnings: string[]
      stats: { concepts: number; edges: number; episodes: number; topics: number }
    }

    if (!data) return

    if (data.topics.length === 0 && data.learnings.length === 0) {
      console.log("Nothing to summarize — knowledge graph is empty.")
      return
    }

    for (const topic of data.topics) {
      console.log(`\n## ${topic.title}`)
      for (const item of topic.items) {
        console.log(`- ${item}`)
      }
    }

    if (data.learnings.length > 0) {
      console.log("\n## Recent Learnings")
      for (const l of data.learnings) {
        console.log(`- ${l}`)
      }
    }

    console.log("")
    const s = data.stats
    console.log(`${s.topics} topics, ${s.concepts} concepts, ${s.edges} edges, ${s.episodes} episodes`)
  },
})
