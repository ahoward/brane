//
// llm.ts - LLM extraction facade
//
// Public API for LLM-powered extraction. Backend swapped via
// BRANE_LLM_MOCK=1 for tests (mirrors BRANE_EMBED_MOCK pattern).
//

import { get_backend, is_mock_mode as _is_mock_mode } from "./llm/index.ts"
import type { LlmExtractionRequest, LlmExtractionResult } from "./llm/types.ts"

export type { LlmExtractionRequest, LlmExtractionResult }

export const is_mock_mode = _is_mock_mode

export async function extract_from_file(request: LlmExtractionRequest): Promise<LlmExtractionResult> {
  const backend = get_backend()
  return await backend.extract(request)
}
