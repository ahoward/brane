#!/usr/bin/env bun
//
// tc.ts - tc-compatible test runner (CLI wrapper)
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
//   tests/before_all.sh                          # runs ONCE before all tests (creates seeds)
//   tests/before_each.sh                         # runs before each test (root level)
//   tests/{namespace}/before_each.sh             # runs before tests in namespace
//   tests/{handler}/data/{case}/setup.sh         # per-case setup
//   tests/{handler}/data/{case}/teardown.sh      # per-case teardown
//   tests/{namespace}/after_each.sh              # runs after tests in namespace
//   tests/after_each.sh                          # runs after each test (root level)
//   tests/after_all.sh                           # runs ONCE after all tests (cleanup)
//
// Seed databases:
//   tests/.seeds/                                # created by before_all.sh
//   Hooks can copy from TC_SEEDS_DIR instead of re-initializing DBs
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

import { resolve } from "path"
import {
  type TestResult,
  build_context,
  find_test_cases,
  run_before_all,
  run_after_all,
  run_parallel,
  run_sequential,
  shuffle,
  format_result,
  print_failure_details,
} from "./tc-lib"

const DEFAULT_CONCURRENCY = 16

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

  const ctx = await build_context()

  // override tests_dir if explicit arg was passed
  if (opts.tests_dir !== "tests") {
    ctx.tests_dir = resolve(opts.tests_dir)
  }

  // Run before_all hook
  await run_before_all(ctx)

  let cases = await find_test_cases(ctx.tests_dir)

  if (cases.length === 0) {
    console.log("no tests found")
    await run_after_all(ctx)
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

  const t0 = Date.now()

  try {
    if (opts.sequential) {
      results = await run_sequential(cases, ctx, on_result)
    } else {
      results = await run_parallel(cases, ctx, opts.concurrency, on_result)
    }
  } finally {
    await run_after_all(ctx)
  }

  const elapsed = Date.now() - t0

  // summary
  const passed  = results.filter(r => r.passed).length
  const failed  = results.filter(r => !r.passed && !r.skipped).length
  const skipped = results.filter(r => r.skipped).length

  console.log("")
  const elapsed_str = elapsed >= 1000
    ? `${(elapsed / 1000).toFixed(1)}s`
    : `${Math.round(elapsed)}ms`
  console.log(`${passed} passed, ${failed} failed, ${skipped} skipped in ${elapsed_str}`)

  // slowest 5
  const ranked = [...results]
    .filter(r => !r.skipped)
    .sort((a, b) => b.duration_ms - a.duration_ms)
    .slice(0, 5)

  if (ranked.length > 0) {
    console.log("\nslowest:")
    for (const r of ranked) {
      const dur = r.duration_ms >= 1000
        ? `${(r.duration_ms / 1000).toFixed(2)}s`
        : `${Math.round(r.duration_ms)}ms`
      console.log(`  ${dur.padStart(8)}  ${r.case.handler}/${r.case.name}`)
    }
  }

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
