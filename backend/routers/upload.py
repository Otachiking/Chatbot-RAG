"""
Upload router — POST /api/upload

Accepts multipart file (PDF or image), runs ingestion pipeline,
and returns metadata + chunk count.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile

from services.ingest_service import process_upload

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
