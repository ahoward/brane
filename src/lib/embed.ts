//
// embed.ts - embedding generation facade
//
// Public API unchanged. Backend swapped from fastembed (ONNX) to
// model2vec (pure TypeScript). Use BRANE_EMBED_MOCK=1 for tests.
//

import { get_backend, is_mock_mode as _is_mock_mode } from "./embed/index.ts"

// Embedding dimension (model2vec/potion-base-8M)
export const EMBED_DIM = 256

export const is_mock_mode = _is_mock_mode

export async function generate_embedding(text: string): Promise<number[] | null> {
  try {
    const backend = await get_backend()
    return await backend.embed(text)
  } catch (err) {
    console.error("Embedding generation failed:", err)
    return null
  }
}

export async function generate_embeddings(texts: string[]): Promise<(number[] | null)[]> {
  try {
    const backend = await get_backend()
    return await backend.embed_batch(texts)
  } catch (err) {
    console.error("Batch embedding generation failed:", err)
    return texts.map(() => null)
  }
}
