#!/usr/bin/env bun
//
// tc.ts - tc-compatible test runner
//
// Runs tests from tests/{handler}/data/{case}/ directories
// Each case has params.json and result.json
// Supports nested cases, skip files, placeholder matching, parallel execution
//
// Structure:
//   tests/{handler}/run                          # executable
//   tests/{handler}/skip                         # optional skip marker
//   tests/{handler}/data/{NN-case}/params.json   # input params
//   tests/{handler}/data/{NN-case}/result.json   # expected result
//
// Nested cases supported:
//   tests/{handler}/data/{NN-group}/{NN-case}/params.json
//   tests/{handler}/data/{NN-group}/{NN-case}/result.json
//
// Flags:
//   -v, --verbose     show failure details inline
//   -s, --sequential  disable parallel execution
//   -r, --random      randomize test order
//   -j N              set concurrency limit (default: 8)
//

import { readdir, stat, access } from "fs/promises"
import { join } from "path"
import { spawn } from "child_process"

const DEFAULT_CONCURRENCY = 8

//
// types
//

interface TestCase {
  handler:  string
  name:     string
  params:   string
  result:   string
  run:      string
  skip:     boolean
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
  dir:      string,
  handler:  string,
  run_path: string,
  skip:     boolean,
  prefix:   string,
  cases:    TestCase[]
): Promise<void> {
  const params_path = join(dir, "params.json")
  const result_path = join(dir, "result.json")

  // if this directory has params.json + result.json, it's a case
  if (await exists(params_path) && await exists(result_path)) {
    cases.push({
      handler: handler,
      name:    prefix,
      params:  params_path,
      result:  result_path,
      run:     run_path,
      skip:    skip
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
      await find_case_dirs(entry_path, handler, run_path, skip, new_prefix, cases)
    }
  }
}

// recursively find handler directories (directories containing 'run' and 'data/')
async function find_handler_dirs(
  dir:     string,
  prefix:  string,
  results: { path: string; handler: string }[]
): Promise<void> {
  const run_path  = join(dir, "run")
  const data_dir  = join(dir, "data")

  // if this directory has run + data/, it's a handler
  if (await exists(run_path) && await is_directory(data_dir)) {
    results.push({ path: dir, handler: prefix })
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
  const handler_dirs: { path: string; handler: string }[] = []
  await find_handler_dirs(tests_dir, "", handler_dirs)

  // sort for deterministic order
  handler_dirs.sort((a, b) => a.handler.localeCompare(b.handler))

  for (const { path: handler_dir, handler } of handler_dirs) {
    const run_path = join(handler_dir, "run")
    const skip_path = join(handler_dir, "skip")
    const has_skip  = await exists(skip_path)
    const data_dir  = join(handler_dir, "data")

    await find_case_dirs(data_dir, handler, run_path, has_skip, "", cases)
  }

  return cases
}

//
// execution
//

async function run_test_case(tc: TestCase): Promise<TestResult> {
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

  // run the test
  return new Promise((resolve) => {
    // ensure bun is in PATH for subprocesses
    const bun_bin = join(process.env.HOME ?? "", ".bun", "bin")
    const path_env = process.env.PATH ?? ""
    const new_path = path_env.includes(bun_bin) ? path_env : `${bun_bin}:${path_env}`

    const proc = spawn(tc.run, [], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: {
        ...process.env,
        PATH:         new_path,
        TC_CASE_NAME: tc.name,
        TC_HANDLER:   tc.handler
      }
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (data) => { stdout += data.toString() })
    proc.stderr.on("data", (data) => { stderr += data.toString() })

    // send params
    proc.stdin.write(params_text)
    proc.stdin.end()

    proc.on("close", () => {
      // parse output
      let actual: unknown
      try {
        actual = JSON.parse(stdout.trim())
      } catch {
        resolve({
          case:     tc,
          passed:   false,
          skipped:  false,
          actual:   stdout,
          expected: expected,
          error:    `invalid JSON output: ${stdout.slice(0, 200)}`
        })
        return
      }

      const passed = deep_match(expected, actual)

      resolve({
        case:     tc,
        passed:   passed,
        skipped:  false,
        actual:   actual,
        expected: expected,
        error:    passed ? null : "mismatch"
      })
    })

    proc.on("error", (err) => {
      resolve({
        case:     tc,
        passed:   false,
        skipped:  false,
        actual:   null,
        expected: expected,
        error:    `failed to run: ${err}`
      })
    })
  })
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
  concurrency: number,
  on_result:   (r: TestResult) => void
): Promise<TestResult[]> {
  const results: TestResult[] = []
  let   index = 0

  async function worker(): Promise<void> {
    while (index < cases.length) {
      const i  = index++
      const tc = cases[i]
      const r  = await run_test_case(tc)
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
  on_result: (r: TestResult) => void
): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (const tc of cases) {
    const r = await run_test_case(tc)
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

  let cases = await find_test_cases(opts.tests_dir)

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
    results = await run_sequential(cases, on_result)
  } else {
    results = await run_parallel(cases, opts.concurrency, on_result)
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
