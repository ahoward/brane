//
// llm.ts - LLM extraction facade
//
// Public API for LLM-powered extraction. Backend swapped via
// BRANE_LLM_MOCK=1 for tests (mirrors BRANE_EMBED_MOCK pattern).
//
// Rate limiting: all LLM calls go through check_rate_limit / record_llm_call
// to enforce per-minute and per-session circuit breakers (#51).
//

import { get_backend, is_mock_mode as _is_mock_mode } from "./llm/index.ts"
import type { LlmExtractionRequest, LlmExtractionResult } from "./llm/types.ts"
import { name_cluster as _name_cluster } from "./llm/consolidate.ts"
import { consume_llm_call, record_llm_call } from "./rate-limit.ts"

export type { LlmExtractionRequest, LlmExtractionResult }

export const is_mock_mode = _is_mock_mode

export async function extract_from_file(request: LlmExtractionRequest, force?: boolean): Promise<LlmExtractionResult> {
  // Rate limit: atomically check AND record before the async call to prevent TOCTOU races.
  // Skip in mock mode (no real API calls) and force mode (CLI override).
  if (!_is_mock_mode() && !force) {
    const limit = consume_llm_call()
    if (!limit.allowed) {
      throw new Error(limit.error!)
    }
  } else if (!_is_mock_mode() && force) {
    // Force mode: record but don't check limits
    record_llm_call()
  }

  const backend = get_backend()
  return await backend.extract(request)
}

export interface ClusterNaming {
  name: string
  type: string
}

export async function name_cluster(observations: string[], force?: boolean): Promise<ClusterNaming> {
  // Rate limit: atomically check AND record before the async call.
  if (!_is_mock_mode() && !force) {
    const limit = consume_llm_call()
    if (!limit.allowed) {
      throw new Error(limit.error!)
    }
  } else if (!_is_mock_mode() && force) {
    record_llm_call()
  }

  return await _name_cluster(observations)
}
