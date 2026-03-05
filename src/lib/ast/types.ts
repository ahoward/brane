//
// types.ts — AST extraction POD types
//

export interface ASTSymbol {
  kind:       "function" | "class" | "type" | "interface" | "constant" | "method" | "module"
  name:       string
  signature:  string | null
  line:       number
  children:   ASTSymbol[]
}

export interface FileAST {
  path:       string
  language:   string | null
  imports:    string[]
  symbols:    ASTSymbol[]
}

export interface Sentinel {
  name:       string
  source:     "import" | "class" | "interface" | "type"
  file_url:   string
}

export interface CoverageReport {
  file_url:          string
  total_sentinels:   number
  matched_sentinels: number
  coverage_pct:      number
  missing:           string[]
}
