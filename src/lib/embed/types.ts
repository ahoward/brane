//
// types.ts - embedding backend interface
//

export interface EmbedBackend {
  readonly dim: number
  embed(text: string): Promise<number[]>
  embed_batch(texts: string[]): Promise<(number[] | null)[]>
}
