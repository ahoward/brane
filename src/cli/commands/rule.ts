//
// rule.ts - brane rule [create|list|get|query|delete]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const rule = defineCommand({
  meta: {
    name: "rule",
    description: "Manage rules in the knowledge graph",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a custom rule" },
      args: {
        name: { type: "string", alias: "n", description: "Rule name", required: true },
        description: { type: "string", alias: "d", description: "Rule description", required: true },
        body: { type: "string", alias: "b", description: "Datalog query body", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/rules/create", {
          name: args.name,
          description: args.description,
          body: args.body,
        })
        output(result, { json: args.json })
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List rules" },
      args: {
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/rules/list", {})
        output(result, { json: args.json })
      },
    }),

    get: defineCommand({
      meta: { name: "get", description: "Get a rule by name" },
      args: {
        name: { type: "positional", description: "Rule name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/rules/get", {
          name: args.name,
        })
        output(result, { json: args.json })
      },
    }),

    query: defineCommand({
      meta: { name: "query", description: "Run a rule query" },
      args: {
        name: { type: "positional", description: "Rule name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/rules/query", {
          name: args.name,
        })
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "error") {
          output(result, {})
        } else {
          const data = result.result as any
          const violations = data?.violations || []
          if (violations.length === 0) {
            console.log("(no violations)")
          } else {
            console.log("ID\tNAME")
            for (const v of violations) {
              console.log(`${v.id}\t${v.name}`)
            }
          }
        }
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete a custom rule" },
      args: {
        name: { type: "positional", description: "Rule name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/rules/delete", {
          name: args.name,
        })
        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`deleted: rule ${args.name}`)
        } else {
          output(result, {})
        }
      },
    }),
  },
})
