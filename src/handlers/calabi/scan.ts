//
// scan.ts - scan dirty files and extract to mind.db using LLM
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { handler as extract_handler } from "./extract.ts"
import { extract_from_content, is_binary_content, detect_provider } from "../../lib/llm.ts"
import { resolve } from "node:path"
import { existsSync, readFileSync } from "node:fs"
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
  files_skipped?:     number
  errors?:            { file_url: string; error: string }[]
  files_to_scan?:     string[]
  dry_run?:           boolean
  provider?:          string
}

interface FileRecord {
  url:  string
  hash: string
}

export async function handler(params: Params): Promise<Result<ScanResult>> {
  const p = (params ?? {}) as ScanParams
  const path_filter = p.path ?? ""
  const dry_run = p.dry_run ?? false

  // Check body.db exists
  const brane_path = resolve(process.cwd(), ".brane")
  const body_db_path = resolve(brane_path, "body.db")

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

    // Check LLM provider is available before starting
    const { provider, error: provider_error } = await detect_provider()
    if (provider_error || !provider) {
      return error({
        llm: [{
          code:    "not_configured",
          message: provider_error ?? "no LLM provider available"
        }]
      })
    }

    // Scan each file using LLM extraction
    let total_concepts_created = 0
    let total_concepts_reused = 0
    let total_edges_created = 0
    let files_skipped = 0
    const errors: { file_url: string; error: string }[] = []

    for (const file_url of files_to_scan) {
      try {
        // Read file content (or generate mock content in test mode)
        let content: string
        const file_path = file_url_to_path(file_url)

        if (process.env.BRANE_LLM_MOCK === "1") {
          // In mock mode, generate fake content from the URL for testing
          content = generate_mock_content(file_url)
        } else if (!existsSync(file_path)) {
          errors.push({ file_url, error: "file not found on disk" })
          continue
        } else {
          content = readFileSync(file_path, "utf-8")
        }

        // Skip binary files
        if (is_binary_content(content)) {
          files_skipped++
          continue
        }

        // Extract concepts using LLM
        const llm_result = await extract_from_content(file_url, content)

        if (llm_result.error || !llm_result.response) {
          errors.push({ file_url, error: llm_result.error ?? "extraction failed" })
          continue
        }

        // Apply extraction to mind.db
        const extract_result = await extract_handler({
          file_url: file_url,
          concepts: llm_result.response.concepts,
          edges:    llm_result.response.edges
        })

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
      files_scanned:    files_to_scan.length - files_skipped,
      concepts_created: total_concepts_created,
      concepts_reused:  total_concepts_reused,
      edges_created:    total_edges_created,
      provider:         provider
    }

    if (files_skipped > 0) {
      result.files_skipped = files_skipped
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

function file_url_to_path(file_url: string): string {
  // Convert file:///path/to/file.ts -> /path/to/file.ts
  if (file_url.startsWith("file://")) {
    return file_url.slice(7)
  }
  return file_url
}

function generate_mock_content(file_url: string): string {
  // Generate deterministic mock content for testing
  // Extract filename to create a simple mock class/function
  const parts = file_url.split("/")
  const filename = parts[parts.length - 1]
  const name = filename.replace(/\.[^.]+$/, "")
  const pascal_name = name.charAt(0).toUpperCase() + name.slice(1)

  return `// Mock content for ${file_url}
export interface ${pascal_name} {
  id: number
  name: string
}

export function get_${name}(id: number): ${pascal_name} | null {
  // TODO: Implement ${name} lookup
  return null
}
`
}
