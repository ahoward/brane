//
// pr-verify.ts - verify workspace changes against rules
//

import type { Params, Result } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { open_mind, is_mind_error, get_rule_by_name, type Rule } from "../../lib/mind.ts"
import { resolve, basename, relative } from "node:path"
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs"
import { Database } from "bun:sqlite"
import { createHash } from "node:crypto"
import type { CozoDb } from "cozo-node"

//
// Types
//

interface PrVerifyParams {
  rules?:   string[]
  dry_run?: boolean
  path?:    string
}

interface ModifiedFile {
  url:      string
  old_hash: string
  new_hash: string
}

interface DeletedFile {
  url: string
}

interface NewFile {
  path: string
}

interface ChangedFiles {
  modified: ModifiedFile[]
  deleted:  DeletedFile[]
  new:      NewFile[]
  summary: {
    modified: number
    deleted:  number
    new:      number
    clean:    boolean
  }
}

interface Violation {
  id:   number
  name: string
}

interface RuleResult {
  name:       string
  passed:     boolean
  violations: Violation[]
  error:      string | null
}

interface VerificationSummary {
  rules_passed:     number
  rules_failed:     number
  total_violations: number
}

interface Verification {
  summary: VerificationSummary
  rules:   RuleResult[]
}

interface PrVerifyResult {
  passed:       boolean
  changes:      ChangedFiles
  verification: Verification | null
  dry_run?:     boolean
}

//
// File change detection (adapted from body/files/status.ts)
//

async function compute_hash(file_path: string): Promise<string> {
  const file = Bun.file(file_path)
  const buffer = await file.arrayBuffer()
  const hash = createHash("sha256")
  hash.update(Buffer.from(buffer))
  return hash.digest("hex")
}

function parse_ignore_file(path: string): string[] {
  if (!existsSync(path)) return []
  const content = readFileSync(path, "utf-8")
  return content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
}

function matches_pattern(name: string, pattern: string): boolean {
  if (pattern.endsWith("/")) {
    return name === pattern.slice(0, -1)
  }
  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1)
    return name.endsWith(ext)
  }
  if (pattern.includes("*")) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
    return regex.test(name)
  }
  return name === pattern
}

function is_ignored(file_path: string, base_dir: string, patterns: string[]): boolean {
  const rel_path = relative(base_dir, file_path)
  const parts = rel_path.split("/")
  for (const pattern of patterns) {
    for (const part of parts) {
      if (matches_pattern(part, pattern)) return true
    }
    if (matches_pattern(rel_path, pattern)) return true
  }
  return false
}

function discover_files(
  path:            string,
  ignore_patterns: string[],
  base_dir:        string,
  tracked_urls:    Set<string>
): string[] {
  const files: string[] = []
  if (!existsSync(path)) return files

  const stat = statSync(path)

  if (stat.isFile()) {
    const name = basename(path)
    if (name.startsWith(".")) return files
    if (is_ignored(path, base_dir, ignore_patterns)) return files
    const url = `file://${path}`
    if (tracked_urls.has(url)) return files
    files.push(path)
  } else if (stat.isDirectory()) {
    const name = basename(path)
    if (name.startsWith(".") && path !== base_dir) return files
    const local_gitignore = parse_ignore_file(resolve(path, ".gitignore"))
    const local_braneignore = parse_ignore_file(resolve(path, ".braneignore"))
    const local_patterns = [...ignore_patterns, ...local_gitignore, ...local_braneignore]
    const entries = readdirSync(path)
    for (const entry of entries) {
      const entry_path = resolve(path, entry)
      const discovered = discover_files(entry_path, local_patterns, base_dir, tracked_urls)
      files.push(...discovered)
    }
  }

  return files
}

async function get_file_changes(path_filter?: string): Promise<ChangedFiles> {
  const brane_path = resolve(process.cwd(), ".brane")
  const db_path = resolve(brane_path, "body.db")

  const db = new Database(db_path, { readonly: true })

  let query = "SELECT id, url, hash, size, mtime FROM files"
  const query_params: string[] = []

  if (path_filter) {
    const abs_path = resolve(process.cwd(), path_filter)
    const url_prefix = `file://${abs_path}`
    query += " WHERE url LIKE ?"
    query_params.push(`${url_prefix}%`)
  }

  query += " ORDER BY url"

  const stmt = db.prepare(query)
  const tracked = stmt.all(...query_params) as { id: number; url: string; hash: string; size: number; mtime: number }[]

  db.close()

  const modified: ModifiedFile[] = []
  const deleted: DeletedFile[] = []
  const tracked_urls = new Set<string>()

  for (const row of tracked) {
    tracked_urls.add(row.url)
    const file_path = row.url.replace("file://", "")

    if (!existsSync(file_path)) {
      deleted.push({ url: row.url })
    } else {
      const current_hash = await compute_hash(file_path)
      if (current_hash !== row.hash) {
        modified.push({
          url:      row.url,
          old_hash: row.hash,
          new_hash: current_hash
        })
      }
    }
  }

  const root_gitignore = parse_ignore_file(resolve(process.cwd(), ".gitignore"))
  const root_braneignore = parse_ignore_file(resolve(process.cwd(), ".braneignore"))
  // Always exclude internal cache directories (fastembed model cache, etc.)
  const builtin_patterns = ["local_cache", "node_modules", ".brane"]
  const root_patterns = [...builtin_patterns, ...root_gitignore, ...root_braneignore]

  const scan_path = path_filter ? resolve(process.cwd(), path_filter) : process.cwd()
  const discovered = discover_files(scan_path, root_patterns, process.cwd(), tracked_urls)

  const new_files: NewFile[] = discovered.map(file_path => ({
    path: relative(process.cwd(), file_path)
  }))

  const clean = modified.length === 0 && deleted.length === 0 && new_files.length === 0

  return {
    modified,
    deleted,
    new: new_files,
    summary: {
      modified: modified.length,
      deleted:  deleted.length,
      new:      new_files.length,
      clean
    }
  }
}

//
// Rule verification (adapted from mind/verify.ts)
//

async function execute_rule(db: CozoDb, rule: Rule): Promise<RuleResult> {
  try {
    const query = `?[id, name] := ${rule.name}[id, name]\n${rule.body}`
    const result = await db.run(query)
    const rows = result.rows as [number, string][]

    const violations: Violation[] = rows.map(row => ({
      id:   row[0],
      name: row[1]
    }))

    return {
      name:       rule.name,
      passed:     violations.length === 0,
      violations,
      error:      null
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return {
      name:       rule.name,
      passed:     false,
      violations: [],
      error:      message
    }
  }
}

async function get_all_rules(db: CozoDb): Promise<Rule[]> {
  const result = await db.run(`
    ?[name, description, body, builtin] := *rules[name, description, body, builtin]
  `)
  const rows = result.rows as [string, string, string, boolean][]

  return rows.map(row => ({
    name:        row[0],
    description: row[1],
    body:        row[2],
    builtin:     row[3]
  }))
}

async function run_verification(
  db: CozoDb,
  requested_rules: string[]
): Promise<{ verification: Verification; error: null } | { verification: null; error: { code: string; message: string } }> {
  let rules_to_run: Rule[] = []

  if (requested_rules.length === 0) {
    rules_to_run = await get_all_rules(db)
  } else {
    for (const name of requested_rules) {
      const rule = await get_rule_by_name(db, name)
      if (!rule) {
        return {
          verification: null,
          error: { code: "not_found", message: `rule not found: ${name}` }
        }
      }
      rules_to_run.push(rule)
    }
  }

  const rule_results: RuleResult[] = []
  for (const rule of rules_to_run) {
    const result = await execute_rule(db, rule)
    rule_results.push(result)
  }

  const rules_passed = rule_results.filter(r => r.passed).length
  const rules_failed = rule_results.filter(r => !r.passed).length
  const total_violations = rule_results.reduce((sum, r) => sum + r.violations.length, 0)

  return {
    verification: {
      summary: { rules_passed, rules_failed, total_violations },
      rules: rule_results
    },
    error: null
  }
}

//
// Main handler
//

export async function handler(params: Params): Promise<Result<PrVerifyResult>> {
  const p = (params ?? {}) as PrVerifyParams
  const requested_rules = p.rules ?? []
  const dry_run = p.dry_run ?? false
  const path_filter = p.path

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

  const { db } = mind

  try {
    // Get file changes
    const changes = await get_file_changes(path_filter)

    // Dry run - return changes only, no verification
    if (dry_run) {
      db.close()
      return success({
        passed:       true,
        changes,
        verification: null,
        dry_run:      true
      })
    }

    // Run verification
    const verify_result = await run_verification(db, requested_rules)

    db.close()

    if (verify_result.error) {
      return error({
        rules: [{
          code:    verify_result.error.code,
          message: verify_result.error.message
        }]
      })
    }

    const passed = verify_result.verification.summary.rules_failed === 0

    return success({
      passed,
      changes,
      verification: verify_result.verification
    })
  } catch (err) {
    db.close()
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
    return error({
      pr_verify: [{
        code:    "verification_error",
        message: `pr-verify failed: ${message}`
      }]
    })
  }
}
