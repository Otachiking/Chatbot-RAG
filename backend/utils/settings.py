"""
Application settings — loaded from .env at import time.

All configuration knobs live here so the rest of the codebase can do:
    from utils.settings import GEMINI_API_KEY, CHUNK_SIZE, ...
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend/ directory
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

# ---------------------------------------------------------------------------
# Gemini / LLM
# ---------------------------------------------------------------------------

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
USE_LOCAL_LLM: bool = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "100"))

# ---------------------------------------------------------------------------
# RAG
# ---------------------------------------------------------------------------

RAG_SIMILARITY_THRESHOLD: float = float(
    os.getenv("RAG_SIMILARITY_THRESHOLD", "0.35")
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_BACKEND_ROOT = Path(__file__).resolve().parent.parent

CHROMA_PERSIST_DIR: str = str(_BACKEND_ROOT / "chroma_data")
LOG_DIR: Path = _BACKEND_ROOT / "logs"
LOG_FILE: Path = LOG_DIR / "queries.jsonl"
