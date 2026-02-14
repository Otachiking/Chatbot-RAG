"""
Ingest stub — simulates PDF processing.

TODO: Replace this module with real ingestion logic:
  1. Parse PDF with a library like PyMuPDF / pdfplumber.
  2. Chunk text and generate embeddings (e.g. OpenAI, Sentence-Transformers).
  3. Store vectors in a vector DB (Pinecone, Weaviate, ChromaDB, etc.).
"""

import asyncio
import uuid
from typing import Any, Dict


async def process_upload(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Simulate document ingestion.

    In production this would:
      - Extract text from every page of the PDF.
      - Split text into overlapping chunks (~512 tokens).
      - Embed each chunk and upsert into a vector store.

    Returns fake metadata so the frontend can render immediately.
    """
    # --- Simulate processing delay (1–2 s) ---
    await asyncio.sleep(1.0)

    file_id = f"doc-{uuid.uuid4().hex[:8]}"
    fake_page_count = max(5, len(file_bytes) // 2000)  # rough heuristic for demo

    return {
        "file_id": file_id,
        "filename": filename,
        "pages": fake_page_count,
        "detected_text_snippets": [
            "Chapter 1 — Introduction to Retrieval-Augmented Generation …",
            "Section 2.3 — Embedding models comparison table …",
            "Appendix A — Glossary of NLP terms …",
        ],
        "recommended_actions": ["summarize", "quiz"],
        "preview_urls": [
            f"/api/preview/{file_id}/page/1",
            f"/api/preview/{file_id}/page/2",
            f"/api/preview/{file_id}/page/3",
        ],
    }
