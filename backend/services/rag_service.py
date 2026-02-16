"""
Hybrid RAG service — handles both General Chat and RAG queries.

Decision logic:
    IF use_rag == True AND file_id is present AND chunks exist:
        → run retrieval pipeline (embed query → ChromaDB → LLM with context)
    ELSE:
        → run general LLM generation (no retrieval)

Both paths share the same underlying generate_from_prompt() helper
so swapping to a different LLM is a single-point change.
"""

import time
import asyncio
import traceback
from typing import Any, Dict, List, Optional

import google.genai as genai
import chromadb

from utils.settings import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    CHROMA_PERSIST_DIR,
    RAG_SIMILARITY_THRESHOLD,
)
from utils.logging_utils import log_query

# ---------------------------------------------------------------------------
# Configure Gemini
# ---------------------------------------------------------------------------

client_genai = genai.Client(api_key=GEMINI_API_KEY)

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

RAG_SYSTEM_PROMPT = (
    "Jawab singkat (2 kalimat) lalu detail bullet points.\n"
    "Gunakan hanya informasi dari potongan sumber.\n"
    "Jika tidak ditemukan, jawab 'Tidak ditemukan dalam dokumen'.\n"
    "Sertakan sumber dalam format: (Hal. X)."
)

QUIZ_SYSTEM_PROMPT = (
    "Kamu adalah pembuat kuis yang ahli. "
    "Buat soal pilihan ganda berdasarkan informasi dari dokumen yang diberikan. "
    "Format setiap soal dengan jelas: nomor soal, pertanyaan, pilihan A/B/C/D, lalu kunci jawaban. "
    "Pastikan soal bervariasi tingkat kesulitannya dan mencakup poin-poin penting dari dokumen."
)

SUMMARY_SYSTEM_PROMPT = (
    "Kamu adalah asisten yang ahli merangkum dokumen. "
    "Buatlah ringkasan yang komprehensif dan terstruktur. "
    "Gunakan bullet points untuk poin-poin utama. "
    "Sertakan halaman referensi dalam format (Hal. X)."
)

GENERAL_SYSTEM_PROMPT = (
    "You are a helpful AI assistant. "
    "Answer the user's question clearly and concisely. "
    "When the user uses pronouns like 'he', 'she', 'it', 'they', 'dia', 'mereka', "
    "refer to the conversation history to resolve what or whom they are referring to."
)

# ---------------------------------------------------------------------------
# Core LLM helper
# ---------------------------------------------------------------------------


def generate_from_prompt(prompt: str, system: str = "") -> str:
    """
    Call Gemini and return the text response.

    TODO: To switch to a local LLM, replace this function body with
    an inference call to your model (e.g. llama-cpp-python, vLLM, etc.).
    """
    config = None
    if system:
        config = genai.types.GenerateContentConfig(
            system_instruction=system,
        )
    response = client_genai.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
    )
    return response.text


# ---------------------------------------------------------------------------
# General (non-RAG) response
# ---------------------------------------------------------------------------


def _build_history_context(history: List[Dict[str, str]]) -> str:
    """Format conversation history into a prompt-friendly string."""
    if not history:
        return ""
    lines = []
    for msg in history[-10:]:  # Last 10 messages for context
        role = "User" if msg.get("role") == "user" else "Assistant"
        text = str(msg.get("text", "")).strip()
        if text:
            lines.append(f"{role}: {text}")
    return "\n".join(lines)


def generate_general_response(
    query: str, history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """Pure LLM generation — no retrieval."""
    history_ctx = _build_history_context(history or [])
    prompt = query
    if history_ctx:
        prompt = f"Conversation history:\n{history_ctx}\n\nCurrent question: {query}"

    gen_start = time.time()
    answer = generate_from_prompt(prompt, system=GENERAL_SYSTEM_PROMPT)
    gen_ms = (time.time() - gen_start) * 1000

    return {
        "answer": answer,
        "sources": [],
        "chunk_ids": None,
        "scores": None,
        "retrieval_latency_ms": None,
        "generation_latency_ms": gen_ms,
    }


# ---------------------------------------------------------------------------
# RAG response
# ---------------------------------------------------------------------------


def _retrieve_chunks(
    query: str, file_id: str, top_k: int = 4
) -> Dict[str, Any]:
    """Embed query and search ChromaDB, filtered by file_id."""
    query_result = client_genai.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
    )
    query_emb = list(query_result.embeddings[0].values)

    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    collection = client.get_or_create_collection("rag_documents")

    results = collection.query(
        query_embeddings=[query_emb],
        n_results=top_k,
        where={"file_id": file_id},
    )
    return results


def generate_rag_response(
    query: str,
    file_id: str,
    top_k: int = 4,
    query_type: str = "freeform",
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Retrieve relevant chunks then generate an answer grounded in them."""

    # 1. Retrieval
    ret_start = time.time()
    results = _retrieve_chunks(query, file_id, top_k)
    ret_ms = (time.time() - ret_start) * 1000

    docs = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    ids = results.get("ids", [[]])[0]

    if not docs:
        return {
            "answer": "Tidak ditemukan dalam dokumen.",
            "sources": [],
            "chunk_ids": [],
            "scores": [],
            "retrieval_latency_ms": ret_ms,
            "generation_latency_ms": 0,
        }

    # Optional: if best similarity is below threshold, fallback
    # Skip this for quiz/summary since we need the document content
    similarities = [max(0, 1 - d) for d in distances]
    if query_type == "freeform" and similarities and similarities[0] < RAG_SIMILARITY_THRESHOLD:
        # Low confidence — fall back to general chat
        gen_result = generate_general_response(query, history)
        gen_result["retrieval_latency_ms"] = ret_ms
        gen_result["chunk_ids"] = ids
        gen_result["scores"] = similarities
        return gen_result

    # 2. Build context
    context_parts: List[str] = []
    sources: List[Dict[str, Any]] = []
    seen_pages: set = set()

    for doc, meta in zip(docs, metadatas):
        page = meta.get("page", "?")
        context_parts.append(f"[Hal. {page}]: {doc}")
        key = (meta.get("filename", "document"), page)
        if key not in seen_pages:
            seen_pages.add(key)
            sources.append({"file": key[0], "page": page})

    context = "\n\n".join(context_parts)
    history_ctx = _build_history_context(history or [])
    if history_ctx:
        prompt = f"Konteks:\n{context}\n\nConversation history:\n{history_ctx}\n\nPertanyaan: {query}"
    else:
        prompt = f"Konteks:\n{context}\n\nPertanyaan: {query}"

    # 3. Select system prompt based on query type
    if query_type == "quiz":
        system_prompt = QUIZ_SYSTEM_PROMPT
    elif query_type == "summarize":
        system_prompt = SUMMARY_SYSTEM_PROMPT
    else:
        system_prompt = RAG_SYSTEM_PROMPT

    # 4. Generation
    gen_start = time.time()
    answer = generate_from_prompt(prompt, system=system_prompt)
    gen_ms = (time.time() - gen_start) * 1000

    return {
        "answer": answer,
        "sources": sources,
        "chunk_ids": ids,
        "scores": similarities,
        "retrieval_latency_ms": ret_ms,
        "generation_latency_ms": gen_ms,
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def handle_query(
    query: str,
    file_id: Optional[str] = None,
    filename: Optional[str] = None,
    use_rag: bool = False,
    query_type: str = "freeform",
    top_k: int = 4,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Route to general or RAG pipeline based on use_rag flag.

    This is the function the /api/query endpoint calls.
    """
    start = time.time()
    request_id = f"req-{int(time.time() * 1000)}"

    # Enrich query for specific action types
    effective_query = query
    effective_top_k = top_k
    doc_context = f"untuk dokumen '{filename}'" if filename else "untuk dokumen yang diberikan"
    
    if use_rag and file_id:
        if query_type == "summarize":
            effective_query = f"Berikan ringkasan lengkap dan komprehensif {doc_context}. Sertakan poin-poin utama dari dokumen tersebut."
            effective_top_k = 20  # Get more chunks for summary
        elif query_type == "quiz":
            effective_query = f"Buat 5 soal kuis pilihan ganda (A, B, C, D) beserta kunci jawabannya berdasarkan informasi penting {doc_context}."
            effective_top_k = 20  # Get more chunks for quiz

    try:
        if use_rag and file_id:
            result = await asyncio.to_thread(
                generate_rag_response, effective_query, file_id, effective_top_k, query_type, history
            )
            mode = "rag"
        else:
            result = await asyncio.to_thread(
                generate_general_response, effective_query, history
            )
            mode = "general"

        total_ms = (time.time() - start) * 1000

        # Log
        log_query(
            query=effective_query,
            mode=mode,
            file_id=file_id,
            use_rag=use_rag,
            retrieved_chunk_ids=result.get("chunk_ids"),
            retrieval_scores=result.get("scores"),
            retrieval_latency_ms=result.get("retrieval_latency_ms"),
            generation_latency_ms=result.get("generation_latency_ms"),
            total_latency_ms=total_ms,
            success=True,
            model=GEMINI_MODEL,
        )

        return {
            "answer": result["answer"],
            "sources": result["sources"],
            "file_id": file_id,
        }

    except Exception as exc:
        total_ms = (time.time() - start) * 1000
        tb = traceback.format_exc()

        print(
            f"[RAG_ERROR] request_id={request_id} mode={'rag' if (use_rag and file_id) else 'general'} "
            f"model={GEMINI_MODEL} file_id={file_id} error_type={type(exc).__name__} error={exc}\n{tb}"
        )

        log_query(
            query=effective_query,
            mode="rag" if (use_rag and file_id) else "general",
            file_id=file_id,
            use_rag=use_rag,
            total_latency_ms=total_ms,
            success=False,
            error=str(exc),
            error_type=type(exc).__name__,
            error_stage="handle_query",
            traceback_text=tb,
            model=GEMINI_MODEL,
        )
        try:
            fallback = await asyncio.to_thread(
                generate_general_response, query, history
            )
            return {
                "answer": fallback.get("answer", "Maaf, terjadi gangguan sementara. Silakan coba lagi."),
                "sources": [],
                "file_id": file_id,
                "request_id": request_id,
            }
        except Exception as fallback_exc:
            fallback_tb = traceback.format_exc()
            print(
                f"[RAG_ERROR] request_id={request_id} fallback_failed error_type={type(fallback_exc).__name__} "
                f"error={fallback_exc}\n{fallback_tb}"
            )
            log_query(
                query=effective_query,
                mode="fallback-general",
                file_id=file_id,
                use_rag=use_rag,
                total_latency_ms=total_ms,
                success=False,
                error=str(fallback_exc),
                error_type=type(fallback_exc).__name__,
                error_stage="fallback_general",
                traceback_text=fallback_tb,
                model=GEMINI_MODEL,
            )
            return {
                "answer": f"Maaf, server sedang sibuk. Coba beberapa detik lagi. (ref: {request_id})",
                "sources": [],
                "file_id": file_id,
                "request_id": request_id,
            }
