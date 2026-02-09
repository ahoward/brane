//
// fts.ts - brane fts [index|search]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const fts = defineCommand({
  meta: {
    name: "fts",
    description: "Full-text search operations",
  },
  subCommands: {
    index: defineCommand({
      meta: { name: "index", description: "Index files for full-text search" },
      args: {
        path: { type: "string", alias: "p", description: "Filter by path pattern" },
        force: { type: "boolean", alias: "f", description: "Force reindex all files" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.path) params.path = args.path
        if (args.force) params.force = true

        const result = await sys.call("/body/fts/index", params)
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "error") {
          output(result, {})
        } else {
          const data = result.result as any
          console.log(`indexed: ${data?.indexed || 0}`)
          console.log(`skipped: ${data?.skipped || 0}`)
        }
      },
    }),

    search: defineCommand({
      meta: { name: "search", description: "Full-text search in file contents" },
      args: {
        query: { type: "positional", description: "Search query", required: true },
        path: { type: "string", alias: "p", description: "Filter by path pattern" },
        limit: { type: "string", alias: "l", description: "Max results" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = { query: args.query }
        if (args.path) params.path = args.path
        if (args.limit) params.limit = parseInt(args.limit)

        const result = await sys.call("/body/fts/search", params)
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "error") {
          output(result, {})
        } else {
          const data = result.result as any
          const matches = data?.matches || []
          if (matches.length === 0) {
            console.log("(no matches)")
          } else {
            for (const m of matches) {
              const path = m.url?.replace("file://", "") || m.path
              console.log(`${path}`)
              if (m.snippet) {
                console.log(`  ${m.snippet.trim()}`)
              }
            }
          }
        }
      },
    }),
  },
})
