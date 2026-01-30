//
// prompts.ts - extraction prompt templates for LLM
//

/**
 * System prompt that defines the LLM's role and guidelines.
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are a code analyzer that extracts domain concepts and relationships from source code.

Your task is to identify:
1. **Entities**: Domain objects, data models, services, components (e.g., User, Order, AuthService)
2. **Rules**: Business rules, validations, constraints, policies (e.g., must_be_positive, require_auth)
3. **Caveats**: Warnings, known issues, technical debt markers (e.g., TODO items, deprecated code)

And relationships between them:
- **DEPENDS_ON**: When one concept requires another (imports, composition, inheritance)
- **CONFLICTS_WITH**: Mutually exclusive or incompatible concepts
- **DEFINED_IN**: Where a concept is declared (use sparingly, provenance handles most of this)

Guidelines:
- Focus on DOMAIN concepts, not implementation details
- Use meaningful names (PascalCase for types, snake_case for functions/rules)
- Extract 3-10 concepts per file (don't over-extract)
- Only create edges for clear, meaningful relationships
- If a file has no domain concepts (just utilities), return empty arrays`

/**
 * Build the user message for extraction.
 */
export function build_extraction_prompt(
  file_url: string,
  content:  string,
  language: string
): string {
  return `Extract domain concepts from this ${language} file.

File: ${file_url}

\`\`\`${language}
${content}
\`\`\`

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "concepts": [{ "name": "string", "type": "Entity|Rule|Caveat" }],
  "edges": [{ "source_name": "string", "target_name": "string", "relation": "DEPENDS_ON|CONFLICTS_WITH|DEFINED_IN" }]
}`
}

/**
 * Build the full prompt combining system and user messages.
 * For CLI usage, we combine them into a single prompt.
 */
export function build_full_prompt(
  file_url: string,
  content:  string,
  language: string
): string {
  const user_message = build_extraction_prompt(file_url, content, language)
  return `${EXTRACTION_SYSTEM_PROMPT}

---

${user_message}`
}

/**
 * Detect language from file extension.
 */
export function detect_language(file_url: string): string {
  const ext_match = file_url.match(/\.([^.]+)$/)
  if (!ext_match) return "text"

  const ext = ext_match[1].toLowerCase()

  const language_map: Record<string, string> = {
    ts:    "typescript",
    tsx:   "typescript",
    js:    "javascript",
    jsx:   "javascript",
    py:    "python",
    rb:    "ruby",
    rs:    "rust",
    go:    "go",
    java:  "java",
    kt:    "kotlin",
    swift: "swift",
    c:     "c",
    cpp:   "cpp",
    h:     "c",
    hpp:   "cpp",
    cs:    "csharp",
    php:   "php",
    sh:    "bash",
    bash:  "bash",
    zsh:   "zsh",
    sql:   "sql",
    md:    "markdown",
    json:  "json",
    yaml:  "yaml",
    yml:   "yaml",
    toml:  "toml",
    xml:   "xml",
    html:  "html",
    css:   "css",
    scss:  "scss",
    less:  "less",
  }

  return language_map[ext] ?? ext
}

/**
 * Maximum content length in characters (~8000 tokens ≈ 32KB).
 */
export const MAX_CONTENT_LENGTH = 32000

/**
 * Truncate content if too long, preserving the beginning.
 */
export function truncate_content(content: string): { content: string; truncated: boolean } {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return { content, truncated: false }
  }

  const truncated_content = content.slice(0, MAX_CONTENT_LENGTH) + "\n\n[... content truncated ...]"
  return { content: truncated_content, truncated: true }
}
