//
// mock.ts - deterministic hash-based mock embedding backend
//

import type { EmbedBackend } from "./types.ts"

const MOCK_DIM = 256

function generate_mock_embedding(text: string): number[] {
  const vector: number[] = new Array(MOCK_DIM).fill(0)

  for (let i = 0; i < text.length; i++) {
    const char_code = text.charCodeAt(i)
    const idx = (char_code * (i + 1)) % MOCK_DIM
    vector[idx] += char_code / 1000
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude
    }
  } else {
    vector[0] = 1.0
  }

  return vector
}

export class MockBackend implements EmbedBackend {
  readonly dim = MOCK_DIM

  async embed(text: string): Promise<number[]> {
    return generate_mock_embedding(text)
  }

  async embed_batch(texts: string[]): Promise<(number[] | null)[]> {
    return texts.map(t => generate_mock_embedding(t))
  }
}
