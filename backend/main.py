"""
FastAPI backend — RAG ChatBot with hybrid General / RAG mode.

Run with:
    uvicorn main:app --reload --port 8000

Endpoints are split into routers (routers/upload.py, routers/query.py).
Core logic lives in services/ and config in utils/settings.py.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from routers.upload import router as upload_router
from routers.query import router as query_router

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="RAG ChatBot",
    version="0.2.0",
    description="Hybrid RAG backend — Gemini 2.5 Pro TTS + ChromaDB.",
)

# Allow the Next.js dev server (localhost:3000) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],               # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(upload_router)
app.include_router(query_router)

# ---------------------------------------------------------------------------
# Root & health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str


@app.get("/", include_in_schema=False)
async def root():
    """Landing page — confirms the server is running."""
    return {
        "app": "RAG ChatBot",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}
