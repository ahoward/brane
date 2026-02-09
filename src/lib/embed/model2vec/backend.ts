//
// backend.ts - Model2Vec embedding backend
//
// Inference: tokenize → lookup embedding matrix → mean-pool → L2 normalize
// No neural network forward pass. Pure arithmetic.
//

import { resolve, dirname } from "node:path"
import { readFileSync, existsSync } from "node:fs"
import type { EmbedBackend } from "../types.ts"
import { WordPieceTokenizer, type TokenizerConfig } from "./tokenizer.ts"
import { parse_safetensors } from "./safetensors.ts"

function find_model_dir(): string {
  // Candidate locations in priority order:
  // 1. BRANE_MODEL_DIR env var (explicit override)
  // 2. Relative to project root via Bun.main (bun run mode)
  // 3. Relative to cwd (common dev layout)
  // 4. Relative to binary location (compiled binary in bin/)
  // 5. Relative to import.meta.dir (module resolution)
  const candidates: string[] = []

  if (process.env.BRANE_MODEL_DIR) {
    candidates.push(process.env.BRANE_MODEL_DIR)
  }

  // bun run mode: Bun.main = src/cli.ts → go up to project root
  try {
    candidates.push(resolve(dirname(Bun.main), "lib/embed/model2vec/model"))
  } catch {}

  // cwd-based (works when running from project root)
  candidates.push(resolve(process.cwd(), "src/lib/embed/model2vec/model"))

  // Relative to compiled binary: bin/brane → ../src/lib/embed/model2vec/model
  try {
    const bin_path = process.execPath
    if (bin_path && !bin_path.includes("/$bunfs/")) {
      candidates.push(resolve(dirname(bin_path), "../src/lib/embed/model2vec/model"))
    }
  } catch {}

  // import.meta.dir based
  try {
    candidates.push(resolve(import.meta.dir, "model"))
  } catch {}

  for (const dir of candidates) {
    if (existsSync(resolve(dir, "tokenizer.json"))) {
      return dir
    }
  }

  throw new Error(`model2vec model files not found. Searched: ${candidates.join(", ")}`)
}

export class Model2VecBackend implements EmbedBackend {
  readonly dim = 256

  private tokenizer: WordPieceTokenizer | null = null
  private embeddings: Float32Array | null = null
  private num_embeddings = 0
  private loading: Promise<void> | null = null

  private async ensure_loaded(): Promise<void> {
    if (this.tokenizer && this.embeddings) return
    if (this.loading) { await this.loading; return }

    this.loading = this.load()
    await this.loading
    this.loading = null
  }

  private async load(): Promise<void> {
    const model_dir = find_model_dir()

    // Load tokenizer
    const tokenizer_json = readFileSync(resolve(model_dir, "tokenizer.json"), "utf-8")
    const tokenizer_config = JSON.parse(tokenizer_json) as TokenizerConfig
    this.tokenizer = new WordPieceTokenizer(tokenizer_config)

    // Load embeddings from safetensors
    const safetensors_buf = readFileSync(resolve(model_dir, "model.safetensors"))
    const tensors = parse_safetensors(safetensors_buf.buffer as ArrayBuffer)

    const embedding_tensor = tensors["embeddings"]
    if (!embedding_tensor) {
      throw new Error("model.safetensors missing 'embeddings' tensor")
    }

    this.embeddings = embedding_tensor.data
    this.num_embeddings = embedding_tensor.info.shape[0]
  }

  async embed(text: string): Promise<number[]> {
    await this.ensure_loaded()

    const ids = this.tokenizer!.tokenize(text)
    return this.mean_pool_normalize(ids)
  }

  async embed_batch(texts: string[]): Promise<(number[] | null)[]> {
    await this.ensure_loaded()

    return texts.map(text => {
      const ids = this.tokenizer!.tokenize(text)
      return this.mean_pool_normalize(ids)
    })
  }

  //
  // Mean-pool token embeddings then L2 normalize
  //
  private mean_pool_normalize(token_ids: number[]): number[] {
    const dim = this.dim
    const emb = this.embeddings!
    const pool = new Float64Array(dim)
    let count = 0

    for (const id of token_ids) {
      if (id < 0 || id >= this.num_embeddings) continue
      const offset = id * dim
      for (let d = 0; d < dim; d++) {
        pool[d] += emb[offset + d]
      }
      count++
    }

    if (count === 0) {
      // Return zero vector normalized (first element = 1)
      const result = new Array(dim).fill(0)
      result[0] = 1.0
      return result
    }

    // Mean
    for (let d = 0; d < dim; d++) {
      pool[d] /= count
    }

    // L2 normalize
    let norm = 0
    for (let d = 0; d < dim; d++) {
      norm += pool[d] * pool[d]
    }
    norm = Math.sqrt(norm)

    const result = new Array(dim)
    if (norm > 0) {
      for (let d = 0; d < dim; d++) {
        result[d] = pool[d] / norm
      }
    } else {
      for (let d = 0; d < dim; d++) {
        result[d] = 0
      }
      result[0] = 1.0
    }

    return result
  }
}
