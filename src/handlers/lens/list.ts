//
// list.ts - list all available lenses with active marker
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { list_lenses, get_active_lens, resolve_lens_paths } from "../../lib/state.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"

interface LensInfo {
  name:   string
  active: boolean
  path:   string
}

interface ListResult {
  lenses: LensInfo[]
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ListResult>> {
  const brane_path = resolve(process.cwd(), ".brane")

  if (!existsSync(brane_path)) {
    return error({
      brane: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  const active = get_active_lens()
  const names = list_lenses()

  const lenses: LensInfo[] = names.map(name => {
    const paths = resolve_lens_paths(name)
    return {
      name,
      active: name === active,
      path:   name === "default" && !existsSync(resolve(brane_path, "lens", "default"))
        ? brane_path  // flat layout
        : resolve(brane_path, "lens", name)
    }
  })

  return success({ lenses })
}
