//
// helpers.ts — tree-sitter node traversal helpers
//

export function node_text(node: any): string {
  return node?.text || ""
}

export function first_named_child_of_type(node: any, type: string): any {
  for (let i = 0; i < node.namedChildCount; i++) {
    if (node.namedChild(i).type === type) return node.namedChild(i)
  }
  return null
}

export function named_children_of_type(node: any, ...types: string[]): any[] {
  const result: any[] = []
  for (let i = 0; i < node.namedChildCount; i++) {
    if (types.includes(node.namedChild(i).type)) result.push(node.namedChild(i))
  }
  return result
}
