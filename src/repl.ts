//
// repl.ts - interactive REPL
//

import * as readline from "readline"
import { sys } from "./index.ts"

//
// robot emoji variants for prompt
//
const ROBOTS = [
  "🤖",  // classic robot
  "🦾",  // mechanical arm
  "🦿",  // mechanical leg
  "⚙️",   // gear
  "🔧",  // wrench
  "🔩",  // bolt
  "💻",  // laptop
  "🖥️",   // desktop
  "📡",  // satellite
  "🛸",  // ufo
]

function random_robot(): string {
  return ROBOTS[Math.floor(Math.random() * ROBOTS.length)]
}

function make_prompt(): string {
  return `${random_robot()} — 🧠 > `
}

export async function start_repl(): Promise<void> {
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    prompt: make_prompt()
  })

  console.log("brane repl v0.0.1")
  console.log("type .help for commands, .exit to quit")
  console.log("")

  rl.setPrompt(make_prompt()); rl.prompt()

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
      rl.setPrompt(make_prompt()); rl.prompt()
      return
    }

    if (input === ".handlers" || input === ".h") {
      console.log("")
      console.log("Handlers:")
      for (const path of sys.paths()) {
        console.log(`  ${path}`)
      }
      console.log("")
      rl.setPrompt(make_prompt()); rl.prompt()
      return
    }

    // empty line
    if (input === "") {
      rl.setPrompt(make_prompt()); rl.prompt()
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
        rl.setPrompt(make_prompt()); rl.prompt()
        return
      }

      const result = await sys.call(path, parse_result.result)
      console.log(JSON.stringify(result, null, 2))
      rl.setPrompt(make_prompt()); rl.prompt()
      return
    }

    // unknown command
    console.log(`unknown command: ${input}`)
    console.log("type .help for commands")
    rl.setPrompt(make_prompt()); rl.prompt()
  })

  rl.on("close", () => {
    console.log("")
    console.log("goodbye!")
    process.exit(0)
  })
}
