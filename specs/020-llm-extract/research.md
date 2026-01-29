# Research: LLM-Powered Concept Extraction

## Decision 1: LLM Provider

**Decision**: Anthropic Claude (claude-3-5-sonnet) as primary and only provider for MVP.

**Rationale**:
- Excellent at structured output (JSON)
- Strong code understanding
- Reasonable pricing for development
- Already have SDK experience in the ecosystem

**Alternatives Considered**:
- **OpenAI GPT-4**: Good alternative, but adds complexity. Can add later if needed.
- **Local Ollama**: Great for privacy, but quality varies. Future enhancement.
- **Multiple providers**: Over-engineering for MVP (YAGNI).

## Decision 2: Structured Output Format

**Decision**: Use tool_use/function calling for guaranteed JSON schema compliance.

**Rationale**:
- Anthropic's tool_use ensures valid JSON output
- Schema enforcement at API level
- No need for manual JSON parsing/retry logic

**Schema**:
```json
{
  "concepts": [
    { "name": "string", "type": "Entity|Rule|Caveat" }
  ],
  "edges": [
    { "source_name": "string", "target_name": "string", "relation": "DEPENDS_ON|CONFLICTS_WITH|DEFINED_IN" }
  ]
}
```

## Decision 3: Configuration Storage

**Decision**: `.brane/config.json` with environment variable fallback.

**Rationale**:
- Keeps all Brane data in `.brane/` directory
- Environment variable fallback for CI/CD and quick setup
- JSON format consistent with Brane's POD philosophy

**Config Schema**:
```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "api_key": "sk-..."
  }
}
```

**Fallback Order**:
1. `.brane/config.json` → `llm.api_key`
2. Environment variable `ANTHROPIC_API_KEY`
3. Error: "No API key configured"

## Decision 4: File Content Handling

**Decision**: Truncate files to ~8000 tokens (~32KB) with smart truncation.

**Rationale**:
- Claude's context is large but we want fast, cheap extractions
- Most meaningful code is in first portion of file
- Smart truncation preserves imports and class/function signatures

**Truncation Strategy**:
1. Always include: First 100 lines (imports, declarations)
2. If file > 8000 tokens: Truncate with "[... truncated ...]" marker
3. Binary files: Skip entirely with warning

## Decision 5: Testing Strategy

**Decision**: Mock LLM in tc tests; real LLM in integration tests.

**Rationale**:
- tc tests must be deterministic and fast
- Real LLM calls are slow and non-deterministic
- Mock based on file content hash for reproducibility

**Mock Implementation**:
- Environment variable `BRANE_LLM_MOCK=1` enables mock mode
- Mock returns deterministic extraction based on file content
- Integration tests (separate from tc) use real LLM

## Decision 6: Error Handling

**Decision**: Graceful degradation with detailed error reporting.

**Errors to Handle**:
| Error | Response |
|-------|----------|
| No API key | Error: "LLM not configured (set ANTHROPIC_API_KEY or .brane/config.json)" |
| Rate limit | Retry with exponential backoff (max 3 attempts) |
| Invalid response | Error logged, file skipped, continue with others |
| Network error | Error logged, file skipped, continue with others |
| Binary file | Warning logged, file skipped |

## Decision 7: Prompt Engineering

**Decision**: Single focused prompt with clear schema and examples.

**Key Elements**:
1. Role: "You are a code analyzer extracting domain concepts"
2. Output: Strict JSON schema via tool_use
3. Guidance: Focus on domain concepts, not implementation details
4. Examples: Include 2-3 few-shot examples in prompt

**Concept Type Guidance**:
- **Entity**: Domain objects, data models, services (User, Order, AuthService)
- **Rule**: Business rules, validations, constraints (must_be_positive, require_auth)
- **Caveat**: Warnings, known issues, technical debt (TODO, FIXME, deprecated)

**Relationship Guidance**:
- **DEPENDS_ON**: Import/require, composition, inheritance
- **CONFLICTS_WITH**: Mutually exclusive options, incompatible versions
- **DEFINED_IN**: Where a concept is declared (file provenance handles this mostly)
