//
// ask.ts - CLI command: brane ask <question>
//
// Synthesize an answer from accumulated knowledge.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const ask = defineCommand({
  meta: {
    name: "ask",
    description: "Ask a question — get a synthesized answer from the knowledge graph",
  },
  args: {
    question: { type: "positional", description: "What you want to know", required: true },
    limit:    { type: "string", alias: "l", description: "Max context items to load (default: 20)" },
    agent:    { type: "string", alias: "a", description: "Filter by agent ID" },
    after:    { type: "string", description: "Only use knowledge after this ISO timestamp" },
    before:   { type: "string", description: "Only use knowledge before this ISO timestamp" },
    lens:     { type: "string", description: "Lens prompt to shape the answer" },
    json:     { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const params: Record<string, unknown> = {
      question: args.question,
    }
    if (args.limit) params.limit = parseInt(String(args.limit), 10) || 20
    if (args.agent) params.agent_id = args.agent
    if (args.after) params.after = args.after
    if (args.before) params.before = args.before
    if (args.lens) params.lens = args.lens

    const result = await sys.call("/calabi/ask", params)

    if (args.json) {
      output(result, { json: true })
      return
    }

    if (result.status === "error") {
      output(result, {})
      return
    }

    const data = result.result as {
      answer: string
      citations: { concept_ids: number[]; episode_ids: number[]; edge_ids: number[] }
      context_loaded: { concepts: number; episodes: number; edges: number }
    }

    if (!data) return

    // Print the answer
    console.log(data.answer)

    // Print citations
    const c = data.citations
    const cited = [
      ...(c.concept_ids?.length ? [`concepts: ${c.concept_ids.map(id => `#${id}`).join(", ")}`] : []),
      ...(c.episode_ids?.length ? [`episodes: ${c.episode_ids.map(id => `#${id}`).join(", ")}`] : []),
      ...(c.edge_ids?.length ? [`edges: ${c.edge_ids.map(id => `#${id}`).join(", ")}`] : []),
    ]

    if (cited.length > 0) {
      console.log("")
      console.log(`sources: ${cited.join("; ")}`)
    }

    // Context stats
    const ctx = data.context_loaded
    console.log(`(${ctx.concepts} concepts, ${ctx.episodes} episodes, ${ctx.edges} edges searched)`)
  },
})
