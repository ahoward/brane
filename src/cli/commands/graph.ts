//
// graph.ts - brane graph [summary|concepts|edges|neighbors|viz]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"
import { resolve_concept_ref } from "../resolve.ts"

export const graph = defineCommand({
  meta: {
    name: "graph",
    description: "Explore the knowledge graph",
  },
  subCommands: {
    summary: defineCommand({
      meta: { name: "summary", description: "Show graph summary statistics" },
      args: {
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/graph/summary", {})

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const summary = result.result as {
            concepts: { total: number; by_type: Record<string, number> }
            edges: { total: number; by_relation: Record<string, number> }
          }

          console.log(`Concepts: ${summary.concepts.total}`)
          for (const [type, count] of Object.entries(summary.concepts.by_type).sort()) {
            console.log(`  ${type}: ${count}`)
          }

          console.log()

          console.log(`Edges: ${summary.edges.total}`)
          for (const [relation, count] of Object.entries(summary.edges.by_relation).sort()) {
            console.log(`  ${relation}: ${count}`)
          }

          if (summary.concepts.total === 0 && summary.edges.total === 0) {
            console.log()
            console.log("(empty graph)")
          }
        } else {
          output(result, {})
        }
      },
    }),

    concepts: defineCommand({
      meta: { name: "concepts", description: "List concepts in the graph" },
      args: {
        type: { type: "string", alias: "t", description: "Filter by type" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/mind/concepts/list", {
          type: args.type,
        })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const data = result.result as {
            concepts: Array<{ id: number; name: string; type: string }>
            total: number
          }

          if (data.concepts.length === 0) {
            console.log("No concepts found.")
          } else {
            console.log("ID".padEnd(6) + "NAME".padEnd(24) + "TYPE")
            for (const c of data.concepts) {
              console.log(
                String(c.id).padEnd(6) +
                c.name.substring(0, 22).padEnd(24) +
                c.type
              )
            }
          }
        } else {
          output(result, {})
        }
      },
    }),

    edges: defineCommand({
      meta: { name: "edges", description: "List edges in the graph" },
      args: {
        relation: { type: "string", alias: "r", description: "Filter by relation" },
        from: { type: "string", alias: "f", description: "Filter by source concept (ID or name)" },
        to: { type: "string", alias: "t", description: "Filter by target concept (ID or name)" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: Record<string, unknown> = {}
        if (args.relation) params.relation = args.relation
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

        const result = await sys.call("/mind/edges/list", params)

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const data = result.result as {
            edges: Array<{ id: number; source: number; target: number; relation: string; weight: number }>
            total: number
          }

          if (data.edges.length === 0) {
            console.log("No edges found.")
          } else {
            console.log("ID".padEnd(6) + "SOURCE".padEnd(8) + "TARGET".padEnd(8) + "RELATION".padEnd(16) + "WEIGHT")
            for (const e of data.edges) {
              console.log(
                String(e.id).padEnd(6) +
                String(e.source).padEnd(8) +
                String(e.target).padEnd(8) +
                e.relation.padEnd(16) +
                String(e.weight)
              )
            }
          }
        } else {
          output(result, {})
        }
      },
    }),

    neighbors: defineCommand({
      meta: { name: "neighbors", description: "Show neighbors of a concept" },
      args: {
        id: { type: "positional", description: "Concept ID or name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const id = await resolve_concept_ref(args.id)
        if (id === null) {
          console.error(`error: concept not found: ${args.id}`)
          process.exit(1)
        }

        const result = await sys.call("/graph/neighbors", { id })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const data = result.result as {
            concept: { id: number; name: string; type: string }
            neighbors: {
              incoming: Array<{ id: number; name: string; type: string; edge_id: number; relation: string; weight: number }>
              outgoing: Array<{ id: number; name: string; type: string; edge_id: number; relation: string; weight: number }>
              total: number
            }
          }

          console.log(`[${data.concept.name}] ${data.concept.type}`)
          console.log()

          if (data.neighbors.incoming.length > 0) {
            console.log("Incoming:")
            for (const n of data.neighbors.incoming) {
              console.log(`  ← ${n.relation} [${n.name}] ${n.type} (edge ${n.edge_id})`)
            }
            console.log()
          }

          if (data.neighbors.outgoing.length > 0) {
            console.log("Outgoing:")
            for (const n of data.neighbors.outgoing) {
              console.log(`  → ${n.relation} [${n.name}] ${n.type} (edge ${n.edge_id})`)
            }
            console.log()
          }

          if (data.neighbors.total === 0) {
            console.log("(no neighbors)")
          } else {
            console.log(`Total: ${data.neighbors.total} neighbors`)
          }
        } else {
          output(result, {})
        }
      },
    }),

    viz: defineCommand({
      meta: { name: "viz", description: "Visualize the graph" },
      args: {
        format: { type: "string", alias: "f", description: "Output format: ascii (default) or mermaid" },
        center: { type: "string", alias: "c", description: "Center visualization on concept (ID or name)" },
        limit: { type: "string", alias: "l", description: "Maximum nodes to display" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: Record<string, unknown> = {}
        if (args.format) params.format = args.format
        if (args.center) {
          const center = await resolve_concept_ref(args.center)
          if (center === null) {
            console.error(`error: concept not found: ${args.center}`)
            process.exit(1)
          }
          params.center = center
        }
        if (args.limit) params.limit = parseInt(args.limit)

        const result = await sys.call("/graph/viz", params)

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const data = result.result as {
            format: string
            output: string
            nodes: number
            edges: number
            truncated: boolean
            message?: string
          }

          console.log(data.output)

          if (data.message) {
            console.log()
            console.log(`Warning: ${data.message}`)
          }
        } else {
          output(result, {})
        }
      },
    }),
  },
})
