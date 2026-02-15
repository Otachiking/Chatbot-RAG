"""
Query router — POST /api/query

Accepts a JSON body with query text, optional file_id, use_rag flag,
and query type. Routes to the hybrid RAG service.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.rag_service import handle_query

router = APIRouter()


class HistoryMessage(BaseModel):
    role: str  # "user" | "bot"
    text: str


class QueryRequest(BaseModel):
    file_id: Optional[str] = None
    filename: Optional[str] = None  # Document name for context
    query: str = ""
    type: str = "freeform"        # "summarize" | "quiz" | "freeform"
    use_rag: bool = False         # NEW — hybrid toggle
    history: List[HistoryMessage] = []  # Conversation history for context


@router.post("/api/query")
async def query_document(req: QueryRequest):
    """
    Answer a user query.

    If use_rag=true and a valid file_id is provided, retrieval is performed
    against the indexed document chunks. Otherwise, a general LLM response
    is returned.
    """
    # Build conversation history for context
    history = [{"role": m.role, "text": m.text} for m in req.history]

    try:
        result = await handle_query(
            query=req.query,
            file_id=req.file_id,
            filename=req.filename,
            use_rag=req.use_rag,
            query_type=req.type,
            history=history,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
