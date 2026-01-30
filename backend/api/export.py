"""
Export API Endpoints
Handles workout exports: text, image, and printable PDF formats
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, FileResponse
from typing import Optional
import logging

from ..models import WorkoutTemplate
from ..services.export_service import ExportService
from ..services.firestore_data_service import firestore_data_service
from ..middleware.auth import get_current_user_optional, extract_user_id

router = APIRouter(prefix="/api/v3/export", tags=["Export"])
logger = logging.getLogger(__name__)

# Initialize export service
export_service = ExportService()


@router.get("/text/{workout_id}", response_class=PlainTextResponse)
async def export_workout_text(
    workout_id: str,
    include_weights: bool = Query(False, description="Include exercise weights in the text"),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Export workout as plain text.
    Returns ASCII-formatted text suitable for SMS/copy-paste.
    """
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Get workout
    workout = await firestore_data_service.get_workout(user_id, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Generate text export
    try:
        text_content = export_service.generate_text_export(workout, include_weights=include_weights)
        return PlainTextResponse(content=text_content)
    except Exception as e:
        logger.error(f"Error generating text export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate text export: {str(e)}")


@router.post("/image/{workout_id}")
async def export_workout_image(
    workout_id: str,
    include_weights: bool = Query(False, description="Include exercise weights in the image"),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Export workout as shareable image (PNG).
    Returns a 1080x1920 story-format image with dark gradient design.
    """
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Get workout
    workout = await firestore_data_service.get_workout(user_id, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Generate image
    try:
        image_path = export_service.generate_shareable_image(workout, include_weights=include_weights)
        if not image_path:
            raise HTTPException(status_code=500, detail="Failed to generate image")

        return FileResponse(
            path=str(image_path),
            filename=image_path.name,
            media_type="image/png"
        )
    except Exception as e:
        logger.error(f"Error generating image export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")


@router.post("/print/{workout_id}")
async def export_workout_print(
    workout_id: str,
    include_weights: bool = Query(False, description="Include exercise weights in the PDF"),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Export workout as printable PDF.
    Returns a clean, black & white PDF optimized for printing.
    """
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Get workout
    workout = await firestore_data_service.get_workout(user_id, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Generate printable PDF
    try:
        pdf_path = export_service.generate_printable_pdf(workout, include_weights=include_weights)
        if not pdf_path:
            raise HTTPException(status_code=500, detail="Failed to generate PDF")

        return FileResponse(
            path=str(pdf_path),
            filename=pdf_path.name,
            media_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"Error generating print export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/status")
async def get_export_status():
    """
    Check export service availability.
    Returns which export formats are available (text always works, image/print need Gotenberg).
    """
    from ..services.v2.gotenberg_client import GotenbergClient

    client = GotenbergClient()
    gotenberg_available = client.is_available()

    return {
        "text_export": True,  # Always available
        "image_export": gotenberg_available,
        "print_export": gotenberg_available,
        "gotenberg_status": "available" if gotenberg_available else "unavailable"
    }
