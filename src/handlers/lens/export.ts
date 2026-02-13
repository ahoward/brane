//
// export.ts - export lens configuration as YAML
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_lens_config } from "../../lib/lens.ts"
import * as yaml from "js-yaml"

interface ExportResult {
  yaml: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ExportResult>> {
  // Open mind.db
  const mind = open_mind()

  if (is_mind_error(mind)) {
    return error({
      mind: [{
        code:    mind.code,
        message: mind.message
      }]
    })
  }

  const { db } = mind

  try {
    const config = await get_lens_config(db)
    db.close()

    // Convert to YAML-friendly format (remove authority from output)
    const yaml_obj: Record<string, unknown> = {
      name:    config.name,
      version: config.version,
    }

    if (config.description) {
      yaml_obj.description = config.description
    }

    if (config.concepts.length > 0) {
      yaml_obj.concepts = config.concepts.map(c => ({
        type:        c.type,
        description: c.description
      }))
    }

    if (config.relations.length > 0) {
      yaml_obj.relations = config.relations.map(r => ({
        rel:         r.rel,
        description: r.description,
        symmetric:   r.symmetric
      }))
    }

    if (Object.keys(config.consolidation).length > 0) {
      yaml_obj.consolidation = config.consolidation
    }

    const yaml_str = yaml.dump(yaml_obj, {
      indent:      2,
      lineWidth:   -1,
      noRefs:      true,
      sortKeys:    false
    })

    return success({ yaml: yaml_str })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "export_error",
        message: `failed to export lens: ${message}`
      }]
    })
  }
}
