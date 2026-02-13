//
// ping.ts - echo handler
//

import type { Params, Result, Emit } from "../lib/types.ts"
import { success } from "../lib/result.ts"

export async function handler(params: Params, emit?: Emit): Promise<Result> {
  return success(params)
}
