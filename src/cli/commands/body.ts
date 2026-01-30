//
// body.ts - brane body [init|scan|file]
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const body = defineCommand({
  meta: {
    name: "body",
    description: "Manage the body (file tracking) database",
  },
  subCommands: {
    init: defineCommand({
      meta: { name: "init", description: "Initialize body database" },
      args: {
        path: { type: "string", alias: "p", description: "Custom path for .brane directory" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const params: any = {}
        if (args.path) params.path = args.path

        const result = await sys.call("/body/init", params)
        output(result, { json: args.json })
      },
    }),

    scan: defineCommand({
      meta: { name: "scan", description: "Scan files into body" },
      args: {
        path: { type: "positional", description: "Path to scan" },
        "dry-run": { type: "boolean", description: "Preview changes" },
        json: { type: "boolean", alias: "j", description: "Output as JSON" },
      },
      async run({ args }) {
        const result = await sys.call("/body/scan", {
          path: args.path || ".",
          dry_run: args["dry-run"],
        })

        if (args.json) {
          output(result, { json: true })
        } else if (result.status === "error") {
          output(result, {})
        } else {
          const data = result.result as any
          const summary = data?.summary
          if (summary) {
            console.log(`added: ${summary.added}`)
            console.log(`updated: ${summary.updated}`)
            console.log(`unchanged: ${summary.unchanged}`)
            if (summary.errors > 0) {
              console.log(`errors: ${summary.errors}`)
            }
          }
        }
      },
    }),

    file: defineCommand({
      meta: { name: "file", description: "File operations" },
      subCommands: {
        add: defineCommand({
          meta: { name: "add", description: "Add files to tracking" },
          args: {
            path: { type: "positional", description: "Path to add", required: true },
            json: { type: "boolean", alias: "j", description: "Output as JSON" },
          },
          async run({ args }) {
            const result = await sys.call("/body/files/add", {
              path: args.path,
            })
            output(result, { json: args.json })
          },
        }),

        list: defineCommand({
          meta: { name: "list", description: "List tracked files" },
          args: {
            path: { type: "string", alias: "p", description: "Filter by path pattern" },
            json: { type: "boolean", alias: "j", description: "Output as JSON" },
          },
          async run({ args }) {
            const params: any = {}
            if (args.path) params.path = args.path

            const result = await sys.call("/body/files/list", params)
            output(result, { json: args.json })
          },
        }),

        status: defineCommand({
          meta: { name: "status", description: "Show file status" },
          args: {
            path: { type: "string", alias: "p", description: "Filter by path" },
            json: { type: "boolean", alias: "j", description: "Output as JSON" },
          },
          async run({ args }) {
            const params: any = {}
            if (args.path) params.path = args.path

            const result = await sys.call("/body/files/status", params)
            if (args.json) {
              output(result, { json: true })
            } else if (result.status === "error") {
              output(result, {})
            } else {
              const data = result.result as any
              const modified = data?.modified || []
              const deleted = data?.deleted || []
              const newFiles = data?.new || []

              if (modified.length === 0 && deleted.length === 0 && newFiles.length === 0) {
                console.log("clean: no changes")
              } else {
                if (modified.length > 0) {
                  console.log(`modified: ${modified.length}`)
                  for (const f of modified) {
                    console.log(`  ${f.url?.replace("file://", "") || f.path}`)
                  }
                }
                if (deleted.length > 0) {
                  console.log(`deleted: ${deleted.length}`)
                  for (const f of deleted) {
                    console.log(`  ${f.url?.replace("file://", "") || f.path}`)
                  }
                }
                if (newFiles.length > 0) {
                  console.log(`new: ${newFiles.length}`)
                  for (const f of newFiles) {
                    console.log(`  ${f.path}`)
                  }
                }
              }
            }
          },
        }),

        hash: defineCommand({
          meta: { name: "hash", description: "Compute file hashes" },
          args: {
            path: { type: "positional", description: "Path to hash", required: true },
            json: { type: "boolean", alias: "j", description: "Output as JSON" },
          },
          async run({ args }) {
            const result = await sys.call("/body/files/hash", {
              path: args.path,
            })
            output(result, { json: args.json })
          },
        }),
      },
    }),
  },
})
