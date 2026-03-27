//
// digest.ts - universal intake: consume anything into the knowledge graph
//
// Single entry point for all knowledge ingestion:
//   - Local code directories → delegates to /calabi/ingest (AST + LLM + provenance)
//   - URLs, files, stdin → LLM extraction of concepts + edges + episodes
//
// Tracks digested sources in state.db for dedup.
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_state, resolve_lens_paths } from "../../lib/state.ts"
import { load_source } from "../../lib/source-loader.ts"
import { digest_content } from "../../lib/llm/digest.ts"
import { auto_tag } from "../../lib/auto-tag.ts"
import { consume_llm_call, record_llm_call } from "../../lib/rate-limit.ts"
import { is_mock_mode } from "../../lib/llm/index.ts"
import { sys } from "../../index.ts"
import { existsSync, statSync } from "node:fs"
import { resolve } from "node:path"

interface DigestParams {
  source:    string    // file path, URL, directory, or "-" for stdin
  lens?:     string    // lens prompt to shape extraction
  agent_id?: string    // agent ID for created items (default: "cli")
  dry_run?:  boolean   // preview without writing
}

//
// Detect if a source is a local code directory that should use the
// ingest pipeline (AST + LLM + provenance + change detection).
//
function should_use_ingest_pipeline(source: string): boolean {
  if (source === "-") return false
  if (source.startsWith("http://") || source.startsWith("https://")) return false

  try {
    const abs = resolve(source)
    if (!existsSync(abs)) return false
    const stat = statSync(abs)
    if (!stat.isDirectory()) return false

    // Check if brane is initialized (ingest requires body.db)
    try {
      const paths = resolve_lens_paths()
      if (existsSync(paths.brane_path)) return true
    } catch {}

    return false
  } catch {
    return false
  }
}

interface DigestSourceResult {
  label:             string
  hash:              string
  concepts_created:  number
  edges_created:     number
  episodes_created:  number
  skipped:           boolean
  reason?:           string
}

interface DigestResult {
  sources_found:     number
  sources_digested:  number
  sources_skipped:   number
  concepts_created:  number
  edges_created:     number
  episodes_created:  number
  dry_run:           boolean
  details:           DigestSourceResult[]
}

//
// Ensure the digested_sources table exists in state.db
//
function ensure_digest_table(db: ReturnType<typeof open_state>): void {
  if (!db) return
  db.run(`
    CREATE TABLE IF NOT EXISTS digested_sources (
      hash         TEXT PRIMARY KEY,
      label        TEXT NOT NULL,
      digested_at  TEXT NOT NULL,
      concepts     INTEGER NOT NULL,
      edges        INTEGER NOT NULL,
      episodes     INTEGER NOT NULL
    )
  `)
}

function is_already_digested(db: ReturnType<typeof open_state>, hash: string): boolean {
  if (!db) return false
  const row = db.query("SELECT 1 FROM digested_sources WHERE hash = ?").get(hash)
  return row !== null
}

function record_digested(
  db: ReturnType<typeof open_state>,
  hash: string,
  label: string,
  concepts: number,
  edges: number,
  episodes: number,
): void {
  if (!db) return
  db.run(
    "INSERT OR REPLACE INTO digested_sources (hash, label, digested_at, concepts, edges, episodes) VALUES (?, ?, ?, ?, ?, ?)",
    [hash, label, new Date().toISOString(), concepts, edges, episodes],
  )
}

export async function handler(params: Params, emit?: Emit): Promise<Result<DigestResult>> {
  const p = (params ?? {}) as DigestParams

  if (!p.source || typeof p.source !== "string" || !p.source.trim()) {
    return error({ source: [{ code: "required", message: "source is required (file, URL, directory, or \"-\" for stdin)" }] })
  }

  const source = p.source.trim()
  const dry_run = p.dry_run === true
  const agent_id = typeof p.agent_id === "string" && p.agent_id.trim() ? p.agent_id.trim() : "cli"
  const lens_prompt = typeof p.lens === "string" && p.lens.trim() ? p.lens.trim() : undefined

  // Local code directories delegate to the ingest pipeline
  // (AST parsing, body.db tracking, provenance, change detection)
  if (should_use_ingest_pipeline(source)) {
    const ingest_result = await sys.call("/calabi/ingest", {
      path: source,
      dry_run,
      force: false,
    }, emit)

    if (ingest_result.status === "error") {
      return ingest_result as any
    }

    // Translate ingest result shape to digest result shape
    const data = ingest_result.result as any
    const t = data?.totals ?? {}
    return success({
      sources_found: t.files_scanned ?? 0,
      sources_digested: t.files_extracted ?? 0,
      sources_skipped: t.files_unchanged ?? 0,
      concepts_created: t.concepts_created ?? 0,
      edges_created: t.edges_created ?? 0,
      episodes_created: 0,  // ingest doesn't create episodes
      dry_run,
      details: (data?.files ?? []).map((f: any) => ({
        label: f.file_url?.replace("file://", "") ?? f.file_url,
        hash: "",
        concepts_created: f.concepts_created ?? 0,
        edges_created: f.edges_created ?? 0,
        episodes_created: 0,
        skipped: f.status === "unchanged",
        reason: f.status === "unchanged" ? "unchanged" : f.error,
      })),
    })
  }

  // Load source(s)
  emit?.("progress", { phase: "loading", source })

  let sources
  try {
    sources = await load_source(source)
  } catch (e: any) {
    return error({ source: [{ code: "load_failed", message: e.message ?? "failed to load source" }] })
  }

  if (sources.length === 0) {
    return error({ source: [{ code: "empty", message: `no content found at: ${source}` }] })
  }

  // Open state.db for dedup tracking
  const state_db = open_state()

  try {
    if (state_db) {
      ensure_digest_table(state_db)
    }
    const details: DigestSourceResult[] = []
    let total_concepts = 0
    let total_edges = 0
    let total_episodes = 0
    let sources_digested = 0
    let sources_skipped = 0

    for (const src of sources) {
      // Dedup check
      if (state_db && is_already_digested(state_db, src.hash)) {
        details.push({
          label: src.label,
          hash: src.hash,
          concepts_created: 0,
          edges_created: 0,
          episodes_created: 0,
          skipped: true,
          reason: "already digested (duplicate content hash)",
        })
        sources_skipped++
        continue
      }

      emit?.("progress", { phase: "extracting", label: src.label })

      if (dry_run) {
        details.push({
          label: src.label,
          hash: src.hash,
          concepts_created: 0,
          edges_created: 0,
          episodes_created: 0,
          skipped: false,
          reason: "dry-run: would digest",
        })
        sources_digested++
        continue
      }

      // Rate limit check (skip in mock mode)
      if (!is_mock_mode()) {
        const limit = consume_llm_call()
        if (!limit.allowed) {
          details.push({
            label: src.label,
            hash: src.hash,
            concepts_created: 0,
            edges_created: 0,
            episodes_created: 0,
            skipped: true,
            reason: limit.error ?? "rate limit exceeded",
          })
          sources_skipped++
          continue
        }
      }

      // LLM extraction
      let extraction
      try {
        extraction = await digest_content({
          content: src.content,
          label: src.label,
          lens_prompt,
        })
      } catch (e: any) {
        details.push({
          label: src.label,
          hash: src.hash,
          concepts_created: 0,
          edges_created: 0,
          episodes_created: 0,
          skipped: true,
          reason: `extraction failed: ${e.message ?? "unknown error"}`,
        })
        sources_skipped++
        continue
      }

      // Apply extraction results
      let concepts_created = 0
      let edges_created = 0
      let episodes_created = 0

      // Batch-create concepts
      const concept_id_map: Record<string, number> = {}
      const valid_concepts = extraction.concepts.filter(c => c.name)
      if (valid_concepts.length > 0) {
        const batch_result = await sys.call("/mind/concepts/create-many", {
          items: valid_concepts.map(c => ({
            name: c.name,
            type: c.type || "Entity",
            agent_id,
          })),
        })
        if (batch_result.status === "success" && batch_result.result) {
          const items = (batch_result.result as { items: { id: number; name: string; matched_existing?: boolean }[] }).items ?? []
          for (const item of items) {
            concept_id_map[item.name] = item.id
            if (!item.matched_existing) {
              concepts_created++
            }
          }
        }
      }

      // Batch-create edges (only where both endpoints resolved)
      const valid_edges = extraction.edges
        .map(e => ({
          source: concept_id_map[e.source_name],
          target: concept_id_map[e.target_name],
          relation: e.relation || "DEPENDS_ON",
          source_name: e.source_name,
          target_name: e.target_name,
          agent_id,
        }))
        .filter(e => e.source && e.target)

      // Warn about dropped edges (LLM hallucinated concept names)
      const dropped_edges = extraction.edges.length - valid_edges.length
      if (dropped_edges > 0) {
        emit?.("progress", { phase: "warning", label: src.label, dropped_edges, message: `${dropped_edges} edges dropped (concept names not found)` })
      }

      if (valid_edges.length > 0) {
        const edge_result = await sys.call("/mind/edges/create-many", {
          items: valid_edges.map(e => ({
            source: e.source,
            target: e.target,
            relation: e.relation,
            agent_id,
          })),
        })
        if (edge_result.status === "success" && edge_result.result) {
          edges_created = (edge_result.result as { items: unknown[] }).items?.length ?? 0
        }
      }

      // Create episodes (no batch endpoint yet, but episodes are few per source)
      for (const ep of extraction.episodes) {
        if (!ep.observation) continue

        const merged_tags = [...new Set([
          "digest",
          ...(ep.tags || []),
          ...auto_tag(ep.observation + " " + ep.context),
        ])]

        const result = await sys.call("/mind/episodes/create", {
          agent_id,
          observation: ep.observation,
          context: ep.context || `Digested from ${src.label}`,
          tags: merged_tags,
        })
        if (result.status === "success") {
          episodes_created++
        }
      }

      // Record in state.db
      if (state_db) {
        record_digested(state_db, src.hash, src.label, concepts_created, edges_created, episodes_created)
      }

      total_concepts += concepts_created
      total_edges += edges_created
      total_episodes += episodes_created
      sources_digested++

      details.push({
        label: src.label,
        hash: src.hash,
        concepts_created,
        edges_created,
        episodes_created,
        skipped: false,
      })
    }

    return success({
      sources_found: sources.length,
      sources_digested,
      sources_skipped,
      concepts_created: total_concepts,
      edges_created: total_edges,
      episodes_created: total_episodes,
      dry_run,
      details,
    })
  } finally {
    if (state_db) {
      try { state_db.close() } catch {}
    }
  }
}
