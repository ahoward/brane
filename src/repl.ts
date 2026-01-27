//
// repl.ts - interactive REPL
//

import * as readline from "readline"
import { sys } from "./index.ts"

const PROMPT = "🤖—🧠 > "

export async function start_repl(): Promise<void> {
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    prompt: PROMPT
  })

  console.log("brane repl v0.0.1")
  console.log("type .help for commands, .exit to quit")
  console.log("")

  rl.prompt()

  rl.on("line", async (line: string) => {
    const input = line.trim()

    // dot commands
    if (input === ".exit" || input === ".quit" || input === ".q") {
      rl.close()
      return
    }

    if (input === ".help" || input === ".h") {
      console.log("")
      console.log("Commands:")
      console.log("  /path/to/handler {json}  - call a handler")
      console.log("  .handlers                - list all handlers")
      console.log("  .help                    - show this help")
      console.log("  .exit                    - quit")
      console.log("")
      rl.prompt()
      return
    }

    if (input === ".handlers" || input === ".h") {
      console.log("")
      console.log("Handlers:")
      for (const path of sys.paths()) {
        console.log(`  ${path}`)
      }
      console.log("")
      rl.prompt()
      return
    }

    // empty line
    if (input === "") {
      rl.prompt()
      return
    }

    // handler call: /path {json}
    if (input.startsWith("/")) {
      const space_idx = input.indexOf(" ")
      let path:        string
      let params_str:  string

      if (space_idx === -1) {
        path       = input
        params_str = ""
      } else {
        path       = input.slice(0, space_idx)
        params_str = input.slice(space_idx + 1).trim()
      }

      const parse_result = sys.parse_params(params_str)

      if (parse_result.status === "error") {
        console.log(JSON.stringify(parse_result, null, 2))
        rl.prompt()
        return
      }

      const result = await sys.call(path, parse_result.result)
      console.log(JSON.stringify(result, null, 2))
      rl.prompt()
      return
    }

    // unknown command
    console.log(`unknown command: ${input}`)
    console.log("type .help for commands")
    rl.prompt()
  })

  rl.on("close", () => {
    console.log("")
    console.log("goodbye!")
    process.exit(0)
  })
}
