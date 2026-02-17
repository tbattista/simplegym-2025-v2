"""
Import API Endpoints
Handles workout import: parse text, CSV, JSON, uploaded files,
URLs, images, and PDFs into WorkoutTemplate format
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, Dict, Any
import logging

from ..models import (
    ImportParseRequest, ImportParseResponse,
    ImportAIParseRequest, ImportURLRequest,
)
from ..services.parsers import import_service
from ..services.parsers.ai_parser import get_ai_parser
from ..services.parsers.url_parser import url_parser
from ..services.parsers.image_parser import image_parser
from ..services.parsers.pdf_parser import pdf_parser
from ..services.ai_rate_limiter import ai_rate_limiter
from ..middleware.auth import get_current_user_optional, extract_user_id

router = APIRouter(prefix="/api/v3/import", tags=["Import"])
logger = logging.getLogger(__name__)

# Max file sizes
MAX_TEXT_FILE_SIZE = 50 * 1024        # 50KB for text files
MAX_IMAGE_SIZE = 10 * 1024 * 1024     # 10MB for images
MAX_PDF_SIZE = 10 * 1024 * 1024       # 10MB for PDFs


# ── Existing endpoints (unchanged) ───────────────────────────────────────

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

    if len(content_bytes) > MAX_TEXT_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_TEXT_FILE_SIZE // 1024}KB")

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


# ── AI-powered endpoints ─────────────────────────────────────────────────

def _check_ai_rate_limit(user_id: str, is_authenticated: bool):
    """Helper to check rate limit and raise if exceeded."""
    allowed, remaining = ai_rate_limiter.check_limit(user_id, is_authenticated)
    if not allowed:
        usage = ai_rate_limiter.get_usage(user_id, is_authenticated)
        raise HTTPException(
            status_code=429,
            detail=f"AI import limit reached ({usage['limit']}/day). "
                   f"Resets in ~24 hours. Try pasting text directly for instant parsing."
        )


def _build_response(result) -> ImportParseResponse:
    """Build ImportParseResponse from a ParseResult."""
    return ImportParseResponse(
        success=result.success,
        workout_data=result.workout_data,
        warnings=result.warnings,
        errors=result.errors,
        confidence=result.confidence,
        source_format=result.source_format,
    )


@router.post("/parse-ai", response_model=ImportParseResponse)
async def parse_workout_ai(
    request: ImportAIParseRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Parse workout content using AI (Gemini).
    Use when standard parsers fail or for messy/unstructured text.
    """
    user_id = extract_user_id(current_user) or request.anonymous_id or "anon"
    is_auth = bool(extract_user_id(current_user))

    _check_ai_rate_limit(user_id, is_auth)

    ai_parser = get_ai_parser()
    if not ai_parser.is_available():
        raise HTTPException(status_code=503, detail="AI import is not currently available")

    try:
        result = ai_parser.parse_text(request.content)
        ai_rate_limiter.record_request(user_id)

        if result.success:
            result = import_service.validate_and_normalize(result)

        return _build_response(result)
    except Exception as e:
        logger.error(f"AI parse error: {e}")
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {str(e)}")


@router.post("/parse-url", response_model=ImportParseResponse)
async def parse_workout_url(
    request: ImportURLRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Parse workout from a URL. Extracts page content, then uses AI.
    """
    user_id = extract_user_id(current_user) or request.anonymous_id or "anon"
    is_auth = bool(extract_user_id(current_user))

    _check_ai_rate_limit(user_id, is_auth)

    if not url_parser.can_parse(request.url):
        raise HTTPException(status_code=400, detail="Invalid URL format")

    try:
        result = url_parser.parse(request.url)
        ai_rate_limiter.record_request(user_id)

        if result.success:
            result = import_service.validate_and_normalize(result)

        return _build_response(result)
    except Exception as e:
        logger.error(f"URL parse error: {e}")
        raise HTTPException(status_code=500, detail=f"URL parsing failed: {str(e)}")


@router.post("/parse-media", response_model=ImportParseResponse)
async def parse_workout_media(
    file: UploadFile = File(...),
    anonymous_id: Optional[str] = Form(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Parse workout from an uploaded image or PDF using AI.
    Supports: JPEG, PNG, WebP, GIF, PDF.
    """
    user_id = extract_user_id(current_user) or anonymous_id or "anon"
    is_auth = bool(extract_user_id(current_user))

    _check_ai_rate_limit(user_id, is_auth)

    # Determine content type
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()

    # Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")

    # Route to appropriate parser
    if image_parser.can_parse(content_type):
        if len(file_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Image too large. Maximum: {MAX_IMAGE_SIZE // (1024 * 1024)}MB"
            )
        result = image_parser.parse(file_bytes, content_type)

    elif pdf_parser.can_parse(content_type, filename):
        if len(file_bytes) > MAX_PDF_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"PDF too large. Maximum: {MAX_PDF_SIZE // (1024 * 1024)}MB"
            )
        result = pdf_parser.parse(file_bytes)

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Supported: JPEG, PNG, WebP, GIF, PDF"
        )

    ai_rate_limiter.record_request(user_id)

    if result.success:
        result = import_service.validate_and_normalize(result)

    return _build_response(result)
