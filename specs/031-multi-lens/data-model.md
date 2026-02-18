# Data Model: Multi-Lens

## Entities

### state.db (new — brane-wide)

```
config
├── key:   TEXT PRIMARY KEY
└── value: TEXT NOT NULL

Initial rows:
  active_lens = "default"
```

### Lens (filesystem)

```
.brane/lens/{name}/
├── body.db       # SQLite — file tracking (existing schema)
└── mind.db/      # CozoDB/RocksDB — knowledge graph (existing schema v1.7.0)
```

Each lens is a complete, independent pair. No shared tables between lenses.

### Layout Detection (no persistence — runtime logic)

```
Flat layout:    .brane/body.db exists AND .brane/state.db does NOT exist
                → treat as "default" lens, paths = .brane/body.db + .brane/mind.db

New layout:     .brane/state.db exists
                → read active_lens from config table
                → paths = .brane/lens/{active_lens}/body.db + .brane/lens/{active_lens}/mind.db

Hybrid:         .brane/state.db exists AND active_lens = "default" AND .brane/body.db exists AND .brane/lens/default/ does NOT exist
                → flat layout still serving as default
                → paths = .brane/body.db + .brane/mind.db
```

## Relationships

```
state.db  ──1:1──>  active lens name (string)
                         │
                         ▼
              .brane/lens/{name}/
                    │
                    ├── body.db  (1:1 per lens)
                    └── mind.db  (1:1 per lens)
```

## Validation Rules

| Field | Rule |
|-------|------|
| Lens name | `/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/` — alphanumeric start, alphanumeric + hyphen + underscore body |
| Active lens | Must reference an existing lens (by name) or "default" |
| config.key | Unique, TEXT, not null |
| config.value | TEXT, not null |

## State Transitions

```
Uninitialized → brane init → Flat layout (body.db + mind.db at .brane/)
                              ↓
                              brane lens create foo → state.db created, lens/foo/ created
                              ↓
                              brane lens use foo → state.db active_lens = "foo"
                              ↓
                              brane lens migrate → flat files moved to lens/default/
                              ↓
                              brane lens delete foo → lens/foo/ removed, active_lens falls back if needed
```
