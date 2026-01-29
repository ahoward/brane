# Data Model: LLM-Powered Concept Extraction

## Config Schema

### `.brane/config.json`

```typescript
interface BraneConfig {
  llm?: LLMConfig
}

interface LLMConfig {
  provider?:  "claude" | "gemini"   // Optional - auto-detected if not set
}
```

**Example** (explicit provider preference):
```json
{
  "llm": {
    "provider": "claude"
  }
}
```

**Minimal Example** (auto-detect available CLI):
```json
{}
```

Note: API keys are managed by the CLIs themselves (`claude` and `gemini`), not by Brane config.

## LLM Request/Response

### Extraction Request (internal)

```typescript
interface ExtractionRequest {
  file_url:  string    // file:///path/to/file.ts
  content:   string    // File content (possibly truncated)
  language:  string    // Detected language (ts, py, rs, etc.)
}
```

### Extraction Response (from CLI)

```typescript
interface ExtractionResponse {
  concepts: ConceptInput[]
  edges:    EdgeInput[]
}

interface ConceptInput {
  name: string
  type: "Entity" | "Rule" | "Caveat"
}

interface EdgeInput {
  source_name: string
  target_name: string
  relation:    "DEPENDS_ON" | "CONFLICTS_WITH" | "DEFINED_IN"
}
```

## CLI Invocation

### Claude CLI

```bash
echo "$prompt" | claude --print --output-format json
```

### Gemini CLI

```bash
echo "$prompt" | gemini --output-format json
```

The prompt includes the JSON schema and instructs the LLM to output only valid JSON matching that schema.

## Existing Types (unchanged)

These types from `src/lib/types.ts` and `src/handlers/calabi/extract.ts` remain unchanged:

```typescript
// From extract.ts - the patch format we feed to extract handler
interface ExtractParams {
  file_url:  string
  concepts:  ConceptInput[]
  edges:     EdgeInput[]
}

// Concept types (from mind.ts)
type ConceptType = "Entity" | "Rule" | "Caveat"

// Edge relations (from mind.ts)
type EdgeRelation = "DEPENDS_ON" | "CONFLICTS_WITH" | "DEFINED_IN"
```

## State Diagram

```
┌─────────────────┐
│  detect_provider │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ 1. Check .brane/config.json for provider │
│ 2. If not set, check `which claude`      │
│ 3. If not found, check `which gemini`    │
│ 4. Error if neither CLI installed        │
└──────────────────┬───────────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│  claude   │ │  gemini   │ │   Error   │
└─────┬─────┘ └─────┬─────┘ └───────────┘
      │             │
      └──────┬──────┘
             │
             ▼
┌─────────────────────────────┐
│      call_cli(provider)     │
│  stdin: prompt              │
│  stdout: JSON response      │
└─────────────────────────────┘
```
