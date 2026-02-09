//
// edge.ts - brane edge [create|list|get|update|delete]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"
import { resolve_concept_ref } from "../resolve.ts"

export const edge = defineCommand({
  meta: {
    name: "edge",
    description: "Manage edges (relationships) in the knowledge graph",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a new edge" },
      args: {
        from: { type: "string", alias: "f", description: "Source concept (ID or name)", required: true },
        to: { type: "string", alias: "t", description: "Target concept (ID or name)", required: true },
        rel: { type: "string", alias: "r", description: "Relationship (freeform)", required: true },
        weight: { type: "string", alias: "w", description: "Edge weight (0-1)" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const source = await resolve_concept_ref(args.from)
        if (source === null) {
          console.error(`error: concept not found: ${args.from}`)
          process.exit(1)
        }

        const target = await resolve_concept_ref(args.to)
        if (target === null) {
          console.error(`error: concept not found: ${args.to}`)
          process.exit(1)
        }

        const params: any = {
          source,
          target,
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
        from: { type: "string", alias: "f", description: "Filter by source concept (ID or name)" },
        to: { type: "string", alias: "t", description: "Filter by target concept (ID or name)" },
        rel: { type: "string", alias: "r", description: "Filter by relation" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.from) {
          const source = await resolve_concept_ref(args.from)
          if (source === null) {
            console.error(`error: concept not found: ${args.from}`)
            process.exit(1)
          }
          params.source = source
        }
        if (args.to) {
          const target = await resolve_concept_ref(args.to)
          if (target === null) {
            console.error(`error: concept not found: ${args.to}`)
            process.exit(1)
          }
          params.target = target
        }
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
