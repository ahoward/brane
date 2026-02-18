//
// scan.ts - scan dirty files and extract to mind.db
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { handler as extract_handler } from "./extract.ts"
import { resolve_lens_paths } from "../../lib/state.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import Database from "bun:sqlite"

interface ScanParams {
  path?:    string
  dry_run?: boolean
}

interface ScanResult {
  files_scanned?:     number
  concepts_created?:  number
  concepts_reused?:   number
  edges_created?:     number
  errors?:            { file_url: string; error: string }[]
  files_to_scan?:     string[]
  dry_run?:           boolean
}

interface FileRecord {
  url:  string
  hash: string
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ScanResult>> {
  const p = (params ?? {}) as ScanParams
  const path_filter = p.path ?? ""
  const dry_run = p.dry_run ?? false

  // Resolve lens-aware paths
  const lens_paths = resolve_lens_paths()
  const brane_path = lens_paths.brane_path
  const body_db_path = lens_paths.body_db_path

  if (!existsSync(brane_path) || !existsSync(body_db_path)) {
    return error({
      body: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Check mind.db exists
  const mind = open_mind()

  if (is_mind_error(mind)) {
    return error({
      mind: [{
        code:    mind.code,
        message: mind.message
      }]
    })
  }

  const { db: mind_db } = mind

  try {
    // Get all files from body.db
    const body_db = new Database(body_db_path, { readonly: true })

    let files: FileRecord[]
    if (path_filter) {
      const stmt = body_db.query("SELECT url, hash FROM files WHERE url LIKE ?")
      files = stmt.all(`%${path_filter}%`) as FileRecord[]
    } else {
      const stmt = body_db.query("SELECT url, hash FROM files")
      files = stmt.all() as FileRecord[]
    }

    body_db.close()

    // Find files needing extraction (no provenance links)
    const files_to_scan: string[] = []

    for (const file of files) {
      const has_provenance = await file_has_provenance(mind_db, file.url)
      if (!has_provenance) {
        files_to_scan.push(file.url)
      }
    }

    // Close mind_db - we'll let extract_handler open its own connection
    // (RocksDB only allows one connection at a time)
    mind_db.close()

    // Dry run - just return the list
    if (dry_run) {
      return success({
        files_to_scan: files_to_scan,
        dry_run:       true
      })
    }

    // Scan each file
    let total_concepts_created = 0
    let total_concepts_reused = 0
    let total_edges_created = 0
    const errors: { file_url: string; error: string }[] = []

    for (const file_url of files_to_scan) {
      try {
        // Small delay to ensure RocksDB lock is released between files
        await new Promise(resolve => setTimeout(resolve, 10))

        // Generate simple extraction patch: filename -> Entity concept
        const concept_name = extract_concept_name(file_url)

        const extract_result = await extract_handler({
          file_url: file_url,
          concepts: [
            { name: concept_name, type: "Entity" }
          ],
          edges: []
        }, emit)

        if (extract_result.status === "success" && extract_result.result) {
          total_concepts_created += extract_result.result.concepts_created
          total_concepts_reused += extract_result.result.concepts_reused
          total_edges_created += extract_result.result.edges_created
        } else {
          // Extract failed
          const err_msg = extract_result.errors
            ? JSON.stringify(extract_result.errors)
            : "unknown error"
          errors.push({ file_url, error: err_msg })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push({ file_url, error: message })
      }
    }

    const result: ScanResult = {
      files_scanned:    files_to_scan.length,
      concepts_created: total_concepts_created,
      concepts_reused:  total_concepts_reused,
      edges_created:    total_edges_created
    }

    if (errors.length > 0) {
      result.errors = errors
    }

    return success(result)
  } catch (err) {
    // mind_db already closed above
    const message = err instanceof Error ? err.message : String(err)
    return error({
      scan: [{
        code:    "scan_error",
        message: `failed to scan: ${message}`
      }]
    })
  }
}

//
// Helper functions
//

async function file_has_provenance(db: any, file_url: string): Promise<boolean> {
  const result = await db.run(`
    ?[concept_id] := *provenance[concept_id, file_url], file_url = '${file_url.replace(/'/g, "''")}'
  `)
  const rows = result.rows as number[][]
  return rows.length > 0
}

function extract_concept_name(file_url: string): string {
  // Extract filename from URL: "file:///path/to/auth.ts" -> "auth"
  const url_parts = file_url.split("/")
  const filename = url_parts[url_parts.length - 1]

  // Remove extension: "auth.ts" -> "auth"
  const dot_index = filename.lastIndexOf(".")
  if (dot_index > 0) {
    return filename.substring(0, dot_index)
  }
  return filename
}
