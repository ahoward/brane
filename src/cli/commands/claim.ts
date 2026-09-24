//
// claim.ts - brane claim [create|list|get|delete|conflicts]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

function subject(args: { concept?: string; edge?: string }): { subject_type: string; subject_id: number } | null {
  if (args.edge)    return { subject_type: "edge",    subject_id: parseInt(args.edge) }
  if (args.concept) return { subject_type: "concept", subject_id: parseInt(args.concept) }
  return null
}

export const claim = defineCommand({
  meta: {
    name: "claim",
    description: "Assert and query claims (contradiction is data, not a defect)",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Assert a claim about a concept or edge" },
      args: {
        concept:   { type: "string", alias: "c", description: "Concept ID (subject)" },
        edge:      { type: "string", alias: "e", description: "Edge ID (subject)" },
        predicate: { type: "string", alias: "p", description: "What is being asserted about", required: true },
        assertion: { type: "string", alias: "a", description: "The assertion itself", required: true },
        authority: { type: "string", description: "Authority tier (must be registered)", required: true },
        source:    { type: "string", alias: "s", description: "Where this came from", required: true },
        json:      { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const subj = subject(args)

        if (!subj) {
          console.error("brane: a subject is required (--concept ID or --edge ID)")
          process.exit(1)
        }

        const result = await sys.call("/mind/claims/create", {
          ...subj,
          predicate: args.predicate,
          assertion: args.assertion,
          authority: args.authority,
          source:    args.source,
        })
        output(result, { json: args.json })
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List claims" },
      args: {
        concept:   { type: "string", alias: "c", description: "Filter by concept ID" },
        edge:      { type: "string", alias: "e", description: "Filter by edge ID" },
        predicate: { type: "string", alias: "p", description: "Filter by predicate" },
        authority: { type: "string", description: "Filter by authority tier" },
        resolve:   { type: "boolean", alias: "r", description: "Project to the winner per subject+predicate" },
        limit:     { type: "string", alias: "n", description: "Max results" },
        json:      { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        const subj = subject(args)

        if (subj) Object.assign(params, subj)
        if (args.predicate) params.predicate = args.predicate
        if (args.authority) params.authority = args.authority
        if (args.resolve)   params.resolve   = true
        if (args.limit)     params.limit     = parseInt(args.limit)

        const result = await sys.call("/mind/claims/list", params)
        output(result, { json: args.json })
      },
    }),

    conflicts: defineCommand({
      meta: { name: "conflicts", description: "Where the graph contradicts itself" },
      args: {
        concept:   { type: "string", alias: "c", description: "Filter by concept ID" },
        edge:      { type: "string", alias: "e", description: "Filter by edge ID" },
        predicate: { type: "string", alias: "p", description: "Filter by predicate" },
        json:      { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        const subj = subject(args)

        if (subj) Object.assign(params, subj)
        if (args.predicate) params.predicate = args.predicate

        const result = await sys.call("/mind/claims/conflicts", params)
        output(result, { json: args.json })
      },
    }),

    get: defineCommand({
      meta: { name: "get", description: "Get a claim by ID" },
      args: {
        id:   { type: "positional", description: "Claim ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/claims/get", { id: parseInt(args.id) })
        output(result, { json: args.json })
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete a claim by ID" },
      args: {
        id:   { type: "positional", description: "Claim ID", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/claims/delete", { id: parseInt(args.id) })
        output(result, { json: args.json })
      },
    }),
  },
})
