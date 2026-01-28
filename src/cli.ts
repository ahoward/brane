#!/usr/bin/env bun
//
// cli.ts - command line interface
//

import { sys } from "./index.ts"
import { start_repl } from "./repl.ts"

async function read_stdin(): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString("utf-8")
}

async function read_file(path: string): Promise<string> {
  return await Bun.file(path).text()
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // no args or repl command
  if (args.length === 0 || args[0] === "repl") {
    await start_repl()
    return
  }

  // handler call
  const path = args[0]

  if (!path.startsWith("/")) {
    console.error(`error: path must start with /`)
    console.error(`usage: brane /path/to/handler [params]`)
    process.exit(1)
  }

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
          status:  "error",
          result:  null,
          errors:  {
            params: [{
              code:    "file_not_found",
              message: `could not read file: ${file_path}`
            }]
          },
          meta: {
            path:        path,
            timestamp:   new Date().toISOString(),
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
      path:        path,
      timestamp:   new Date().toISOString(),
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

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
