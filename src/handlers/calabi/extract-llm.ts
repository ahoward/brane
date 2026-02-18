//
// extract-llm.ts - LLM-powered knowledge extraction orchestrator
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { resolve_lens_paths } from "../../lib/state.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { file_exists_in_body } from "../../lib/body.ts"
import { get_golden_types, get_golden_relations } from "../../lib/lens.ts"
import { extract_from_file } from "../../lib/llm.ts"
import { handler as extract_handler } from "./extract.ts"
import { resolve } from "node:path"
import { existsSync, statSync } from "node:fs"
import Database from "bun:sqlite"

interface ExtractLlmParams {
  path?:     string
  file_url?: string
  dry_run?:  boolean
}

interface ExtractLlmFileResult {
  file_url:            string
  concepts_extracted:  number
  edges_extracted:     number
  concepts_created:    number
  concepts_reused:     number
  edges_created:       number
  provenance_created:  number
  concepts_orphaned?:  number
  patch?:              { concepts: any[]; edges: any[] }
}

interface ExtractLlmResult {
  files:              ExtractLlmFileResult[]
  totals: {
    files_processed:     number
    concepts_extracted:  number
    edges_extracted:     number
    concepts_created:    number
    concepts_reused:     number
    edges_created:       number
    provenance_created:  number
  }
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ExtractLlmResult>> {
  const p = (params ?? {}) as ExtractLlmParams
  const dry_run = p.dry_run ?? false

  // Resolve file_url(s) to process
  let file_urls: string[] = []

  if (p.file_url) {
    file_urls = [p.file_url]
  } else if (p.path) {
    const abs_path = resolve(process.cwd(), p.path)

    // Check if path is a directory
    if (existsSync(abs_path) && statSync(abs_path).isDirectory()) {
      // Query body.db for all files under this directory
      const lens_paths = resolve_lens_paths()
      const body_db_path = lens_paths.body_db_path

      if (!existsSync(body_db_path)) {
        return error({
          body: [{
            code:    "not_initialized",
            message: "brane not initialized (run brane init)"
          }]
        })
      }

      const db = new Database(body_db_path, { readonly: true })
      const prefix = "file://" + abs_path
      const rows = db.query("SELECT url FROM files WHERE url LIKE ?").all(`${prefix}%`) as { url: string }[]
      db.close()

      file_urls = rows.map(r => r.url)

      if (file_urls.length === 0) {
        return error({
          path: [{
            code:    "not_found",
            message: `no tracked files found under ${p.path}`
          }]
        })
      }
    } else {
      // Single file
      file_urls = ["file://" + abs_path]
    }
  } else {
    return error({
      path: [{
        code:    "required",
        message: "path or file_url is required"
      }]
    })
  }

  // Check .brane exists
  const brane_path = resolve_lens_paths().brane_path
  if (!existsSync(brane_path)) {
    return error({
      body: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Check mind.db is accessible
  const mind = open_mind()
  if (is_mind_error(mind)) {
    return error({
      mind: [{
        code:    mind.code,
        message: mind.message
      }]
    })
  }

  // Get lens config (golden types/relations) then close mind.db (RocksDB single-connection)
  let golden_types: { type: string; description: string }[] = []
  let golden_relations: { rel: string; description: string; symmetric: boolean }[] = []

  try {
    golden_types = (await get_golden_types(mind.db)).map(t => ({
      type:        t.type,
      description: t.description
    }))
    golden_relations = (await get_golden_relations(mind.db)).map(r => ({
      rel:         r.rel,
      description: r.description,
      symmetric:   r.symmetric
    }))
  } catch {
    // Lens tables may not exist yet — proceed with defaults
  }

  mind.db.close()

  // Process each file
  const file_results: ExtractLlmFileResult[] = []
  const totals = {
    files_processed:    0,
    concepts_extracted: 0,
    edges_extracted:    0,
    concepts_created:   0,
    concepts_reused:    0,
    edges_created:      0,
    provenance_created: 0
  }

  for (const file_url of file_urls) {
    // Validate file is tracked in body.db
    if (!file_exists_in_body(file_url)) {
      return error({
        file_url: [{
          code:    "not_found",
          message: `file not tracked in body.db: ${file_url}`
        }]
      })
    }

    // Read file content from disk
    const file_path = file_url.replace("file://", "")
    let file_content: string

    try {
      file_content = await Bun.file(file_path).text()
    } catch (err) {
      return error({
        file_url: [{
          code:    "read_error",
          message: `cannot read file: ${file_path}`
        }]
      })
    }

    // Call LLM for extraction
    let extraction
    try {
      extraction = await extract_from_file({
        file_url,
        file_content,
        file_path,
        golden_types,
        golden_relations
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return error({
        llm: [{
          code:    "extraction_error",
          message: `LLM extraction failed: ${message}`
        }]
      })
    }

    const file_result: ExtractLlmFileResult = {
      file_url,
      concepts_extracted: extraction.concepts.length,
      edges_extracted:    extraction.edges.length,
      concepts_created:   0,
      concepts_reused:    0,
      edges_created:      0,
      provenance_created: 0
    }

    // Dry run — return the patch without applying
    if (dry_run) {
      file_result.patch = {
        concepts: extraction.concepts,
        edges:    extraction.edges
      }
      file_results.push(file_result)
      totals.files_processed++
      totals.concepts_extracted += extraction.concepts.length
      totals.edges_extracted += extraction.edges.length
      continue
    }

    // Small delay between files to ensure RocksDB lock is released
    if (file_results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Apply patch via existing extract handler
    const patch_result = await extract_handler({
      file_url,
      concepts: extraction.concepts.map(c => ({ name: c.name, type: c.type })),
      edges:    extraction.edges.map(e => ({
        source_name: e.source_name,
        target_name: e.target_name,
        relation:    e.relation,
        weight:      e.weight
      }))
    }, emit)

    if (patch_result.status === "success" && patch_result.result) {
      const r = patch_result.result as any
      file_result.concepts_created   = r.concepts_created ?? 0
      file_result.concepts_reused    = r.concepts_reused ?? 0
      file_result.edges_created      = r.edges_created ?? 0
      file_result.provenance_created = r.provenance_created ?? 0
      if (r.concepts_orphaned) {
        file_result.concepts_orphaned = r.concepts_orphaned
      }
    } else {
      // Patch application failed — return the error
      return patch_result as any
    }

    file_results.push(file_result)
    totals.files_processed++
    totals.concepts_extracted += file_result.concepts_extracted
    totals.edges_extracted += file_result.edges_extracted
    totals.concepts_created += file_result.concepts_created
    totals.concepts_reused += file_result.concepts_reused
    totals.edges_created += file_result.edges_created
    totals.provenance_created += file_result.provenance_created
  }

  return success({ files: file_results, totals })
}
