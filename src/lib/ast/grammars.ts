//
// grammars.ts — tree-sitter parser singleton + lazy WASM grammar loading
//

import { resolve } from "node:path"
import { existsSync } from "node:fs"

let _parser: any = null
let _loaded_langs: Record<string, any> = {}

// find the WASM directory — works in dev (node_modules) and compiled binary
function find_wasm_dir(): string {
  // dev mode: node_modules path
  const dev_path = resolve(__dirname, "../../../node_modules/tree-sitter-wasms/out")
  if (existsSync(dev_path)) return dev_path

  // compiled binary: relative to binary location
  const bin_path = resolve(process.execPath, "../wasm")
  if (existsSync(bin_path)) return bin_path

  return dev_path  // fallback
}

export async function get_parser(): Promise<any> {
  if (_parser) return _parser
  const mod = require("web-tree-sitter")
  const Parser = mod.Parser || mod.default || mod
  await Parser.init()
  _parser = new Parser()
  return _parser
}

export async function load_language(wasm_name: string): Promise<any> {
  if (_loaded_langs[wasm_name]) return _loaded_langs[wasm_name]

  const mod = require("web-tree-sitter")
  const Language = mod.Language
  const wasm_dir = find_wasm_dir()
  const wasm_path = resolve(wasm_dir, wasm_name)

  if (!existsSync(wasm_path)) return null

  const lang = await Language.load(wasm_path)
  _loaded_langs[wasm_name] = lang
  return lang
}

// extension → { language name, wasm filename }
export const LANG_MAP: Record<string, { language: string; wasm: string }> = {
  ".ts":   { language: "typescript",  wasm: "tree-sitter-typescript.wasm" },
  ".tsx":  { language: "tsx",         wasm: "tree-sitter-typescript.wasm" },
  ".js":   { language: "javascript",  wasm: "tree-sitter-javascript.wasm" },
  ".jsx":  { language: "javascript",  wasm: "tree-sitter-javascript.wasm" },
  ".mjs":  { language: "javascript",  wasm: "tree-sitter-javascript.wasm" },
}

export function detect_language(file_path: string): { language: string; wasm: string } | null {
  const ext = file_path.slice(file_path.lastIndexOf("."))
  return LANG_MAP[ext] || null
}
