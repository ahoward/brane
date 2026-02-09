//
// index.ts - embedding backend loader and dispatch
//

import type { EmbedBackend } from "./types.ts"
import { MockBackend } from "./mock.ts"
import { Model2VecBackend } from "./model2vec/backend.ts"

let cached_backend: EmbedBackend | null = null

export function is_mock_mode(): boolean {
  return process.env.BRANE_EMBED_MOCK === "1"
}

export async function get_backend(): Promise<EmbedBackend> {
  if (cached_backend) return cached_backend

  if (is_mock_mode()) {
    cached_backend = new MockBackend()
  } else {
    cached_backend = new Model2VecBackend()
  }

  return cached_backend
}
