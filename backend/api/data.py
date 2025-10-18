"""
Data Import, Export, and Backup Operations
Handles data management, backup, restore, and statistics
"""

from fastapi import APIRouter, HTTPException, File, UploadFile, Depends
from fastapi.responses import Response
from typing import List
import json
import logging
from ..services.data_service import DataService
from ..models import CreateWorkoutRequest, CreateProgramRequest
from ..api.dependencies import get_data_service

router = APIRouter(prefix="/api/v3", tags=["Data Management"])
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_stats(data_service: DataService = Depends(get_data_service)):
    """Get application statistics"""
    try:
        return {
            "total_workouts": data_service.get_workout_count(),
            "total_programs": data_service.get_program_count(),
            "version": "v3"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")


@router.post("/data/backup")
async def backup_data(data_service: DataService = Depends(get_data_service)):
    """Create a backup of all program and workout data"""
    try:
        backup_file = data_service.backup_data()
        return {
            "message": "Backup created successfully",
            "backup_file": backup_file
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")


@router.post("/data/restore")
async def restore_data(
    backup_file: str,
    data_service: DataService = Depends(get_data_service)
):
    """Restore data from backup file"""
    try:
        success = data_service.restore_data(backup_file)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to restore data from backup")
        return {"message": "Data restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restoring data: {str(e)}")


@router.get("/export/programs")
async def export_programs(data_service: DataService = Depends(get_data_service)):
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
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=programs_export.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting programs: {str(e)}")


@router.get("/export/workouts")
async def export_workouts(data_service: DataService = Depends(get_data_service)):
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
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=workouts_export.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting workouts: {str(e)}")


@router.get("/export/all")
async def export_all_data(data_service: DataService = Depends(get_data_service)):
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
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=gym_data_export.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    data_service: DataService = Depends(get_data_service)
):
    """Import programs and workouts from JSON file"""
    try:
        # Validate file type
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are supported")
        
        # Read file content
        content = await file.read()
        
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