//
// import.ts - import lens configuration from YAML file
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/lens.ts"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import * as yaml from "js-yaml"

interface ImportParams {
  path?: string
  mode?: "merge" | "replace"
}

interface ImportResult {
  name:               string
  version:            string
  concepts_imported:  number
  relations_imported: number
  consolidation_rules: number
}

interface LensYaml {
  name?:        string
  version?:     string
  description?: string
  concepts?:    Array<{ type: string; description: string }>
  relations?:   Array<{ rel: string; description: string; symmetric?: boolean }>
  consolidation?: Record<string, string>
}

export async function handler(params: Params): Promise<Result<ImportResult>> {
  const p = (params ?? {}) as ImportParams

  // Validate path
  if (!p.path) {
    return error({
      path: [{
        code:    "required",
        message: "path is required"
      }]
    })
  }

  // Open mind.db first (check initialization)
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

  // Resolve and check file path
  const file_path = resolve(process.cwd(), p.path)

  if (!existsSync(file_path)) {
    db.close()
    return error({
      path: [{
        code:    "not_found",
        message: `file not found: ${p.path}`
      }]
    })
  }

  // Read and parse YAML
  let lens_data: LensYaml
  try {
    const content = readFileSync(file_path, "utf-8")
    lens_data = yaml.load(content) as LensYaml
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      yaml: [{
        code:    "parse_error",
        message: message
      }]
    })
  }

  // Validate required fields
  if (!lens_data.name) {
    db.close()
    return error({
      name: [{
        code:    "required",
        message: "name is required"
      }]
    })
  }

  const mode = p.mode ?? "merge"

  try {
    // If replace mode, clear existing lens data
    if (mode === "replace") {
      // Clear lens_meta
      await db.run(`
        ?[key, value] := *lens_meta[key, value]
        :rm lens_meta { key => value }
      `)
      // Clear golden_types
      await db.run(`
        ?[type, description, authority] := *golden_types[type, description, authority]
        :rm golden_types { type => description, authority }
      `)
      // Clear golden_relations
      await db.run(`
        ?[rel, description, symmetric, authority] := *golden_relations[rel, description, symmetric, authority]
        :rm golden_relations { rel => description, symmetric, authority }
      `)
      // Clear consolidation_map
      await db.run(`
        ?[source_type, target_type] := *consolidation_map[source_type, target_type]
        :rm consolidation_map { source_type => target_type }
      `)
    }

    // Update lens_meta
    const name = lens_data.name
    const version = lens_data.version ?? "1.0.0"
    const description = lens_data.description ?? ""

    await db.run(`
      ?[key, value] <- [
        ['name', '${name.replace(/'/g, "''")}'],
        ['version', '${version.replace(/'/g, "''")}'],
        ['description', '${description.replace(/'/g, "''")}']
      ]
      :put lens_meta { key => value }
    `)

    // Import concepts
    const concepts = lens_data.concepts ?? []
    for (const concept of concepts) {
      const escaped_type = concept.type.replace(/'/g, "''")
      const escaped_desc = concept.description.replace(/'/g, "''")
      await db.run(`
        ?[type, description, authority] <- [['${escaped_type}', '${escaped_desc}', 'lens']]
        :put golden_types { type => description, authority }
      `)
    }

    // Import relations
    const relations = lens_data.relations ?? []
    for (const relation of relations) {
      const escaped_rel = relation.rel.replace(/'/g, "''")
      const escaped_desc = relation.description.replace(/'/g, "''")
      const symmetric = relation.symmetric ?? false
      await db.run(`
        ?[rel, description, symmetric, authority] <- [['${escaped_rel}', '${escaped_desc}', ${symmetric}, 'lens']]
        :put golden_relations { rel => description, symmetric, authority }
      `)
    }

    // Import consolidation mappings
    const consolidation = lens_data.consolidation ?? {}
    const consolidation_count = Object.keys(consolidation).length
    for (const [source, target] of Object.entries(consolidation)) {
      const escaped_source = source.replace(/'/g, "''")
      const escaped_target = target.replace(/'/g, "''")
      await db.run(`
        ?[source_type, target_type] <- [['${escaped_source}', '${escaped_target}']]
        :put consolidation_map { source_type => target_type }
      `)
    }

    db.close()

    return success({
      name:               name,
      version:            version,
      concepts_imported:  concepts.length,
      relations_imported: relations.length,
      consolidation_rules: consolidation_count
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : String(err)
    return error({
      lens: [{
        code:    "import_error",
        message: `failed to import lens: ${message}`
      }]
    })
  }
}
