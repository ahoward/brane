# GraphRAG Survey: Retrieval-Augmented Generation with Graphs

**Source:** arXiv:2501.00309 [cs.IR]
**Date:** December 31, 2024 (revised January 8, 2025)
**URL:** https://arxiv.org/abs/2501.00309

## Authors

Haoyu Han, Yu Wang, Harry Shomer, Kai Guo, Jiayuan Ding, Yongjia Lei, Mahantesh Halappanavar, Ryan A. Rossi, Subhabrata Mukherjee, Xianfeng Tang, Qi He, Zhigang Hua, Bo Long, Tong Zhao, Neil Shah, Amin Javari, Yinglong Xia, Jiliang Tang

## Abstract

Comprehensive survey on Graph-based Retrieval-Augmented Generation (GraphRAG). Addresses how graph-structured data can enhance RAG systems by leveraging relational information encoded in graph formats.

## Key Framework

The survey proposes a holistic GraphRAG framework with five components:

1. **Query Processor** - Handles incoming queries
2. **Retriever** - Fetches relevant graph substructures
3. **Organizer** - Structures retrieved information
4. **Generator** - Produces responses using LLM
5. **Data Source** - Graph-structured knowledge base

## Core Insights

- Different domains require specialized approaches due to distinct relational patterns
- Graph structure captures relationships that embedding-based RAG misses
- Design challenges unique to graph-structured data vs traditional vector-based RAG
- Domain-specific graph applications need tailored retrieval strategies

## Relevance to Brane

This survey directly informs Brane's architecture:

| GraphRAG Component | Brane Equivalent |
|-------------------|------------------|
| Data Source | mind.db (CozoDB knowledge graph) |
| Retriever | /mind/edges, /mind/concepts queries |
| Query Processor | Datalog rules system |
| Organizer | Calabi projections |
| Generator | External LLM integration (future) |

### Key Takeaways for Brane

1. **Relational retrieval** - Brane's edge-based queries already implement graph retrieval patterns
2. **Community detection** - Could inform future clustering of related concepts
3. **Multi-hop reasoning** - Datalog rules enable this via recursive queries
4. **Domain specialization** - Brane's Split-Brain architecture allows domain-specific graph schemas

## Citation

```bibtex
@article{han2025graphrag,
  title={Retrieval-Augmented Generation with Graphs (GraphRAG)},
  author={Han, Haoyu and Wang, Yu and Shomer, Harry and others},
  journal={arXiv preprint arXiv:2501.00309},
  year={2025}
}
```
