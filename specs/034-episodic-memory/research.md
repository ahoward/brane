# Research: Episodic Memory

## R1: CozoDB List Type for Tags

**Decision**: Store tags as a JSON string column, not a CozoDB native list.

**Rationale**: CozoDB's list type `[String]` works for storage but filtering ("find episodes with tag X") requires Datalog pattern matching on list contents, which is complex and slow. A JSON string `'["tag1","tag2"]'` is simpler: store on write, parse on read, filter with string contains for tag matching.

**Alternatives considered**:
- CozoDB `[String]` list type — complex Datalog for contains-check, no index support
- Separate `episode_tags` relation (episode_id, tag) — normalized but adds a join to every query, over-engineered for a tag list

## R2: Episode ID Generation

**Decision**: Use the same `schema_meta` counter pattern as concepts/edges/annotations.

**Rationale**: Consistent with existing codebase. `get_next_episode_id()` reads and increments `episode_next_id` in schema_meta. Same pattern as `get_next_concept_id()`.

## R3: Timestamp Generation

**Decision**: Server-generated UTC ISO 8601 timestamps via `new Date().toISOString()`.

**Rationale**: Consistent, avoids timezone issues, agents don't need to supply their own timestamps. The spec says "auto-generated."

## R4: Migration Strategy (v1.7.0 → v1.8.0)

**Decision**: Add migration to `MIGRATIONS` array in migrate.ts. The apply function creates the `episodes` relation and `episodes:semantic` HNSW index. Bump `LATEST_VERSION` to "1.8.0". Also update `create_schema()` in init.ts for fresh databases.

**Rationale**: This is exactly what the migration system was built for. Existing databases get auto-migrated on next open_mind() call. New databases get episodes from init.

## R5: Semantic Search Implementation

**Decision**: Mirror the existing `/mind/search` handler pattern — embed the query text, then use CozoDB's `~` HNSW search operator on the `episodes:semantic` index.

**Rationale**: Proven pattern already working for concept search. Same embedding model, same cosine similarity, same result format.

## R6: Tag Filtering in List

**Decision**: Filter tags using CozoDB string matching on the JSON tags column. For a tag filter "preference", match episodes where the tags string contains `"preference"`.

**Rationale**: Simple, works for the common case. Edge case of partial string matches (e.g., tag "pre" matching "preference") is acceptable given tags are user-defined labels, not arbitrary text. For exact matching, we can check `'"preference"'` (with quotes) in the JSON string.

## R7: Time Range Filtering

**Decision**: Compare ISO 8601 timestamp strings lexicographically. `after` and `before` filters use string comparison.

**Rationale**: ISO 8601 timestamps sort lexicographically correctly (year-month-day-hour-minute-second). No date parsing needed in CozoDB queries.
