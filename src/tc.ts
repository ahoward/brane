#!/usr/bin/env bun
//
// tc.ts - tc-compatible test runner
//
// Runs tests from tests/{handler}/data/{case}/ directories
// Each case has params.json and result.json
// Supports nested cases, skip files, placeholder matching, parallel execution
//
// Structure:
//   tests/{handler}/run                          # executable (optional with hooks)
//   tests/{handler}/skip                         # optional skip marker
//   tests/{handler}/data/{NN-case}/params.json   # input params
//   tests/{handler}/data/{NN-case}/result.json   # expected result
//
// Nested cases supported:
//   tests/{handler}/data/{NN-group}/{NN-case}/params.json
//   tests/{handler}/data/{NN-group}/{NN-case}/result.json
//
// Hook system:
//   tests/before_each.sh                         # runs before each test (root level)
//   tests/{namespace}/before_each.sh             # runs before tests in namespace
//   tests/{handler}/data/{case}/setup.sh         # per-case setup
//   tests/{handler}/data/{case}/teardown.sh      # per-case teardown
//   tests/{namespace}/after_each.sh              # runs after tests in namespace
//   tests/after_each.sh                          # runs after each test (root level)
//
// Configuration:
//   tc.config.ts (or tc.config.json) in project root
//
// Flags:
//   -v, --verbose     show failure details inline
//   -s, --sequential  disable parallel execution
//   -r, --random      randomize test order
//   -j N              set concurrency limit (default: 8)
//

import { readdir, stat, access, mkdtemp, rm } from "fs/promises"
import { join, dirname, resolve, relative } from "path"
import { spawn } from "child_process"
import { tmpdir } from "os"

const DEFAULT_CONCURRENCY = 8

//
// configuration
//

interface TcConfig {
  entry:     string    // entry point (e.g., "src/cli.ts")
  tests_dir: string    // tests directory relative to root
}

const DEFAULT_CONFIG: TcConfig = {
  entry:     "src/cli.ts",
  tests_dir: "tests",
}

async function load_config(root: string): Promise<TcConfig> {
  // try tc.config.ts first
  const ts_path = join(root, "tc.config.ts")
  try {
    const mod = await import(ts_path)
    return { ...DEFAULT_CONFIG, ...mod.default }
  } catch {
    // ignore
  }

  // try tc.config.json
  const json_path = join(root, "tc.config.json")
  try {
    const text = await Bun.file(json_path).text()
    return { ...DEFAULT_CONFIG, ...JSON.parse(text) }
  } catch {
    // ignore
  }

  // use defaults
  return DEFAULT_CONFIG
}

function find_project_root(): string {
  // walk up from cwd looking for tc.config.ts or package.json
  let dir = process.cwd()

  while (dir !== "/") {
    const config_ts = join(dir, "tc.config.ts")
    const config_json = join(dir, "tc.config.json")
    const package_json = join(dir, "package.json")

    try {
      require("fs").accessSync(config_ts)
      return dir
    } catch {}

    try {
      require("fs").accessSync(config_json)
      return dir
    } catch {}

    try {
      require("fs").accessSync(package_json)
      return dir
    } catch {}

    dir = dirname(dir)
  }

  // fallback to cwd
  return process.cwd()
}

//
// hook system
//

interface HookChain {
  before_each: string[]   // paths, root→leaf order
  after_each:  string[]   // paths, leaf→root order
}

// Collect hooks from tests_dir down to handler_dir
// Returns paths in execution order
async function collect_hooks(
  tests_dir:   string,
  handler_dir: string
): Promise<HookChain> {
  const before_each: string[] = []
  const after_each:  string[] = []

  // Get the relative path from tests_dir to handler_dir
  const rel = relative(tests_dir, handler_dir)
  const parts = rel ? rel.split("/") : []

  // Collect hooks at each level: tests/, tests/body/, tests/body/files/, etc.
  let current = tests_dir

  // Root level
  const root_before = join(current, "before_each.sh")
  const root_after  = join(current, "after_each.sh")
  if (await exists(root_before)) before_each.push(root_before)
  if (await exists(root_after))  after_each.unshift(root_after)

  // Walk down the path
  for (const part of parts) {
    current = join(current, part)
    const level_before = join(current, "before_each.sh")
    const level_after  = join(current, "after_each.sh")
    if (await exists(level_before)) before_each.push(level_before)
    if (await exists(level_after))  after_each.unshift(level_after)
  }

  return { before_each, after_each }
}

// Run a shell hook script with environment
async function run_hook(
  hook_path: string,
  env:       Record<string, string>,
  cwd:       string
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(hook_path, [], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env:   env,
      cwd:   cwd,
    })

    let stderr = ""
    proc.stderr.on("data", (data) => { stderr += data.toString() })

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true })
      } else {
        resolve({ ok: false, error: `hook ${hook_path} failed with code ${code}: ${stderr}` })
      }
    })

    proc.on("error", (err) => {
      resolve({ ok: false, error: `hook ${hook_path} error: ${err}` })
    })

    proc.stdin.end()
  })
}

// Create a temporary workspace directory
async function create_workspace(): Promise<string> {
  const prefix = join(tmpdir(), "tc-")
  return await mkdtemp(prefix)
}

// Remove a workspace directory
async function cleanup_workspace(workspace: string): Promise<void> {
  try {
    await rm(workspace, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
}

//
// types
//

interface TestCase {
  handler:      string           // e.g., "body/files/add"
  name:         string           // e.g., "00-success-single-file"
  params:       string           // absolute path to params.json
  result:       string           // absolute path to result.json
  run:          string | null    // absolute path to run script, or null for default runner
  skip:         boolean          // has skip marker
  handler_dir:  string           // absolute path to handler directory
  case_dir:     string           // absolute path to case data directory
  data_dir:     string           // absolute path to handler's data/ directory
}

interface TestResult {
  case:     TestCase
  passed:   boolean
  skipped:  boolean
  actual:   unknown
  expected: unknown
  error:    string | null
}

//
// placeholder matching
//
// expected.json can contain:
//   "<timestamp>"  - matches any ISO timestamp string
//   "<number>"     - matches any number
//   "<string>"     - matches any string
//   "<any>"        - matches anything
//

function matches_placeholder(expected: unknown, actual: unknown): boolean {
  if (expected === "<timestamp>") {
    return typeof actual === "string" && /^\d{4}-\d{2}-\d{2}T/.test(actual)
  }

  if (expected === "<number>") {
    return typeof actual === "number"
  }

  if (expected === "<string>") {
    return typeof actual === "string"
  }

  if (expected === "<any>") {
    return true
  }

  return false
}

function deep_match(expected: unknown, actual: unknown): boolean {
  // placeholder check first
  if (matches_placeholder(expected, actual)) {
    return true
  }

  // null
  if (expected === null) {
    return actual === null
  }

  // primitives
  if (typeof expected !== "object") {
    return expected === actual
  }

  // actual must also be object (and not null)
  if (typeof actual !== "object" || actual === null) {
    return false
  }

  // arrays
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false
    if (expected.length !== actual.length) return false
    return expected.every((v, i) => deep_match(v, actual[i]))
  }

  // objects
  const exp_obj = expected as Record<string, unknown>
  const act_obj = actual as Record<string, unknown>

  const exp_keys = Object.keys(exp_obj).sort()
  const act_keys = Object.keys(act_obj).sort()

  if (exp_keys.length !== act_keys.length) return false
  if (!exp_keys.every((k, i) => k === act_keys[i])) return false

  return exp_keys.every(k => deep_match(exp_obj[k], act_obj[k]))
}

//
// discovery
//

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function is_directory(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}

// recursively find all directories containing params.json + result.json
async function find_case_dirs(
  dir:         string,
  handler:     string,
  run_path:    string | null,  // null if no run script exists
  skip:        boolean,
  prefix:      string,
  handler_dir: string,
  data_dir:    string,
  cases:       TestCase[]
): Promise<void> {
  const params_path = join(dir, "params.json")
  const result_path = join(dir, "result.json")

  // if this directory has params.json + result.json, it's a case
  if (await exists(params_path) && await exists(result_path)) {
    cases.push({
      handler:     handler,
      name:        prefix,
      params:      params_path,
      result:      result_path,
      run:         run_path,
      skip:        skip,
      handler_dir: handler_dir,
      case_dir:    dir,
      data_dir:    data_dir,
    })
    return
  }

  // otherwise recurse into subdirectories
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }

  // sort entries for deterministic order
  entries.sort()

  for (const entry of entries) {
    const entry_path = join(dir, entry)
    if (await is_directory(entry_path)) {
      const new_prefix = prefix ? `${prefix}/${entry}` : entry
      await find_case_dirs(entry_path, handler, run_path, skip, new_prefix, handler_dir, data_dir, cases)
    }
  }
}

// recursively find handler directories
// A handler directory has a data/ subdirectory
// The run script is optional (default runner will be used if missing)
async function find_handler_dirs(
  dir:     string,
  prefix:  string,
  results: { path: string; handler: string; has_run: boolean }[]
): Promise<void> {
  const run_path  = join(dir, "run")
  const data_dir  = join(dir, "data")

  // if this directory has data/, it's a handler
  // run script is optional
  if (await is_directory(data_dir)) {
    const has_run = await exists(run_path)
    results.push({ path: dir, handler: prefix, has_run })
    return
  }

  // otherwise recurse into subdirectories
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return
  }

  entries.sort()

  for (const entry of entries) {
    const entry_path = join(dir, entry)
    if (await is_directory(entry_path)) {
      const new_prefix = prefix ? `${prefix}/${entry}` : entry
      await find_handler_dirs(entry_path, new_prefix, results)
    }
  }
}

async function find_test_cases(tests_dir: string): Promise<TestCase[]> {
  const cases: TestCase[] = []

  // find all handler directories (may be nested like body/init)
  const handler_dirs: { path: string; handler: string; has_run: boolean }[] = []
  await find_handler_dirs(tests_dir, "", handler_dirs)

  // sort for deterministic order
  handler_dirs.sort((a, b) => a.handler.localeCompare(b.handler))

  for (const { path: handler_dir, handler, has_run } of handler_dirs) {
    const run_path  = has_run ? join(handler_dir, "run") : null
    const skip_path = join(handler_dir, "skip")
    const has_skip  = await exists(skip_path)
    const data_dir  = join(handler_dir, "data")

    await find_case_dirs(data_dir, handler, run_path, has_skip, "", handler_dir, data_dir, cases)
  }

  return cases
}

//
// test context
//

interface TestContext {
  root:      string      // project root
  config:    TcConfig    // loaded configuration
  tests_dir: string      // absolute path to tests directory
}

function build_test_env(
  tc:        TestCase,
  ctx:       TestContext,
  workspace?: string
): Record<string, string> {
  // ensure bun is in PATH for subprocesses
  const bun_bin = join(process.env.HOME ?? "", ".bun", "bin")
  const path_env = process.env.PATH ?? ""
  const new_path = path_env.includes(bun_bin) ? path_env : `${bun_bin}:${path_env}`

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    PATH:         new_path,

    // Legacy env vars (for backward compatibility during migration)
    TC_CASE_NAME: tc.name,
    TC_HANDLER:   tc.handler,

    // New TC_* env vars
    TC_ROOT:      ctx.root,
    TC_ENTRY:     ctx.config.entry,
    TC_TESTS_DIR: ctx.tests_dir,
    TC_CASE_DIR:  tc.case_dir,
    TC_DATA_DIR:  tc.data_dir,
  }

  // Include workspace if provided (for hook-based tests)
  if (workspace) {
    env.TC_WORKSPACE = workspace
    // Legacy WORKDIR for compatibility with existing lib.sh
    env.WORKDIR = workspace
  }

  return env
}

//
// execution
//

// Run a command and capture output
function run_command(
  cmd:         string,
  args:        string[],
  input:       string,
  env:         Record<string, string>,
  cwd:         string
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env:   env,
      cwd:   cwd,
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (data) => { stdout += data.toString() })
    proc.stderr.on("data", (data) => { stderr += data.toString() })

    proc.stdin.write(input)
    proc.stdin.end()

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 })
    })

    proc.on("error", (err) => {
      resolve({ stdout, stderr: `${stderr}\n${err}`, code: 1 })
    })
  })
}

// Get the command to run for a test case
// If run script exists, use it; otherwise use default runner (bun run entry_point /handler)
function get_test_command(
  tc:  TestCase,
  ctx: TestContext
): { cmd: string; args: string[] } {
  if (tc.run) {
    // Use the run script
    return { cmd: tc.run, args: [] }
  }

  // Default runner: bun run <entry> /<handler>
  const entry_path = join(ctx.root, ctx.config.entry)
  return {
    cmd:  `bun run "${entry_path}" "/${tc.handler}"`,
    args: []
  }
}

async function run_test_case(tc: TestCase, ctx: TestContext): Promise<TestResult> {
  if (tc.skip) {
    return {
      case:     tc,
      passed:   false,
      skipped:  true,
      actual:   null,
      expected: null,
      error:    null
    }
  }

  // read result (expected output)
  let expected: unknown
  try {
    const result_text = await Bun.file(tc.result).text()
    expected = JSON.parse(result_text)
  } catch (err) {
    return {
      case:     tc,
      passed:   false,
      skipped:  false,
      actual:   null,
      expected: null,
      error:    `failed to read result.json: ${err}`
    }
  }

  // read params (input)
  let params_text: string
  try {
    params_text = await Bun.file(tc.params).text()
  } catch (err) {
    return {
      case:     tc,
      passed:   false,
      skipped:  false,
      actual:   null,
      expected: expected,
      error:    `failed to read params.json: ${err}`
    }
  }

  // Collect hooks from tests_dir to handler_dir
  const hooks = await collect_hooks(ctx.tests_dir, tc.handler_dir)
  const has_hooks = hooks.before_each.length > 0 || hooks.after_each.length > 0

  // Check for per-case setup/teardown
  const case_setup    = join(tc.case_dir, "setup.sh")
  const case_teardown = join(tc.case_dir, "teardown.sh")
  const has_case_setup    = await exists(case_setup)
  const has_case_teardown = await exists(case_teardown)

  // Decide whether to use hook-based execution or legacy run script
  // Use hooks if:
  // 1. There are before_each or after_each hooks, OR
  // 2. There is a per-case setup.sh or teardown.sh
  const use_hooks = has_hooks || has_case_setup || has_case_teardown

  let workspace: string | undefined
  let cwd: string = ctx.root

  try {
    if (use_hooks) {
      // Create workspace directory
      workspace = await create_workspace()
      cwd = workspace

      // Build environment with workspace
      const env = build_test_env(tc, ctx, workspace)

      // Run before_each hooks (root → leaf)
      for (const hook of hooks.before_each) {
        const result = await run_hook(hook, env, workspace)
        if (!result.ok) {
          return {
            case:     tc,
            passed:   false,
            skipped:  false,
            actual:   null,
            expected: expected,
            error:    result.error ?? "before_each hook failed"
          }
        }
      }

      // Run per-case setup.sh if exists
      if (has_case_setup) {
        const result = await run_hook(case_setup, env, workspace)
        if (!result.ok) {
          return {
            case:     tc,
            passed:   false,
            skipped:  false,
            actual:   null,
            expected: expected,
            error:    result.error ?? "setup.sh failed"
          }
        }
      }

      // Run the test
      const { cmd, args } = get_test_command(tc, ctx)
      const test_result = await run_command(cmd, args, params_text, env, workspace)

      // Run per-case teardown.sh if exists (even if test failed)
      if (has_case_teardown) {
        await run_hook(case_teardown, env, workspace)
      }

      // Run after_each hooks (leaf → root, even if test failed)
      for (const hook of hooks.after_each) {
        await run_hook(hook, env, workspace)
      }

      // Parse and return result
      let actual: unknown
      try {
        actual = JSON.parse(test_result.stdout.trim())
      } catch {
        return {
          case:     tc,
          passed:   false,
          skipped:  false,
          actual:   test_result.stdout,
          expected: expected,
          error:    `invalid JSON output: ${test_result.stdout.slice(0, 200)}`
        }
      }

      const passed = deep_match(expected, actual)

      return {
        case:     tc,
        passed:   passed,
        skipped:  false,
        actual:   actual,
        expected: expected,
        error:    passed ? null : "mismatch"
      }
    }

    // Legacy execution: run script handles everything (or default runner)
    const env = build_test_env(tc, ctx)
    const { cmd, args } = get_test_command(tc, ctx)
    const test_result = await run_command(cmd, args, params_text, env, ctx.root)

    // Parse and return result
    let actual: unknown
    try {
      actual = JSON.parse(test_result.stdout.trim())
    } catch {
      return {
        case:     tc,
        passed:   false,
        skipped:  false,
        actual:   test_result.stdout,
        expected: expected,
        error:    `invalid JSON output: ${test_result.stdout.slice(0, 200)}`
      }
    }

    const passed = deep_match(expected, actual)

    return {
      case:     tc,
      passed:   passed,
      skipped:  false,
      actual:   actual,
      expected: expected,
      error:    passed ? null : "mismatch"
    }
  } finally {
    // Always cleanup workspace if created
    if (workspace) {
      await cleanup_workspace(workspace)
    }
  }
}

//
// output
//

function format_result(r: TestResult): string {
  const label = `${r.case.handler}/${r.case.name}`

  if (r.skipped) {
    return `⏸️  ${label} (skipped)`
  }

  if (r.passed) {
    return `✅ ${label}`
  }

  return `❌ ${label}`
}

function print_failure_details(r: TestResult): void {
  console.log("")
  console.log(`   expected:`)
  console.log(`   ${JSON.stringify(r.expected, null, 2).split("\n").join("\n   ")}`)
  console.log("")
  console.log(`   actual:`)
  console.log(`   ${JSON.stringify(r.actual, null, 2).split("\n").join("\n   ")}`)
  if (r.error && r.error !== "mismatch") {
    console.log("")
    console.log(`   error: ${r.error}`)
  }
}

//
// shuffle (fisher-yates)
//

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

//
// runners
//

async function run_parallel(
  cases:       TestCase[],
  ctx:         TestContext,
  concurrency: number,
  on_result:   (r: TestResult) => void
): Promise<TestResult[]> {
  const results: TestResult[] = []
  let   index = 0

  async function worker(): Promise<void> {
    while (index < cases.length) {
      const i  = index++
      const tc = cases[i]
      const r  = await run_test_case(tc, ctx)
      results[i] = r
      on_result(r)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, cases.length) },
    () => worker()
  )

  await Promise.all(workers)
  return results
}

async function run_sequential(
  cases:     TestCase[],
  ctx:       TestContext,
  on_result: (r: TestResult) => void
): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (const tc of cases) {
    const r = await run_test_case(tc, ctx)
    results.push(r)
    on_result(r)
  }

  return results
}

//
// arg parsing
//

function parse_concurrency(args: string[]): number {
  const j_idx = args.indexOf("-j")
  if (j_idx !== -1 && args[j_idx + 1]) {
    const n = parseInt(args[j_idx + 1], 10)
    if (!isNaN(n) && n > 0) return n
  }
  return DEFAULT_CONCURRENCY
}

function parse_args(args: string[]): {
  verbose:     boolean
  sequential:  boolean
  random:      boolean
  concurrency: number
  tests_dir:   string
} {
  const verbose    = args.includes("-v") || args.includes("--verbose")
  const sequential = args.includes("-s") || args.includes("--sequential")
  const random     = args.includes("-r") || args.includes("--random")
  const concurrency = parse_concurrency(args)

  const non_flags = args.filter((a, i) => {
    if (a.startsWith("-")) return false
    // skip value after -j
    if (i > 0 && args[i - 1] === "-j") return false
    return true
  })

  const tests_dir = non_flags[0] || "tests"

  return { verbose, sequential, random, concurrency, tests_dir }
}

//
// main
//

async function main(): Promise<void> {
  const opts = parse_args(process.argv.slice(2))

  // find project root and load config
  const root   = find_project_root()
  const config = await load_config(root)

  // resolve tests directory (config value is relative to root)
  const tests_dir = opts.tests_dir !== "tests"
    ? resolve(opts.tests_dir)  // use explicit arg as-is
    : resolve(root, config.tests_dir)

  // build test context
  const ctx: TestContext = {
    root:      root,
    config:    config,
    tests_dir: tests_dir,
  }

  let cases = await find_test_cases(tests_dir)

  if (cases.length === 0) {
    console.log("no tests found")
    process.exit(0)
  }

  // shuffle if requested
  if (opts.random) {
    cases = shuffle(cases)
  }

  // build mode string
  const parts: string[] = []
  if (opts.sequential) {
    parts.push("sequential")
  } else {
    parts.push(`parallel (${opts.concurrency})`)
  }
  if (opts.random) {
    parts.push("random")
  }
  const mode = parts.join(", ")

  console.log(`running ${cases.length} tests [${mode}]...\n`)

  const on_result = (r: TestResult): void => {
    console.log(format_result(r))
    if (!r.passed && !r.skipped && opts.verbose) {
      print_failure_details(r)
    }
  }

  let results: TestResult[]

  if (opts.sequential) {
    results = await run_sequential(cases, ctx, on_result)
  } else {
    results = await run_parallel(cases, ctx, opts.concurrency, on_result)
  }

  // summary
  const passed  = results.filter(r => r.passed).length
  const failed  = results.filter(r => !r.passed && !r.skipped).length
  const skipped = results.filter(r => r.skipped).length

  console.log("")
  console.log(`${passed} passed, ${failed} failed, ${skipped} skipped`)

  // show failure details if not verbose (compact summary)
  if (failed > 0 && !opts.verbose) {
    console.log("\nfailures:\n")
    for (const r of results) {
      if (!r.passed && !r.skipped) {
        console.log(`❌ ${r.case.handler}/${r.case.name}`)
        print_failure_details(r)
        console.log("")
      }
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
