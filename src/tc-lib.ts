//
// tc-lib.ts - tc test runner library
//
// Extracted from tc.ts for reuse by brane.test.ts (bun native test runner)
// and the tc.ts CLI wrapper.
//

import { readdir, stat, access, mkdtemp, rm, mkdir, cp } from "fs/promises"
import { join, dirname, resolve, relative } from "path"
import { spawn } from "child_process"
import { tmpdir } from "os"

//
// types
//

export interface TcConfig {
  entry:     string
  tests_dir: string
}

export interface TestCase {
  handler:       string
  name:          string
  params:        string
  result:        string
  run:           string | null
  skip:          boolean
  handler_dir:   string
  case_dir:      string
  data_dir:      string
  has_setup:     boolean
  has_teardown:  boolean
}

export interface TestResult {
  case:        TestCase
  passed:      boolean
  skipped:     boolean
  actual:      unknown
  expected:    unknown
  error:       string | null
  duration_ms: number
}

export interface TestContext {
  root:      string
  config:    TcConfig
  tests_dir: string
  seeds_dir: string
}

export interface HookChain {
  before_each: string[]
  after_each:  string[]
}

//
// configuration
//

const DEFAULT_CONFIG: TcConfig = {
  entry:     "src/cli.ts",
  tests_dir: "tests",
}

export async function load_config(root: string): Promise<TcConfig> {
  const ts_path = join(root, "tc.config.ts")
  try {
    const mod = await import(ts_path)
    return { ...DEFAULT_CONFIG, ...mod.default }
  } catch {
    // ignore
  }

  const json_path = join(root, "tc.config.json")
  try {
    const text = await Bun.file(json_path).text()
    return { ...DEFAULT_CONFIG, ...JSON.parse(text) }
  } catch {
    // ignore
  }

  return DEFAULT_CONFIG
}

export function find_project_root(): string {
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

  return process.cwd()
}

//
// filesystem helpers
//

export async function exists(path: string): Promise<boolean> {
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

//
// hook system
//

const hook_cache = new Map<string, HookChain>()

export async function collect_hooks(
  tests_dir:   string,
  handler_dir: string
): Promise<HookChain> {
  const cached = hook_cache.get(handler_dir)
  if (cached) return cached

  const before_each: string[] = []
  const after_each:  string[] = []

  const rel = relative(tests_dir, handler_dir)
  const parts = rel ? rel.split("/") : []

  let current = tests_dir

  const root_before = join(current, "before_each.sh")
  const root_after  = join(current, "after_each.sh")
  if (await exists(root_before)) before_each.push(root_before)
  if (await exists(root_after))  after_each.unshift(root_after)

  for (const part of parts) {
    current = join(current, part)
    const level_before = join(current, "before_each.sh")
    const level_after  = join(current, "after_each.sh")
    if (await exists(level_before)) before_each.push(level_before)
    if (await exists(level_after))  after_each.unshift(level_after)
  }

  const result = { before_each, after_each }
  hook_cache.set(handler_dir, result)
  return result
}

export function clear_hook_cache(): void {
  hook_cache.clear()
}

export async function run_hook(
  hook_path: string,
  env:       Record<string, string>,
  cwd:       string
): Promise<{ ok: boolean; error?: string; stdout?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(hook_path, [], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env:   env,
      cwd:   cwd,
    })

    let stdout = ""
    let stderr = ""
    proc.stdout.on("data", (data) => { stdout += data.toString() })
    proc.stderr.on("data", (data) => { stderr += data.toString() })

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, stdout })
      } else {
        resolve({ ok: false, error: `hook ${hook_path} failed with code ${code}: ${stderr}`, stdout })
      }
    })

    proc.on("error", (err) => {
      resolve({ ok: false, error: `hook ${hook_path} error: ${err}` })
    })

    proc.stdin.end()
  })
}

//
// workspace
//

export async function create_workspace(): Promise<string> {
  const prefix = join(tmpdir(), "tc-")
  return await mkdtemp(prefix)
}

export async function cleanup_workspace(workspace: string): Promise<void> {
  try {
    await rm(workspace, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
}

//
// placeholder matching
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

  if (expected === "<array>") {
    return Array.isArray(actual)
  }

  if (typeof expected === "string" && expected.startsWith("<array:")) {
    const match = expected.match(/^<array:(\d+)>$/)
    if (match) {
      const count = parseInt(match[1], 10)
      return Array.isArray(actual) && actual.length === count
    }
  }

  return false
}

export function deep_match(expected: unknown, actual: unknown): boolean {
  if (matches_placeholder(expected, actual)) {
    return true
  }

  if (expected === null) {
    return actual === null
  }

  if (typeof expected !== "object") {
    return expected === actual
  }

  if (typeof actual !== "object" || actual === null) {
    return false
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false
    if (expected.length !== actual.length) return false
    return expected.every((v, i) => deep_match(v, actual[i]))
  }

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

async function find_case_dirs(
  dir:         string,
  handler:     string,
  run_path:    string | null,
  skip:        boolean,
  prefix:      string,
  handler_dir: string,
  data_dir:    string,
  cases:       TestCase[]
): Promise<void> {
  const params_path = join(dir, "params.json")
  const result_path = join(dir, "result.json")

  if (await exists(params_path) && await exists(result_path)) {
    const setup_path    = join(dir, "setup.sh")
    const teardown_path = join(dir, "teardown.sh")

    cases.push({
      handler:      handler,
      name:         prefix,
      params:       params_path,
      result:       result_path,
      run:          run_path,
      skip:         skip,
      handler_dir:  handler_dir,
      case_dir:     dir,
      data_dir:     data_dir,
      has_setup:    await exists(setup_path),
      has_teardown: await exists(teardown_path),
    })
    return
  }

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
      await find_case_dirs(entry_path, handler, run_path, skip, new_prefix, handler_dir, data_dir, cases)
    }
  }
}

async function find_handler_dirs(
  dir:     string,
  prefix:  string,
  results: { path: string; handler: string; has_run: boolean }[]
): Promise<void> {
  const run_path  = join(dir, "run")
  const data_dir  = join(dir, "data")

  if (await is_directory(data_dir)) {
    const has_run = await exists(run_path)
    results.push({ path: dir, handler: prefix, has_run })
    return
  }

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

export async function find_test_cases(tests_dir: string): Promise<TestCase[]> {
  const cases: TestCase[] = []

  const handler_dirs: { path: string; handler: string; has_run: boolean }[] = []
  await find_handler_dirs(tests_dir, "", handler_dirs)

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
// test context helpers
//

export function build_test_env(
  tc:        TestCase,
  ctx:       TestContext,
  workspace?: string
): Record<string, string> {
  const bin_dir = join(ctx.root, "bin")
  const bun_bin = join(process.env.HOME ?? "", ".bun", "bin")
  const path_env = process.env.PATH ?? ""
  const new_path = [bin_dir, bun_bin, path_env].filter(Boolean).join(":")

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    PATH:         new_path,

    TC_CASE_NAME: tc.name,
    TC_HANDLER:   tc.handler,

    TC_ROOT:      ctx.root,
    TC_ENTRY:     ctx.config.entry,
    TC_TESTS_DIR: ctx.tests_dir,
    TC_SEEDS_DIR: ctx.seeds_dir,
    TC_CASE_DIR:  tc.case_dir,
    TC_DATA_DIR:  tc.data_dir,
  }

  if (workspace) {
    env.TC_WORKSPACE = workspace
    env.WORKDIR = workspace
  }

  return env
}

export function build_global_env(ctx: TestContext): Record<string, string> {
  const bin_dir = join(ctx.root, "bin")
  const bun_bin = join(process.env.HOME ?? "", ".bun", "bin")
  const path_env = process.env.PATH ?? ""
  const new_path = [bin_dir, bun_bin, path_env].filter(Boolean).join(":")

  return {
    ...process.env as Record<string, string>,
    PATH:         new_path,
    TC_ROOT:      ctx.root,
    TC_ENTRY:     ctx.config.entry,
    TC_TESTS_DIR: ctx.tests_dir,
    TC_SEEDS_DIR: ctx.seeds_dir,
  }
}

//
// execution
//

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

function get_test_command(
  tc:  TestCase,
  ctx: TestContext
): { cmd: string; args: string[] } {
  if (tc.run) {
    return { cmd: tc.run, args: [] }
  }

  return {
    cmd:  `${ctx.config.entry} "/${tc.handler}"`,
    args: []
  }
}

export async function run_test_case(tc: TestCase, ctx: TestContext): Promise<TestResult> {
  const start = Date.now()

  if (tc.skip) {
    return {
      case:        tc,
      passed:      false,
      skipped:     true,
      actual:      null,
      expected:    null,
      error:       null,
      duration_ms: Date.now() - start
    }
  }

  let expected: unknown
  try {
    const result_text = await Bun.file(tc.result).text()
    expected = JSON.parse(result_text)
  } catch (err) {
    return {
      case:        tc,
      passed:      false,
      skipped:     false,
      actual:      null,
      expected:    null,
      error:       `failed to read result.json: ${err}`,
      duration_ms: Date.now() - start
    }
  }

  let params_text: string
  try {
    params_text = await Bun.file(tc.params).text()
  } catch (err) {
    return {
      case:        tc,
      passed:      false,
      skipped:     false,
      actual:      null,
      expected:    expected,
      error:       `failed to read params.json: ${err}`,
      duration_ms: Date.now() - start
    }
  }

  const hooks = await collect_hooks(ctx.tests_dir, tc.handler_dir)
  const has_hooks = hooks.before_each.length > 0 || hooks.after_each.length > 0

  const case_setup    = join(tc.case_dir, "setup.sh")
  const case_teardown = join(tc.case_dir, "teardown.sh")

  const use_hooks = has_hooks || tc.has_setup || tc.has_teardown

  let workspace: string | undefined
  let cwd: string = ctx.root

  try {
    if (use_hooks) {
      workspace = await create_workspace()
      cwd = workspace

      const env = build_test_env(tc, ctx, workspace)

      for (const hook of hooks.before_each) {
        const result = await run_hook(hook, env, workspace)
        if (!result.ok) {
          return {
            case:        tc,
            passed:      false,
            skipped:     false,
            actual:      null,
            expected:    expected,
            error:       result.error ?? "before_each hook failed",
            duration_ms: Date.now() - start
          }
        }
      }

      if (tc.has_setup) {
        const result = await run_hook(case_setup, env, workspace)
        if (!result.ok) {
          return {
            case:        tc,
            passed:      false,
            skipped:     false,
            actual:      null,
            expected:    expected,
            error:       result.error ?? "setup.sh failed",
            duration_ms: Date.now() - start
          }
        }
      }

      const { cmd, args } = get_test_command(tc, ctx)
      const test_result = await run_command(cmd, args, params_text, env, workspace)

      if (tc.has_teardown) {
        await run_hook(case_teardown, env, workspace)
      }

      for (const hook of hooks.after_each) {
        await run_hook(hook, env, workspace)
      }

      let actual: unknown
      try {
        actual = JSON.parse(test_result.stdout.trim())
      } catch {
        return {
          case:        tc,
          passed:      false,
          skipped:     false,
          actual:      test_result.stdout,
          expected:    expected,
          error:       `invalid JSON output: ${test_result.stdout.slice(0, 200)}`,
          duration_ms: Date.now() - start
        }
      }

      const passed = deep_match(expected, actual)

      return {
        case:        tc,
        passed:      passed,
        skipped:     false,
        actual:      actual,
        expected:    expected,
        error:       passed ? null : "mismatch",
        duration_ms: Date.now() - start
      }
    }

    const env = build_test_env(tc, ctx)
    const { cmd, args } = get_test_command(tc, ctx)
    const test_result = await run_command(cmd, args, params_text, env, ctx.root)

    let actual: unknown
    try {
      actual = JSON.parse(test_result.stdout.trim())
    } catch {
      return {
        case:        tc,
        passed:      false,
        skipped:     false,
        actual:      test_result.stdout,
        expected:    expected,
        error:       `invalid JSON output: ${test_result.stdout.slice(0, 200)}`,
        duration_ms: Date.now() - start
      }
    }

    const passed = deep_match(expected, actual)

    return {
      case:        tc,
      passed:      passed,
      skipped:     false,
      actual:      actual,
      expected:    expected,
      error:       passed ? null : "mismatch",
      duration_ms: Date.now() - start
    }
  } finally {
    if (workspace) {
      await cleanup_workspace(workspace)
    }
  }
}

//
// global hooks (before_all / after_all)
//

export async function run_before_all(ctx: TestContext): Promise<void> {
  const before_all = join(ctx.tests_dir, "before_all.sh")
  if (await exists(before_all)) {
    await mkdir(ctx.seeds_dir, { recursive: true })
    const env = build_global_env(ctx)
    const result = await run_hook(before_all, env, ctx.tests_dir)
    if (result.stdout) {
      process.stdout.write(result.stdout)
    }
    if (!result.ok) {
      throw new Error(`before_all.sh failed: ${result.error}`)
    }
  }
}

export async function run_after_all(ctx: TestContext): Promise<void> {
  const after_all = join(ctx.tests_dir, "after_all.sh")
  if (await exists(after_all)) {
    const env = build_global_env(ctx)
    await run_hook(after_all, env, ctx.tests_dir)
  }

  try {
    await rm(ctx.seeds_dir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
}

//
// context builder
//

export async function build_context(root?: string): Promise<TestContext> {
  const r = root ?? find_project_root()
  const config = await load_config(r)
  const tests_dir = resolve(r, config.tests_dir)
  const seeds_dir = join(tests_dir, ".seeds")

  return {
    root:      r,
    config:    config,
    tests_dir: tests_dir,
    seeds_dir: seeds_dir,
  }
}

//
// output helpers (used by CLI)
//

export function format_duration(ms: number): string {
  if (ms >= 1000) {
    return `(${(ms / 1000).toFixed(1)}s)`
  }
  return `(${Math.round(ms)}ms)`
}

export function format_result(r: TestResult): string {
  const label = `${r.case.handler}/${r.case.name}`
  const timing = format_duration(r.duration_ms)

  if (r.skipped) {
    return `⏸️  ${label} (skipped)`
  }

  if (r.passed) {
    return `✅ ${label} ${timing}`
  }

  return `❌ ${label} ${timing}`
}

export function print_failure_details(r: TestResult): void {
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

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

//
// runners (used by CLI)
//

export async function run_parallel(
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

export async function run_sequential(
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
