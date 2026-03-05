# Data Model: 033-prune

No new relations or schema changes. Prune operates on existing relations.

## Existing Relations (read + delete)

### concepts (mind.db)
```
{id: Int, name: String, type: String, vector: <F32;256>?}
```
Concepts with ALL provenance pointing to missing files are deleted.

### edges (mind.db)
```
{id: Int, source: Int, target: Int, relation: String, weight: Float}
```
Edges where source OR target was pruned are deleted.

### provenance (mind.db)
```
{concept_id: Int, file_url: String}
```
Provenance records where file_url is not in body.db files are deleted.

### files (body.db)
```
url TEXT PRIMARY KEY, hash TEXT, size INTEGER, modified INTEGER
```
Read-only reference — provides the set of valid file_urls.

## Data Flow

```
body.db files.url  →  valid_urls (Set)
mind.db provenance →  all provenance records
                   →  stale_provenance = {file_url NOT IN valid_urls}
                   →  orphan_concept_ids = {concept_id where ALL provenance is stale}
                   →  dangling_edge_ids = {edge where source OR target IN orphan_concept_ids}

DELETE: edges (dangling) → provenance (stale) → concepts (orphan)
```
