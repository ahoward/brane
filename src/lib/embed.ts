//
// embed.ts - local embedding generation via fastembed
//
// Uses BGESmallEN model (384 dimensions) for semantic similarity.
// Supports mock mode for testing via BRANE_EMBED_MOCK=1.
//

import { EmbeddingModel, FlagEmbedding } from "fastembed"

// Embedding dimension for BGESmallEN
export const EMBED_DIM = 384

// Cached embedding model (lazy loaded)
let cached_model: FlagEmbedding | null = null
let model_loading: Promise<FlagEmbedding> | null = null

//
// Check if mock mode is enabled
//
export function is_mock_mode(): boolean {
  return process.env.BRANE_EMBED_MOCK === "1"
}

//
// Generate deterministic mock embedding from text
// Uses simple hash-based approach for reproducibility
//
function generate_mock_embedding(text: string): number[] {
  const vector: number[] = new Array(EMBED_DIM).fill(0)

  // Simple deterministic hash-based embedding
  for (let i = 0; i < text.length; i++) {
    const char_code = text.charCodeAt(i)
    const idx = (char_code * (i + 1)) % EMBED_DIM
    vector[idx] += char_code / 1000
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude
    }
  } else {
    // If all zeros, create a simple normalized vector
    vector[0] = 1.0
  }

  return vector
}

//
// Get or initialize the embedding model
//
async function get_model(): Promise<FlagEmbedding> {
  if (cached_model) {
    return cached_model
  }

  // Prevent concurrent initialization
  if (model_loading) {
    return model_loading
  }

  model_loading = FlagEmbedding.init({
    model: EmbeddingModel.BGESmallENV15
  })

  cached_model = await model_loading
  model_loading = null

  return cached_model
}

//
// Generate embedding for text
//
export async function generate_embedding(text: string): Promise<number[] | null> {
  // Mock mode for testing
  if (is_mock_mode()) {
    return generate_mock_embedding(text)
  }

  try {
    const model = await get_model()
    const embedding = await model.queryEmbed(text)
    return Array.from(embedding)
  } catch (err) {
    // Graceful degradation - return null on failure
    console.error("Embedding generation failed:", err)
    return null
  }
}

//
// Generate embeddings for multiple texts (batch)
//
export async function generate_embeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (is_mock_mode()) {
    return texts.map(t => generate_mock_embedding(t))
  }

  try {
    const model = await get_model()
    const results: (number[] | null)[] = []

    // fastembed returns async generator for batches
    const embeddings = model.embed(texts)

    for await (const batch of embeddings) {
      for (const embedding of batch) {
        results.push(Array.from(embedding))
      }
    }

    return results
  } catch (err) {
    console.error("Batch embedding generation failed:", err)
    return texts.map(() => null)
  }
}
