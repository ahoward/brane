#!/usr/bin/env bun
//
// cli.ts - command line interface
//
// Routing:
//   - No args          → REPL
//   - argv[1] starts with /  → API mode (existing behavior)
//   - Otherwise        → CLI mode (citty commands)
//

import { sys } from "./index.ts"
import { start_repl } from "./repl.ts"
import { runMain } from "citty"
import { main, subCommandAliases } from "./cli/main.ts"

//
// Read stdin (for API mode)
//
async function read_stdin(): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString("utf-8")
}

//
// Read file (for API mode)
//
async function read_file(path: string): Promise<string> {
  return await Bun.file(path).text()
}

//
// API mode: /path/to/handler '{"params"}'
// This is the original behavior, preserved for backwards compatibility
//
async function api_mode(args: string[]): Promise<void> {
  const path = args[0]

  let params_str = ""

  // params from arg, file, or stdin
  if (args.length > 1) {
    const params_arg = args[1]

    if (params_arg.startsWith("@")) {
      // file: @path/to/file.json
      const file_path = params_arg.slice(1)
      try {
        params_str = await read_file(file_path)
      } catch (err) {
        const result = {
          status: "error",
          result: null,
          errors: {
            params: [{
              code: "file_not_found",
              message: `could not read file: ${file_path}`
            }]
          },
          meta: {
            path: path,
            timestamp: new Date().toISOString(),
            duration_ms: 0
          }
        }
        console.log(JSON.stringify(result, null, 2))
        process.exit(1)
      }
    } else {
      // inline JSON
      params_str = params_arg
    }
  } else if (!process.stdin.isTTY) {
    // stdin
    params_str = await read_stdin()
  }

  // parse params
  const parse_result = sys.parse_params(params_str)

  if (parse_result.status === "error") {
    parse_result.meta = {
      path: path,
      timestamp: new Date().toISOString(),
      duration_ms: 0
    }
    console.log(JSON.stringify(parse_result, null, 2))
    process.exit(1)
  }

  // call handler
  const result = await sys.call(path, parse_result.result)
  console.log(JSON.stringify(result, null, 2))

  if (result.status === "error") {
    process.exit(1)
  }

  // Special handling for /mind/verify - exit 1 if violations found
  if (path === "/mind/verify" && result.status === "success") {
    const verify_result = result.result as { passed?: boolean } | null
    if (verify_result && verify_result.passed === false) {
      process.exit(1)
    }
  }
}

//
// CLI mode: brane command [subcommand] [flags]
//
async function cli_mode(args: string[]): Promise<void> {
  // Expand aliases (c → concept, e → edge, etc.)
  const expanded = args.map((arg, i) => {
    if (i === 0 && !arg.startsWith("-") && subCommandAliases[arg]) {
      return subCommandAliases[arg]
    }
    return arg
  })

  // Run through citty
  // We need to reconstruct argv for citty
  const originalArgv = process.argv
  process.argv = [originalArgv[0], originalArgv[1], ...expanded]

  try {
    await runMain(main)
  } finally {
    process.argv = originalArgv
  }
}

//
// Main entry point
//
async function main_entry(): Promise<void> {
  const args = process.argv.slice(2)

  // No args → REPL
  if (args.length === 0) {
    await start_repl()
    return
  }

  // "repl" command → REPL
  if (args[0] === "repl") {
    await start_repl()
    return
  }

  // API mode: first arg starts with /
  if (args[0].startsWith("/")) {
    await api_mode(args)
    return
  }

  // CLI mode
  await cli_mode(args)
}

main_entry().catch((err) => {
  console.error(err)
  process.exit(1)
})
