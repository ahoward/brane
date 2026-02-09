import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import {
  build_context,
  find_test_cases,
  run_test_case,
  run_before_all,
  run_after_all,
  type TestCase,
  type TestContext,
} from "./src/tc-lib"

const TC_TIMEOUT = 30_000 // 30s per test case

// discover all tc cases before registering tests
const ctx = await build_context()
const cases = await find_test_cases(ctx.tests_dir)

// group cases by handler
const by_handler = new Map<string, TestCase[]>()
for (const tc of cases) {
  const list = by_handler.get(tc.handler) ?? []
  list.push(tc)
  by_handler.set(tc.handler, list)
}

// global hooks
beforeAll(async () => {
  await run_before_all(ctx)
}, TC_TIMEOUT)

afterAll(async () => {
  await run_after_all(ctx)
}, TC_TIMEOUT)

// register a describe block per handler, a test per case
for (const [handler, handler_cases] of by_handler) {
  describe(`/${handler}`, () => {
    for (const tc of handler_cases) {
      if (tc.skip) {
        test.skip(tc.name, () => {})
      } else {
        test(tc.name, async () => {
          const result = await run_test_case(tc, ctx)
          if (!result.passed) {
            const msg = result.error === "mismatch"
              ? `expected:\n${JSON.stringify(result.expected, null, 2)}\n\nactual:\n${JSON.stringify(result.actual, null, 2)}`
              : result.error ?? "test failed"
            expect(result.passed).toBe(true) // triggers bun's assertion with context
            throw new Error(msg) // fallback detail
          }
        }, TC_TIMEOUT)
      }
    }
  })
}
