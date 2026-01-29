# Extraction Prompt Contract

## System Prompt

```text
You are a code analyzer that extracts domain concepts and relationships from source code.

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
- If a file has no domain concepts (just utilities), return empty arrays
```

## User Message Template

```text
Extract domain concepts from this {{language}} file.

File: {{file_url}}

```{{language}}
{{content}}
```

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "concepts": [{ "name": "string", "type": "Entity|Rule|Caveat" }],
  "edges": [{ "source_name": "string", "target_name": "string", "relation": "DEPENDS_ON|CONFLICTS_WITH|DEFINED_IN" }]
}
```

## Expected JSON Response

The CLI returns JSON matching this schema:

```json
{
  "concepts": [
    { "name": "User", "type": "Entity" },
    { "name": "authenticate", "type": "Entity" },
    { "name": "password_min_length", "type": "Rule" }
  ],
  "edges": [
    { "source_name": "authenticate", "target_name": "User", "relation": "DEPENDS_ON" }
  ]
}
```

## Example Extractions

### Example 1: TypeScript Service

**Input**:
```typescript
import { Database } from './db'
import { hash_password } from './crypto'

interface User {
  id: number
  email: string
  password_hash: string
}

export class AuthService {
  constructor(private db: Database) {}

  async authenticate(email: string, password: string): Promise<User | null> {
    // TODO: Add rate limiting
    const user = await this.db.find_user_by_email(email)
    if (!user) return null
    const hash = hash_password(password)
    return hash === user.password_hash ? user : null
  }
}
```

**Expected Output**:
```json
{
  "concepts": [
    { "name": "User", "type": "Entity" },
    { "name": "AuthService", "type": "Entity" },
    { "name": "authenticate", "type": "Entity" },
    { "name": "rate_limiting_todo", "type": "Caveat" }
  ],
  "edges": [
    { "source_name": "AuthService", "target_name": "User", "relation": "DEPENDS_ON" },
    { "source_name": "authenticate", "target_name": "User", "relation": "DEPENDS_ON" }
  ]
}
```

### Example 2: Python Model

**Input**:
```python
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Order:
    """Represents a customer order."""
    id: int
    customer_id: int
    total: float
    status: str  # pending, confirmed, shipped, delivered
    created_at: datetime

    def confirm(self) -> None:
        """Confirm the order. Total must be positive."""
        if self.total <= 0:
            raise ValueError("Order total must be positive")
        self.status = "confirmed"
```

**Expected Output**:
```json
{
  "concepts": [
    { "name": "Order", "type": "Entity" },
    { "name": "order_total_must_be_positive", "type": "Rule" }
  ],
  "edges": [
    { "source_name": "order_total_must_be_positive", "target_name": "Order", "relation": "DEPENDS_ON" }
  ]
}
```

### Example 3: Utility File (No Domain Concepts)

**Input**:
```typescript
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
```

**Expected Output**:
```json
{
  "concepts": [],
  "edges": []
}
```

## Error Cases

### Invalid Concept Type
If LLM returns invalid type, reject and retry:
```json
{ "name": "Foo", "type": "Class" }  // INVALID - must be Entity|Rule|Caveat
```

### Invalid Relation
If LLM returns invalid relation, reject and retry:
```json
{ "source_name": "A", "target_name": "B", "relation": "uses" }  // INVALID
```

### Circular Reference
Valid but should be rare:
```json
{
  "edges": [
    { "source_name": "A", "target_name": "B", "relation": "DEPENDS_ON" },
    { "source_name": "B", "target_name": "A", "relation": "DEPENDS_ON" }
  ]
}
```
