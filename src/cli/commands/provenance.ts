//
// provenance.ts - brane provenance [create|list|delete]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const provenance = defineCommand({
  meta: {
    name: "provenance",
    description: "Manage concept-to-file provenance links",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a provenance link" },
      args: {
        concept: { type: "string", alias: "c", description: "Concept ID", required: true },
        file: { type: "string", alias: "f", description: "File URL", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/provenance/create", {
          concept_id: parseInt(args.concept),
          file_url: args.file,
        })
        output(result, { json: args.json })
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List provenance links" },
      args: {
        concept: { type: "string", alias: "c", description: "Filter by concept ID" },
        file: { type: "string", alias: "f", description: "Filter by file URL" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.concept) params.concept_id = parseInt(args.concept)
        if (args.file) params.file_url = args.file

        const result = await sys.call("/mind/provenance/list", params)
        output(result, { json: args.json })
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete a provenance link" },
      args: {
        concept: { type: "string", alias: "c", description: "Concept ID", required: true },
        file: { type: "string", alias: "f", description: "File URL", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/provenance/delete", {
          concept_id: parseInt(args.concept),
          file_url: args.file,
        })
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`deleted: provenance link`)
        } else {
          output(result, {})
        }
      },
    }),
  },
})
