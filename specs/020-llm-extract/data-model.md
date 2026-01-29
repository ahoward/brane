# Data Model: LLM-Powered Concept Extraction

## Config Schema

### `.brane/config.json`

```typescript
interface BraneConfig {
  llm?: LLMConfig
}

interface LLMConfig {
  provider:  "anthropic"           // Only anthropic for MVP
  model?:    string                // Default: "claude-3-5-sonnet-20241022"
  api_key?:  string                // Optional if using env var
}
```

**Example**:
```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "api_key": "sk-ant-..."
  }
}
```

**Minimal Example** (uses env var for API key):
```json
{
  "llm": {
    "provider": "anthropic"
  }
}
```

## LLM Request/Response

### Extraction Request

```typescript
interface ExtractionRequest {
  file_url:  string    // file:///path/to/file.ts
  content:   string    // File content (possibly truncated)
  language:  string    // Detected language (ts, py, rs, etc.)
}
```

### Extraction Response (from LLM)

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

## Tool Definition (for Claude API)

```typescript
const extraction_tool = {
  name: "extract_concepts",
  description: "Extract domain concepts and relationships from code",
  input_schema: {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Concept name (PascalCase or snake_case)" },
            type: { type: "string", enum: ["Entity", "Rule", "Caveat"] }
          },
          required: ["name", "type"]
        }
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source_name: { type: "string" },
            target_name: { type: "string" },
            relation: { type: "string", enum: ["DEPENDS_ON", "CONFLICTS_WITH", "DEFINED_IN"] }
          },
          required: ["source_name", "target_name", "relation"]
        }
      }
    },
    required: ["concepts", "edges"]
  }
}
```

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
┌─────────────┐
│   No Config │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Load Config                               │
│ 1. Check .brane/config.json              │
│ 2. Fall back to ANTHROPIC_API_KEY env    │
│ 3. Error if neither found                │
└──────────────────┬───────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ Config OK   │         │ No API Key  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ LLM Ready   │         │   Error     │
└─────────────┘         └─────────────┘
```
