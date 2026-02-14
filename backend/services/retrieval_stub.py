"""
Retrieval stub — returns canned RAG answers.

TODO: Replace with real retrieval pipeline:
  1. Embed the user query.
  2. Search the vector store for top-k relevant chunks.
  3. Feed retrieved chunks + query into an LLM (GPT-4, Claude, etc.).
  4. Return the generated answer plus source citations.
"""

import asyncio
import random
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Canned responses — keyed by query *type* for the demo.  In production,
# actual content would come from the LLM + retriever.
# ---------------------------------------------------------------------------

_SUMMARY_ANSWER = (
    "This document provides a comprehensive overview of Retrieval-Augmented "
    "Generation (RAG). It covers embedding strategies, chunking approaches, "
    "vector database selection, and prompt engineering best practices. Key "
    "highlights include a comparison of dense vs. sparse retrieval methods "
    "(Chapter 3) and a case study on customer-support chatbots (Chapter 7)."
)

_QUIZ_QUESTIONS = (
    "Here are 3 quiz questions based on the document:\n\n"
    "1. What is the primary advantage of RAG over fine-tuning?\n"
    "   A) Lower latency  B) Access to up-to-date knowledge  C) Smaller model size\n\n"
    "2. Which embedding model achieved the highest recall in the benchmark (Table 2.3)?\n"
    "   A) text-embedding-ada-002  B) all-MiniLM-L6-v2  C) e5-large-v2\n\n"
    "3. In the case study (Ch. 7), what metric improved most after adding RAG?\n"
    "   A) Response time  B) Answer accuracy  C) User satisfaction"
)

_FREE_FORM_ANSWERS: List[str] = [
    "Based on the document, RAG combines retrieval from external knowledge "
    "sources with generative language models to produce grounded answers. "
    "The key benefit is reduced hallucination compared to pure generation.",

    "According to Chapter 4, the optimal chunk size depends on your embedding "
    "model's context window. The authors recommend 256–512 tokens with a 20 % "
    "overlap for most use cases.",

    "The document mentions three vector databases: Pinecone (managed), Weaviate "
    "(open-source), and ChromaDB (lightweight). Each has trade-offs in cost, "
    "scalability, and ease of setup (see Table 5.1).",
]


async def answer_query(
    file_id: str,
    query: str,
    query_type: str = "freeform",
) -> Dict[str, Any]:
    """
    Return a canned answer based on *query_type*.

    In production this function would:
      - Embed ``query``.
      - Retrieve top-k chunks from the vector store for ``file_id``.
      - Call an LLM with the retrieved context and the user query.
      - Parse and return the answer with source metadata.
    """
    # Simulate LLM latency (600–1200 ms)
    await asyncio.sleep(random.uniform(0.6, 1.2))

    if query_type == "summarize":
        answer = _SUMMARY_ANSWER
        sources = [
            {"file": "sample_manual.pdf", "page": 1},
            {"file": "sample_manual.pdf", "page": 3},
            {"file": "sample_manual.pdf", "page": 7},
        ]
    elif query_type == "quiz":
        answer = _QUIZ_QUESTIONS
        sources = [
            {"file": "sample_manual.pdf", "page": 2},
            {"file": "sample_manual.pdf", "page": 5},
        ]
    else:
        answer = random.choice(_FREE_FORM_ANSWERS)
        sources = [
            {"file": "sample_manual.pdf", "page": random.randint(1, 12)},
        ]

    return {
        "answer": answer,
        "sources": sources,
        "file_id": file_id,
    }
