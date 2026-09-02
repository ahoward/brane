//
// authority.ts - brane authority [list|create|delete]
//
// The registry claims are made under. Strict about authority, loose about
// vocabulary: tiers are registered and ranked, predicates are not.
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const authority = defineCommand({
  meta: {
    name: "authority",
    description: "Manage authority tiers that claims are made under",
  },
  subCommands: {
    list: defineCommand({
      meta: { name: "list", description: "List authority tiers, highest rank first" },
      args: {
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/authorities/list", {})
        output(result, { json: args.json })
      },
    }),

    create: defineCommand({
      meta: { name: "create", description: "Register a tier, or re-rank an existing one" },
      args: {
        name:        { type: "string", alias: "n", description: "Tier name", required: true },
        rank:        { type: "string", alias: "r", description: "Rank (higher wins)", required: true },
        description: { type: "string", alias: "d", description: "What this tier means" },
        json:        { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = { name: args.name, rank: parseInt(args.rank) }

        // omitted description preserves the existing one
        if (args.description !== undefined) params.description = args.description

        const result = await sys.call("/mind/authorities/create", params)
        output(result, { json: args.json })
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete an unreferenced tier" },
      args: {
        name: { type: "positional", description: "Tier name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/authorities/delete", { name: args.name })
        output(result, { json: args.json })
      },
    }),
  },
})
