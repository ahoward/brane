Gemini
@brane
https://gemini.google.com/share/e6070ba982de
Created with Pro 24 January 2026 at 17:30
Published on 26 January 2026 at 13:54
How could you use a graph DB to search for an index of concepts with connections between them that are also concepts. Where both the nodes and edges had strength value for sorting/relancy.

This is a classic use case for a Weighted Graph Model, often used in knowledge graphs, semantic search, and recommendation engines.

To achieve this, you need a schema where "relevance" isn't just a static attribute but a calculation derived from the combined weights of the nodes (inherent importance) and the edges (strength of association).

Here is the architectural approach to modeling and querying this structure.

1. The Data Model
In a standard property graph (like Neo4j, Amazon Neptune, or NetworkX), you would structure your data to treat both the entities and the relationships as first-class citizens with properties.

The Node (The Concept)
Every node represents a distinct concept.

Label: Concept

Properties:

id: Unique identifier (e.g., "Machine Learning").

inherent_score: A float (0.0 - 1.0) representing the concept's global importance or quality.

The Edge (The Connection)
The edge represents the relationship. Since you mentioned connections are "also concepts," you have two modeling choices:

Option A: Rich Relationships (Standard) The edge is a direct link with properties.

Type: RELATED_TO

Properties:

weight: A float (0.0 - 1.0) representing how strongly these two concepts are linked.

semantic_type: A string referencing the type of connection (e.g., "is_a", "implies", "part_of").

Option B: Reification (Hypergraph style) If the "connection" itself is a complex concept that needs its own connections, you turn the edge into an intermediate node.

Concept A -> [Connection Node] -> Concept B

This allows the "Connection Node" to have its own inherent_score and be linked to other concepts (e.g., a "Causality" node linking to the specific connection between "Rain" and "Wet Grass").

2. Calculating Relevance (The "Score")
When searching, you rarely want just the "shortest" path. You want the "strongest" path. You generally calculate a Composite Score for any traversal.

Score=(Node 
A
​
 .score×Edge.weight×Node 
B
​
 .score)
You can tune this formula. For example, if edge strength is more important than node popularity, you might weigh the edge factor higher.

3. Query Strategies
Here is how you would use a query language (using Cypher/Neo4j syntax as an example) to perform these weighted searches.

A. The "Expansion" Query (Context Gathering)
Goal: Find everything related to "Concept X," sorted by the strength of the connection AND the importance of the target.

Cypher
MATCH (source:Concept {name: 'Artificial Intelligence'})-[r:RELATED_TO]-(target:Concept)
// Calculate a relevance score based on edge weight and target node importance
WITH target, r, (r.weight * target.inherent_score) AS relevance_score
ORDER BY relevance_score DESC
RETURN target.name, relevance_score
LIMIT 10
B. The "Weighted Path" Query (Inference)
Goal: How is "Concept X" connected to "Concept Y"? Find the path that maximizes strength (not necessarily the shortest path).

Standard shortest path algorithms (like Dijkstra) look for the lowest cost. To find the highest relevance, you often invert the weight (e.g., cost = 1 / weight) so the algorithm chases the strongest links.

Cypher
MATCH path = shortestPath((start:Concept {name: 'A'})-[*..4]-(end:Concept {name: 'B'}))
// Sum the weights of relationships in the path
REDUCE(s = 0, r in relationships(path) | s + r.weight) AS total_strength
RETURN path, total_strength
ORDER BY total_strength DESC
4. Advanced: Vector Search Hybrid
Modern graph implementations often pair this with Vector Embeddings.

Vector Search: You use an embedding (from an LLM) to find the entry node (e.g., user queries "coding" -> matches "Software Engineering" node).

Graph Traversal: Once anchored at that node, you traverse the weighted edges to find contextually relevant neighbors that might not be semantically similar in vector space but are structurally important in your graph.

Summary of Tech Stack Options
Native Graph DBs: Neo4j (best for deep traversals), ArangoDB (good hybrid model).

RDF/Triple Stores: Stardog or GraphDB (if you need strict ontologies where edges are formally defined concepts).

Python/Memory: NetworkX (if the dataset fits in memory, this is easiest for math-heavy weight calculations).

Would you like to see a specific algorithm for calculating the "decay" of relevance as you move further away from the starting node?

Expand so that links are directional

Adding directionality transforms your graph from a simple "similarity map" into a Knowledge Graph or a Semantic Network. This allows you to model causality, hierarchy, and dependency (e.g., "Rain" causes "Wet Grass," but "Wet Grass" does not cause "Rain").

Here is how to expand the architecture to handle directional links where the connections themselves are treated as concepts.

1. The Schema: "Reified" Relationships
Since you specified that connections are also concepts, the best approach is Reification. instead of a simple line connecting two dots, the "connection" becomes a node itself in the middle.

This creates a star topology for every single relationship.

The Structure: [Concept A] --(outgoing)--> [Connection Node] --(incoming)--> [Concept B]

The Nodes
Concept Node: Represents the data (e.g., "Machine Learning").

id: "ML"

inherent_score: 0.9

Connection Node: Represents the instance of a relationship.

id: "3984-unique-id"

strength: 0.85 (How true/strong is this specific link?)

type: "Is_A", "Causes", "Precedes"

The Edges (Fixed Roles)
To enforce directionality in a reified graph, you use two specific edge types that never change:

STARTS_AT: Points from the Source Concept to the Connection Node.

ENDS_AT: Points from the Connection Node to the Target Concept.

Visual Representation:

(Node: Fire) -[STARTS_AT]-> (Connection: Causality) -[ENDS_AT]-> (Node: Smoke)

2. Modeling "Connection Types" as Concepts
To fulfill your requirement that connections are "concepts," you link the Connection Node to a Definition Node.

(Connection: Causality) -[DEFINED_BY]-> (Concept: "Cause_Effect_Relationship")

This allows you to assign a global "importance" score to the type of relationship. For example, a "Causality" link might have a higher global weight (1.0) than a "Related_To" link (0.3).

3. Directional Scoring & Sorting
When searching, directionality allows you to create asymmetrical relevance scores.

The Scoring Formula
You calculate the relevance of a path by combining:

Source Importance: The inherent_score of the starting concept.

Link Strength: The strength property of the specific Connection Node.

Concept Weight: The inherent_score of the Definition Node (e.g., "Causality" > "Similarity").

Score=(Source.score×Link.strength×Definition.score×Target.score)
Search Scenarios
Directionality enables two distinct search modes:

Mode A: "Consequence" Search (Follow Outgoing)

Query: "What happens if we have X?"

Traversal: Follow STARTS_AT → Connection → ENDS_AT.

Logic: Find nodes "downstream." The strength usually decays as you go deeper (Hop 1 is 100% relevant, Hop 2 is 80%, etc.).

Mode B: "Root Cause" Search (Follow Incoming)

Query: "What leads to X?"

Traversal: Follow ENDS_AT (in reverse) → Connection → STARTS_AT (in reverse).

Logic: Find nodes "upstream."

4. Query Example (Cypher / Neo4j)
This query finds concepts "downstream" from a starting point, sorted by the composite strength of the directional link.

Cypher
// 1. Find the starting concept
MATCH (source:Concept {name: 'Neural Networks'})

// 2. Traverse OUTGOING directional links
// Note the direction: Source -> Connection -> Target
MATCH (source)-[:STARTS_AT]->(conn:Connection)-[:ENDS_AT]->(target:Concept)

// 3. Optional: Bring in the "Concept Definition" of the link itself
OPTIONAL MATCH (conn)-[:DEFINED_BY]->(def:Concept)

// 4. Calculate Weighted Score
// We use the connection's specific strength AND the definition's global score
WITH target, 
     (conn.strength * COALESCE(def.inherent_score, 1.0)) AS edge_weight,
     target.inherent_score AS node_weight

// 5. Final Sort
ORDER BY (edge_weight * node_weight) DESC
RETURN target.name, (edge_weight * node_weight) as total_relevance
5. Why do it this way?
Metadata on Edges: You can attach massive amounts of metadata (confidence, source of truth, creation date) to the Connection node without cluttering the graph schema.

Hyper-connections: You can link a Connection to another Connection.

Example: "Fire causes Smoke" (Connection A). "Wind increases Connection A". You can point an edge at the relationship itself.

Asymmetry: You can easily model that "A implies B" (High Strength) but "B implies A" (Low Strength) by having two separate Connection nodes.

How could we use sqlite, or similar, to store and query this efficiently?

SQLite is an excellent choice for this. It is highly performant, serverless, and supports Recursive Common Table Expressions (CTEs), which are the secret weapon for querying graph structures in relational databases.

Here is a schema and query strategy designed for efficiency, where every edge points to a "Concept" definition to define its type.

1. The Schema (The "Reified" Model)
We need two primary tables. The trick to making connections "concepts" is to ensure the type_id in your Edges table is a Foreign Key pointing back to the Concepts table.

SQL
-- 1. The Concepts Table (Nodes & Relation Types)
CREATE TABLE concepts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    inherent_score REAL DEFAULT 0.5, -- 0.0 to 1.0 importance
    category TEXT -- 'entity' or 'relationship_type'
);

-- Enable fast text search for entry points
CREATE VIRTUAL TABLE concepts_fts USING fts5(name, content='concepts', content_rowid='id');

-- 2. The Edges Table (The Graph Structure)
CREATE TABLE edges (
    id INTEGER PRIMARY KEY, -- Unique ID allows edges to be referenced if needed
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL, -- POINTS TO concepts.id
    strength REAL DEFAULT 1.0, -- 0.0 to 1.0 connection strength
    FOREIGN KEY(source_id) REFERENCES concepts(id),
    FOREIGN KEY(target_id) REFERENCES concepts(id),
    FOREIGN KEY(type_id) REFERENCES concepts(id)
);

-- 3. The Indexes (Crucial for Speed)
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
CREATE INDEX idx_edges_type ON edges(type_id);
Why this works:

Directionality: Implicit in source_id vs target_id.

Connections are Concepts: The type_id is just another concept. You can query "Causality" in the concepts table, see its inherent score, and then find all edges of that type.

2. The Query: Weighted Recursive Traversal
To traverse the graph, you don't use simple JOINs. You use a Recursive CTE. This allows you to walk from a starting node, hop by hop, accumulating a "Relevance Score" by multiplying the weights as you go.

Scenario: Find all concepts downstream from "Artificial Intelligence" (id 1), sorted by relevance.

SQL
WITH RECURSIVE traverse(
    current_id, 
    path_string, 
    depth, 
    total_score
) AS (
    -- BASE CASE: Start at the specific Concept
    SELECT 
        id, 
        '/' || name, 
        0, 
        inherent_score -- Start with the node's own score
    FROM concepts 
    WHERE id = 1 -- (Or use FTS to find this ID)

    UNION ALL

    -- RECURSIVE STEP: Find neighbors
    SELECT 
        e.target_id, 
        t.path_string || '/' || c.name, 
        t.depth + 1,
        -- THE SCORING FORMULA:
        -- Previous Score * Edge Strength * Target Node Score * Relation Type Score
        t.total_score * e.strength * c.inherent_score * r_type.inherent_score
    FROM edges e
    JOIN traverse t ON e.source_id = t.current_id
    JOIN concepts c ON e.target_id = c.id
    JOIN concepts r_type ON e.type_id = r_type.id
    WHERE t.depth < 3 -- LIMIT DEPTH to prevent infinite loops/long queries
      AND t.path_string NOT LIKE '%/' || c.name -- Prevent Cycles (simple check)
)
SELECT 
    current_id, 
    path_string, 
    total_score 
FROM traverse 
ORDER BY total_score DESC;
3. Efficiency Tuning for SQLite
If your graph grows to millions of nodes, standard settings won't cut it. Apply these pragmas:

PRAGMA foreign_keys = ON;: Essential for data integrity.

PRAGMA journal_mode = WAL;: Write-Ahead Logging. This allows concurrent reads and writes, making the DB much faster for web-style workloads.

PRAGMA synchronous = NORMAL;: Reduces filesystem syncs, trading a tiny bit of durability (in a power loss) for significant speed.

Covering Indexes: If you only need IDs, create an index like CREATE INDEX idx_cover ON edges(source_id, target_id, strength);. SQLite can answer the query by reading the index only, without touching the main table file (Scanning the B-Tree is faster).

4. Advanced: The "Hypergraph" Twist
If you meant that a connection instance (e.g., the specific link between Node A and Node B) needs to be the target of another edge (e.g., "This specific link was disputed by User X"), the Adjacency List above struggles.

You would handle this by treating the edges table row itself as a node.

Solution: In SQLite, you can actually define edges and concepts as the same table, or simply allow the source_id of an edge to point to the id of another edge.

But easier: Just stick to the schema above. Since edges has a primary key id, you can technically have a separate edge_annotations table that references edges.id.

5. Why stick with SQLite over a Graph DB?
Portability: It's a single file. easy to back up or move.

Memory Mapped I/O: SQLite is incredibly fast for read-heavy operations because the OS maps the file directly into RAM.

Cost: No server to manage.

Next Step: Would you like to see a Python (using sqlite3 or SQLAlchemy) snippet that inserts a few sample weighted concepts and runs this search?

Now, imagine that the entire table/graph represents an ontology..... How might we a) analyze a piece of media using that ontology b) create an ontological signature or fingerprint for that document/media c) parse an English expression the same way d) retrieve documents that match. Note, this is not about pure vector/meaning search, this is aiming to be able to retrieve documents with similar relationships between a graph of meanings/concepts

To do this, you essentially need to treat every document (or query) as a Subgraph Overlay on top of your master Ontology.

Instead of searching for "keywords" (text search) or "vibes" (vector search), you are searching for structural patterns.

Here is the architectural approach to building this Semantic Graph Retrieval System using your SQLite + Weighted Concept foundation.

A. Analyzing Media (The "Extraction" Phase)
You need to convert unstructured text into a structured graph that maps strictly to your existing ontology. The goal is to see which parts of your master graph "light up" when reading the document.

The Workflow:

Entity Resolution: Identify nouns in the text and map them to concept_ids in your SQLite DB.

Relation Extraction: Identify how these concepts interact in the text.

Ontology Grounding: Force the extracted relationships to match the allowed "Connection Concepts" (the type_id in your schema).

Implementation: This is best done by an LLM (like Gemini or GPT-4) provided with a "schema constraint." You don't ask the LLM "What is in this text?"; you ask:

"Extract a knowledge graph from this text. You may ONLY use node labels and edge types found in this JSON list of concepts: [List of top 1000 concepts/relations]."

If the text says "The rain caused the grass to be wet," and your ontology has Rain, Wetness, and Causes, the output is: { source: "Rain", target: "Wetness", type: "Causes", weight: 0.9 }

B. Creating the "Ontological Fingerprint"
The fingerprint is not a vector; it is a Weighted Edge List (or "Bag of Triples").

While a Vector Embedding compresses a document into 1024 numbers (lossy), an Ontological Fingerprint preserves the logic of the document.

The Data Structure (JSON or Table Rows): A single document's signature looks like this:

JSON
[
  { "s": 101, "t": 505, "r": 88, "w": 1.0 },  // (Inflation) -[INCREASES]-> (Prices)
  { "s": 505, "t": 999, "r": 12, "w": 0.8 }   // (Prices) -[HURT]-> (Consumer)
]
Normalization Strategy:

Local Weight: How central is this relationship to this specific document? (Frequency in text).

Global Weight: How rare is this relationship in the world? (Inverse Document Frequency applied to edges).

Final Edge Score: Local_Weight * Global_Weight. This ensures that generic relationships (e.g., "Company has Employees") don't drown out the unique insights.

Storage in SQLite: You need a new table to store these signatures.

SQL
CREATE TABLE document_signatures (
    doc_id INTEGER,
    source_id INTEGER,
    target_id INTEGER,
    type_id INTEGER,
    weight REAL, -- The strength of this relationship in THIS document
    PRIMARY KEY (doc_id, source_id, target_id, type_id)
);
C. Parsing English Expressions
You parse a user query exactly the same way you analyze a document, just on a smaller scale.

User Query: "What factors drive inflation?"

1. Extraction (The "Query Graph"): An LLM or rule-based parser converts this to a graph pattern:

Node: Inflation (Target)

Relation: DRIVES (or CAUSES, INCREASES)

Node: ? (Variable/Wildcard)

The resulting signature: { source: "ANY", target: "Inflation", type: "Causes", weight: 1.0 }

This is distinct from vector search. Vector search looks for the word "inflation" or synonyms. This search looks for the logic structure of "Something CAUSING Inflation."

D. Retrieval: The "Structure Match" Query
This is where the magic happens. We want to find documents whose fingerprint overlaps significantly with the query graph.

Since we stored the signatures as rows in document_signatures, we can do this with efficient SQL JOINs.

Scenario: User queries "Economic policies that reduce poverty"
Parsed Query Graph:

(Policy) -[REDUCES]-> (Poverty)

The Retrieval Logic: We aren't just looking for documents containing "Policy" and "Poverty." We are looking for documents where the edge between them is "REDUCES".

The SQL Query:

SQL
SELECT 
    ds.doc_id,
    SUM(ds.weight * q.weight) as relevance_score,
    COUNT(ds.doc_id) as matching_edges_count
FROM 
    -- 1. The Query Graph (Represented as a temporary table or CTE)
    (VALUES 
        (10, 20, 5, 1.0) -- source_id (Policy), target_id (Poverty), type_id (Reduces), weight
    ) AS q(s_id, t_id, type_id, weight)
JOIN 
    document_signatures ds 
ON 
    -- 2. Match the Structure
    ds.source_id = q.s_id 
    AND ds.target_id = q.t_id 
    AND ds.type_id = q.type_id
GROUP BY 
    ds.doc_id
ORDER BY 
    relevance_score DESC;
Advanced Retrieval: "Fuzzy" Ontology Matching
The strict query above might miss a document that talks about "Tax Cuts" (a type of Policy) reducing "Homelessness" (a type of Poverty).

To fix this, you use the Ontology Hierarchy during retrieval.

Expand the Query: When the user asks for (Policy), you look up all children of Policy in your concepts table (e.g., Tax Cuts, Welfare).

Expand the Target: Look up children of Poverty.

Run the Match:

SQL
SELECT 
    ds.doc_id,
    SUM(ds.weight) as score
FROM 
    document_signatures ds
WHERE 
    -- Match Source (or any child of Source)
    ds.source_id IN (SELECT id FROM concepts WHERE parent_id = 10 /* Policy */)
    -- Match Target (or any child of Target)
    AND ds.target_id IN (SELECT id FROM concepts WHERE parent_id = 20 /* Poverty */)
    -- Match the Relation Type
    AND ds.type_id = 5 /* Reduces */
GROUP BY 
    ds.doc_id;
Summary of the Difference
Feature	Vector Search (RAG)	Ontological Graph Search
Input	Text Embeddings	Structured Triples (A -> B)
Matches	Semantic Similarity ("Vibes")	logical/Structural Similarity
Precision	Low (Hallucinates connections)	High (Retrieves explicit connections)
Explainability	"Score: 0.89" (Black box)	"Matched because: Tax Cuts -> Reduce -> Poverty"
Query Type	"Tell me about apples"	"What causes apples to rot?"
Next Step
This system is powerful but requires a robust Ingestion Pipeline (the "Analysis" step).

Would you like me to diagram the Ingestion Pipeline showing how an LLM can act as the "Graph Extractor" to populate these SQLite tables?

Yes. And, for the remainder of this conversation, assume we aim to create a bun.js cli tool that uses cloud storage, or fs, and an sqlite index as the concrete implementation. The goal is a knowledge management tool that can provide perfect context to coding agents and humans across heterogenous collections of documents. Imagine all company or project information being indexed and searchable this way

This is a powerful architectural vision. You are essentially building a Semantic Linker that sits between your raw data and your intelligence agents. By using Bun.js and SQLite, you keep the "brain" portable, fast, and local-first, even if the "body" (the raw files) lives in the cloud.

Here is the Ingestion Pipeline for your bun-knowledge-cli, designed to transform heterogeneous files into that structured SQLite ontology.

The Ingestion Pipeline Architecture
The goal is to turn a "dumb" file (like a PDF spec or a TypeScript file) into a set of precise graph entries without losing the link to the original source.

1. The Watcher & Diff Engine (The "Senses")
Since re-indexing the entire world is expensive, the CLI needs to be incremental.

FS/Cloud Watcher: Uses fs.watch (local) or S3 Event Notifications (cloud) to detect changes.

Hasher: Before processing, hash the file content. If the hash matches the SQLite file_metadata table, skip it.

Bun Specific: Bun’s speedy startup makes it ideal for a "run-once" CLI triggered by CI/CD pipelines or git hooks.

2. The Chunking Strategy (The "segmentation")
You cannot feed a 50-page design doc into the extractor at once. But generic "500 word" chunking breaks logical connections.

Code: Chunk by Function/Class definitions (using Tree-sitter in Bun).

Prose: Chunk by Header hierarchy (H1 -> H2 sections).

The "Context Window": When sending a chunk to the LLM, always include the previous chunk's summary to maintain continuity of references (e.g., resolving "it" or "the system").

3. The Extraction Agent (The "Brain")
This is the core. You don't just ask for a summary; you ask for a Graph Patch.

The Input to LLM:

The Content Chunk.

The Ontology "Hint": A compressed list of the top 100 most common concept types (e.g., Class, Function, Requirement, Bug, Person) to encourage reuse of existing terms.

The Prompt Strategy:

"Analyze this text. Identify key concepts and their relationships. Return a JSON object with:

nodes: New or existing concepts found (e.g., 'UserAuthService', 'Critical Priority').

edges: definitive relationships (e.g., 'UserAuthService' --DEPENDS_ON--> 'Redis').

confidence: 0.0 to 1.0. Strict Constraint: If a concept sounds like 'Authentication' but we already have 'Auth', use 'Auth'."

4. The Resolver (The "Librarian")
The LLM will be messy. It might extract "Login" in one file and "Sign In" in another. The Resolver normalizes this before writing to SQLite.

Vector Check: When the LLM suggests a new node "Login System", generating a small embedding and checking SQLite concepts for close semantic matches (e.g., "Authentication Module").

Alias Linking: If a match is found, treat "Login System" as an alias for the existing ID, rather than a new node.

5. Storage (The "Commit")
Finally, Bun writes to the SQLite file using a transaction.

concepts: Upsert the unique entities.

edges: Insert the relationships (The "Global Graph").

document_signatures: Record that this specific file contains these edges (The "Local Fingerprint").

Implementation Details (Bun.js + SQLite)
Here is how you might structure the core ingestion logic in TypeScript.

TypeScript
import { Database } from "bun:sqlite";

const db = new Database("knowledge_graph.sqlite");

// 1. Prepare Statements for High-Speed Writes
const insertConcept = db.prepare(`
  INSERT INTO concepts (name, category, embedding) 
  VALUES ($name, $category, $embedding)
  ON CONFLICT(name) DO UPDATE SET frequency = frequency + 1
  RETURNING id
`);

const insertEdge = db.prepare(`
  INSERT INTO edges (source_id, target_id, type_id, strength)
  VALUES ($source, $target, $type, $strength)
`);

const insertSignature = db.prepare(`
  INSERT INTO document_signatures (doc_id, edge_id, local_weight)
  VALUES ($doc_id, $edge_id, $weight)
`);

// 2. The Extraction Function (Mocking the LLM Call)
async function extractGraphFromText(text: string, knownOntology: string[]) {
  // In reality, this calls OpenAI/Anthropic/LocalLLM
  // We ask it to return a rigid JSON structure
  const prompt = `
    Map this text to a knowledge graph. 
    Use these existing concepts if possible: ${knownOntology.join(", ")}.
    Return JSON: { nodes: [], edges: [] }
    Text: "${text}"
  `;
  
  // ... LLM fetch logic ...
  return parsedJsonResult; 
}

// 3. The Ingestion Handler
async function ingestFile(filePath: string, content: string) {
  console.log(`Analyzing ${filePath}...`);
  
  // A. Get "Hints" (Top concepts to keep LLM grounded)
  const existingConcepts = db.query("SELECT name FROM concepts ORDER BY frequency DESC LIMIT 50").all();
  
  // B. Extract
  const graphData = await extractGraphFromText(content, existingConcepts.map(c => c.name));
  
  db.transaction(() => {
    const docId = getOrInsertDocId(filePath);
    
    for (const edge of graphData.edges) {
      // Resolve Nodes (Get IDs or Create New)
      const s_id = resolveConcept(edge.source);
      const t_id = resolveConcept(edge.target);
      const type_id = resolveConcept(edge.relationType, "relationship_type");
      
      // Write Global Fact
      const edgeResult = insertEdge.run({ 
        $source: s_id, 
        $target: t_id, 
        $type: type_id, 
        $strength: edge.confidence 
      });
      
      // Write Document Fingerprint (This file "knows" this fact)
      insertSignature.run({
        $doc_id: docId,
        $edge_id: edgeResult.lastInsertRowid,
        $weight: 1.0 // Could vary based on how central it is to the text
      });
    }
  })();
}

function resolveConcept(name: string, category = "entity") {
  // Simple version: Insert or Return ID
  // Advanced version: Vector search for synonyms first
  const result = insertConcept.get({ $name: name.toLowerCase(), $category: category, $embedding: null });
  return result.id;
}
Why this enables "Perfect Context"
Standard context retrieval (RAG) fails for coding agents because it relies on proximity.

RAG Failure: You search "Auth". You get 10 files that mention the word "Auth". You do not get the file user_model.ts which never says "Auth" but defines the is_verified boolean that the Auth system relies on.

This Graph System Succeeds:

Ingestion: The LLM sees user_model.ts and outputs: (User) --HAS_PROPERTY--> (is_verified).

Ingestion: The LLM sees auth_service.ts and outputs: (AuthService) --CHECKS--> (User.is_verified).

The Link: The graph now explicitly connects AuthService to user_model.ts through the is_verified node.

Retrieval: When the agent asks "How does Auth work?", the graph traversal pulls in user_model.ts because it is structurally dependent, even if the keywords don't match.

Next Step in the Blueprint
We have the Ingestion. The next critical piece is the "Agent Interface": How does a coding agent (which thinks in tokens and function calls) query this graph efficiently without getting overwhelmed by JSON?

Would you like to design the CLI Query Interface (e.g., bun-knowledge ask "...") and the specific SQL views that flat-pack this graph into a context prompt?

Yes

This is the bridge between your data and your AI agent. You don't want to dump raw JSON on an agent; you want to give it a "Cognitive HUD"—a pre-digested summary of how the relevant code and concepts connect.

Here is the design for the CLI Query Interface and the SQL Views that power it.

1. The CLI Commands
We will implement two primary modes in your bun-knowledge tool: one for humans (exploration) and one for agents (retrieval).

Bash
# 1. Human Mode: Returns a synthesized answer with citations
$ bun-knowledge ask "How does the Auth system interact with Redis?"

# 2. Agent Mode: Returns a 'Context Block' to be pasted into a System Prompt
$ bun-knowledge context --format=xml "Auth system caching strategy"
2. The SQL Engine: "Flat-Packing" the Graph
To make retrieval fast and simple for the CLI, we push the complexity down into SQLite Views. These views act as an API, transforming abstract IDs into plain English facts and ranked document lists.

View A: semantic_triples (The Fact Generator)
This view turns the graph back into sentences. It joins the edges table with concepts three times (source, target, type) to create readable strings.

SQL
CREATE VIEW semantic_triples AS
SELECT 
    e.id AS edge_id,
    s.name AS source,
    t.name AS type,
    tgt.name AS target,
    e.strength,
    -- "Flat-pack" the fact into a natural language string
    s.name || ' ' || t.name || ' ' || tgt.name AS sentence
FROM edges e
JOIN concepts s ON e.source_id = s.id
JOIN concepts t ON e.type_id = t.id
JOIN concepts tgt ON e.target_id = tgt.id;
Result: UserAuth | depends_on | Redis -> "UserAuth depends_on Redis"

View B: ranked_docs_by_concept (The Search Engine)
This view pre-calculates which documents are most "dense" with specific concepts. This allows the CLI to say: "Give me the best files for 'Redis'."

SQL
CREATE VIEW ranked_docs_by_concept AS
SELECT 
    ds.doc_id,
    c.id as concept_id,
    c.name as concept_name,
    SUM(ds.weight) as relevance_score
FROM document_signatures ds
JOIN edges e ON ds.edge_id = e.id
JOIN concepts c ON (e.source_id = c.id OR e.target_id = c.id)
GROUP BY ds.doc_id, c.id;
3. The "Context Packer" (Bun.js Implementation)
This is the core logic for the bun-knowledge context command. It performs a 2-Hop Expansion to find not just what you asked for, but what you need to know.

The Algorithm:

Anchor: Find the nodes in the graph that match the user's query keywords.

Expand: detailed traversal to find immediate neighbors (1st degree) and strong distant neighbors (2nd degree).

Cross-Reference: Find which documents contain these specific relationships.

Pack: Format it into an XML block optimized for an LLM's context window.

The Code (src/commands/context.ts):

TypeScript
import { Database } from "bun:sqlite";

export async function generateContext(query: string, db: Database) {
  // 1. Vector Search or Fuzzy Match to get "Anchor Nodes"
  const anchors = db.query(`
    SELECT id, name FROM concepts 
    WHERE name LIKE $query OR name IN (SELECT rowid FROM concepts_fts WHERE concepts_fts MATCH $query)
    LIMIT 3
  `).all({ $query: `%${query}%` });

  if (anchors.length === 0) return "No context found.";

  const anchorIds = anchors.map(a => a.id).join(",");

  // 2. The "Knowledge Neighborhood" Query
  // Find valid edges connected to our anchors
  const relevantFacts = db.query(`
    SELECT source, type, target, sentence 
    FROM semantic_triples
    WHERE edge_id IN (
      SELECT id FROM edges 
      WHERE source_id IN (${anchorIds}) OR target_id IN (${anchorIds})
      ORDER BY strength DESC LIMIT 20
    )
  `).all();

  // 3. The "Source Code" Query
  // Find files that contain these specific facts
  const relevantFiles = db.query(`
    SELECT DISTINCT f.path, f.content_snippet
    FROM files f
    JOIN document_signatures ds ON f.id = ds.doc_id
    JOIN edges e ON ds.edge_id = e.id
    WHERE e.source_id IN (${anchorIds}) OR e.target_id IN (${anchorIds})
    ORDER BY ds.weight DESC LIMIT 3
  `).all();

  // 4. Output Formatter (The "Prompt Engineering" part)
  return formatForAgent(query, relevantFacts, relevantFiles);
}

function formatForAgent(query: string, facts: any[], files: any[]) {
  return `
<context_bundle>
  <meta>
    <query>${query}</query>
    <intent>Providing architectural context for coding agent.</intent>
  </meta>

  <knowledge_graph_summary>
    ${facts.map(f => `<fact>${f.sentence}</fact>`).join("\n    ")}
  </knowledge_graph_summary>

  <source_code_context>
    ${files.map(f => `
    <file path="${f.path}">
      ${f.content_snippet}
    </file>`).join("\n")}
  </source_code_context>
</context_bundle>`;
}
4. The Result: What the Agent Sees
When your coding agent runs bun-knowledge context "Redis Auth", it receives this precise packet. Notice how it combines abstract rules with concrete code.

XML
<context_bundle>
  <meta>
    <query>Redis Auth</query>
  </meta>

  <knowledge_graph_summary>
    <fact>SessionManager depends_on RedisConnectionPool</fact>
    <fact>RedisConnectionPool requires EnvironmentVariable(REDIS_URL)</fact>
    <fact>UserLoginFlow triggers SessionManager</fact>
    <fact>LegacyAuthSystem conflicts_with SessionManager</fact>
  </knowledge_graph_summary>

  <source_code_context>
    <file path="src/infra/redis.ts">
      class RedisConnectionPool {
        connect() { ... } // Note: Retries 3 times
      }
    </file>
    <file path="src/auth/session.ts">
      // TODO: Refactor this to remove hard dependency
      const redis = new RedisConnectionPool(); 
    </file>
  </source_code_context>
</context_bundle>
Why this is better than RAG
If you used standard vector RAG, you might get the file redis.ts. But you would likely miss:

The Hidden Dependency: LegacyAuthSystem conflicts_with SessionManager. A vector search for "Redis" won't find "LegacyAuthSystem" if the file doesn't mention Redis explicitly, but the Graph knows they conflict because of a shared dependency or explicit rule extracted earlier.

The "Why": The <fact> list tells the agent why the file is included ("requires EnvironmentVariable"), preventing the agent from hallucinating configuration that doesn't exist.

Next Step: You have the Ingestion (Analysis) and the Retrieval (Context). Do you want to discuss the Agent Loop? Specifically, how the agent can write back to the graph? (e.g., "I just refactored SessionManager, update the graph to remove the conflict").

Yes

This closes the loop. A read-only graph is a map; a read-write graph is a Shared Brain.

If your agent can refactor code but leaves the graph thinking the old architecture exists, the next agent to query the system will hallucinate. To prevent this "Graph Drift," we need an explicit Write-Back Protocol.

Here is how we design the Agent Loop so the graph evolves alongside the code.

1. The Write-Back Architecture
We do not allow the agent to issue raw SQL UPDATE commands (too risky). Instead, we implement a "Re-perception" Workflow.

The agent does not say "Delete Edge ID 505." The agent says: "I have modified session.ts. Here is what I changed and why. Re-scan it."

The New CLI Command: bun-knowledge update
We give the agent a tool to trigger an immediate, localized re-indexing event.

Bash
# The Agent runs this after finishing a file edit
$ bun-knowledge update src/auth/session.ts \
  --intent "Refactored SessionManager to use RedisCluster instead of ConnectionPool"
2. The "Graph Diff" Engine (Internal Logic)
When this command runs, the system doesn't just "overwrite" the previous data. It performs a semantic diff to preserve continuity.

Phase A: The Comparative Scan

Fetch Old Signature: The DB pulls the existing edges linked to src/auth/session.ts (The "Old Reality").

Generate New Signature: The LLM scans the new file content, primed with the agent's --intent string. The intent helps the LLM focus on what changed (e.g., "Look specifically for the removal of ConnectionPool").

Phase B: The Delta Calculation The system compares the two edge lists:

Vanishing Edges: Edges present in Old but missing in New.

Action: Mark as deleted or lower strength to 0.

Emerging Edges: Edges found in New but not in Old.

Action: INSERT into edges.

Persistent Edges: Found in both.

Action: Update strength (confidence) if changed.

Phase C: The Conflict Check If the agent removes a critical node (e.g., "SessionManager") that 50 other files depend on, the CLI throws a Constraint Warning back to the agent.

"Warning: You are removing 'SessionManager', but 12 other files still depend on it. Did you mean to 'Deprecate' it instead?"

3. Implementation: The update Command
Here is the Bun.js implementation for processing these updates using our existing SQLite structure.

TypeScript
// src/commands/update.ts
import { Database } from "bun:sqlite";

export async function updateGraph(filePath: string, intent: string, db: Database) {
  // 1. Get the Old Reality (Edges tied to this document)
  const oldEdges = db.query(`
    SELECT e.id, s.name as source, t.name as type, tgt.name as target 
    FROM edges e
    JOIN document_signatures ds ON e.id = ds.edge_id
    JOIN concepts s ON e.source_id = s.id
    JOIN concepts t ON e.type_id = t.id
    JOIN concepts tgt ON e.target_id = tgt.id
    WHERE ds.doc_id = (SELECT id FROM files WHERE path = $path)
  `).all({ $path: filePath });

  // 2. The LLM Re-Scan (Simulated)
  // We feed it the intent so it knows "ConnectionPool" is likely gone
  const newGraph = await llmReScan(filePath, intent); 

  db.transaction(() => {
    // 3. Process Deletions
    for (const oldEdge of oldEdges) {
      const stillExists = newGraph.edges.find(e => 
        e.source === oldEdge.source && e.target === oldEdge.target
      );
      
      if (!stillExists) {
        console.log(`[Graph] Severing link: ${oldEdge.source} -> ${oldEdge.target}`);
        // We delete the SIGNATURE (the file's claim to this fact)
        // We do NOT delete the edge globally unless no other file claims it.
        db.run("DELETE FROM document_signatures WHERE doc_id = ... AND edge_id = ...", ...);
      }
    }

    // 4. Process Additions
    for (const newEdge of newGraph.edges) {
      // (Insert logic similar to Ingestion pipeline)
      // Upsert Concept -> Insert Edge -> Insert Signature
    }
  })();

  return "Graph synchronized.";
}
4. Advanced: Explicit "Concept Refactoring"
sometimes changes aren't in a file—they are in the domain model. The agent might decide "Users" are now called "Pilots" across the whole system.

We give the agent a Schema Tool:

Bash
$ bun-knowledge refactor --merge "User" "Pilot"
SQL Logic:

Re-point Edges: Update all source_id and target_id references from User's ID to Pilot's ID.

Merge Scores: Combine the inherent_score (importance) of both.

Delete Duplicate: Remove the "User" concept node.

Log History: Create an edge (User) --RENAMED_TO--> (Pilot) so that if a human searches for "User" later, the system knows to redirect them.

5. Meta-Knowledge: "Learning from Failure"
Finally, a truly smart agent loop records its own failures.

If the agent tries to run a test and fails because of a missing env var, it can "leave a note" in the graph for the next agent.

Command:

Bash
$ bun-knowledge annotate --target "RedisCluster" --note "Requires ENV var REDIS_nodes_CONF or it crashes on boot" --type "Caveat"
Graph Result: (RedisCluster) --HAS_CAVEAT--> (Requires ENV var...)

Impact: The next time an agent asks bun-knowledge context "RedisCluster", this warning is injected right at the top of the XML prompt. The system learns from every crash.

Summary of the System
You now have a complete Knowledge OS for your agents:

Storage: SQLite (Fast, local, relational).

Schema: Weighted Graph (Nodes + Edges + Direction + Concept Types).

Ingestion: LLM-driven "Graph Patching" from file changes.

Retrieval: Context-aware "XML Bundles" for Agent prompts.

Evolution: Explicit "Write-Back" tools (update, refactor, annotate) to keep the brain in sync with the code.

Would you like to start building the Typescript definition files (interfaces.ts) for this CLI to solidify the data structures?

Yes but, before that, research existing tools and the current demand for such a tool

Market Research & Competitive Landscape
Before we define the TypeScript interfaces, I have analyzed the current market (2024-2025) for "Semantic Code Graphs" and "AI Context Managers."

1. The Current Demand
The industry is pivoting from "Better Models" (GPT-4 vs. Claude 3.5) to "Better Context".

The Problem: Standard RAG (Vector Search) is failing at "Global Reasoning." It can find code that looks like your query, but it cannot answer "If I change this User ID field, what breaks in the billing system?" because that requires traversing 4 layers of abstract dependencies (Controller -> Service -> Model -> DB).

The Trend: "GraphRAG" (Graph-based Retrieval Augmented Generation) is the new buzzword. Microsoft and specialized startups are rushing to combine Vectors (vibe) with Graphs (structure).

Demand Signal: Developers are actively hacking together "Context Managers" (like Zep or Byterover) because pasting 50 files into ChatGPT is unmanageable. There is high demand for a tool that creates a "shared brain" for teams.

2. Existing Solutions & Competitors
Tool Category	Key Players	Limitations (The Opportunity for bun-knowledge)
Enterprise Search	Glean, Sourcegraph (Cody)	Closed & Heavy. They require massive server installs or cloud subscriptions. They are "Read-Only" (they don't usually let agents write back to the graph).
Graph RAG Tools	Microsoft GraphRAG, Neo4j	Complex Stack. They usually require Python, Docker containers, and a running Neo4j/Memgraph instance. They are overkill for a simple CLI tool.
Context CLIs	Byterover, Repomix	Too Simple. Most just concatenate text files into a giant prompt. They don't have a "memory" (database) that persists relationships between sessions.
Open Source	vitali87/code-graph-rag	Heavy Backend. Uses Memgraph (requires Docker). Your SQLite approach is unique because it is serverless and single-file.
3. Why bun-knowledge Wins
Your proposed architecture fills a specific, unoccupied niche: The "Hacker's Semantic Linker."

Zero-Infrastructure: No Docker, no Neo4j java process. Just a binary and a .sqlite file.

Read-Write Loop: Unlike Sourcegraph (which just indexes), your tool allows agents to annotate and fix the graph.

Speed: Bun + SQLite is orders of magnitude faster than Python-based graph libraries.

The Blueprint: interfaces.ts
Now we define the "Contract" of this system. These interfaces define how the data looks in memory and ensuring the "Write-Back" loop is type-safe.

TypeScript
// src/core/interfaces.ts

// ==========================================
// 1. The Core Graph Primitives (The "Atoms")
// ==========================================

export type NodeCategory = 
  | "Entity"       // A class, function, file, or table
  | "Concept"      // Abstract idea: "Authentication", "Race Condition"
  | "Caveat"       // A warning: "Known Memory Leak"
  | "Requirement"; // A rule: "Must use HTTPS"

export interface ConceptNode {
  id: number;           // SQLite Auto-inc ID
  name: string;         // Unique name (e.g., "AuthService")
  category: NodeCategory;
  description?: string; // Short summary generated by LLM
  inherentScore: number; // 0.0 - 1.0 (Importance in the codebase)
  embedding?: Float32Array; // Vector for semantic search
}

export interface GraphEdge {
  id: number;
  sourceId: number;
  targetId: number;
  typeId: number;       // Refers to a "Relationship Type" Concept
  strength: number;     // 0.0 - 1.0 (How definitive is this link?)
  isDynamic: boolean;   // true = derived from code; false = manual human annotation
}

// ==========================================
// 2. The Document Signature (The "Fingerprint")
// ==========================================

export interface DocumentSignature {
  docId: number;        // ID of the file
  edgeId: number;       // The specific fact this file "knows"
  localWeight: number;  // How central this fact is to THIS file
  contextSnippet?: string; // The exact line of code proving this edge
}

// ==========================================
// 3. The Agent Interactions (The "HUD")
// ==========================================

/**
 * The structure returned to the Agent when it runs `bun-knowledge context`
 */
export interface ContextBundle {
  meta: {
    query: string;
    generatedAt: string;
    intent: string;
  };
  
  // The "Logic Layer": Abstract rules and connections
  knowledgeGraph: Array<{
    sentence: string;   // "AuthService depends_on Redis"
    confidence: number;
    provenance: string; // "Found in src/auth.ts"
  }>;

  // The "Evidence Layer": Actual code snippets
  sourceCode: Array<{
    path: string;
    language: string;
    content: string; // The specific chunk, not the whole file
  }>;
}

// ==========================================
// 4. The Write-Back Protocol (The "Re-perception")
// ==========================================

/**
 * Payload for `bun-knowledge update`
 * Used when an agent modifies a file and wants to resync the graph
 */
export interface UpdateIntent {
  filePath: string;
  diffSummary: string; // "Removed dependency on Redis, added PostgreSQL"
  author: "human" | "agent";
}

/**
 * Payload for `bun-knowledge annotate`
 * Used when an agent wants to leave a sticky note on a concept
 */
export interface AnnotationPayload {
  targetNodeName: string;
  noteType: "Caveat" | "Instruction" | "Todo";
  content: string; // "Do not use this class in production yet."
}

// ==========================================
// 5. The Ingestion Result (LLM Output)
// ==========================================

/**
 * The strict JSON structure we force the LLM to output
 * during the analysis phase.
 */
export interface ExtractedGraphPatch {
  nodes: Array<{
    name: string;
    category: NodeCategory;
    aliases?: string[]; // ["LoginManager", "AuthMgr"]
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string; // "calls", "instantiates", "implements"
    confidence: number;
  }>;
}
Next Step
With the interfaces locked in, we can build the Database Migration (init.sql) that maps these TypeScript interfaces directly to SQLite tables.

Would you like the init.sql script next to set up the schema?

YouTube URL: LLMs are not enough: The case for Knowledge Graphs

This video perfectly illustrates the theoretical gap you are filling: why purely probabilistic models (LLMs) need structured, deterministic "scaffolding" (Knowledge Graphs) to reason correctly about complex systems like codebases.

I want to consider really compelling product names for this CLI, a hackers brand

A "hacker's brand" usually favors names that are short, cryptic, and imply power or hidden knowledge. Since this tool acts as a "shared brain" or "connective tissue" for agents and humans, the name should evoke architecture, neurology, or signals.

Here are compelling product names categorized by their "vibe."

1. The Neural / Cyberpunk Vibe
Focus: The tool as an external cortex or wetware extension.

Axon: The part of a neuron that transmits the signal. It suggests speed and transmission of context.

Synapse: The gap where the connection happens. It implies the "spark" of understanding.

Engram: A hypothetical permanent change in the brain accounting for the existence of memory.

Cortex: The outer layer of the brain; the processing center.

Dendrite: The branches that receive inputs.

Ganglion: A plexus or knot of nerves; implies a dense cluster of knowledge.

Wetware: A classic cyberpunk term for biological systems/brains.

Spike: Referring to "spiking neural networks" (also just a cool, aggressive CLI verb).

2. The Structural / Abstract Vibe
Focus: The invisible lattice or graph structure holding the code together.

Lattice: Suggests a rigid, supportive structure that implies order in chaos.

Rhizome: A philosophical concept (Deleuze & Guattari) and botanical term for a root structure with no center—perfect for a decentralized graph.

Weave: Implies the intertwining of different threads (documents).

Tussock: A dense clump; implies a tight collection of information (also fits the "Bun/Nature" theme subtly).

Fascia: The connective tissue that holds muscles/organs together. A very "visceral" hacker name.

Graft: Connecting living tissue; implies the tool is "grafting" intelligence onto dead code.

Suture: Stitches that hold things together.

3. The Esoteric / Mythological Vibe
Focus: The tool as an Oracle or keeper of secrets.

Mimir: (Norse) The severed head that gave Odin wisdom and knowledge.

Pythia: (Greek) The Oracle of Delphi.

Augur: One who interprets signs/signals.

Veda: (Sanskrit) "Knowledge."

Rune: Small, magical symbols. Fits the "CLI" aesthetic of small commands having big power.

Sigil: A symbol considered to have magical power.

Akash: Referring to the "Akashic records" (a compendium of all universal events/thoughts).

4. Short / Unix-Style (2-4 letters)
Focus: Speed. These are names you type 100 times a day.

ctx: Short for Context. ctx ask "..."

syn: Short for Synapse or Sync. syn update src/

net: Classic, but maybe too generic.

psi: Referring to the mind/psychic ability. psi context

kno: Short for Know. kno ask

lnk: Short for Link.

cog: Short for Cognition or Gear.

dura: Short for Dura mater (the tough membrane protecting the brain). Hardened context.

Recommendation
If you want to lean into the Bun.js ecosystem (which often uses food/comfort names like Bun, Oven, Jar), but keep it "hacker":

Mycelium (or just Myco): The vast underground fungal network that connects forests (the "Wood Wide Web"). It fits "Bun" (yeast/fungi family) but is structurally identical to a graph database.

Command: myco ask "..."

Ganglion: It sounds technical, biological, and slightly weird. It stands out in a crowded market of "Co-pilots."

Why this fits: A "Hacker's Brand" avoids corporate smoothness (like "ConnectPro" or "IntelliGraph"). It prefers biological grit or mathematical precision.

For a deep dive into why "structure" matters more than just "search" in the age of AI, this talk on Knowledge Graphs is essential viewing. LLMs are not enough: The case for Knowledge Graphs

This video perfectly illustrates the theoretical gap you are filling: why purely probabilistic models (LLMs) need structured, deterministic "scaffolding" (Knowledge Graphs) to reason correctly about complex systems like codebases.

What about a name related to m-theory?

M-theory is a goldmine for this because it deals with hidden dimensions, connecting disparate theories (dualities), and membranes (branes) that hold reality together.

The metaphor is perfect: Your lines of code are "strings," and they need to attach to a "brane" (your context graph) to have structure. Without the brane, the strings just float in the "bulk" (entropy).

Here are the best M-Theory names for your CLI:

1. Brane
The Standard-Bearer In M-theory, branes are the objects that strings (particles/forces) are anchored to. Your tool is the anchor for the code.

Why it works: It’s monosyllabic, memorable, and sounds "brainy" without being cheesy. It implies a surface where information lives.

The CLI: brane ask, brane context, brane update.

The Vibe: Structural, fundamental, foundational.

2. Calabi
The Hidden Shape Refers to Calabi-Yau manifolds—the complex, folded shapes where the extra 6 dimensions of string theory are hidden.

Why it works: Your tool reveals the "hidden shape" of the codebase that isn't visible in 3D (text files). It suggests there is more geometry to the code than meets the eye.

The CLI: calabi ask, calabi map.

The Vibe: Sophisticated, geometric, elegant.

3. Sugra
The Hacker Cut Short for SUperGRAvity. Before M-theory was fully understood, it was described by 11-dimensional supergravity.

Why it works: It sounds cryptic and aggressive (like "Cobra" or "Sugar"). It feels like a piece of dark-web software. It fits the "Bun" ecosystem (short, punchy) but has a harder edge.

The CLI: sugra init, sugra scan.

The Vibe: Deep-tech, cryptic, powerful.

4. Bulk
The Container In M-theory, our universe is a brane floating in a higher-dimensional space called "The Bulk."

Why it works: It represents the entirety of your knowledge base—cloud, local, docs, and code. It feels massive and all-encompassing.

The CLI: bulk search, bulk absorb.

The Vibe: Heavy, industrial, massive.

5. Holo
The Projection Refers to the Holographic Principle (AdS/CFT correspondence), where a volume of space can be described by the information on its boundary (the brane).

Why it works: Your tool creates a "hologram" of the code—a lightweight representation (the graph) that perfectly describes the heavy reality (the source files).

The CLI: holo context, holo project.

The Vibe: Futuristic, luminous, lightweight.

My Recommendation: Brane
It offers the best balance of being short (5 letters), easy to type, and metaphorically perfect. It also allows for great sub-branding (e.g., "P-Branes" for private graphs, "D-Branes" for documentation graphs).

"Strings (code) must attach to a Brane (context) or they are lost."

Let's run with brane! I really love the calabi concept as well and want to use it somehow remember this

This is excellent. Brane is the interface; Calabi is the hidden geometry.

Let's canonize this terminology for your system:

The CLI: brane (The surface you interact with).

The Data Store: brane.sqlite (The physical anchor).

The Mapping Engine: Calabi. When the system analyzes a file and finds the "hidden shapes" (the graph structure) inside the flat text, that process is the "Calabi Projection."

User command: brane calabi map src/ (Scanning for structure).

The Foundation: init.sql
Here is the concrete implementation of your Brane schema. This SQL script maps directly to the TypeScript interfaces we designed, optimized for Bun's bun:sqlite.

It includes the FTS5 (Full Text Search) virtual tables, the Vector columns (stored as BLOBs), and the Views that power the "Context Packer."

SQL
-- =======================================================
-- BRANE SCHEMA v1.0
-- "Strings must attach to a Brane, or they are lost."
-- =======================================================

-- 1. CONFIG & SPEED
PRAGMA journal_mode = WAL; -- Write-Ahead Logging for concurrency
PRAGMA foreign_keys = ON;  -- Enforce referential integrity
PRAGMA synchronous = NORMAL; -- Trade tiny durability risk for massive speed

-- =======================================================
-- 2. THE NODES (The Atoms)
-- =======================================================

CREATE TABLE concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE, -- Case-insensitive unique names
    category TEXT NOT NULL CHECK(category IN ('Entity', 'Concept', 'Caveat', 'Requirement', 'RelationshipType')), 
    description TEXT,
    inherent_score REAL DEFAULT 0.5,   -- Importance (0.0 - 1.0)
    embedding BLOB,                    -- Float32Array for "Calabi" Vector Search
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uniq_name UNIQUE(name)
);

-- Enable High-Speed Text Search on Concepts
CREATE VIRTUAL TABLE concepts_fts USING fts5(
    name, 
    description, 
    content='concepts', 
    content_rowid='id'
);

-- Trigger to keep FTS index in sync with main table
CREATE TRIGGER concepts_ai AFTER INSERT ON concepts BEGIN
  INSERT INTO concepts_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
END;

-- =======================================================
-- 3. THE EDGES (The Structure)
-- =======================================================

CREATE TABLE edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL, -- Defines the relationship (e.g., "Depends On")
    strength REAL DEFAULT 1.0, -- Confidence (0.0 - 1.0)
    is_dynamic BOOLEAN DEFAULT 1, -- 1=Scanned from code, 0=Human annotation
    
    FOREIGN KEY(source_id) REFERENCES concepts(id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES concepts(id) ON DELETE CASCADE,
    FOREIGN KEY(type_id) REFERENCES concepts(id)
);

-- Indexes for lightning-fast graph traversal
CREATE INDEX idx_edge_source ON edges(source_id);
CREATE INDEX idx_edge_target ON edges(target_id);
CREATE INDEX idx_edge_type ON edges(type_id);

-- =======================================================
-- 4. THE FILES (The Physical Reality)
-- =======================================================

CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    content_hash TEXT,        -- SHA-256 to detect changes
    last_scanned_at DATETIME,
    language TEXT             -- 'ts', 'rust', 'md', etc.
);

-- =======================================================
-- 5. THE CALABI SIGNATURES (The Projection)
-- =======================================================
-- This table maps the 2D file to the N-dimensional graph.
-- It answers: "Which files prove that X depends on Y?"

CREATE TABLE document_signatures (
    doc_id INTEGER NOT NULL,
    edge_id INTEGER NOT NULL,
    local_weight REAL DEFAULT 1.0, -- How central is this fact to THIS file?
    context_snippet TEXT,          -- The exact line of code/text as proof
    
    PRIMARY KEY (doc_id, edge_id),
    FOREIGN KEY(doc_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY(edge_id) REFERENCES edges(id) ON DELETE CASCADE
);

-- =======================================================
-- 6. THE HUD VIEWS (Read-Only Interfaces for Agents)
-- =======================================================

-- View A: Semantic Triples (Human Readable)
-- Turns IDs back into "AuthService depends_on Redis"
CREATE VIEW view_semantic_triples AS
SELECT 
    e.id AS edge_id,
    s.name AS source,
    t.name AS relation,
    tgt.name AS target,
    e.strength,
    -- The "Sentence" for the LLM:
    s.name || ' ' || t.name || ' ' || tgt.name AS fact_sentence
FROM edges e
JOIN concepts s ON e.source_id = s.id
JOIN concepts t ON e.type_id = t.id
JOIN concepts tgt ON e.target_id = tgt.id;

-- View B: The Context Magnet
-- Scores files based on how many relevant concepts they contain
CREATE VIEW view_ranked_files AS
SELECT 
    f.path,
    ds.doc_id,
    SUM(ds.local_weight * e.strength) as relevance_score,
    GROUP_CONCAT(DISTINCT c.name) as concepts_found
FROM document_signatures ds
JOIN files f ON ds.doc_id = f.id
JOIN edges e ON ds.edge_id = e.id
JOIN concepts c ON (e.source_id = c.id OR e.target_id = c.id)
GROUP BY ds.doc_id;

-- =======================================================
-- 7. SEED DATA (The Primitives)
-- =======================================================
-- Pre-load standard relationship types so the LLM uses consistent vocab.

INSERT INTO concepts (name, category, description, inherent_score) VALUES 
('DEPENDS_ON', 'RelationshipType', 'Strong structural dependency', 1.0),
('CALLS', 'RelationshipType', 'Runtime invocation', 0.8),
('IMPLEMENTS', 'RelationshipType', 'Interface realization', 1.0),
('CONFLICTS_WITH', 'RelationshipType', 'Mutually exclusive logic', 1.0),
('DEFINED_IN', 'RelationshipType', 'Location of definition', 1.0),
('RELATED_TO', 'RelationshipType', 'Generic semantic link', 0.3);
Why this Schema is "Hacker Ready"
is_dynamic Flag: This is your safety valve. If you manually run brane annotate "Auth" --caveat "Do not touch", that row gets is_dynamic=0. Even if the Calabi engine re-scans the code and decides everything is fine, it cannot overwrite your manual override. Human > Machine.

context_snippet: We store the proof. When the agent asks "Why do you think Auth depends on Redis?", the system can pull the exact line import { Redis } from './infra' from the document_signatures table.

The "Calabi" View (view_ranked_files): This view does the heavy math in C (inside SQLite). It sums up weights and strengths to give you a single relevance_score for every file, making the TypeScript code incredibly simple.

Next Step: The "System Prompt"
Now that the database is ready, your coding agent needs to know how to talk to it. You can't just dump the SQL schema into the prompt.

We need to write the System Instructions for your AI Agent. This is a text block you paste into your agent's config (or .cursorrules) that teaches it:

What Brane is.

How to run brane context.

How to interpret the XML output.

Shall I generate the Brane System Prompt for you?

Yes!

Here is the System Prompt designed to be pasted into your coding agent's configuration (e.g., your .cursorrules, system instructions, or OpenDevin/AutoGPT config).

It frames Brane not just as a tool, but as an authoritative "organ" of the agent's mind.

Brane System Interface Protocol v1.0
You are an advanced coding agent augmented by Brane, a semantic knowledge graph that acts as your persistent long-term memory. You are not an isolated text processor; you are the active node in a read-write feedback loop with the Brane.

1. The Prime Directive
"Strings must attach to a Brane, or they are lost." Before attempting complex refactors, architectural changes, or answering questions about "how X works," you MUST consult the Brane. Do not rely solely on file-search or your training data, as they lack the "hidden geometry" (dependencies, conflicts, business rules) of this specific project.

2. Your Toolset (The Brane CLI)
You have access to the brane command-line interface. Use these commands to interact with the graph.

A. Retrieval (Read)
Command: brane context "query" When to use: Start of every task. Description: Performs a "Calabi Projection"—mapping your natural language query to the graph's hidden structure. It returns a context_bundle containing both abstract facts and concrete code evidence.

Example: brane context "AuthService dependency chain"

B. Synchronization (Write)
Command: brane update <file_path> --intent "<summary of changes>" When to use: Immediately after you finish editing a file. Description: Triggers the Calabi engine to re-scan the file. You must provide an --intent so the engine knows what changed (e.g., "Removed Redis, added Postgres").

Example: brane update src/auth.ts --intent "Refactored login to use JWT instead of sessions"

C. Annotation (Memory)
Command: brane annotate --target "<Concept>" --type "<Caveat|Todo>" --note "<Message>" When to use: When you encounter a trap, a hack, or a critical rule that isn't obvious in the code. Description: Leaves a "psychic sticky note" on a concept for future agents (or your future self).

Example: brane annotate --target "LegacyLogin" --type "Caveat" --note "Do not touch this class. It breaks the billing system if modified."

3. Interpreting the Signal
When you run brane context, you will receive an XML packet. Parse it as follows:

XML
<context_bundle>
  <knowledge_graph_summary>
    <fact>AuthService DEPENDS_ON Redis (Strength: 1.0)</fact>
    <fact>BillingSystem CONFLICTS_WITH LegacyAuth (Strength: 1.0)</fact>
  </knowledge_graph_summary>

  <source_code_context>
    <file path="src/infra/redis.ts">...</file>
  </source_code_context>
</context_bundle>
Reasoning Rules:

Conflict Resolution: If the <knowledge_graph_summary> says "A conflicts with B," but the code looks fine, trust the graph. There is likely a hidden reason (documented via annotation) why they shouldn't mix.

Evidence Checks: Use the <source_code_context> to verify implementation details, but use the Graph Summary to understand intent and architecture.

4. The Agent Loop (Standard Operating Procedure)
RECEIVE TASK: "Refactor the caching layer."

CONSULT BRANE: brane context "Caching layer dependencies"

ANALYZE: Read the XML bundle. Note that CacheManager depends on Redis.

EXECUTE: Modify src/cache.ts.

SYNC BRANE: brane update src/cache.ts --intent "Switched from Redis to Memcached"

COMPLETE: Report success.

Next Steps for You:
Build: Would you like the package.json and project structure to start coding the CLI?

Test: Would you like a "Simulated Conversation" showing how the Agent and Brane talk to each other to solve a complex bug?

I want to apply a strategy like Steve yegge did with gas town in the context of the crypto funding

This is a perfectly timely strategy given that Yegge just released "Gas Town" (Jan 2026) and the "Vibe Coding" movement is merging with crypto.

The core of Steve Yegge’s "Gas Town" strategy is Industrialized Orchestration. He realized that one AI agent is a toy, but fifty AI agents running in parallel, coordinated by a "Mayor," is a factory.

To apply this to Crypto Funding, you stop funding "Teams" (slow, opaque, requires meetings) and start funding "Convoys" (autonomous streams of work).

Here is the Gas Town Funding Protocol, using your Brane as the "Town Record."

1. The Core Metaphor: "The Town" (The Ecosystem)
In Yegge’s model, the "Town" is the workspace. In your model, the Town is the Protocol/DAO.

The Mayor: The Funding DAO (or the central AI that approves grants).

The Gas: Your Token (The fuel burned to execute work).

The Citizens: The Agents (Human devs or AI bots) requesting funds.

The Beads: The Atomic Unit of Value.

2. The Mechanism: "Bead-Based Funding"
Yegge’s genius was inventing "Beads" (Git-backed structured data) to give agents memory. In crypto, Beads are the Funding Milestone.

Instead of a $100k grant for "Q1 Development," you fund Beads.

Bead #104: "Refactor Auth Interface" -> Reward: 500 Tokens.

Bead #105: "Write Integration Test" -> Reward: 50 Tokens.

The Strategy:

Granularity: You don't fund a roadmap; you fund a backlog.

Permissionless Work: Anyone (human or agent) who picks up a "Bead" and submits a valid PR (verified by the Brane) gets the Gas.

The "Convoy": A large feature (e.g., "Launch Mobile App") is a "Convoy" of 500 Beads. You fund the Convoy, and the Mayor distributes Gas to the workers as they complete Beads.

3. The "Brane" Implementation
Your CLI tool (brane) becomes the oracle that verifies the work.

Phase A: The Request (The Bounty) The Mayor (DAO) creates a "Ghost Node" in the Brane.

Bash
$ brane task create --title "Implement Zero-Knowledge Proof" --bounty "5000 GAS"
# Creates a "Requirement" node in brane.sqlite
Phase B: The Work (The Vibe) A developer (or their "Gas Town" of 10 Claude instances) picks up the task. They write code.

Bash
# The dev's agent runs:
$ brane context "Zero-Knowledge Proof Requirement"
Phase C: The Proof (The Submission) The dev submits the work. The Brane runs a Calabi Projection (The Scan).

Bash
$ brane verify src/zk_proof.ts --against "Task #505"
The Check: Does the Graph show a valid edge (ZK_Proof_Module) --IMPLEMENTS--> (Requirement #505)?

The Quality: Does the code have strength: 0.9 (high coherence)?

Phase D: The Payout (The Burn) If brane verify passes, the Smart Contract automatically releases the Gas to the wallet in the PR metadata.

4. Why this is "Like Steve Yegge"
It's Aggressive: It assumes "Code is cheap, Context is expensive." You burn tokens to generate massive amounts of code, filtering for the good stuff using the Brane.

It's Gamified: Developers aren't "employees"; they are "Mercenaries" in the Town, hunting for Beads.

It's Chaos-Tolerant: Just as Gas Town tolerates agents hallucinating (because the Mayor corrects them), this funding model tolerates bad submissions (because the Brane rejects them).

5. The "Gas Town" Funding CLI
You can extend your brane tool to handle the money.

Bash
# 1. The 'Mayor' (You) defines the Convoy
$ brane convoy start "Q1_DeFi_Launch" --budget 50000

# 2. The 'Town' (The Graph) breaks it into Beads (Tasks)
$ brane bead mint --from "Q1_DeFi_Launch" --granularity high
> Minted 450 Beads (Tickets). Total value: 48,000 GAS.

# 3. The 'Citizens' (Agents) hunt
$ brane bead hunt --skill "Rust" --min-reward 100
> Found Bead #88: "Implement Liquidity Pool Struct" (250 GAS)

# 4. The Payout
$ brane bead claim #88 --proof ./pr_link
> Verifying... [Calabi Projection Match: 98%]
> Payout TX: 0x99f... Confirmed.
Next Step: Do you want to design the "Bead Schema" (the data structure for these funding units) to add to your brane.sqlite?

No. Let's consider the convoy concept orthogonal for now. But the idea that brane can analyze a PR... Expand on that

This is the "Killer Feature."

Current CI tools (CircleCI, GitHub Actions) are Syntactic. They check: "Does it compile? Do the unit tests pass?" Brane introduces Semantic CI. It checks: "Does this make sense? Does it break the intent of the system?"

Here is how brane analyzes a Pull Request by simulating the "Future Graph."

1. The Workflow: "The Calabi Simulation"
When a PR is opened, brane doesn't just read the text diff. It performs a Graph Simulation.

Fork the Reality: It creates a temporary, in-memory copy of brane.sqlite (The "Master Brane").

Apply the Mutation: It scans the changed files in the PR and "patches" the temporary graph with the new nodes and edges implied by the code.

Run the Physics: It checks if the new graph is stable or if "structural stress" has increased.

2. The Mechanics: What is it checking?
We define three specific "Calabi Tests" that the PR must pass.

Test A: Architectural Integrity (The "Severed Artery" Check)
Standard linters don't know that src/infra should never import src/ui. The Brane does, because it has verified edges (UI --DEPENDS_ON--> Infra) but never the reverse.

The Scenario: A junior dev (or hallucinating Agent) adds import { Button } from '../ui/Button' into a backend service to hack a fix.

The Brane Analysis:

Old Graph: Clean hierarchy.

Simulated Graph: Cycle detected! Infra -> UI -> Infra.

The Result: ❌ FAIL: "Cyclic Dependency Detected. The 'Backend' concept is now structurally coupled to 'Frontend'."

Test B: Concept Rot (The "Orphaned Logic" Check)
This catches "Ghost Code"—code that exists but has lost its purpose.

The Scenario: You delete the User.verifyEmail() method because "we don't use it."

The Brane Analysis:

The Brane sees an edge: (BillingSystem) --CALLS--> (User.verifyEmail).

Note: Maybe BillingSystem calls it dynamically or via a string reference, so the TypeScript compiler missed it. But the Brane knows because it indexed the conceptual link months ago.

The Result: ❌ FAIL: "Breaking Change. You deleted verifyEmail, but the Concept BillingSystem still relies on it. Please update Billing or restore the function."

Test C: Documentation Debt (The "Dark Matter" Check)
If you add massive complexity without explaining it, you are adding "Dark Matter"—mass without light.

The Scenario: You add a 500-line algorithm calculate_entropy.ts.

The Brane Analysis:

Nodes added: 50 (Variables, Functions).

Edges added: 200 (Complexity).

Concept Nodes (Documentation/Explanation) added: 0.

Ratio Check: The Complexity / Explanation ratio has spiked.

The Result: ⚠️ WARN: "High Cognitive Load. You added 500 lines of logic but 0 conceptual anchors. Please run brane annotate to explain this module."

3. The CLI Experience
This is what the agent (or human) sees in the PR comment or terminal.

Bash
$ brane pr check --diff ./pr.diff

---------------------------------------------------
BRANE CALABI VALIDATION REPORT
Target: origin/main -> feat/new-auth
---------------------------------------------------

⛔ CRITICAL FAILURES:
   1. [Architectural Violation]
      File: src/db/schema.ts
      Error: 'DatabaseSchema' now depends on 'ReactComponents'.
      Why: Line 45 imports 'UserAvatar'. 
      Rule: 'Persistence Layer' cannot depend on 'Presentation Layer'.

⚠️ WARNINGS:
   1. [Concept Drift]
      File: src/auth/login.ts
      Note: You renamed 'login()' to 'authenticate()'.
      Impact: 3 Annotations in the graph still refer to 'login'.
      Fix: Run `brane refactor --merge "login" "authenticate"` to update the graph.

✅ IMPROVEMENTS:
   1. [Graph Strengthening]
      Context: 'PaymentGateway'
      Note: Your changes increased the connectivity of 'PaymentGateway' by 15%.
      Status: The system understands this module better now.

---------------------------------------------------
Final Score: 65/100 (FAIL)
Action: Fix Critical Failures to merge.
4. Implementation Strategy
How do we build this?

Step 1: The "Speculative" Flag We update our Ingestion Interface (src/core/ingest.ts) to accept a "Sandbox Mode."

TypeScript
// Instead of writing to disk, we write to an in-memory SQLite attached DB
db.run("ATTACH DATABASE ':memory:' AS sandbox");
db.run("CREATE TABLE sandbox.edges AS SELECT * FROM main.edges");
// ... apply the PR diff to sandbox.edges ...
Step 2: The Rules Engine We define Graph Queries that act as unit tests.

SQL
-- Rule: No cycles in dependency graph
WITH RECURSIVE traverse(id, path) AS (
  SELECT source_id, '/' || source_id FROM sandbox.edges WHERE type = 'DEPENDS_ON'
  UNION
  SELECT e.target_id, t.path || '/' || e.target_id
  FROM sandbox.edges e JOIN traverse t ON e.source_id = t.id
  WHERE t.path NOT LIKE '%/' || e.target_id -- Stop if we see a repeat (Cycle)
)
SELECT * FROM traverse WHERE path LIKE ... -- Detect the cycle
5. Why this changes the game for Agents
If you give an autonomous agent a task "Refactor the Auth system," it will break things. It cannot help it; it doesn't see the big picture.

With Brane PR Analysis:

Agent writes code.

Agent commits.

Brane runs pr check.

Brane tells Agent: "You created a cycle in src/db. Undo that import."

Agent self-corrects before you even see the PR.

This turns the Graph from a "Passive Map" into an "Active Immune System."

What similar tools exist?

You are entering a "Blue Ocean" with Brane. While there is massive activity in "AI Coding" (Cursor, Windsurf) and "RAG" (Pinecone, Weaviate), there is almost no one building a local-first, read-write Knowledge Graph CLI specifically for agent orchestration.

Here is the landscape of tools you are competing with or complementing, categorized by their approach to "Context."

1. The Heavyweights (Enterprise GraphRAG)
These are the industrial tools. They are powerful but heavy (require Docker, Python, 16GB RAM). They are designed for "Data Analysts," not "Hacker Agents."

Tool	How it works	Why Brane is different
Microsoft GraphRAG	Uses LLMs to detect "Communities" in text. Summarizes broad themes (e.g., "What is this dataset about?").	GraphRAG is Read-Only and batch-processed. It takes hours to index. Brane is Real-Time and incremental.
Neo4j + LangChain	The standard "Enterprise" stack. Requires running a Java/Bolt server and managing Cypher queries.	Brane is Serverless (SQLite). You don't need a sysadmin to run it.
LlamaIndex	A Python library for building RAG. Has KnowledgeGraphIndex.	It's a Library, not a Product. You have to build the CLI yourself.
2. The "Vibe Coding" Orchestrators
This is the Steve Yegge / "Gas Town" space. These tools manage agents, but they usually lack a "Shared Brain" (they rely on git logs or chat history).

Tool	How it works	Why Brane is different
Gas Town (Yegge)	Manages 50+ "Claude Code" instances using Beads (Git-backed tickets).	Gas Town is an Orchestrator (The Boss). Brane is the Database (The Record). Gas Town needs Brane to know if the work is correct.
OpenDevin / Devin	Autonomous software engineers that run in a sandbox.	They have "Short-term Memory" (Context Window). They lack "Long-term Structural Wisdom." They make the same architectural mistake twice.
Goose / Cline	CLI-based coding agents.	They rely on Vector Search (Grepping). They miss deep dependencies.
3. The "Agent Memory" Systems
These tools try to give agents "Long Term Memory," but they focus on Conversation, not Code Structure.

Tool	How it works	Why Brane is different
Zep / Graphiti	A "Temporal Knowledge Graph" for chat bots. Remembers "User likes Python."	Optimized for Chat, not Code. Doesn't understand "Cyclic Dependency" or "Refactoring."
Mem0	A personalized memory layer for AI.	Stores "Facts," not "Topology."
4. The Code Search Engines (Read-Only)
These tools index code brilliantly but don't let agents write back to the index to fix understanding.

Tool	How it works	Why Brane is different
Sourcegraph (SCIP)	Uses LSIF/SCIP to create precise code navigation graphs.	Static Analysis only. It cannot store "Intent" or "Caveats" (e.g., "Don't touch this, it's a hack").
Greptile	An API that indexes repos for agents.	Cloud-Dependent. Brane is local-first (privacy friendly).
The Gap in the Market
You can see the gap:

Vector DBs (Pinecone) have no structure.

Graph DBs (Neo4j) are too heavy for a CLI.

Code Search (Sourcegraph) is read-only.

Agent Orchestrators (Gas Town) have no shared memory.

Brane sits in the middle: A Lightweight, Writable, Semantic Graph for Agents.

Why Now? (The "Vibe Shift")
As Steve Yegge points out in his "Gas Town" manifesto (Jan 2026), we are moving from "Human-in-the-loop" to "Human-on-the-loop."

Old Way: Human reads code -> Human builds mental model -> Human types.

New Way: Agent reads code -> Agent builds Graph (Brane) -> Agent types.

If the Agent doesn't have a Graph, it's just "Vibing" (guessing). Brane turns "Vibe Coding" into "Engineering."

Ready to build?
We have the Name (Brane), the Stack (Bun+SQLite), the Schema (calabi projection), and the Market Validation.

Shall we proceed to Step 1: The Project Skeleton & package.json?

I want to produce a detailed prd for this project

This Product Requirements Document (PRD) outlines the vision, architecture, and specifications for Brane, a local-first semantic knowledge graph designed for the age of AI Agents.

Product Requirements Document: Brane
Version: 1.0 (Draft) Date: January 2026 Status: Inception Codename: Calabi

1. Executive Summary
Brane is a command-line interface (CLI) tool that acts as a "Shared Brain" for AI agents and developers. It bridges the gap between raw code files and conceptual understanding by maintaining a local-first, read-write Knowledge Graph.

Unlike standard RAG (which searches text similarity) or static analysis (which checks syntax), Brane models the intent, relationships, and "tribal knowledge" of a codebase. It allows Agents to "onboard" to complex projects in seconds and allows Humans to "annotate" the graph with architectural constraints that Agents must respect.

Core Metaphor: M-Theory. Raw strings of code must attach to a "Brane" (Context) or they are lost in entropy.

2. Problem Statement
The current ecosystem of AI Coding Agents (e.g., Cursor, Windsurf, OpenDevin) suffers from three critical failures:

The Context Gap: Agents rely on "Context Windows" or simple Vector Search. They miss deep, multi-hop dependencies (e.g., "If I change this DB schema in infra/, it breaks the billing/ logic that relies on an implicit field constraint").

The "Vibe" Trap: Agents act on probability ("vibe"), not architecture. They happily refactor "ugly" code that serves a critical, undocumented purpose, introducing subtle bugs.

Amnesia: Agents are ephemeral. When an agent fixes a bug, its "learning" is lost when the session ends. There is no persistent memory of why changes were made.

3. Product Vision & Goals
Vision: To create the standard "Semantic Nervous System" for software projects—a lightweight sidecar file (brane.sqlite) that travels with the repo and grows smarter with every commit.

Key Metrics:

Time-to-Context (TTC): An Agent should retrieve a perfect "Mental Model" of a specific feature in <2 seconds.

Hallucination Rate: Reduce architectural violations (e.g., circular dependencies) in Agent-generated code by 90%.

Graph Density: Maintain a high ratio of Concepts to Files, ensuring the graph captures abstraction, not just file lists.

4. Technical Architecture
Stack: Bun.js (Runtime), SQLite (Storage), TypeScript (Logic).

4.1. The "Brane" (Storage Layer)
A single file, brane.sqlite, residing in the project root (git-ignored, or git-tracked for small teams).

Nodes (Concepts): Entities like AuthService, API_Key, RetryPolicy.

Edges (Relations): Directed links like DEPENDS_ON, CONFLICTS_WITH, IMPLEMENTS.

Vectors: Embeddings stored as BLOBs for hybrid search.

4.2. The "Calabi" Engine (Processing Layer)
The "Calabi Projection" is the algorithm that maps 2D text (code) into the N-dimensional graph.

Scanner: Incrementally watches file changes.

Extractor: LLM-driven parser that outputs structured Graph Patches (Nodes/Edges).

Simulator: An in-memory sandbox for testing PRs against the graph before committing.

5. Feature Specifications
5.1. Feature Set: Ingestion & Analysis
Command: brane scan [path]

Function:

Detects changed files via fs.watch or git diff.

Chunks code by logical blocks (using Tree-sitter).

Calls LLM with "Ontology Constraints" to extract relations.

deduplication: Uses vector similarity to map "Login" and "SignIn" to the same Concept ID.

Constraint: Must process a mid-sized repo (500 files) in <5 minutes on initial scan; <5 seconds for incremental updates.

5.2. Feature Set: Context Retrieval (The HUD)
Command: brane context "query"

Function:

Performs Hybrid Search: Vector match (Anchor Nodes) + Graph Traversal (2-Hop Neighborhood).

Output Format: Returns an XML/JSON bundle optimized for System Prompts.

Bundle Structure:

<logic_layer>: The abstract rules ("A implies B").

<evidence_layer>: The code snippets proving the rules.

5.3. Feature Set: The Write-Back Loop
Command: brane update <file> --intent "description"

Function: Allows an Agent to signal that it has changed the architecture. The "Intent" string primes the Calabi engine to look for specific structural changes (e.g., "removed dependency").

Command: brane annotate --target "Node" --type "Caveat" --note "..."

Function: Human-in-the-loop override. Adds an immutable "Sticky Note" to the graph (e.g., "Do not delete this").

5.4. Feature Set: Governance (The Immune System)
Command: brane verify (or pr check)

Function: Runs a "Simulation" of the PR.

Cycle Check: Does the new code create a dependency loop?

Orphan Check: Does deleting this function break a Concept that relies on it?

Drift Check: Does the code violate an existing explicit Annotation?

Output: A Pass/Fail report with a "Structural Integrity Score."

6. User Experience (UX)
6.1. The "Hacker" Persona (Human)
Setup: bun install -g brane-cli -> brane init

Workflow:

Dev runs brane context "How does billing work?"

Brane returns a summary: "Billing depends on StripeService. Warning: StripeService has a caveat 'Flaky on Tuesdays'."

Dev codes.

Dev runs brane update to sync.

6.2. The "Agent" Persona (Machine)
Setup: Paste "Brane Protocol" into .cursorrules or System Prompt.

Workflow:

Agent receives task.

Agent automatically runs brane context.

Agent respects the "Caveats" found in the graph.

Agent verifies its own work via brane verify before asking for human review.

7. Data Models (Core Schema)
Entity	Description	Key Properties
Concept	The atomic unit of knowledge.	id, name, category (Entity/Caveat), score
Edge	The structural link.	source, target, type (Depends/Conflicts), weight
Signature	The proof of knowledge.	file_id, edge_id, snippet (The line of code)
Ontology	The allowed vocabulary.	type_name (e.g., "Instantiates", "Calls")
8. Roadmap & Phasing
Phase 1: The Skeleton (Weeks 1-4)

Implement SQLite Schema & Bun setup.

Build brane scan (Ingestion) with basic LLM extractor.

Build brane context (Read-only retrieval).

Phase 2: The Loop (Weeks 5-8)

Implement brane update (Agent write-back).

Implement brane annotate (Human override).

Refine the "Calabi" scoring algorithm.

Phase 3: The Shield (Weeks 9-12)

Implement brane verify (PR Analysis).

Add "Simulation Mode" (In-memory graph patching).

Phase 4: The Network (Future)

Multi-agent "Convoy" support (Beads/Funding integration).

9. Risks & Mitigations
Risk: Graph Drift (The code changes, but the graph lags).

Mitigation: brane verify in CI acts as a forcing function. If the graph doesn't match the code, the build fails.

Risk: Cost (LLM tokens for scanning).

Mitigation: Aggressive hashing. Only scan changed chunks. Use cheaper models (e.g., Haiku/Flash) for bulk extraction, expensive models (Opus/GPT-4) for conflict resolution.

Risk: Garbage In, Garbage Out.

Mitigation: "Inherent Score" decay. If a node isn't referenced often, its weight drops.

End of Document

How would this tool work with normal prose? Eg. Research notes?

The beauty of the Brane architecture (M-Theory) is that it is agnostic to the content of the strings. Whether the strings are lines of TypeScript or sentences in a Markdown research note, they still need to attach to a concept (the Brane) to have meaning.

When applied to prose (research notes, essays, documentation), Brane transforms from a "Dependency Graph" into an "Argument Map."

Here is how the system adapts to "Research Mode."

1. The Shift in Ontology (The "Verbs")
In code, relationships are rigid (IMPORT, IMPLEMENTS). In prose, relationships are rhetorical. We simply swap the RelationshipType seed data in the SQLite DB.

Code Ontology	Prose/Research Ontology	Meaning
DEPENDS_ON	SUPPORTS / EVIDENCES	Note A provides proof for Claim B.
CONFLICTS_WITH	CONTRADICTS / CHALLENGES	Note A argues against Note B.
IMPLEMENTS	EXEMPLIFIES	Note A is a concrete example of Abstract Concept B.
DEFINES	DEFINES	Note A establishes the meaning of Term B.
CALLS	REFERENCES	Note A mentions B without deep connection.
2. Ingestion: The "Idea" Scanner
Instead of parsing Abstract Syntax Trees (ASTs) like we do for code, the "Calabi Engine" uses Header Hierarchy and Paragraph Blocks.

Chunking Strategy:

Level 1: File (The Document).

Level 2: Headers (#, ##). These act as "Functions" or "Classes" in code—containers of logic.

Level 3: Paragraphs. These are the lines of code.

The Prompt Adjustment: When brane scan sees a .md or .txt file, it swaps the system prompt:

Old: "Extract software dependencies and architectural flows." New: "Extract the Knowledge Graph. Identify Claims, Evidence, and Definitions. If Note A says 'X is true' and Note B says 'X is false', create a CONTRADICTS edge."

3. Use Case: The "Syntopical" Research Assistant
Imagine you are researching "Universal Basic Income (UBI)." You have 50 PDF summaries and raw notes.

Scenario A: The "Conflict" Check You write a new note: "UBI consistently lowers inflation." You run: brane verify my_note.md

The Brane Reacts: It scans the graph. It finds an existing edge from a paper you read 3 months ago: (Friedman_Paper_1968) --ARGUES--> (UBI_Causes_Inflation).

The Output:

⚠️ Contradiction Detected Your statement "UBI lowers inflation" contradicts Friedman_1968 which argues "UBI increases liquidity -> inflation." Strength of Conflict: 0.9

Scenario B: The "Synthesis" Context You are writing an essay and get stuck. You run: brane context "Arguments against UBI"

Standard Search: Gives you files with the word "Against."

Brane Context: Traverses the graph.

Finds UBI.

Follows incoming CHALLENGES edges.

Finds Work_Disincentive (even if the text doesn't explicitly say "Against UBI," the structural link is negative).

Result: A generated outline of logically connected counter-arguments, not just keyword matches.

4. The "Zettelkasten" on Steroids
Traditional Zettelkasten (like Obsidian) relies on manual linking ([[Link]]). Brane automates the "back-linking" based on semantic logic.

Manual: You have to remember to link Note A to Note B.

Brane: You write Note A. The "Calabi" background process scans it, realizes it discusses the same concept as Note B, and proposes a link or auto-creates a "Soft Edge" (strength: 0.5).

5. Configuration: brane.json
To make the tool switch modes seamlessly, we add a config file in the project root.

JSON
// brane.json
{
  "mode": "prose", // or "code"
  "extraction": {
    "granularity": "paragraph",
    "ontology": ["Support", "Refute", "Define", "Example"]
  },
  "files": {
    "include": ["**/*.md", "**/*.txt", "**/*.tex"],
    "exclude": ["node_modules"]
  }
}
6. Example: The "Argument Map" Visualization
Because brane stores data in SQLite, you can easily export it to a visualization tool to "see" your research.

Command: brane export --format dot > graph.gv

Visual:

Green Arrows: Supporting evidence.

Red Lines: Contradictions.

Big Nodes: Core concepts (highly referenced).

Summary
For prose, Brane becomes a Logic Checker. Just as it checks code for "Circular Dependencies," it checks research for "Circular Reasoning" or "Unsubstantiated Claims."

What would some thoughts on a funding model for this be, assuming OSS/hybrid

Given your "Gas Town" ambition and the technical architecture of Brane, you should avoid the traditional "SaaS-only" trap. Instead, adopt a Tri-Brid Model that captures value from three distinct economies: The Individual (OSS), The Enterprise (SaaS), and The Protocol (Crypto).

Here is the funding strategy for Brane:

1. The Foundation: "Open Core" (The Standard)
License: Apache 2.0 or MIT.

The Free Product: brane-cli (Local Mode).

Full usage of brane.sqlite.

Unlimited local context.

Full "Calabi" scanning capabilities on local files.

The Strategy: You need ubiquitous adoption. If every developer uses Brane locally, it becomes the standard format for "Context." This prevents vendor lock-in fears and encourages plugin ecosystems.

Revenue: $0 directly. Infinite value in "Standard Setting."

2. The Bridge: "Team Brane" (The SaaS)
The Pain Point: Local SQLite files are great for me, but terrible for us. Teams need a "Shared Brain."

The Product: Brane Cloud.

Feature: brane sync. Real-time synchronization of brane.sqlite across a team of 50 developers.

Feature: Federated Search. Query across all company repos (not just the one checked out locally).

Feature: RBAC. "Junior Devs can't annotate 'Caveats' on Core Billing Logic."

Feature: Web UI. A visual graph explorer for non-technical PMs/Stakeholders to query the system.

Pricing: $20/user/month. This funds the traditional business ops.

3. The Convoy: "Protocol-Based Verification" (The Crypto)
This is the "Steve Yegge / Gas Town" differentiator. You don't just sell software; you sell Verification.

The Mechanism: Proof of Understanding (PoU).

In a future where AI Agents (and humans) are paid per task ("Bead"), the Payer needs to know: Did this code actually fix the issue without breaking the architecture?

Brane is the Oracle.

The Token Model: BRANE (or CTX - Context Token).

Staking: To run a "Verification Node" (a high-power instance of Brane that validates PRs for the network), you stake CTX.

Burning: When a DAO or Company creates a Bounty ("Bead"), they burn a small amount of CTX to pay for the Brane Verification fee.

Earning: If your code passes brane verify and is merged, you (the developer/agent) earn the bounty.

Why this works: It monetizes the transaction of code, not just the storage of code.

Summary of the Hybrid Model
Tier	User	Value Prop	Revenue Model
Local	Solo Hacker / Agent	Perfect Context, Zero Latency.	Free (Growth)
Cloud	Enterprise Team	Sync, RBAC, Visualizations.	SaaS Subscription
Protocol	DAOs / Agent Swarms	Trustless Verification of Code Quality.	Transaction Fees (Gas)
The "Trojan Horse" Strategy
Phase 1 (OSS): Release the CLI. Get 10,000 devs to use it because it makes Cursor/Windsurf smarter.

Phase 2 (Cloud): Those devs get hired. They try to share their brane.sqlite file on Slack. It breaks. They pay for Brane Cloud to sync it.

Phase 3 (Protocol): You launch the "Convoy" Marketplace. Companies stop hiring "Devs" and start posting "Beads" (Tasks). Brane becomes the automated judge that releases the funds.

This model allows you to stay "Hacker Aligned" (Free CLI) while building a massive defensive moat (The Protocol) that standard SaaS tools cannot touch.

What other technologies / tools might be more appropriate for this project?

While the Bun + SQLite stack is excellent for velocity and accessibility (TypeScript is easy to iterate on), there are specialized technologies that might be architecturally superior for a high-performance, local-first Knowledge Graph.

If you want brane to handle millions of nodes or perform complex logic (e.g., "Find all circular dependencies that involve a deprecated API"), "hacking" SQLite with Recursive CTEs might eventually become a bottleneck.

Here are the three strongest alternative technology paths for this project.

1. The "Native Graph" Path: KùzuDB
If SQLite is "Excel for Apps," KùzuDB is "Neo4j for Apps." It is an embedded, serverless, on-disk graph database that speaks Cypher (the standard graph query language) natively.

Why it’s better: You don't have to write complex SQL joins or Recursive CTEs to traverse the graph. You just write Cypher.

The Trade-off: The ecosystem is younger than SQLite.

The Vibe: Bleeding edge, academic rigor.

Comparison:

SQL
-- SQLite (Current Plan)
WITH RECURSIVE traverse(id) AS (
  SELECT target_id FROM edges WHERE source_id = ?
  UNION
  SELECT e.target_id FROM edges e JOIN traverse t ON e.source_id = t.id
) SELECT * FROM traverse;

-- KùzuDB (Alternative)
MATCH (a:Concept)-[:DEPENDS_ON*]->(b:Concept) WHERE a.name = $name RETURN b;
2. The "Systems" Path: Rust
If you want to win the "Hacker Heart," Rust is the language of choice for modern CLIs (e.g., ripgrep, bat, uv, turborepo).

Why it’s better:

Single Binary: No need for users to have the Bun runtime. You ship one brane file that works everywhere.

Memory Safety: Critical when parsing massive codebases in parallel.

Speed: Rust's serde and parsing libraries are generally faster than JS equivalents.

The Stack: Rust + Rusqlite (or Kuzu-rs).

The Trade-off: Slower development cycle than TypeScript. Harder to "script" extensions.

3. The "Logic" Path: CozoDB (Datalog)
This is the "Galaxy Brain" option. CozoDB is an embedded database that uses Datalog instead of SQL. Datalog is a logic programming language designed specifically for deductive reasoning.

Why it’s better: It is designed for inference.

SQLite: "Find rows that match these IDs."

CozoDB: "Given these rules (A implies B, B implies C), tell me what is true."

Use Case: If you want Brane to infer dependencies that aren't explicitly written (e.g., "If A calls B, and B is 'Private', then A is violating visibility rules"), Datalog is mathematically superior to SQL.

The Vibe: Mathematical purity. Very "M-Theory."

4. The "Vector-First" Path: LanceDB
If you believe that "Semantic Search" (Vectors) is more important than "Graph Structure" (Edges), LanceDB is the state-of-the-art embedded vector store.

Why it’s better: It handles embeddings (vectors) much faster than SQLite's BLOBs. It is columnar, so scanning 100k files for similarity is instant.

The Trade-off: You lose the strict transactional integrity and relational modeling of SQLite. It’s harder to model "A depends on B" strictly.

Recommendation: The "Industrial" Stack
If I were building brane to compete with Microsoft and win, I would shift the core engine from Bun/SQLite to Rust/KùzuDB.

Why?

Cypher is the Product: Allowing Agents to write Cypher queries (MATCH (n) WHERE n.type = 'Bug' RETURN n) is a massive feature. Teaching an LLM to write Recursive SQL is hard; teaching it to write Cypher is easy (it's in their training data).

Performance: Kùzu is optimized for "multi-hop" queries (e.g., finding the root cause 5 layers deep), which is your main value prop.

Distribution: A Rust binary is easier to sell to Enterprise Security teams than a "Bun Script."

However, for the MVP (Minimum Viable Product) and to iterate fast on the logic of the "Calabi Projection," Bun + SQLite is still the fastest way to prototype. You can always rewrite the engine in Rust/Kuzu v2.0 once the schema is proven.

It would seem that kuzudb is dead. Claude code is bun, correct? Why? I'm interested in considering using sqlite and cozodb....

You are absolutely correct on both counts.

1. KuzuDB is Dead
The project was officially archived on GitHub in October 2025. The team has moved on (some to FalkorDB, some to other ventures), and the repository is now read-only.

Verdict: Do not build new infrastructure on KuzuDB. It is a ghost ship.

2. Claude Code is Bun
Yes, Anthropic acquired Bun in late 2025 specifically to power the Claude Code ecosystem.

Why Bun?

Velocity: Bun starts up in milliseconds. For a CLI agent that runs thousands of times a day (like brane), Node.js's 500ms startup tax is unacceptable.

The "All-in-One" Binary: Bun ships as a single executable (runtime + bundler + package manager + test runner). This makes distribution trivial.

TypeScript Native: No tsc build step. You write .ts, it runs. This reduces the "friction loop" for agents writing code.

The Pivot: CozoDB vs. SQLite
Since Kuzu is dead, CozoDB is a fascinating contender. It is arguably a better fit for your "M-Theory" concept than SQLite or Kuzu ever were.

Here is the breakdown of why you might choose Cozo over SQLite for brane.

The Argument for CozoDB (The "M-Theory" Choice)
CozoDB uses Datalog, not SQL. Datalog is a logic programming language. This is indistinguishable from magic when building a knowledge graph.

1. Inference vs. Querying

SQLite (SQL): You ask: "Find me all rows where A connects to B." (Passive)

Cozo (Datalog): You define Rules. "If X depends on Y, and Y is broken, then X is broken."

You don't query for "Broken X"; the database infers it automatically.

2. The "Calabi" Projection In SQLite, calculating the "Structural Integrity" of a PR requires 50 lines of Recursive CTE SQL (which is painful to read/write). In Cozo, it is 3 lines of Datalog:

Prolog
# Datalog Rule: Transitive Dependency
?[x, z] := depends_on[x, y], depends_on[y, z]

# Datalog Rule: Cycle Detection
cycle[x] := ?[x, x]
This fits your "Calabi" concept perfectly: You define the rules of physics for your code, and the DB enforces them.

3. Native Vector Search Cozo has built-in HNSW vector search. SQLite needs sqlite-vec (an extension), which complicates the single-binary distribution.

4. Time Travel Cozo has native "Time Travel" queries. You can ask: "What did the graph look like last Tuesday before I merged that PR?" without building complex history tables yourself.

The Argument for SQLite (The "Industrial" Choice)
Ubiquity: If you want brane to be installed on 10 million laptops, SQLite is already there. Cozo requires shipping a separate binary or WASM blob.

Ecosystem: Every tool in the world speaks SQL. Only "Galaxy Brain" hackers speak Datalog.

Risk: Cozo is maintained by a smaller team. If they get bored (like Kuzu), you are stuck.

My Recommendation
If you want brane to be a "Hacker's Cult Classic" that feels essentially different from every other tool: Go with CozoDB.

It aligns with the "Brane/Calabi" branding: You are defining rules, not just storing tables.

The "Time Travel" feature allows you to implement brane undo or brane bisect (finding which commit broke the graph) almost for free.

Revised Stack for the "Hacker" Vibe:

Runtime: Bun (Speed, TS)

Database: CozoDB (Logic, Vectors, Time Travel)

Interface: Datalog (The language of the "Brane")

Would you like to see what the CozoDB Schema (in Datalog) looks like compared to the SQL one we wrote?

Yes, but I think we'll need both.... Eg, for storing file pointers and md5s.... Metadata, cozo seems wrong...

Your intuition is exactly right. Trying to force file pointers, MD5 hashes, and standard table-stakes metadata into a graph database (especially a Datalog one like Cozo) is mathematically correct but practically painful.

You are describing a Split-Brain Architecture, and it is the standard pattern for high-performance AI systems.

The "Body" (SQLite): Handles the physical reality (Files, Paths, Hashes, Logs). It's flat, rigid, and lightning-fast for "SELECT * FROM files WHERE path = ...".

The "Mind" (CozoDB): Handles the semantic reality (Concepts, Relationships, Rules). It's flexible, recursive, and logical.

Here is how to architect this Hybrid Stack so they work in harmony.

1. The Architecture: Body vs. Mind
Feature	SQLite (The Body)	CozoDB (The Mind)
Data Type	Concrete, immutable facts.	Abstract, inferred relationships.
Examples	File paths, MD5 checksums, git commit hashes, user logs.	"AuthService depends on Redis", "Circular Dependency Rule".
Query Style	SELECT * WHERE hash = ?	?[x, y] := depends_on[x, y]
Strength	raw I/O speed, simple lookups, FTS5 text search.	Graph traversal, Vector search, Recursive logic.
Role	The File System Index	The Knowledge Graph
2. The Implementation (Hybrid Schema)
You link the two databases using a unified doc_uuid or integer ID.

A. The Body: physical.sqlite
This file stores the "boring" stuff that you query 1,000 times a second to check for file changes.

SQL
-- physical.sqlite

-- 1. The File Registry
-- Fast, flat, standard. 
CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,     -- "src/auth.ts"
    hash TEXT NOT NULL,            -- "sha256:a1b2..."
    last_scanned_at DATETIME,      -- Timestamp
    mime_type TEXT,                -- "application/typescript"
    size_bytes INTEGER
);

-- 2. The "Raw Text" Index (Optional)
-- SQLite's FTS5 is legendary. Use it for "Cmd+F" style search.
CREATE VIRTUAL TABLE file_content_fts USING fts5(
    path, 
    content
);
B. The Mind: brane.cozo (Datalog)
This file stores the "Calabi Projection"—the extracted intelligence. It doesn't care about file paths; it cares about Logic.

Prolog
# brane.cozo

# 1. The Concept Nodes
# :create concept { id => name, type, vector }
?[id, name, type, vec] <- [
    [101, "AuthService", "Service", <f32; 1536>],
    [102, "Redis", "Infrastructure", <f32; 1536>]
]

# 2. The Relationships
# :create edge { source_id, target_id => type, weight }
?[src, tgt, type, w] <- [
    [101, 102, "DEPENDS_ON", 1.0]
]

# 3. The Bridge (Linking back to SQLite)
# :create provenance { concept_id, file_id => line_number }
# This 'file_id' corresponds to 'files.id' in SQLite
?[c_id, f_id, line] <- [
    [101, 55, 12]  # "AuthService defined in File #55 at line 12"
]
3. The "Sync Loop" Logic
This is where the magic happens. Your CLI orchestrates the handoff between the two DBs.

Step 1: The Fast Check (SQLite) The CLI wakes up. It asks SQLite: "Have any file hashes changed?"

SQLite is optimized for this. It scans 10,000 rows in milliseconds.

Result: ["src/auth.ts", "src/billing.ts"] are dirty.

Step 2: The Extraction (LLM) The CLI reads the new content of src/auth.ts and sends it to the LLM.

LLM output: (AuthService) --CALLS--> (StripeAPI)

Step 3: The Surgery (CozoDB) The CLI tells Cozo: "Forget everything you knew about File #55, and learn this new graph."

Prolog
# Datalog Transaction
# 1. Delete old facts linked to File #55
:rm provenance { file_id: 55 }

# 2. Insert new graph facts
:put edge { source: "AuthService", target: "StripeAPI", ... }
:put provenance { concept: "AuthService", file_id: 55, line: ... }
4. Why this wins
Datalog is cleaner for Logic:

SQLite: Writing a recursive query to find circular dependencies is a nightmare of WITH RECURSIVE.

Cozo: It is literally one line: cycle[x] := path[x, x].

SQLite is safer for Files:

If Cozo crashes or corrupts (it's newer tech), you don't lose your file index/hashes. You just rebuild the graph.

Migration Path:

If you decide later that vectors belong in LanceDB, you only swap out the "Mind" component. The "Body" (SQLite) remains the stable foundation.

5. New Toolchain Recommendation
Since you are using Bun + Typescript:

SQLite Driver: bun:sqlite (Native, instant).

Cozo Driver: cozo-node (Works well with Bun).

Orchestration: Your TypeScript code acts as the "Corpus Callosum" connecting the two hemispheres.

This hybrid approach gives you the stability of 2026 enterprise software with the reasoning power of bleeding-edge AI.

Ok. Let's produce a new prd based on this. As a detail, I want to call the DBS mind.db and body.db in a .brane/ project directory. We need to update our business model

This updated PRD incorporates the Dual-Database "Split-Brain" Architecture and the Tri-Brid Funding Model, specifically designed to dominate the agent-orchestration market of 2026.

Product Requirements Document: Brane
Version: 2.0 (Split-Brain Architecture) Date: January 2026 Status: Inception Codename: Calabi

1. Executive Summary
Brane is the "Semantic Nervous System" for software projects. It is a local-first, read-write Knowledge Graph CLI that bridges the gap between raw code files (Entropy) and architectural intent (Order).

By using a novel Split-Brain Architecture—a high-speed SQLite "Body" for file physics and a logical CozoDB "Mind" for semantic reasoning—Brane provides AI Agents with "Perfect Context" and Humans with "Architectural Guardianship."

Core Thesis: AI Agents do not need more context windows; they need structured memory. Strings of code must attach to a "Brane" (graph), or they are lost in entropy.

2. Technical Architecture: The "Split-Brain"
The system resides entirely within a .brane/ directory in the user's project root. It uses two distinct database engines, each optimized for a specific hemisphere of reality.

2.1. The Body (.brane/body.db)
Engine: Bun:SQLite (WAL Mode) Role: The Physical Reality. Handles high-frequency I/O, file hashing, and raw content indexing. Schema:

files: Path, Hash (SHA-256), Size, LastModified.

chunks: Text segments (AST-based) for granular mapping.

fts_index: Full-Text Search (FTS5) for "Cmd+F" style lookups.

2.2. The Mind (.brane/mind.db)
Engine: CozoDB (Datalog + Vector) Role: The Semantic Reality. Handles logic, relationships, vectors, and time-travel reasoning. Schema (Datalog):

concepts: {id, name, type, vector<1536>}. The abstract ideas.

edges: {source, target, relation, weight}. The wiring.

rules: {datalog_logic}. Inferred truths (e.g., circular_dependency[x] := ...).

provenance: {concept_id, body_file_id}. The link between Mind and Body.

2.3. The Bridge (The CLI)
Engine: Bun.js (TypeScript) Role: The Corpus Callosum.

Reads changes from Body.

Extracts structure via Calabi Engine (LLM).

Writes logic to Mind.

Queries Mind to verify Body.

3. Core Feature Specifications
3.1. Ingestion: The "Calabi" Projection
Command: brane scan [path]

Workflow:

Body Scan: Check body.db for changed file hashes. Identify "Dirty Files."

Extraction: Send dirty chunks to LLM with the prompt: "Extract the graph. Map 'Login' to existing Concept #105 if similar."

Mind Surgery: Use Datalog transactions to remove old facts about File X and insert new facts, maintaining the provenance link.

3.2. Retrieval: The "Holographic" Context
Command: brane context "Why is auth failing?"

Workflow:

Mind Search: Run Vector Search on mind.db to find Anchor Concepts (AuthService).

Graph Expansion: Use Datalog to find 2nd-degree neighbors and "Rule Violations" (e.g., AuthService is marked deprecated).

Body Lookup: Use provenance links to pull the exact code snippets from body.db.

Synthesis: Return XML bundle to the Agent.

3.3. Governance: The "Immune System"
Command: brane verify (or brane pr check)

Workflow:

Simulation: Create an in-memory fork of mind.db.

Patch: Apply the PR's structural changes to the fork.

Reasoning: Run Datalog rules (e.g., !cycle[x]) against the fork.

Verdict: If rules violate, fail the check. Output: "Cycle detected in src/infra."

3.4. Memory: The "Write-Back"
Command: brane annotate --target "Auth" --caveat "Do not touch"

Function: Inserts a hard constraint into mind.db.

Rule: Manual Annotations have authority: infinity. The Calabi Engine (LLM) cannot overwrite them during a scan.

4. Business Model: The "Tri-Brid" Strategy
We capture value from the Individual (OSS), the Team (SaaS), and the Economy (Protocol).

Tier 1: The Standard (OSS)
Product: brane-cli

Price: Free / Open Source (Apache 2.0).

Value: Perfect local context for the solo hacker or agent.

Strategy: Ubiquity. Become the git of context. "If it doesn't have a .brane folder, the Agent can't work on it."

Tier 2: The Cloud (SaaS)
Product: Brane Team

Price: $20/seat/month.

Value:

Sync: Real-time replication of mind.db across the team (using CRDTs via Cozo's time-travel features).

Visualizer: Web-based graph explorer for PMs.

RBAC: "Only Seniors can annotate Caveats."

Tier 3: The Protocol (Verification)
Product: Brane Verifier (The Convoy)

Price: Transaction Fees (CTX Token).

Mechanism:

The Bounty: A company posts a task ("Fix Bug #101").

The Work: An anonymous Agent submits a PR.

The Proof: The Agent pays a small CTX fee to run brane verify on a decentralized Verifier Node.

The Payout: If brane verify passes (Structural Integrity confirmed), the Smart Contract releases the bounty.

Why: Companies will pay to verify Agent work automatically, without wasting Human time on code review.

5. Roadmap & Phasing
Phase 1: The Skeleton (Weeks 1-4)
Goal: A working CLI that creates .brane/ and populates body.db.

Deliverable: brane init, brane scan (hashing only).

Tech: Bun, SQLite setup.

Phase 2: The Mind (Weeks 5-8)
Goal: Connect mind.db and the Calabi Engine.

Deliverable: brane scan (LLM extraction), brane context (Datalog retrieval).

Tech: CozoDB integration, LLM Prompts.

Phase 3: The Shield (Weeks 9-12)
Goal: Logic enforcement.

Deliverable: brane verify, brane annotate.

Tech: Datalog Rule definitions (Cycles, Orphans).

Phase 4: The Network (Month 6+)
Goal: The Protocol.

Deliverable: brane-verifier (Headless node), Smart Contract integration.

6. Directory Structure
This is the physical footprint of the project.

Plaintext
my-project/
├── .brane/
│   ├── body.db          # SQLite (Files, Hashes, FTS)
│   ├── mind.db          # CozoDB (RocksDB backend: Graph, Rules, Vectors)
│   ├── brane.lock       # Process lock
│   └── config.json      # Local settings (ontology, exclude patterns)
├── src/
└── package.json
7. Interfaces (TypeScript Definition)
TypeScript
// src/core/types.ts

// The Body (Physical)
export interface FileRecord {
  id: number;
  path: string;
  hash: string;
  lastScanned: number;
}

// The Mind (Semantic)
export interface Concept {
  id: number;
  name: string;
  type: "Entity" | "Caveat" | "Rule";
  vector: Float32Array; // Cozo vector
}

export interface Edge {
  source: number;
  target: number;
  relation: "DEPENDS_ON" | "CONFLICTS_WITH" | "DEFINED_IN";
  weight: number;
}

// The Bridge
export interface CalabiPatch {
  // Instructions to update the Mind based on Body changes
  removals: number[]; // Concept IDs to forget
  additions: Concept[];
  edges: Edge[];
}
End of PRD v2.0

Google Privacy PolicyOpens in a new window
Google Terms of ServiceOpens in a new window
Your privacy and Gemini AppsOpens in a new window
Gemini may display inaccurate info, including about people, so double-check its responses.


