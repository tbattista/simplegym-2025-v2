"""
Import API Endpoints
Handles workout import: parse text, CSV, JSON, and uploaded files into WorkoutTemplate format
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import logging

from ..models import ImportParseRequest, ImportParseResponse
from ..services.parsers import import_service

router = APIRouter(prefix="/api/v3/import", tags=["Import"])
logger = logging.getLogger(__name__)

# Max file size: 50KB for text files
MAX_FILE_SIZE = 50 * 1024


@router.post("/parse", response_model=ImportParseResponse)
async def parse_workout_content(request: ImportParseRequest):
    """
    Parse raw workout content (text, CSV, or JSON) into structured workout data.
    No authentication required — parsing is stateless.
    """
    try:
        result = import_service.parse(
            content=request.content,
            format_hint=request.format_hint
        )

        return ImportParseResponse(
            success=result.success,
            workout_data=result.workout_data,
            warnings=result.warnings,
            errors=result.errors,
            confidence=result.confidence,
            source_format=result.source_format,
        )
    except Exception as e:
        logger.error(f"Error parsing workout content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse content: {str(e)}")


@router.post("/parse-file", response_model=ImportParseResponse)
async def parse_workout_file(
    file: UploadFile = File(...),
    format_hint: Optional[str] = Form(None),
):
    """
    Parse an uploaded file (.txt, .csv, .json) into structured workout data.
    No authentication required — parsing is stateless.
    """
    # Validate file type
    allowed_types = {
        "text/plain", "text/csv", "application/json",
        "application/vnd.ms-excel",  # Some systems send CSV as this
        "text/tab-separated-values",
    }
    content_type = file.content_type or ""

    # Also check extension as fallback
    filename = (file.filename or "").lower()
    allowed_extensions = (".txt", ".csv", ".json", ".tsv")

    if content_type not in allowed_types and not any(filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Accepted: .txt, .csv, .json"
        )

    # Read file content
    try:
        content_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024}KB")

    if not content_bytes:
        raise HTTPException(status_code=400, detail="File is empty")

    # Decode to string
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = content_bytes.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Could not decode file. Please use UTF-8 encoding.")

    # Derive format hint from extension if not provided
    if not format_hint:
        if filename.endswith(".json"):
            format_hint = "json"
        elif filename.endswith(".csv") or filename.endswith(".tsv"):
            format_hint = "csv"
        else:
            format_hint = "text"

    # Parse
    try:
        result = import_service.parse(content=content, format_hint=format_hint)

        return ImportParseResponse(
            success=result.success,
            workout_data=result.workout_data,
            warnings=result.warnings,
            errors=result.errors,
            confidence=result.confidence,
            source_format=result.source_format,
        )
    except Exception as e:
        logger.error(f"Error parsing workout file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")
