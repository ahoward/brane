# Research: LLM-Powered Concept Extraction

## Decision 1: Integration Approach

**Decision**: Wrap CLI tools (`claude`, `gemini`) instead of using SDKs.

**Rationale**:
- **Durability**: CLI is a stable interface, unlikely to break between SDK versions
- **Portability**: Adding providers = wrap their CLI (no new npm dependencies)
- **Zero dependencies**: No `@anthropic-ai/sdk` or `openai` to install/maintain/update
- **Auth handled**: CLIs already know about API keys from their own config
- **Unix-Clean**: Aligns with Constitution Principle V (stdin/stdout)
- **Battle-tested**: CLIs handle retries, rate limits, streaming internally

**Alternatives Considered**:
- **Anthropic SDK**: Typed responses, but version churn and dependency management
- **Multiple SDKs**: Each provider = new dependency, auth management overhead
- **HTTP direct**: Maximum control, but reimplementing what CLIs already do

## Decision 2: Provider Support

**Decision**: Support both `claude` and `gemini` CLIs for v1.

**Rationale**:
- Both are high-quality and widely installed
- Auto-detect which is available (`which claude`, `which gemini`)
- User can set preference in config if both are available

**Detection Order**:
1. Check `.brane/config.json` for `llm.provider` preference
2. If not set, auto-detect: prefer `claude` if available, fall back to `gemini`
3. Error if neither CLI is installed

## Decision 3: Structured Output Format

**Decision**: Use `--output-format json` flag with explicit JSON schema in prompt.

**CLI Commands**:
```bash
# Claude
echo "$prompt" | claude --print --output-format json

# Gemini
echo "$prompt" | gemini --output-format json
```

**Schema** (embedded in prompt):
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

## Decision 4: Configuration Storage

**Decision**: `.brane/config.json` for provider preference (optional).

**Rationale**:
- CLIs handle their own auth (no API keys in brane config)
- Config only needed to set provider preference if both CLIs installed
- Keeps config minimal

**Config Schema**:
```json
{
  "llm": {
    "provider": "claude"  // or "gemini" - optional, auto-detected if not set
  }
}
```

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
| No CLI installed | Error: "No LLM CLI found (install claude or gemini)" |
| CLI auth error | Error: "LLM CLI not authenticated (run `claude` or `gemini` to configure)" |
| CLI returns non-zero | Error logged, file skipped, continue with others |
| Invalid JSON response | Error logged, file skipped, continue with others |
| Binary file | Warning logged, file skipped |

Note: Rate limits and retries are handled by the CLIs themselves.

## Decision 7: Prompt Engineering

**Decision**: Single focused prompt with clear schema and examples.

**Key Elements**:
1. Role: "You are a code analyzer extracting domain concepts"
2. Output: Strict JSON schema (explained in prompt, enforced via `--output-format json`)
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

## Decision 8: CLI Invocation Pattern

**Decision**: Use Bun's shell API (`Bun.spawn`) for subprocess execution.

**Rationale**:
- Native to Bun, no external dependencies
- Proper stdin/stdout handling
- Exit code access for error detection

**Example**:
```typescript
const proc = Bun.spawn(["claude", "--print", "--output-format", "json"], {
  stdin: new TextEncoder().encode(prompt),
})
const output = await new Response(proc.stdout).text()
const exit_code = await proc.exited
```
