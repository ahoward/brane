//
// search.ts - brane search (convenience: mind search)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const search = defineCommand({
  meta: {
    name: "search",
    description: "Semantic search for concepts",
  },
  args: {
    query: { type: "positional", description: "Search query", required: true },
    limit: { type: "string", alias: "l", description: "Max results (default: 10)" },
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    const result = await sys.call("/mind/search", {
      query: args.query,
      limit: args.limit ? parseInt(args.limit) : undefined,
    })

    output(result, { json: args.json })
  },
})
