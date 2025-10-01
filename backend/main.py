from fastapi import FastAPI, HTTPException, File, UploadFile, Query, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables FIRST before importing Firebase services
load_dotenv()

from .models import (
    WorkoutData, Program, WorkoutTemplate,
    CreateWorkoutRequest, UpdateWorkoutRequest,
    CreateProgramRequest, UpdateProgramRequest,
    AddWorkoutToProgramRequest, GenerateProgramDocumentRequest,
    WorkoutListResponse, ProgramListResponse, ProgramWithWorkoutsResponse
)
from .services.v2.document_service_v2 import DocumentServiceV2
from .services.data_service import DataService
from .services.firebase_service import firebase_service
from .services.auth_service import auth_service
from .services.unified_data_service import unified_data_service
from .services.migration_service import migration_service
from .middleware.auth import get_current_user_optional, get_current_user, extract_user_id
from .api.migration import router as migration_router

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

# Initialize V2 document service and data service
document_service_v2 = DocumentServiceV2()
data_service = DataService()

# Include Phase 2 migration router
app.include_router(migration_router)

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

@app.get("/dashboard", response_class=HTMLResponse)
async def serve_v3_dashboard():
    """Serve the V3 dashboard page"""
    try:
        with open("frontend/dashboard.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content="<h1>V3 Dashboard not found</h1><p>Please ensure frontend/dashboard.html exists</p>",
            status_code=404
        )

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    firebase_status = "available" if firebase_service.is_available() else "unavailable"
    auth_status = "available" if auth_service.is_available() else "unavailable"
    
    return {
        "status": "healthy",
        "message": "Ghost Gym V3 API is running",
        "version": "v3",
        "firebase_status": firebase_status,
        "auth_status": auth_status
    }

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
async def v3_status():
    """Get V3 system status including Firebase and Gotenberg availability"""
    try:
        gotenberg_available = document_service_v2.is_gotenberg_available()
        firebase_available = firebase_service.is_available()
        auth_available = auth_service.is_available()
        
        return {
            "version": "v3",
            "status": "available",
            "gotenberg_available": gotenberg_available,
            "firebase_available": firebase_available,
            "auth_available": auth_available,
            "features": {
                "html_templates": True,
                "pdf_generation": gotenberg_available,
                "instant_preview": True,
                "user_authentication": auth_available,
                "cloud_storage": firebase_available,
                "multi_device_sync": firebase_available and auth_available,
                "offline_support": True
            }
        }
    except Exception as e:
        return {
            "version": "v3",
            "status": "error",
            "error": str(e),
            "gotenberg_available": False,
            "firebase_available": False,
            "auth_available": False
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

# V3 Program Management API Endpoints

@app.post("/api/v3/workouts", response_model=WorkoutTemplate)
async def create_workout(workout_request: CreateWorkoutRequest):
    """Create a new workout template"""
    try:
        logger.info(f"🔍 DEBUG: /api/v3/workouts POST called for workout: {workout_request.name}")
        workout = data_service.create_workout(workout_request)
        logger.info(f"🔍 DEBUG: Workout created successfully with ID: {workout.id}")
        return workout
    except Exception as e:
        logger.error(f"🔍 DEBUG: Error creating workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workout: {str(e)}")

@app.get("/api/v3/workouts", response_model=WorkoutListResponse)
async def get_workouts(
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    """Get all workout templates with optional filtering"""
    try:
        if search:
            workouts = data_service.search_workouts(search)
            total_count = len(workouts)
            # Apply pagination to search results
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            workouts = workouts[start_idx:end_idx]
        else:
            workouts = data_service.get_all_workouts(tags=tags, page=page, page_size=page_size)
            total_count = data_service.get_workout_count()
        
        return WorkoutListResponse(
            workouts=workouts,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving workouts: {str(e)}")

@app.get("/api/v3/workouts/{workout_id}", response_model=WorkoutTemplate)
async def get_workout(workout_id: str):
    """Get a specific workout template"""
    workout = data_service.get_workout(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@app.put("/api/v3/workouts/{workout_id}", response_model=WorkoutTemplate)
async def update_workout(workout_id: str, update_request: UpdateWorkoutRequest):
    """Update a workout template"""
    workout = data_service.update_workout(workout_id, update_request)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@app.delete("/api/v3/workouts/{workout_id}")
async def delete_workout(workout_id: str):
    """Delete a workout template"""
    success = data_service.delete_workout(workout_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"message": "Workout deleted successfully"}

@app.post("/api/v3/workouts/{workout_id}/duplicate", response_model=WorkoutTemplate)
async def duplicate_workout(workout_id: str, new_name: str = Query(...)):
    """Duplicate a workout template with a new name"""
    workout = data_service.duplicate_workout(workout_id, new_name)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

# Program Management Endpoints

@app.post("/api/v3/programs", response_model=Program)
async def create_program(program_request: CreateProgramRequest):
    """Create a new program"""
    try:
        program = data_service.create_program(program_request)
        return program
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating program: {str(e)}")

@app.get("/api/v3/programs", response_model=ProgramListResponse)
async def get_programs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    """Get all programs with optional search"""
    try:
        if search:
            programs = data_service.search_programs(search)
            total_count = len(programs)
            # Apply pagination to search results
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            programs = programs[start_idx:end_idx]
        else:
            programs = data_service.get_all_programs(page=page, page_size=page_size)
            total_count = data_service.get_program_count()
        
        return ProgramListResponse(
            programs=programs,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving programs: {str(e)}")

@app.get("/api/v3/programs/{program_id}", response_model=Program)
async def get_program(program_id: str):
    """Get a specific program"""
    program = data_service.get_program(program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program

@app.get("/api/v3/programs/{program_id}/details", response_model=ProgramWithWorkoutsResponse)
async def get_program_with_workouts(program_id: str):
    """Get a program with full workout details"""
    program_data = data_service.get_program_with_workout_details(program_id)
    if not program_data:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return ProgramWithWorkoutsResponse(
        program=program_data["program"],
        workout_details=program_data["workout_details"]
    )

@app.put("/api/v3/programs/{program_id}", response_model=Program)
async def update_program(program_id: str, update_request: UpdateProgramRequest):
    """Update a program"""
    program = data_service.update_program(program_id, update_request)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program

@app.delete("/api/v3/programs/{program_id}")
async def delete_program(program_id: str):
    """Delete a program"""
    success = data_service.delete_program(program_id)
    if not success:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"message": "Program deleted successfully"}

@app.post("/api/v3/programs/{program_id}/workouts", response_model=Program)
async def add_workout_to_program(program_id: str, request: AddWorkoutToProgramRequest):
    """Add a workout to a program"""
    program = data_service.add_workout_to_program(
        program_id=program_id,
        workout_id=request.workout_id,
        order_index=request.order_index,
        custom_name=request.custom_name,
        custom_date=request.custom_date
    )
    if not program:
        raise HTTPException(status_code=404, detail="Program or workout not found")
    return program

@app.delete("/api/v3/programs/{program_id}/workouts/{workout_id}")
async def remove_workout_from_program(program_id: str, workout_id: str):
    """Remove a workout from a program"""
    program = data_service.remove_workout_from_program(program_id, workout_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program or workout not found")
    return {"message": "Workout removed from program successfully"}

@app.put("/api/v3/programs/{program_id}/workouts/reorder")
async def reorder_program_workouts(program_id: str, workout_order: List[str]):
    """Reorder workouts in a program"""
    program = data_service.reorder_program_workouts(program_id, workout_order)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program

# Program Document Generation

@app.post("/api/v3/programs/{program_id}/generate-html")
async def generate_program_html(program_id: str, request: GenerateProgramDocumentRequest):
    """Generate HTML document for entire program"""
    try:
        # Get program with workout details
        program_data = data_service.get_program_with_workout_details(program_id)
        if not program_data:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Generate multi-page HTML document
        html_path = document_service_v2.generate_program_html_file(
            program_data["program"],
            program_data["workout_details"],
            request
        )
        
        # Return the file for download
        filename = f"program_{program_data['program'].name.replace(' ', '_')}.html"
        
        return FileResponse(
            path=html_path,
            filename=filename,
            media_type="text/html"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating program HTML: {str(e)}")

@app.post("/api/v3/programs/{program_id}/generate-pdf")
async def generate_program_pdf(program_id: str, request: GenerateProgramDocumentRequest):
    """Generate PDF document for entire program"""
    try:
        logger.info(f"PDF generation requested for program {program_id}")
        
        # Check if Gotenberg is available
        gotenberg_available = document_service_v2.is_gotenberg_available()
        logger.info(f"Gotenberg service availability: {gotenberg_available}")
        
        if not gotenberg_available:
            logger.error("PDF generation failed: Gotenberg service is not running")
            raise HTTPException(
                status_code=503,
                detail="PDF generation is not available. Gotenberg service is not running. Please start the Gotenberg service or use HTML format instead."
            )
        
        # Get program with workout details
        program_data = data_service.get_program_with_workout_details(program_id)
        if not program_data:
            logger.error(f"Program not found: {program_id}")
            raise HTTPException(status_code=404, detail="Program not found")
        
        logger.info(f"Generating PDF for program: {program_data['program'].name}")
        
        # Generate multi-page PDF document
        pdf_path = document_service_v2.generate_program_pdf_file(
            program_data["program"],
            program_data["workout_details"],
            request
        )
        
        # Return the file for download
        filename = f"program_{program_data['program'].name.replace(' ', '_')}.pdf"
        logger.info(f"PDF generated successfully: {filename}")
        
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating program PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating program PDF: {str(e)}")

@app.post("/api/v3/programs/{program_id}/preview-html")
async def preview_program_html(program_id: str, request: GenerateProgramDocumentRequest):
    """Generate HTML preview for entire program"""
    try:
        # Get program with workout details
        program_data = data_service.get_program_with_workout_details(program_id)
        if not program_data:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Generate HTML content
        html_content = document_service_v2.generate_program_html_document(
            program_data["program"],
            program_data["workout_details"],
            request
        )
        
        # Return HTML content directly
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating program HTML preview: {str(e)}")

# Data Management Endpoints

@app.post("/api/v3/data/backup")
async def backup_data():
    """Create a backup of all program and workout data"""
    try:
        backup_file = data_service.backup_data()
        return {"message": "Backup created successfully", "backup_file": backup_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")

@app.post("/api/v3/data/restore")
async def restore_data(backup_file: str):
    """Restore data from backup file"""
    try:
        success = data_service.restore_data(backup_file)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to restore data from backup")
        return {"message": "Data restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restoring data: {str(e)}")

@app.get("/api/v3/stats")
async def get_stats():
    """Get application statistics"""
    try:
        return {
            "total_workouts": data_service.get_workout_count(),
            "total_programs": data_service.get_program_count(),
            "version": "v3"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")

# Import/Export Endpoints

@app.get("/api/v3/export/programs")
async def export_programs():
    """Export all programs as JSON file"""
    try:
        programs = data_service.get_all_programs(page=1, page_size=1000)  # Get all programs
        
        export_data = {
            "export_type": "programs",
            "export_date": "2025-01-15T10:00:00Z",  # Use fixed date for consistency
            "version": "v3",
            "programs": [program.dict() for program in programs]
        }
        
        # Create JSON response
        import json
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        from fastapi.responses import Response
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=programs_export.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting programs: {str(e)}")

@app.get("/api/v3/export/workouts")
async def export_workouts():
    """Export all workouts as JSON file"""
    try:
        workouts = data_service.get_all_workouts(page=1, page_size=1000)  # Get all workouts
        
        export_data = {
            "export_type": "workouts",
            "export_date": "2025-01-15T10:00:00Z",  # Use fixed date for consistency
            "version": "v3",
            "workouts": [workout.dict() for workout in workouts]
        }
        
        # Create JSON response
        import json
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        from fastapi.responses import Response
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=workouts_export.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting workouts: {str(e)}")

@app.get("/api/v3/export/all")
async def export_all_data():
    """Export all programs and workouts as JSON file"""
    try:
        programs = data_service.get_all_programs(page=1, page_size=1000)
        workouts = data_service.get_all_workouts(page=1, page_size=1000)
        
        export_data = {
            "export_type": "complete",
            "export_date": "2025-01-15T10:00:00Z",  # Use fixed date for consistency
            "version": "v3",
            "programs": [program.dict() for program in programs],
            "workouts": [workout.dict() for workout in workouts]
        }
        
        # Create JSON response
        import json
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        from fastapi.responses import Response
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=gym_data_export.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")

@app.post("/api/v3/import")
async def import_data(file: UploadFile = File(...)):
    """Import programs and workouts from JSON file"""
    try:
        # Validate file type
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are supported")
        
        # Read file content
        content = await file.read()
        import json
        
        try:
            import_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file")
        
        # Validate import data structure
        if not isinstance(import_data, dict):
            raise HTTPException(status_code=400, detail="Invalid import file format")
        
        imported_programs = 0
        imported_workouts = 0
        errors = []
        
        # Import workouts first (programs may reference them)
        if 'workouts' in import_data and isinstance(import_data['workouts'], list):
            for workout_data in import_data['workouts']:
                try:
                    # Remove ID to create new workout
                    workout_data.pop('id', None)
                    workout_data.pop('created_date', None)
                    workout_data.pop('modified_date', None)
                    
                    # Create workout request
                    workout_request = CreateWorkoutRequest(**workout_data)
                    data_service.create_workout(workout_request)
                    imported_workouts += 1
                    
                except Exception as e:
                    errors.append(f"Failed to import workout '{workout_data.get('name', 'Unknown')}': {str(e)}")
        
        # Import programs
        if 'programs' in import_data and isinstance(import_data['programs'], list):
            for program_data in import_data['programs']:
                try:
                    # Remove ID and workout references to create new program
                    program_data.pop('id', None)
                    program_data.pop('created_date', None)
                    program_data.pop('modified_date', None)
                    program_data.pop('workouts', None)  # Don't import workout associations
                    
                    # Create program request
                    program_request = CreateProgramRequest(**program_data)
                    data_service.create_program(program_request)
                    imported_programs += 1
                    
                except Exception as e:
                    errors.append(f"Failed to import program '{program_data.get('name', 'Unknown')}': {str(e)}")
        
        result = {
            "message": "Import completed",
            "imported_programs": imported_programs,
            "imported_workouts": imported_workouts,
            "errors": errors
        }
        
        if errors:
            result["warning"] = "Some items could not be imported"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing data: {str(e)}")

# Firebase Authentication Endpoints

@app.post("/api/v3/auth/migrate-data")
async def migrate_anonymous_data(
    migration_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Migrate anonymous user data to authenticated account"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        programs_data = migration_data.get('programs', [])
        workouts_data = migration_data.get('workouts', [])
        
        # Migrate data using Firebase service
        success = await firebase_service.migrate_anonymous_data(user_id, programs_data, workouts_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to migrate data")
        
        return {
            "message": "Data migrated successfully",
            "migrated_programs": len(programs_data),
            "migrated_workouts": len(workouts_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error migrating anonymous data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error migrating data: {str(e)}")

@app.get("/api/v3/auth/user")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current authenticated user information"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        # Get user profile from Firestore
        user_profile = await firebase_service.get_user_profile(user_id)
        
        # Combine auth info with profile
        user_info = {
            "uid": current_user.get('uid'),
            "email": current_user.get('email'),
            "email_verified": current_user.get('email_verified', False),
            "name": current_user.get('name'),
            "picture": current_user.get('picture'),
            "provider": current_user.get('provider'),
            "profile": user_profile
        }
        
        return user_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting user info: {str(e)}")

@app.post("/api/v3/auth/create-profile")
async def create_user_profile(
    profile_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create user profile in Firestore"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        # Create user profile
        success = await firebase_service.create_user_profile(user_id, {
            'email': current_user.get('email'),
            'displayName': current_user.get('name'),
            **profile_data
        })
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create user profile")
        
        return {"message": "User profile created successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating user profile: {str(e)}")

# Firebase-enabled V3 Endpoints (with dual-mode support)

@app.post("/api/v3/firebase/workouts", response_model=WorkoutTemplate)
async def create_workout_firebase(
    workout_request: CreateWorkoutRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a new workout template (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        logger.info(f"🔍 DEBUG: /api/v3/firebase/workouts POST called for workout: {workout_request.name}, user_id: {user_id}")
        
        if user_id and firebase_service.is_available():
            # Authenticated user - use Firestore data service
            logger.info(f"🔍 DEBUG: Using Firestore for authenticated user")
            from .services.firestore_data_service import firestore_data_service
            workout = await firestore_data_service.create_workout(user_id, workout_request)
            if workout:
                logger.info(f"✅ Workout created in Firestore: {workout.name} with ID: {workout.id}")
                return workout
            else:
                # Fallback to local storage
                logger.warning("🔍 DEBUG: Firebase workout creation failed, falling back to local storage")
        
        # Anonymous user or Firebase unavailable - use local storage
        logger.info(f"🔍 DEBUG: Using local storage for workout creation")
        workout = data_service.create_workout(workout_request)
        logger.info(f"🔍 DEBUG: Workout created in local storage with ID: {workout.id}")
        return workout
        
    except Exception as e:
        logger.error(f"🔍 DEBUG: Error creating workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workout: {str(e)}")

@app.get("/api/v3/firebase/workouts", response_model=WorkoutListResponse)
async def get_workouts_firebase(
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get workout templates (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - get from Firestore
            from .services.firestore_data_service import firestore_data_service
            if search:
                workouts = await firestore_data_service.search_workouts(user_id, search, limit=page_size)
            else:
                workouts = await firestore_data_service.get_user_workouts(user_id, limit=page_size, tags=tags)
            
            total_count = len(workouts)
            
            # Apply pagination
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            workouts = workouts[start_idx:end_idx]
        else:
            # Anonymous user or Firebase unavailable - use local storage
            if search:
                workouts = data_service.search_workouts(search)
                total_count = len(workouts)
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                workouts = workouts[start_idx:end_idx]
            else:
                workouts = data_service.get_all_workouts(tags=tags, page=page, page_size=page_size)
                total_count = data_service.get_workout_count()
        
        return WorkoutListResponse(
            workouts=workouts,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error retrieving workouts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving workouts: {str(e)}")

@app.put("/api/v3/firebase/workouts/{workout_id}", response_model=WorkoutTemplate)
async def update_workout_firebase(
    workout_id: str,
    workout_request: UpdateWorkoutRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Update a workout template (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        logger.info(f"🔍 DEBUG: /api/v3/firebase/workouts/{workout_id} PUT called, user_id: {user_id}")
        
        if user_id and firebase_service.is_available():
            logger.info(f"🔍 DEBUG: Using Firestore for authenticated user workout update")
            # Authenticated user - use Firestore data service
            from .services.firestore_data_service import firestore_data_service
            workout = await firestore_data_service.update_workout(user_id, workout_id, workout_request)
            if workout:
                logger.info(f"✅ Workout updated in Firestore: {workout.name} with ID: {workout.id}")
                return workout
            else:
                logger.warning("🔍 DEBUG: Firebase workout update failed, falling back to local storage")
        
        # Anonymous user or Firebase unavailable - use local storage
        logger.info(f"🔍 DEBUG: Using local storage for workout update")
        workout = data_service.update_workout(workout_id, workout_request)
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        logger.info(f"🔍 DEBUG: Workout updated in local storage with ID: {workout.id}")
        return workout
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🔍 DEBUG: Error updating workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating workout: {str(e)}")

@app.post("/api/v3/firebase/programs", response_model=Program)
async def create_program_firebase(
    program_request: CreateProgramRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a new program (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - use Firestore data service
            from .services.firestore_data_service import firestore_data_service
            program = await firestore_data_service.create_program(user_id, program_request)
            if program:
                logger.info(f"✅ Program created in Firestore: {program.name}")
                return program
            else:
                # Fallback to local storage
                logger.warning("Firebase program creation failed, falling back to local storage")
        
        # Anonymous user or Firebase unavailable - use local storage
        program = data_service.create_program(program_request)
        return program
        
    except Exception as e:
        logger.error(f"Error creating program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating program: {str(e)}")

@app.get("/api/v3/firebase/programs", response_model=ProgramListResponse)
async def get_programs_firebase(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get programs (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - get from Firestore
            from .services.firestore_data_service import firestore_data_service
            if search:
                programs = await firestore_data_service.search_programs(user_id, search, limit=page_size)
            else:
                programs = await firestore_data_service.get_user_programs(user_id, limit=page_size)
            
            total_count = len(programs)
            
            # Apply pagination
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            programs = programs[start_idx:end_idx]
        else:
            # Anonymous user or Firebase unavailable - use local storage
            if search:
                programs = data_service.search_programs(search)
                total_count = len(programs)
                start_idx = (page - 1) * page_size
                end_idx = start_idx + page_size
                programs = programs[start_idx:end_idx]
            else:
                programs = data_service.get_all_programs(page=page, page_size=page_size)
                total_count = data_service.get_program_count()
        
        return ProgramListResponse(
            programs=programs,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error retrieving programs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving programs: {str(e)}")

@app.get("/api/v3/firebase/programs/{program_id}/details", response_model=ProgramWithWorkoutsResponse)
async def get_program_with_workouts_firebase(
    program_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get a program with full workout details (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - get from Firestore
            from .services.firestore_data_service import firestore_data_service
            program_data = await firestore_data_service.get_program_with_workout_details(user_id, program_id)
            if program_data:
                return ProgramWithWorkoutsResponse(
                    program=program_data["program"],
                    workout_details=program_data["workout_details"]
                )
            else:
                raise HTTPException(status_code=404, detail="Program not found")
        else:
            # Anonymous user or Firebase unavailable - use local storage
            program_data = data_service.get_program_with_workout_details(program_id)
            if not program_data:
                raise HTTPException(status_code=404, detail="Program not found")
            
            return ProgramWithWorkoutsResponse(
                program=program_data["program"],
                workout_details=program_data["workout_details"]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving program details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving program details: {str(e)}")

@app.post("/api/v3/firebase/programs/{program_id}/workouts", response_model=Program)
async def add_workout_to_program_firebase(
    program_id: str,
    request: AddWorkoutToProgramRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Add a workout to a program (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - use Firestore
            from .services.firestore_data_service import firestore_data_service
            program = await firestore_data_service.add_workout_to_program(
                user_id=user_id,
                program_id=program_id,
                workout_id=request.workout_id,
                order_index=request.order_index,
                custom_name=request.custom_name,
                custom_date=request.custom_date
            )
            if not program:
                raise HTTPException(status_code=404, detail="Program or workout not found")
            return program
        else:
            # Anonymous user or Firebase unavailable - use local storage
            program = data_service.add_workout_to_program(
                program_id=program_id,
                workout_id=request.workout_id,
                order_index=request.order_index,
                custom_name=request.custom_name,
                custom_date=request.custom_date
            )
            if not program:
                raise HTTPException(status_code=404, detail="Program or workout not found")
            return program
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding workout to program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding workout to program: {str(e)}")

@app.delete("/api/v3/firebase/programs/{program_id}/workouts/{workout_id}")
async def remove_workout_from_program_firebase(
    program_id: str,
    workout_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Remove a workout from a program (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - use Firestore
            from .services.firestore_data_service import firestore_data_service
            program = await firestore_data_service.remove_workout_from_program(user_id, program_id, workout_id)
            if not program:
                raise HTTPException(status_code=404, detail="Program or workout not found")
            return {"message": "Workout removed from program successfully"}
        else:
            # Anonymous user or Firebase unavailable - use local storage
            program = data_service.remove_workout_from_program(program_id, workout_id)
            if not program:
                raise HTTPException(status_code=404, detail="Program or workout not found")
            return {"message": "Workout removed from program successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing workout from program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing workout from program: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
