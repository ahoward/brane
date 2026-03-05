//
// sentinels.ts — generate mandatory concepts from AST analysis
//

import type { FileAST, Sentinel } from "./types.ts"

export function generate_sentinels(file_ast: FileAST): Sentinel[] {
  const sentinels: Sentinel[] = []
  const seen = new Set<string>()

  const file_url = file_ast.path

  // sentinels from import named bindings
  // import { Foo, Bar } from "./module" → sentinels for Foo, Bar
  // we extract the last segment of the import path as a sentinel too
  for (const imp of file_ast.imports) {
    const basename = imp.split("/").pop()?.replace(/^\.+/, "") || ""
    if (basename && !seen.has(basename)) {
      // don't create sentinels for relative path fragments — only named bindings matter
      // import paths are module paths, not concept names
    }
  }

  // sentinels from symbols (classes, interfaces, types)
  for (const sym of file_ast.symbols) {
    if (sym.name === "(anonymous)") continue

    if (sym.kind === "class" && !seen.has(sym.name)) {
      sentinels.push({ name: sym.name, source: "class", file_url })
      seen.add(sym.name)
    } else if (sym.kind === "interface" && !seen.has(sym.name)) {
      sentinels.push({ name: sym.name, source: "interface", file_url })
      seen.add(sym.name)
    } else if (sym.kind === "type" && !seen.has(sym.name)) {
      sentinels.push({ name: sym.name, source: "type", file_url })
      seen.add(sym.name)
    }
  }

  return sentinels
}
