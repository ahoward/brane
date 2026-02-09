//
// output.ts - CLI output formatting
//

import type { Result } from "../lib/types.ts"

export interface OutputOptions {
  json?: boolean
  quiet?: boolean
}

//
// Main output function
//
export function output(result: Result<any>, options: OutputOptions = {}): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.status === "error") {
    format_error(result)
  } else {
    format_success(result)
  }

  if (result.status === "error") {
    process.exit(1)
  }
}

//
// Error formatting (to stderr)
//
function format_error(result: Result<any>): void {
  if (!result.errors) {
    console.error("error: unknown error")
    return
  }

  for (const [_field, errors] of Object.entries(result.errors)) {
    for (const err of errors as any[]) {
      console.error(`error: ${err.message}`)
    }
  }
}

//
// Success formatting (to stdout)
//
function format_success(result: Result<any>): void {
  const data = result.result

  if (data === null || data === undefined) {
    return
  }

  // Detect result shape and format appropriately
  if (data.concepts && Array.isArray(data.concepts)) {
    format_concepts(data.concepts)
  } else if (data.edges && Array.isArray(data.edges)) {
    format_edges(data.edges)
  } else if (data.rules && Array.isArray(data.rules)) {
    format_rules(data.rules)
  } else if (data.matches && Array.isArray(data.matches)) {
    format_search_results(data.matches)
  } else if (data.files && Array.isArray(data.files)) {
    format_files(data.files)
  } else if (data.annotations && Array.isArray(data.annotations)) {
    format_annotations(data.annotations)
  } else if (data.provenance && Array.isArray(data.provenance)) {
    format_provenance(data.provenance)
  } else if (data.violations && Array.isArray(data.violations)) {
    format_violations(data)
  } else if (typeof data === "object" && data.id !== undefined) {
    // Single resource with id
    format_single(data)
  } else if (typeof data === "object" && data.path !== undefined) {
    // Init result
    format_init(data)
  } else if (typeof data === "object") {
    format_object(data)
  } else {
    console.log(data)
  }
}

//
// Format functions for specific types
//

function format_concepts(concepts: any[]): void {
  if (concepts.length === 0) {
    console.log("(no concepts)")
    return
  }
  console.log("ID\tNAME\tTYPE")
  for (const c of concepts) {
    console.log(`${c.id}\t${c.name}\t${c.type}`)
  }
}

function format_edges(edges: any[]): void {
  if (edges.length === 0) {
    console.log("(no edges)")
    return
  }
  console.log("ID\tFROM\tTO\tRELATION")
  for (const e of edges) {
    console.log(`${e.id}\t${e.source}\t${e.target}\t${e.relation}`)
  }
}

function format_rules(rules: any[]): void {
  if (rules.length === 0) {
    console.log("(no rules)")
    return
  }
  console.log("NAME\tBUILTIN\tDESCRIPTION")
  for (const r of rules) {
    console.log(`${r.name}\t${r.builtin ? "yes" : "no"}\t${r.description}`)
  }
}

function format_search_results(matches: any[]): void {
  if (matches.length === 0) {
    console.log("(no matches)")
    return
  }
  console.log("SCORE\tID\tNAME\tTYPE")
  for (const m of matches) {
    const score = typeof m.score === "number" ? m.score.toFixed(3) : m.score
    console.log(`${score}\t${m.id}\t${m.name}\t${m.type}`)
  }
}

function format_files(files: any[]): void {
  if (files.length === 0) {
    console.log("(no files)")
    return
  }
  console.log("ID\tPATH\tSIZE")
  for (const f of files) {
    const path = f.url?.replace("file://", "") || f.path || ""
    console.log(`${f.id || "-"}\t${path}\t${f.size || "-"}`)
  }
}

function format_annotations(annotations: any[]): void {
  if (annotations.length === 0) {
    console.log("(no annotations)")
    return
  }
  console.log("ID\tCONCEPT\tTYPE\tTEXT")
  for (const a of annotations) {
    const text = a.text?.slice(0, 40) + (a.text?.length > 40 ? "..." : "")
    console.log(`${a.id}\t${a.concept_id}\t${a.type}\t${text}`)
  }
}

function format_provenance(prov: any[]): void {
  if (prov.length === 0) {
    console.log("(no provenance)")
    return
  }
  console.log("CONCEPT\tFILE")
  for (const p of prov) {
    console.log(`${p.concept_id}\t${p.file_url}`)
  }
}

function format_violations(data: any): void {
  if (data.passed) {
    console.log("OK: all rules passed")
    return
  }
  console.log(`FAILED: ${data.summary?.total_violations || 0} violations`)
  for (const rule of data.rules || []) {
    if (!rule.passed) {
      console.log(`\n${rule.name}:`)
      for (const v of rule.violations || []) {
        console.log(`  - ${v.name} (id: ${v.id})`)
      }
    }
  }
}

function format_single(data: any): void {
  for (const [key, value] of Object.entries(data)) {
    if (key === "vector") continue // Skip embedding vectors
    const display = typeof value === "object" ? JSON.stringify(value) : value
    console.log(`${capitalize(key)}: ${display}`)
  }
}

function format_init(data: any): void {
  if (data.created) {
    console.log(`created: ${data.path}`)
  } else {
    console.log(`exists: ${data.path}`)
  }
  if (data.schema_version) {
    console.log(`schema: ${data.schema_version}`)
  }
}

function format_object(data: any): void {
  // Generic object formatting
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "object" && value !== null) {
      console.log(`${capitalize(key)}: ${JSON.stringify(value)}`)
    } else {
      console.log(`${capitalize(key)}: ${value}`)
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}
