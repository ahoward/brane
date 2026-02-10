//
// index.ts - LLM backend loader and dispatch
//

import type { LlmBackend } from "./types.ts"
import { MockLlmBackend } from "./mock.ts"
import { CliLlmBackend } from "./cli.ts"

let cached_backend: LlmBackend | null = null

export function is_mock_mode(): boolean {
  return process.env.BRANE_LLM_MOCK === "1"
}

export function get_backend(): LlmBackend {
  if (cached_backend) return cached_backend

  if (is_mock_mode()) {
    cached_backend = new MockLlmBackend()
  } else {
    cached_backend = new CliLlmBackend()
  }

  return cached_backend
}
