//
// context.ts - brane context query
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const context = defineCommand({
  meta: {
    name: "context",
    description: "Query context from the knowledge graph",
  },
  subCommands: {
    query: defineCommand({
      meta: { name: "query", description: "Query context for a concept" },
      args: {
        query: { type: "positional", description: "Query string", required: true },
        depth: { type: "string", alias: "d", description: "Graph traversal depth (0-2)" },
        limit: { type: "string", alias: "l", description: "Max results" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = { query: args.query }
        if (args.depth) params.depth = parseInt(args.depth)
        if (args.limit) params.limit = parseInt(args.limit)

        const result = await sys.call("/context/query", params)
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "error") {
          output(result, {})
        } else {
          const data = result.result as any
          const concepts = data?.concepts || []
          const files = data?.files || []
          const graph = data?.graph || {}

          if (concepts.length === 0) {
            console.log("(no concepts found)")
            return
          }

          console.log("CONCEPTS:")
          console.log("ID\tNAME\tTYPE\tRELEVANCE")
          for (const c of concepts) {
            console.log(`${c.id}\t${c.name}\t${c.type}\t${c.relevance}`)
          }

          if (files.length > 0) {
            console.log("\nFILES:")
            for (const f of files) {
              console.log(`  ${f.url}`)
            }
          }

          if (graph.edges?.length > 0) {
            console.log("\nEDGES:")
            for (const e of graph.edges) {
              console.log(`  ${e.source} --[${e.relation}]--> ${e.target}`)
            }
          }
        }
      },
    }),
  },
})
