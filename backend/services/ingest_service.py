"""
Document ingestion service.

Handles PDF and image uploads:
  1. Detect file type (PDF vs. image).
  2. Extract text (PyMuPDF for PDF, pytesseract for images).
  3. Chunk the extracted text.
  4. Embed chunks via Gemini and store in ChromaDB.
  5. Return metadata to the caller.

Dependencies:
  - PyMuPDF (pip install PyMuPDF)         → optional, graceful fallback
  - pytesseract + Pillow (pip install pytesseract Pillow) → optional
  - Tesseract OCR binary must be on PATH for pytesseract.
"""

import asyncio
import io
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple

import google.genai as genai
import chromadb

from utils.settings import (
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    CHROMA_PERSIST_DIR,
    GEMINI_API_KEY,
)

# ---------------------------------------------------------------------------
# Optional heavy deps — graceful fallback if not installed
# ---------------------------------------------------------------------------

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from PIL import Image
    import pytesseract
    # Test if tesseract binary is available
    pytesseract.get_tesseract_version()
    HAS_OCR = True
except (ImportError, pytesseract.TesseractNotFoundError, Exception):
    HAS_OCR = False

# ---------------------------------------------------------------------------
# Configure Gemini (embeddings)
# ---------------------------------------------------------------------------

client_genai = genai.Client(api_key=GEMINI_API_KEY)

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------


def extract_text_from_pdf(file_bytes: bytes) -> List[Tuple[int, str]]:
    """
    Extract text from every page of a PDF.
    Falls back to OCR for pages with no selectable text.

    Returns list of (page_number, text) tuples.
    """
    if not HAS_PYMUPDF:
        return [
            (1, "[PyMuPDF not installed — run: pip install PyMuPDF]")
        ]

    pages: List[Tuple[int, str]] = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text().strip()

        # Fallback to OCR if page has no selectable text
        if not text and HAS_OCR:
            try:
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text = pytesseract.image_to_string(img).strip()
            except Exception:
                pass  # OCR failed, continue without it

        if text:
            pages.append((page_num + 1, text))

    doc.close()
    return pages


def extract_text_from_image(file_bytes: bytes) -> List[Tuple[int, str]]:
    """
    Run OCR on an image file. Treats the result as a single-page document.
    """
    if not HAS_OCR:
        return [
            (1, "[OCR not available - Tesseract not installed. PDF text extraction still works.]")
        ]

    try:
        img = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(img).strip()
        return [(1, text if text else "[No text detected in image]")]
    except Exception as e:
        return [(1, f"[OCR failed: {str(e)}]")]


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[str]:
    """Split text into overlapping character-level chunks."""
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        start = end - overlap
        if start <= (end - chunk_size):  # safety: avoid infinite loop
            break
    return chunks


# ---------------------------------------------------------------------------
# ChromaDB storage
# ---------------------------------------------------------------------------


def _embed_batch(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts via Gemini in batches of up to 100."""
    embeddings: List[List[float]] = []
    for i in range(0, len(texts), 100):
        batch = texts[i : i + 100]
        if len(batch) == 1:
            result = client_genai.models.embed_content(
                model="gemini-embedding-001",
                contents=batch[0],
            )
            embeddings.append(list(result.embeddings[0].values))
        else:
            result = client_genai.models.embed_content(
                model="gemini-embedding-001",
                contents=batch,
            )
            for emb in result.embeddings:
                embeddings.append(list(emb.values))
    return embeddings


def store_in_chromadb(
    file_id: str,
    filename: str,
    pages: List[Tuple[int, str]],
) -> int:
    """Chunk all pages, embed, and upsert into ChromaDB. Returns chunk count."""
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    collection = client.get_or_create_collection("rag_documents")

    all_chunks: List[str] = []
    all_ids: List[str] = []
    all_meta: List[Dict[str, Any]] = []

    chunk_idx = 0
    for page_num, text in pages:
        for piece in chunk_text(text):
            all_chunks.append(piece)
            all_ids.append(f"{file_id}_chunk_{chunk_idx}")
            all_meta.append(
                {
                    "file_id": file_id,
                    "filename": filename,
                    "page": page_num,
                    "chunk_index": chunk_idx,
                }
            )
            chunk_idx += 1

    if not all_chunks:
        return 0

    embeddings = _embed_batch(all_chunks)

    collection.add(
        documents=all_chunks,
        embeddings=embeddings,
        ids=all_ids,
        metadatas=all_meta,
    )
    return len(all_chunks)


# ---------------------------------------------------------------------------
# File type detection
# ---------------------------------------------------------------------------


def detect_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"):
        return "image"
    return "unknown"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def process_upload(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Full ingestion pipeline (async wrapper around sync I/O).

    Returns metadata dict consumed by the frontend.
    """
    file_type = detect_file_type(filename)
    file_id = f"doc-{uuid.uuid4().hex[:8]}"

    # 1. Extract text
    if file_type == "pdf":
        pages = await asyncio.to_thread(extract_text_from_pdf, file_bytes)
    elif file_type == "image":
        pages = await asyncio.to_thread(extract_text_from_image, file_bytes)
    else:
        pages = [(1, f"Unsupported file type: {Path(filename).suffix}")]

    # 2. Chunk + embed + store
    chunks_indexed = await asyncio.to_thread(
        store_in_chromadb, file_id, filename, pages
    )

    return {
        "file_id": file_id,
        "filename": filename,
        "pages": len(pages),
        "chunks_indexed": chunks_indexed,
        "type": file_type,
        "recommended_actions": ["summarize", "quiz"],
    }
