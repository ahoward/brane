//
// mock.ts - deterministic mock LLM backend for tests
//

import type { LlmBackend, LlmExtractionRequest, LlmExtractionResult } from "./types.ts"

export class MockLlmBackend implements LlmBackend {
  async extract(request: LlmExtractionRequest): Promise<LlmExtractionResult> {
    // Extract basename without extension from file_path
    const parts = request.file_path.split("/")
    const filename = parts[parts.length - 1]
    const dot = filename.lastIndexOf(".")
    const basename = dot > 0 ? filename.substring(0, dot) : filename

    // PascalCase the basename: "auth-service" -> "AuthService"
    const name = basename
      .split(/[-_.]/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join("")

    // Use first golden type if available, otherwise "Entity"
    const type = request.golden_types.length > 0
      ? request.golden_types[0].type
      : "Entity"

    return {
      concepts: [{ name, type }],
      edges: []
    }
  }
}
