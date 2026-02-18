//
// lens.ts - brane lens [create|use|list|delete|migrate|show|import|export|stats|bless]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const lens = defineCommand({
  meta: {
    name: "lens",
    description: "Manage lenses (named perspectives with independent knowledge graphs)",
  },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Create a new named lens" },
      args: {
        name: { type: "positional", description: "Lens name", required: true },
        config: { type: "string", alias: "c", description: "YAML config file to pre-load" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = { name: args.name }
        if (args.config) params.config = args.config

        const result = await sys.call("/lens/create", params)

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const r = result.result as any
          console.log(`created ${r.path}/body.db`)
          console.log(`created ${r.path}/mind.db`)
        } else {
          output(result, {})
        }
      },
    }),

    use: defineCommand({
      meta: { name: "use", description: "Switch to a named lens" },
      args: {
        name: { type: "positional", description: "Lens name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/use", { name: args.name })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`active lens: ${args.name}`)
        } else {
          output(result, {})
        }
      },
    }),

    list: defineCommand({
      meta: { name: "list", description: "List all lenses" },
      args: {
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/list", {})

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const r = result.result as { lenses: Array<{ name: string; active: boolean; path: string }> }
          for (const l of r.lenses) {
            const marker = l.active ? "* " : "  "
            console.log(`${marker}${l.name}`)
          }
        } else {
          output(result, {})
        }
      },
    }),

    delete: defineCommand({
      meta: { name: "delete", description: "Delete a named lens" },
      args: {
        name: { type: "positional", description: "Lens name", required: true },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/delete", { name: args.name })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success") {
          console.log(`deleted lens: ${args.name}`)
        } else {
          output(result, {})
        }
      },
    }),

    migrate: defineCommand({
      meta: { name: "migrate", description: "Migrate flat layout to lens/default/" },
      args: {
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/migrate", {})

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const r = result.result as any
          console.log(`migrated ${r.from} → ${r.to}`)
        } else {
          output(result, {})
        }
      },
    }),

    show: defineCommand({
      meta: { name: "show", description: "Show lens configuration (active or named)" },
      args: {
        name: { type: "positional", description: "Lens name (default: active lens)", required: false },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.name) params.name = args.name

        const result = await sys.call("/lens/show", params)

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const lens = result.result as {
            name: string
            version: string
            description: string | null
            concepts: Array<{ type: string; description: string; authority: string }>
            relations: Array<{ rel: string; description: string; symmetric: boolean; authority: string }>
            consolidation: Record<string, string>
          }

          console.log(`Name: ${lens.name}`)
          console.log(`Version: ${lens.version}`)
          if (lens.description) {
            console.log(`Description: ${lens.description}`)
          }
          console.log()

          if (lens.concepts.length > 0) {
            console.log("Golden Types:")
            for (const c of lens.concepts) {
              console.log(`  ${c.type.padEnd(12)} ${c.description}`)
            }
            console.log()
          }

          if (lens.relations.length > 0) {
            console.log("Golden Relations:")
            for (const r of lens.relations) {
              const sym = r.symmetric ? " (symmetric)" : ""
              console.log(`  ${r.rel.padEnd(16)} ${r.description}${sym}`)
            }
            console.log()
          }

          if (Object.keys(lens.consolidation).length > 0) {
            console.log("Consolidation Mappings:")
            for (const [source, target] of Object.entries(lens.consolidation)) {
              console.log(`  ${source} → ${target}`)
            }
          }
        } else {
          output(result, {})
        }
      },
    }),

    import: defineCommand({
      meta: { name: "import", description: "Import lens from YAML file" },
      args: {
        file: { type: "positional", description: "Path to YAML file", required: true },
        replace: { type: "boolean", alias: "r", description: "Replace existing lens (default: merge)" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/import", {
          path: args.file,
          mode: args.replace ? "replace" : "merge",
        })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const r = result.result as {
            name: string
            version: string
            concepts_imported: number
            relations_imported: number
            consolidation_rules: number
          }
          console.log(`Imported lens: ${r.name} v${r.version}`)
          console.log(`  Concepts: ${r.concepts_imported}`)
          console.log(`  Relations: ${r.relations_imported}`)
          console.log(`  Consolidation rules: ${r.consolidation_rules}`)
        } else {
          output(result, {})
        }
      },
    }),

    export: defineCommand({
      meta: { name: "export", description: "Export lens as YAML" },
      args: {
        json: { type: "boolean", alias: "j", description: "Output as JSON (with yaml field)" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/export", {})

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const r = result.result as { yaml: string }
          process.stdout.write(r.yaml)
        } else {
          output(result, {})
        }
      },
    }),

    stats: defineCommand({
      meta: { name: "stats", description: "Show usage statistics for types and relations" },
      args: {
        candidates: { type: "boolean", alias: "c", description: "Show only non-golden (candidates for blessing)" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/lens/stats", {
          candidates_only: args.candidates ?? false,
        })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const stats = result.result as {
            types: Array<{ type: string; count: number; golden: boolean; first_seen: string; last_seen: string }>
            relations: Array<{ rel: string; count: number; golden: boolean; first_seen: string; last_seen: string }>
          }

          if (stats.types.length > 0) {
            console.log("TYPE".padEnd(20) + "COUNT".padEnd(8) + "GOLDEN".padEnd(8) + "FIRST SEEN".padEnd(25) + "LAST SEEN")
            for (const t of stats.types) {
              const golden = t.golden ? "yes" : "no"
              console.log(
                t.type.padEnd(20) +
                String(t.count).padEnd(8) +
                golden.padEnd(8) +
                t.first_seen.padEnd(25) +
                t.last_seen
              )
            }
            console.log()
          }

          if (stats.relations.length > 0) {
            console.log("RELATION".padEnd(20) + "COUNT".padEnd(8) + "GOLDEN".padEnd(8) + "FIRST SEEN".padEnd(25) + "LAST SEEN")
            for (const r of stats.relations) {
              const golden = r.golden ? "yes" : "no"
              console.log(
                r.rel.padEnd(20) +
                String(r.count).padEnd(8) +
                golden.padEnd(8) +
                r.first_seen.padEnd(25) +
                r.last_seen
              )
            }
          }

          if (stats.types.length === 0 && stats.relations.length === 0) {
            console.log("No usage data yet.")
          }
        } else {
          output(result, {})
        }
      },
    }),

    bless: defineCommand({
      meta: { name: "bless", description: "Promote a type or relation to golden status" },
      args: {
        type: { type: "string", alias: "t", description: "Type to bless" },
        rel: { type: "string", alias: "r", description: "Relation to bless" },
        description: { type: "string", alias: "d", description: "Description (required)", required: true },
        symmetric: { type: "boolean", alias: "s", description: "Mark relation as symmetric" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: Record<string, unknown> = {
          description: args.description,
        }

        if (args.type) {
          params.type = args.type
        }
        if (args.rel) {
          params.relation = args.rel
          if (args.symmetric) {
            params.symmetric = true
          }
        }

        const result = await sys.call("/lens/bless", params)

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "success" && result.result) {
          const r = result.result as {
            blessed: "type" | "relation"
            name: string
            description: string
            symmetric?: boolean
          }

          if (r.blessed === "type") {
            console.log(`Blessed type: ${r.name}`)
          } else {
            console.log(`Blessed relation: ${r.name}`)
            if (r.symmetric) {
              console.log(`Symmetric: yes`)
            }
          }
          console.log(`Description: ${r.description}`)
          console.log(`Authority: manual`)
        } else {
          output(result, {})
        }
      },
    }),
  },
})
