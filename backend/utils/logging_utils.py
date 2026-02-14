"""
Query logging utility.

Appends a JSON-lines record for every query processed (both general and RAG).
Log file lives at <backend>/logs/queries.jsonl.

Structure per line:
{
  timestamp, query, mode, file_id, use_rag,
  retrieved_chunk_ids, retrieval_scores,
  retrieval_latency_ms, generation_latency_ms, total_latency_ms,
  success, error
}
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from utils.settings import LOG_DIR, LOG_FILE


def _ensure_log_dir() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def log_query(
    query: str,
    mode: str,                                      # "general" | "rag"
    file_id: Optional[str] = None,
    use_rag: bool = False,
    retrieved_chunk_ids: Optional[List[str]] = None,
    retrieval_scores: Optional[List[float]] = None,
    retrieval_latency_ms: Optional[float] = None,
    generation_latency_ms: Optional[float] = None,
    total_latency_ms: Optional[float] = None,
    success: bool = True,
    error: Optional[str] = None,
) -> None:
    """Append one JSON line to the log file."""
    _ensure_log_dir()

    entry: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "query": query,
        "mode": mode,
        "file_id": file_id,
        "use_rag": use_rag,
        "retrieved_chunk_ids": retrieved_chunk_ids,
        "retrieval_scores": retrieval_scores,
        "retrieval_latency_ms": round(retrieval_latency_ms, 2) if retrieval_latency_ms is not None else None,
        "generation_latency_ms": round(generation_latency_ms, 2) if generation_latency_ms is not None else None,
        "total_latency_ms": round(total_latency_ms, 2) if total_latency_ms is not None else None,
        "success": success,
        "error": error,
    }

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_logs() -> List[Dict[str, Any]]:
    """Read all log entries back as a list of dicts."""
    if not LOG_FILE.exists():
        return []
    entries: List[Dict[str, Any]] = []
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if stripped:
                entries.append(json.loads(stripped))
    return entries
