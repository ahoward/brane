//
// typescript.ts — tree-sitter TypeScript/JavaScript extractor
//
// ported from ahoward/bunny src/lib/map.ts
//

import type { ASTSymbol } from "../types.ts"
import { node_text, first_named_child_of_type, named_children_of_type } from "../helpers.ts"

function extract_signature(func_node: any): string | null {
  const params = first_named_child_of_type(func_node, "formal_parameters")
  const ret = first_named_child_of_type(func_node, "type_annotation")
  if (!params) return null
  return node_text(params) + (ret ? node_text(ret) : "")
}

function extract_class_methods(class_node: any): ASTSymbol[] {
  const body = first_named_child_of_type(class_node, "class_body")
  if (!body) return []
  const methods: ASTSymbol[] = []
  for (const child of named_children_of_type(body, "method_definition", "public_field_definition")) {
    if (child.type === "method_definition") {
      const name_node = first_named_child_of_type(child, "property_identifier")
      const params = first_named_child_of_type(child, "formal_parameters")
      const ret = first_named_child_of_type(child, "type_annotation")
      if (name_node) {
        methods.push({
          kind: "method",
          name: node_text(name_node),
          signature: params ? node_text(params) + (ret ? node_text(ret) : "") : null,
          line: child.startPosition.row + 1,
          children: [],
        })
      }
    }
  }
  return methods
}

export function extract_typescript(root: any): { symbols: ASTSymbol[]; imports: string[] } {
  const symbols: ASTSymbol[] = []
  const imports: string[] = []

  for (let i = 0; i < root.namedChildCount; i++) {
    const node = root.namedChild(i)

    // imports
    if (node.type === "import_statement") {
      const src = first_named_child_of_type(node, "string")
      if (src) {
        const frag = first_named_child_of_type(src, "string_fragment")
        imports.push(frag ? node_text(frag) : node_text(src))
      }
      continue
    }

    // exports
    if (node.type === "export_statement") {
      const decl = node.namedChild(0)
      if (!decl) continue

      if (decl.type === "function_declaration") {
        const name = first_named_child_of_type(decl, "identifier")
        symbols.push({
          kind: "function",
          name: name ? node_text(name) : "(anonymous)",
          signature: extract_signature(decl),
          line: node.startPosition.row + 1,
          children: [],
        })
      } else if (decl.type === "class_declaration") {
        const name = first_named_child_of_type(decl, "type_identifier")
        symbols.push({
          kind: "class",
          name: name ? node_text(name) : "(anonymous)",
          signature: null,
          line: node.startPosition.row + 1,
          children: extract_class_methods(decl),
        })
      } else if (decl.type === "interface_declaration") {
        const name = first_named_child_of_type(decl, "type_identifier")
        symbols.push({
          kind: "interface",
          name: name ? node_text(name) : "(anonymous)",
          signature: null,
          line: node.startPosition.row + 1,
          children: [],
        })
      } else if (decl.type === "type_alias_declaration") {
        const name = first_named_child_of_type(decl, "type_identifier")
        symbols.push({
          kind: "type",
          name: name ? node_text(name) : "(anonymous)",
          signature: null,
          line: node.startPosition.row + 1,
          children: [],
        })
      } else if (decl.type === "lexical_declaration") {
        const declarator = first_named_child_of_type(decl, "variable_declarator")
        if (declarator) {
          const name = first_named_child_of_type(declarator, "identifier")
          symbols.push({
            kind: "constant",
            name: name ? node_text(name) : "(anonymous)",
            signature: null,
            line: node.startPosition.row + 1,
            children: [],
          })
        }
      }
    }

    // non-exported top-level declarations (still structurally significant)
    if (node.type === "class_declaration") {
      const name = first_named_child_of_type(node, "type_identifier")
      symbols.push({
        kind: "class",
        name: name ? node_text(name) : "(anonymous)",
        signature: null,
        line: node.startPosition.row + 1,
        children: extract_class_methods(node),
      })
    } else if (node.type === "interface_declaration") {
      const name = first_named_child_of_type(node, "type_identifier")
      symbols.push({
        kind: "interface",
        name: name ? node_text(name) : "(anonymous)",
        signature: null,
        line: node.startPosition.row + 1,
        children: [],
      })
    } else if (node.type === "type_alias_declaration") {
      const name = first_named_child_of_type(node, "type_identifier")
      symbols.push({
        kind: "type",
        name: name ? node_text(name) : "(anonymous)",
        signature: null,
        line: node.startPosition.row + 1,
        children: [],
      })
    }
  }

  return { symbols, imports }
}
