from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from .models import WorkoutData
from .services.v2.document_service_v2 import DocumentServiceV2

# Initialize FastAPI app
app = FastAPI(
    title="Ghost Gym V2 - Advanced Log Book API",
    description="API for generating customized gym log documents from HTML templates. V2 - Modern HTML/PDF generation with Gotenberg.",
    version="2.0.0"
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize V2 document service
document_service_v2 = DocumentServiceV2()

# Create necessary directories
os.makedirs("backend/uploads", exist_ok=True)
os.makedirs("backend/templates/html", exist_ok=True)

# Mount static files (frontend)
# Add debug logging for static files
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if frontend directory exists
frontend_path = Path("frontend")
if frontend_path.exists():
    logger.info(f"Frontend directory found: {frontend_path.absolute()}")
    logger.info(f"Frontend contents: {list(frontend_path.iterdir())}")
    app.mount("/static", StaticFiles(directory="frontend"), name="static")
else:
    logger.error(f"Frontend directory not found at: {frontend_path.absolute()}")

@app.get("/", response_class=HTMLResponse)
async def serve_v2_frontend():
    """Serve the V2 frontend page"""
    try:
        with open("frontend/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content="<h1>V2 Frontend not found</h1><p>Please ensure frontend/index.html exists</p>",
            status_code=404
        )

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Ghost Gym V2 API is running", "version": "v2"}

@app.get("/api/debug/static")
async def debug_static():
    """Debug static file serving"""
    frontend_path = Path("frontend")
    css_path = frontend_path / "css" / "style-v2.css"
    js_path = frontend_path / "js" / "app-v2.js"
    
    return {
        "frontend_exists": frontend_path.exists(),
        "frontend_absolute": str(frontend_path.absolute()),
        "css_exists": css_path.exists(),
        "css_absolute": str(css_path.absolute()),
        "js_exists": js_path.exists(),
        "js_absolute": str(js_path.absolute()),
        "working_directory": str(Path.cwd()),
        "frontend_contents": [str(p) for p in frontend_path.iterdir()] if frontend_path.exists() else []
    }

@app.get("/api/status")
async def v2_status():
    """Get V2 system status including Gotenberg availability"""
    try:
        gotenberg_available = document_service_v2.is_gotenberg_available()
        return {
            "version": "v2",
            "status": "available",
            "gotenberg_available": gotenberg_available,
            "features": {
                "html_templates": True,
                "pdf_generation": gotenberg_available,
                "instant_preview": True
            }
        }
    except Exception as e:
        return {
            "version": "v2",
            "status": "error",
            "error": str(e),
            "gotenberg_available": False
        }

@app.get("/api/templates")
async def list_templates_v2():
    """List available HTML templates for V2"""
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

@app.post("/api/preview-html")
async def preview_html_v2(workout_data: WorkoutData):
    """Generate HTML preview (instant, no PDF conversion)"""
    try:
        # Generate HTML content
        html_content = document_service_v2.generate_html_document(workout_data)
        
        # Return HTML content directly
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating HTML preview: {str(e)}")

@app.post("/api/preview-pdf")
async def preview_pdf_v2(workout_data: WorkoutData):
    """Generate PDF preview using Gotenberg (V2 system)"""
    try:
        # Check if Gotenberg is available
        if not document_service_v2.is_gotenberg_available():
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available. Gotenberg service is not running."
            )
        
        # Generate PDF preview
        pdf_path = document_service_v2.generate_pdf_preview(workout_data)
        
        # Return the PDF for viewing
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF preview: {str(e)}")

@app.post("/api/generate-html")
async def generate_html_v2(workout_data: WorkoutData):
    """Generate and download HTML file"""
    try:
        # Generate HTML file
        html_path = document_service_v2.generate_html_file(workout_data)
        
        # Return the file for download
        filename = f"gym_log_{workout_data.workout_name.replace(' ', '_')}_{workout_data.workout_date}.html"
        
        return FileResponse(
            path=html_path,
            filename=filename,
            media_type="text/html"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating HTML document: {str(e)}")

@app.post("/api/generate-pdf")
async def generate_pdf_v2(workout_data: WorkoutData):
    """Generate and download PDF file using Gotenberg"""
    try:
        # Check if Gotenberg is available
        if not document_service_v2.is_gotenberg_available():
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available. Gotenberg service is not running."
            )
        
        # Generate PDF file
        pdf_path = document_service_v2.generate_pdf_preview(workout_data)
        
        # Return the file for download
        filename = f"gym_log_{workout_data.workout_name.replace(' ', '_')}_{workout_data.workout_date}.pdf"
        
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF document: {str(e)}")

@app.get("/api/template-info")
async def get_template_info_v2():
    """Get information about the V2 HTML template"""
    try:
        template_info = document_service_v2.get_template_info()
        return template_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting template info: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
