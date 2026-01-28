# GraphRAG: From Local to Global Query-Focused Summarization

**Source:** arXiv:2404.16130 [cs.CL]
**Date:** April 2024
**URL:** https://arxiv.org/abs/2404.16130
**Origin:** Microsoft Research

## Authors

Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt, Dasha Metropolitansky, Robert Osazuwa Ness, Jonathan Larson

## Abstract

Addresses limitations in RAG systems when handling broad, corpus-level questions. Traditional RAG excels at targeted retrieval but struggles with global sensemaking queries like "What are the main themes in the dataset?"

## Methodology

GraphRAG combines graph-based indexing with LLM capabilities through a two-stage process:

### Stage 1: Graph Construction
- LLM derives an entity knowledge graph from source documents
- Entities and relationships extracted automatically
- Graph captures semantic structure beyond keyword matching

### Stage 2: Community Summarization
- System precomputes summaries for closely related entity clusters
- Uses community detection algorithms to find related concepts
- Each community gets a pre-generated summary

### Query Response
1. User submits question
2. Each community summary generates partial response
3. Partial responses synthesized into final answer
4. Enables both local (specific) and global (thematic) queries

## Key Findings

- Substantially outperforms conventional RAG on "global sensemaking questions"
- Tested on datasets with ~1 million tokens
- Improvements in both **comprehensiveness** and **diversity** of responses
- Community-based approach enables corpus-level understanding

## Relevance to Brane

This paper validates several Brane design decisions:

### Direct Alignments

| Microsoft GraphRAG | Brane Architecture |
|-------------------|-------------------|
| Entity Knowledge Graph | mind.db concepts + edges |
| Community Detection | Potential future feature |
| Pre-computed Summaries | Rule-based verification (cycles, orphans) |
| Local + Global Queries | /mind/query (local) + /mind/verify (global) |

### Implementation Ideas for Brane

1. **Community Detection Rules**
   - Add Datalog rules to detect concept clusters
   - Could use edge patterns to find related concept groups
   - Enable "What are the main themes?" style queries

2. **Pre-computed Summaries**
   - Store summary concepts that link related entities
   - Use provenance to track summary sources
   - Enable hierarchical navigation

3. **Global Sensemaking**
   - /mind/verify already does global graph analysis
   - Could extend to generate thematic summaries
   - Combine with Calabi projections for code-aware themes

### Key Insight

> "Traditional RAG excels at targeted retrieval but struggles with global sensemaking"

Brane's Split-Brain architecture positions it well here:
- **Body (SQLite)**: Fast local retrieval, file-level queries
- **Mind (CozoDB)**: Graph-based global reasoning, relationship traversal

## Citation

```bibtex
@article{edge2024graphrag,
  title={From Local to Global: A Graph RAG Approach to Query-Focused Summarization},
  author={Edge, Darren and Trinh, Ha and Cheng, Newman and others},
  journal={arXiv preprint arXiv:2404.16130},
  year={2024}
}
```
