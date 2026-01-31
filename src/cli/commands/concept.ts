//
// concept.ts - brane concept [create|list|get|update|delete]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const concept = defineCommand({
  meta: {
    name: "concept",
    description: "Manage concepts in the knowledge graph",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a new concept" },
      args: {
        name: { type: "string", alias: "n", description: "Concept name", required: true },
        type: { type: "string", alias: "t", description: "Concept type (freeform)", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/create", {
          name: args.name,
          type: args.type,
        })
        output(result, { json: args.json })
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List concepts" },
      args: {
        type: { type: "string", alias: "t", description: "Filter by type" },
        limit: { type: "string", alias: "l", description: "Max results" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/list", {
          type: args.type,
          limit: args.limit ? parseInt(args.limit) : undefined,
        })
        output(result, { json: args.json })
      },
    }),

    get: defineCommand({
      meta: { name: "get", description: "Get a concept by ID" },
      args: {
        id: { type: "positional", description: "Concept ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/get", {
          id: parseInt(args.id),
        })
        output(result, { json: args.json })
      },
    }),

    update: defineCommand({
      meta: { name: "update", description: "Update a concept" },
      args: {
        id: { type: "positional", description: "Concept ID", required: true },
        name: { type: "string", alias: "n", description: "New name" },
        type: { type: "string", alias: "t", description: "New type" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = { id: parseInt(args.id) }
        if (args.name) params.name = args.name
        if (args.type) params.type = args.type

        const result = await sys.call("/mind/concepts/update", params)
        output(result, { json: args.json })
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete a concept" },
      args: {
        id: { type: "positional", description: "Concept ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/delete", {
          id: parseInt(args.id),
        })
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`deleted: concept ${args.id}`)
        } else {
          output(result, {})
        }
      },
    }),
  },
})
