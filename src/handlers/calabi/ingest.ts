//
// ingest.ts - unified scan + extract orchestrator
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error } from "../../lib/mind.ts"
import { get_golden_types, get_golden_relations } from "../../lib/lens.ts"
import { extract_from_file } from "../../lib/llm.ts"
import { handler as body_scan_handler } from "../body/scan.ts"
import { handler as extract_handler } from "./extract.ts"
import { resolve_lens_paths } from "../../lib/state.ts"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { Database } from "bun:sqlite"

interface IngestParams {
  path?:    string
  dry_run?: boolean
}

interface IngestFileResult {
  file_url:            string
  status:              "added" | "updated" | "unchanged" | "error"
  concepts_extracted?: number
  edges_extracted?:    number
  concepts_created?:   number
  concepts_reused?:    number
  edges_created?:      number
  provenance_created?: number
  error?:              string
  patch?:              { concepts: any[]; edges: any[] }
}

interface IngestResult {
  files:  IngestFileResult[]
  totals: {
    files_scanned:      number
    files_added:        number
    files_updated:      number
    files_unchanged:    number
    files_extracted:    number
    files_skipped:      number
    concepts_extracted: number
    edges_extracted:    number
    concepts_created:   number
    concepts_reused:    number
    edges_created:      number
    provenance_created: number
    errors:             number
  }
}

// Invalidate a file's hash in body.db so the next ingest re-processes it.
// Used when extraction fails — prevents "sync drift" where body.db thinks
// the file is current but mind.db never got the extraction.
function invalidate_body_hash(body_db_path: string, file_url: string): void {
  try {
    const db = new Database(body_db_path)
    db.run("UPDATE files SET hash = ? WHERE url = ?", ["extraction_pending", file_url])
    db.close()
  } catch {
    // Best effort — if body.db is locked, the file just won't be retried automatically
  }
}

// Check if file content looks binary (contains null bytes in first 8KB)
function looks_binary(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192))
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) return true
  }
  return false
}

export async function handler(params: Params, emit?: Emit): Promise<Result<IngestResult>> {
  const p = (params ?? {}) as IngestParams
  const dry_run = p.dry_run ?? false
  const path = p.path ?? "."

  // Resolve lens paths
  const lens_paths = resolve_lens_paths()
  const brane_path = lens_paths.brane_path

  if (!existsSync(brane_path)) {
    return error({
      body: [{
        code:    "not_initialized",
        message: "brane not initialized (run brane init)"
      }]
    })
  }

  // Step 1: Scan files into body.db
  emit?.("progress", { phase: "scanning", current: 0, total: 0, message: path })
  const scan_result = await body_scan_handler({ path, dry_run }, emit)

  if (scan_result.status === "error") {
    return scan_result as any
  }

  const scan = scan_result.result as any

  // Step 2: Check mind.db is accessible and load lens config
  const mind = open_mind()
  if (is_mind_error(mind)) {
    return error({
      mind: [{
        code:    mind.code,
        message: mind.message
      }]
    })
  }

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

  // Step 3: Determine which files need extraction (added + updated)
  const files_to_extract: { url: string; status: "added" | "updated" }[] = []

  for (const f of scan.added ?? []) {
    files_to_extract.push({ url: f.url, status: "added" })
  }
  for (const f of scan.updated ?? []) {
    files_to_extract.push({ url: f.url, status: "updated" })
  }

  // Build results
  const file_results: IngestFileResult[] = []
  const totals = {
    files_scanned:      (scan.summary?.added ?? 0) + (scan.summary?.updated ?? 0) + (scan.summary?.unchanged ?? 0),
    files_added:        scan.summary?.added ?? 0,
    files_updated:      scan.summary?.updated ?? 0,
    files_unchanged:    scan.summary?.unchanged ?? 0,
    files_extracted:    0,
    files_skipped:      scan.summary?.unchanged ?? 0,
    concepts_extracted: 0,
    edges_extracted:    0,
    concepts_created:   0,
    concepts_reused:    0,
    edges_created:      0,
    provenance_created: 0,
    errors:             0
  }

  // Add unchanged files to results
  // (we don't have individual URLs for unchanged files from body/scan,
  //  so we just track the count in totals)

  // Step 4: Extract each file
  for (let i = 0; i < files_to_extract.length; i++) {
    const file = files_to_extract[i]
    const file_path = file.url.replace("file://", "")
    emit?.("progress", { phase: "extracting", current: i + 1, total: files_to_extract.length, message: file_path })

    // Read file content (skip binary files)
    let file_content: string
    try {
      const buf = await Bun.file(file_path).arrayBuffer()
      if (looks_binary(buf)) {
        file_results.push({
          file_url: file.url,
          status:   "error",
          error:    `skipped binary file: ${file_path}`
        })
        totals.errors++
        continue
      }
      file_content = new TextDecoder().decode(buf)
    } catch {
      file_results.push({
        file_url: file.url,
        status:   "error",
        error:    `cannot read file: ${file_path}`
      })
      if (!dry_run) invalidate_body_hash(lens_paths.body_db_path, file.url)
      totals.errors++
      continue
    }

    // Call LLM extraction
    let extraction
    try {
      extraction = await extract_from_file({
        file_url:         file.url,
        file_content,
        file_path,
        golden_types,
        golden_relations
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      file_results.push({
        file_url: file.url,
        status:   "error",
        error:    `LLM extraction failed: ${message}`
      })
      if (!dry_run) invalidate_body_hash(lens_paths.body_db_path, file.url)
      totals.errors++
      continue
    }

    const file_result: IngestFileResult = {
      file_url:           file.url,
      status:             file.status,
      concepts_extracted: extraction.concepts.length,
      edges_extracted:    extraction.edges.length
    }

    // Dry run — return patch without applying
    if (dry_run) {
      file_result.patch = {
        concepts: extraction.concepts,
        edges:    extraction.edges
      }
      file_result.concepts_created = 0
      file_result.concepts_reused = 0
      file_result.edges_created = 0
      file_result.provenance_created = 0
      file_results.push(file_result)
      totals.files_extracted++
      totals.concepts_extracted += extraction.concepts.length
      totals.edges_extracted += extraction.edges.length
      continue
    }

    // Small delay between files for RocksDB lock release
    if (file_results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Apply patch via extract handler
    const patch_result = await extract_handler({
      file_url:  file.url,
      concepts:  extraction.concepts.map(c => ({ name: c.name, type: c.type })),
      edges:     extraction.edges.map(e => ({
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
    } else {
      file_result.status = "error"
      file_result.error = "patch application failed"
      invalidate_body_hash(lens_paths.body_db_path, file.url)
      totals.errors++
      file_results.push(file_result)
      continue
    }

    file_results.push(file_result)
    totals.files_extracted++
    totals.concepts_extracted += file_result.concepts_extracted ?? 0
    totals.edges_extracted += file_result.edges_extracted ?? 0
    totals.concepts_created += file_result.concepts_created ?? 0
    totals.concepts_reused += file_result.concepts_reused ?? 0
    totals.edges_created += file_result.edges_created ?? 0
    totals.provenance_created += file_result.provenance_created ?? 0
  }

  return success({ files: file_results, totals })
}
