//
// types.ts - LLM backend interface
//

export interface LlmExtractionRequest {
  file_url:         string
  file_content:     string
  file_path:        string
  golden_types:     { type: string; description: string }[]
  golden_relations: { rel: string; description: string; symmetric: boolean }[]
}

export interface LlmExtractionResult {
  concepts: { name: string; type: string }[]
  edges:    { source_name: string; target_name: string; relation: string; weight?: number }[]
}

export interface LlmBackend {
  extract(request: LlmExtractionRequest): Promise<LlmExtractionResult>
}
