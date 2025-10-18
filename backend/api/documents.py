"""
Document Generation and Template Management
Handles HTML/PDF document generation and template operations
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, HTMLResponse
from pathlib import Path
from ..models import WorkoutData
from ..api.dependencies import get_document_service
from ..services.v2.document_service_v2 import DocumentServiceV2

router = APIRouter(prefix="/api", tags=["Documents"])


@router.get("/templates")
async def list_templates():
    """List available HTML templates"""
    try:
        templates_dir = Path("backend/templates/html")
        if not templates_dir.exists():
            return {"templates": [], "message": "HTML templates directory not found"}
        
        # Find all .html files in templates directory
        template_files = [
            f.name for f in templates_dir.glob("*.html") 
            if not f.name.startswith("~")  # Exclude temp files
        ]
        
        return {
            "templates": template_files,
            "count": len(template_files),
            "version": "v2",
            "template_type": "html"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing V2 templates: {str(e)}")


@router.post("/preview-html")
async def preview_html(
    workout_data: WorkoutData,
    document_service: DocumentServiceV2 = Depends(get_document_service)
):
    """Generate HTML preview (instant, no PDF conversion)"""
    try:
        # Generate HTML content
        html_content = document_service.generate_html_document(workout_data)
        
        # Return HTML content directly
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating HTML preview: {str(e)}")


@router.post("/preview-pdf")
async def preview_pdf(
    workout_data: WorkoutData,
    document_service: DocumentServiceV2 = Depends(get_document_service)
):
    """Generate PDF preview using Gotenberg"""
    try:
        # Check if Gotenberg is available
        if not document_service.is_gotenberg_available():
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available. Gotenberg service is not running."
            )
        
        # Generate PDF preview
        pdf_path = document_service.generate_pdf_preview(workout_data)
        
        # Return the PDF for viewing
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF preview: {str(e)}")


@router.post("/generate-html")
async def generate_html(
    workout_data: WorkoutData,
    document_service: DocumentServiceV2 = Depends(get_document_service)
):
    """Generate and download HTML file"""
    try:
        # Generate HTML file
        html_path = document_service.generate_html_file(workout_data)
        
        # Return the file for download
        filename = f"gym_log_{workout_data.workout_name.replace(' ', '_')}_{workout_data.workout_date}.html"
        
        return FileResponse(
            path=html_path,
            filename=filename,
            media_type="text/html"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating HTML document: {str(e)}")


@router.post("/generate-pdf")
async def generate_pdf(
    workout_data: WorkoutData,
    document_service: DocumentServiceV2 = Depends(get_document_service)
):
    """Generate and download PDF file using Gotenberg"""
    try:
        # Check if Gotenberg is available
        if not document_service.is_gotenberg_available():
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available. Gotenberg service is not running."
            )
        
        # Generate PDF file
        pdf_path = document_service.generate_pdf_preview(workout_data)
        
        # Return the file for download
        filename = f"gym_log_{workout_data.workout_name.replace(' ', '_')}_{workout_data.workout_date}.pdf"
        
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF document: {str(e)}")


@router.get("/template-info")
async def get_template_info(
    document_service: DocumentServiceV2 = Depends(get_document_service)
):
    """Get information about the V2 HTML template"""
    try:
        template_info = document_service.get_template_info()
        return template_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting template info: {str(e)}")