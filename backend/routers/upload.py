"""
Upload router — POST /api/upload

Accepts multipart file (PDF or image), runs ingestion pipeline,
and returns metadata + chunk count.
"""

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from services.ingest_service import process_upload
from utils.settings import UPLOADS_DIR

router = APIRouter()


@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Ingest a PDF or image file.

    Returns:
        file_id, filename, pages, chunks_indexed, type, recommended_actions
    """
    try:
        contents = await file.read()
        result = await process_upload(file.filename or "unknown.pdf", contents)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/files/{file_id}")
async def get_uploaded_file(file_id: str):
    uploads_dir = Path(UPLOADS_DIR)
    if not uploads_dir.exists():
        raise HTTPException(status_code=404, detail="Upload storage not found")

    matches = sorted(uploads_dir.glob(f"{file_id}__*"))
    if not matches:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = matches[0]
    ext = file_path.suffix.lower()

    media_type = "application/octet-stream"
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext in {".png"}:
        media_type = "image/png"
    elif ext in {".jpg", ".jpeg"}:
        media_type = "image/jpeg"
    elif ext in {".webp"}:
        media_type = "image/webp"
    elif ext in {".gif"}:
        media_type = "image/gif"

    original_name = file_path.name.split("__", 1)[1] if "__" in file_path.name else file_path.name
    return FileResponse(path=file_path, media_type=media_type, filename=original_name)
