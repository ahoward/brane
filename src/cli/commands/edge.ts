//
// edge.ts - brane edge [create|list|get|update|delete]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const edge = defineCommand({
  meta: {
    name: "edge",
    description: "Manage edges (relationships) in the knowledge graph",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a new edge" },
      args: {
        from: { type: "string", alias: "f", description: "Source concept ID", required: true },
        to: { type: "string", alias: "t", description: "Target concept ID", required: true },
        rel: { type: "string", alias: "r", description: "Relation (DEPENDS_ON|IMPLEMENTS|CONTAINS)", required: true },
        weight: { type: "string", alias: "w", description: "Edge weight (0-1)" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {
          source: parseInt(args.from),
          target: parseInt(args.to),
          relation: args.rel,
        }
        if (args.weight) params.weight = parseFloat(args.weight)

        const result = await sys.call("/mind/edges/create", params)
        output(result, { json: args.json })
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List edges" },
      args: {
        from: { type: "string", alias: "f", description: "Filter by source concept ID" },
        to: { type: "string", alias: "t", description: "Filter by target concept ID" },
        rel: { type: "string", alias: "r", description: "Filter by relation" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.from) params.source = parseInt(args.from)
        if (args.to) params.target = parseInt(args.to)
        if (args.rel) params.relation = args.rel

        const result = await sys.call("/mind/edges/list", params)
        output(result, { json: args.json })
      },
    }),

    get: defineCommand({
      meta: { name: "get", description: "Get an edge by ID" },
      args: {
        id: { type: "positional", description: "Edge ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/edges/get", {
          id: parseInt(args.id),
        })
        output(result, { json: args.json })
      },
    }),

    update: defineCommand({
      meta: { name: "update", description: "Update an edge" },
      args: {
        id: { type: "positional", description: "Edge ID", required: true },
        rel: { type: "string", alias: "r", description: "New relation" },
        weight: { type: "string", alias: "w", description: "New weight (0-1)" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = { id: parseInt(args.id) }
        if (args.rel) params.relation = args.rel
        if (args.weight) params.weight = parseFloat(args.weight)

        const result = await sys.call("/mind/edges/update", params)
        output(result, { json: args.json })
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete an edge" },
      args: {
        id: { type: "positional", description: "Edge ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/edges/delete", {
          id: parseInt(args.id),
        })
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`deleted: edge ${args.id}`)
        } else {
          output(result, {})
        }
      },
    }),
  },
})
