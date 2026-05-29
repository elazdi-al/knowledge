---
title: Cross-Encoder Reranking
description: Notes on cross-encoder reranking after embedding retrieval.
tags: [retrieval, reranking, nl2sql]
created: 2026-05-18
updated: 2026-05-18
---

A bi-encoder maps queries and documents into a shared vector space
independently. A **cross-encoder** instead takes a `(query, document)`
pair and scores them jointly with full self-attention. The first is
cheap and parallel-friendly; the second is slow but much more accurate.

The common pattern is to **stage** them: bi-encoder for recall,
cross-encoder for precision.

## Two-stage retrieval

1. Embed the query with a bi-encoder and pull the top-$k$ candidates
   (often $k = 50$ to $200$) from a vector index.
2. Score each `(query, candidate)` pair with a cross-encoder.
3. Return the top-$n$ after reranking (typically $n = 5$ to $20$).

Stage one keeps latency low; stage two recovers ordering quality that
single-vector retrieval often misses.

## Scoring

A cross-encoder produces a single scalar per pair. The standard
formulation:

$$
s(q, d) = \mathrm{CE}\bigl(\mathrm{concat}(q, d)\bigr) \in \mathbb{R}
$$

Train it as pointwise regression on labelled relevance, or pairwise on
ordered triples $(q, d^+, d^-)$ with a margin loss:

$$
\mathcal{L} = \max\bigl(0,\; m - s(q, d^+) + s(q, d^-)\bigr)
$$

For ranking quality, evaluate with nDCG@$k$:

$$
\mathrm{nDCG}@k = \frac{1}{Z_k} \sum_{i=1}^{k}
  \frac{2^{rel_i} - 1}{\log_2(i + 1)}
$$

## Latency budget

Cross-encoders are not free. A rough budget for an interactive query
($\leq 250\text{ ms}$ end-to-end):

| stage           | top-k | per-pair cost | total |
| --------------- | ----: | ------------: | ----: |
| bi-encoder ANN  |   100 |        0.1 ms |  10 ms |
| cross-encoder   |   100 |        1.5 ms | 150 ms |
| business logic  |       |               |  20 ms |
| **headroom**    |       |               |  70 ms |

Tuning levers when the budget gets tight:

- Reduce $k$ before the reranker (precision vs. recall tradeoff).
- Distil a smaller cross-encoder from a larger teacher.
- Batch the rerank step. Most cross-encoders see large speedups at
  batch sizes of 16–32.

## Calling it

A minimal reranker in Python:

```python
from sentence_transformers import CrossEncoder

model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-12-v2")

def rerank(query: str, candidates: list[str], top_n: int = 10):
    pairs = [(query, c) for c in candidates]
    scores = model.predict(pairs, batch_size=32)
    ordered = sorted(zip(candidates, scores), key=lambda x: -x[1])
    return ordered[:top_n]
```

The bi-encoder gives recall; the cross-encoder gives ordering. Most of
the perceived "quality" of a retrieval system lives in the second
stage.

> The bi-encoder asks _which documents might match_. The cross-encoder
> asks _which one is the answer_.

## Related

- Bi-encoders / dual encoders
- ANN indexes (HNSW, IVF-PQ)
- Listwise ranking losses
