//
// parse.ts — AST parse facade
//

import type { FileAST } from "./types.ts"
import { get_parser, load_language, detect_language } from "./grammars.ts"
import { extract_typescript } from "./extractors/typescript.ts"

const EXTRACTORS: Record<string, (root: any) => { symbols: any[]; imports: string[] }> = {
  typescript:  extract_typescript,
  tsx:         extract_typescript,
  javascript:  extract_typescript,
}

export async function parse_file(file_url: string, content: string, language_hint?: string): Promise<FileAST> {
  // detect language from file extension
  const detected = detect_language(file_url)
  const lang_info = detected || (language_hint ? { language: language_hint, wasm: "" } : null)

  if (!lang_info) {
    return { path: file_url, language: null, imports: [], symbols: [] }
  }

  const extractor = EXTRACTORS[lang_info.language]
  if (!extractor) {
    return { path: file_url, language: lang_info.language, imports: [], symbols: [] }
  }

  const parser = await get_parser()
  const lang = await load_language(lang_info.wasm)
  if (!lang) {
    return { path: file_url, language: lang_info.language, imports: [], symbols: [] }
  }

  parser.setLanguage(lang)
  const tree = parser.parse(content)
  const { symbols, imports } = extractor(tree.rootNode)

  return { path: file_url, language: lang_info.language, imports, symbols }
}
