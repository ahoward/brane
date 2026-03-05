//
// extract-ast.ts — AST-only extraction for a single file
//

import type { Params, Result, Emit } from "../../lib/types.ts"
import { success, error } from "../../lib/result.ts"
import { parse_file } from "../../lib/ast/parse.ts"
import { generate_sentinels } from "../../lib/ast/sentinels.ts"
import type { ASTSymbol, Sentinel } from "../../lib/ast/types.ts"

interface ExtractASTParams {
  file_url?:  string
  content?:   string
  language?:  string
}

interface ExtractASTResult {
  file_url:   string
  language:   string | null
  imports:    string[]
  symbols:    ASTSymbol[]
  sentinels:  string[]
  coverage:   null
}

export async function handler(params: Params, emit?: Emit): Promise<Result<ExtractASTResult>> {
  const p = (params ?? {}) as ExtractASTParams

  if (!p.file_url) {
    return error({
      file_url: [{ code: "required", message: "file_url is required" }]
    })
  }

  if (!p.content && p.content !== "") {
    return error({
      content: [{ code: "required", message: "content is required" }]
    })
  }

  const content = p.content ?? ""
  const file_ast = await parse_file(p.file_url, content, p.language)
  const sentinels = generate_sentinels(file_ast)

  return success({
    file_url:   p.file_url,
    language:   file_ast.language,
    imports:    file_ast.imports,
    symbols:    file_ast.symbols,
    sentinels:  sentinels.map(s => s.name),
    coverage:   null,
  })
}
