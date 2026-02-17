//
// init.ts - brane init (convenience: body init + mind init)
//

import { defineCommand } from "citty"
import { sys } from "../../index.ts"
import { output } from "../output.ts"

export const init = defineCommand({
  meta: {
    name: "init",
    description: "Initialize Brane (body + mind databases)",
  },
  args: {
    json: { type: "boolean", alias: "j", description: "Output as JSON" },
  },
  async run({ args }) {
    // Initialize body
    const body_result = await sys.call("/body/init", {})
    if (body_result.status === "error") {
      output(body_result, { json: args.json })
      return
    }

    // Initialize mind
    const mind_result = await sys.call("/mind/init", {})
    if (mind_result.status === "error") {
      output(mind_result, { json: args.json })
      return
    }

    if (args.json) {
      // Combine results for JSON output
      console.log(JSON.stringify({
        status: "success",
        result: {
          body: body_result.result,
          mind: mind_result.result,
        },
        errors: null,
        meta: mind_result.meta,
      }, null, 2))
    } else {
      const body = body_result.result as any
      const mind = mind_result.result as any
      const body_status = body?.created ? "created" : "exists"
      const mind_status = mind?.created ? "created" : "exists"
      console.log(`${body_status} ${body?.path}/body.db`)
      console.log(`${mind_status} ${mind?.path}`)
    }
  },
})
