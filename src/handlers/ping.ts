//
// ping.ts - echo handler
//

import type { Params, Result } from "../lib/types.ts"
import { success } from "../lib/result.ts"

export async function handler(params: Params): Promise<Result> {
  return success(params)
}
