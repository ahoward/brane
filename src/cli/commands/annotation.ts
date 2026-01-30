//
// annotation.ts - brane annotation [create|list|get|delete]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const annotation = defineCommand({
  meta: {
    name: "annotation",
    description: "Manage annotations on concepts",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create an annotation" },
      args: {
        concept: { type: "string", alias: "c", description: "Concept ID", required: true },
        type: { type: "string", alias: "t", description: "note | caveat | todo", required: true },
        text: { type: "string", description: "Annotation text", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/annotations/create", {
          concept_id: parseInt(args.concept),
          type: args.type,
          text: args.text,
        })
        output(result, { json: args.json })
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List annotations" },
      args: {
        concept: { type: "string", alias: "c", description: "Filter by concept ID" },
        type: { type: "string", alias: "t", description: "Filter by type" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.concept) params.concept_id = parseInt(args.concept)
        if (args.type) params.type = args.type

        const result = await sys.call("/mind/annotations/list", params)
        output(result, { json: args.json })
      },
    }),

    get: defineCommand({
      meta: { name: "get", description: "Get an annotation by ID" },
      args: {
        id: { type: "positional", description: "Annotation ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/annotations/get", {
          id: parseInt(args.id),
        })
        output(result, { json: args.json })
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete an annotation" },
      args: {
        id: { type: "positional", description: "Annotation ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/annotations/delete", {
          id: parseInt(args.id),
        })
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`deleted: annotation ${args.id}`)
        } else {
          output(result, {})
        }
      },
    }),
  },
})
