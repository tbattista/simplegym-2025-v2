"""
Migration API endpoints for Ghost Gym V3 Phase 2
Handles data migration and unified data operations
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import logging
from ..models import (
    Program, WorkoutTemplate, CreateWorkoutRequest, CreateProgramRequest,
    UpdateWorkoutRequest, UpdateProgramRequest, AddWorkoutToProgramRequest,
    WorkoutListResponse, ProgramListResponse, ProgramWithWorkoutsResponse
)
from ..services.unified_data_service import unified_data_service
from ..services.migration_service import migration_service
from ..middleware.auth import get_current_user_optional, get_current_user, extract_user_id

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v3", tags=["Phase 2 - Migration & Unified Data"])

# User Workout Endpoints with Unified Data Service

@router.post("/user/workouts", response_model=WorkoutTemplate)
async def create_user_workout(
    workout_request: CreateWorkoutRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a new workout template using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        workout = await unified_data_service.create_workout(workout_request, user_id)
        
        if not workout:
            raise HTTPException(status_code=500, detail="Failed to create workout")
        
        return workout
    except Exception as e:
        logger.error(f"Error creating user workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workout: {str(e)}")

@router.get("/user/workouts", response_model=WorkoutListResponse)
async def get_user_workouts_unified(
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get workout templates using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        workouts = await unified_data_service.get_workouts(
            user_id=user_id, 
            tags=tags, 
            page=page, 
            page_size=page_size, 
            search=search
        )
        
        # Get total count for pagination
        stats = await unified_data_service.get_stats(user_id)
        total_count = stats.get("total_workouts", len(workouts))
        
        return WorkoutListResponse(
            workouts=workouts,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Error retrieving user workouts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving workouts: {str(e)}")

@router.get("/user/workouts/{workout_id}", response_model=WorkoutTemplate)
async def get_user_workout(
    workout_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get a specific workout template using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        workout = await unified_data_service.get_workout(workout_id, user_id)
        
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        
        return workout
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving workout: {str(e)}")

@router.put("/user/workouts/{workout_id}", response_model=WorkoutTemplate)
async def update_user_workout(
    workout_id: str,
    update_request: UpdateWorkoutRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Update a workout template using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        workout = await unified_data_service.update_workout(workout_id, update_request, user_id)
        
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        
        return workout
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating workout: {str(e)}")

@router.delete("/user/workouts/{workout_id}")
async def delete_user_workout(
    workout_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Delete a workout template using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        success = await unified_data_service.delete_workout(workout_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Workout not found")
        
        return {"message": "Workout deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting workout: {str(e)}")

@router.post("/user/workouts/{workout_id}/duplicate", response_model=WorkoutTemplate)
async def duplicate_user_workout(
    workout_id: str,
    new_name: str = Query(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Duplicate a workout template using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        workout = await unified_data_service.duplicate_workout(workout_id, new_name, user_id)
        
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        
        return workout
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating user workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error duplicating workout: {str(e)}")

# User Program Endpoints

@router.post("/user/programs", response_model=Program)
async def create_user_program(
    program_request: CreateProgramRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a new program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program = await unified_data_service.create_program(program_request, user_id)
        
        if not program:
            raise HTTPException(status_code=500, detail="Failed to create program")
        
        return program
    except Exception as e:
        logger.error(f"Error creating user program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating program: {str(e)}")

@router.get("/user/programs", response_model=ProgramListResponse)
async def get_user_programs_unified(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get programs using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        programs = await unified_data_service.get_programs(
            user_id=user_id,
            page=page,
            page_size=page_size,
            search=search
        )
        
        # Get total count for pagination
        stats = await unified_data_service.get_stats(user_id)
        total_count = stats.get("total_programs", len(programs))
        
        return ProgramListResponse(
            programs=programs,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Error retrieving user programs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving programs: {str(e)}")

@router.get("/user/programs/{program_id}", response_model=Program)
async def get_user_program(
    program_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get a specific program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program = await unified_data_service.get_program(program_id, user_id)
        
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        return program
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving program: {str(e)}")

@router.get("/user/programs/{program_id}/details", response_model=ProgramWithWorkoutsResponse)
async def get_user_program_with_workouts(
    program_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get a program with full workout details using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program_data = await unified_data_service.get_program_with_workout_details(program_id, user_id)
        
        if not program_data:
            raise HTTPException(status_code=404, detail="Program not found")
        
        return ProgramWithWorkoutsResponse(
            program=program_data["program"],
            workout_details=program_data["workout_details"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user program details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving program details: {str(e)}")

@router.put("/user/programs/{program_id}", response_model=Program)
async def update_user_program(
    program_id: str,
    update_request: UpdateProgramRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Update a program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program = await unified_data_service.update_program(program_id, update_request, user_id)
        
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        return program
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating program: {str(e)}")

@router.delete("/user/programs/{program_id}")
async def delete_user_program(
    program_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Delete a program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        success = await unified_data_service.delete_program(program_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Program not found")
        
        return {"message": "Program deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting program: {str(e)}")

# Program-Workout Management

@router.post("/user/programs/{program_id}/workouts", response_model=Program)
async def add_workout_to_user_program(
    program_id: str,
    request: AddWorkoutToProgramRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Add a workout to a program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program = await unified_data_service.add_workout_to_program(
            program_id=program_id,
            workout_id=request.workout_id,
            user_id=user_id,
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
        logger.error(f"Error adding workout to user program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding workout to program: {str(e)}")

@router.delete("/user/programs/{program_id}/workouts/{workout_id}")
async def remove_workout_from_user_program(
    program_id: str,
    workout_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Remove a workout from a program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program = await unified_data_service.remove_workout_from_program(program_id, workout_id, user_id)
        
        if not program:
            raise HTTPException(status_code=404, detail="Program or workout not found")
        
        return {"message": "Workout removed from program successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing workout from user program: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing workout from program: {str(e)}")

@router.put("/user/programs/{program_id}/workouts/reorder")
async def reorder_user_program_workouts(
    program_id: str,
    workout_order: List[str],
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Reorder workouts in a program using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        program = await unified_data_service.reorder_program_workouts(program_id, workout_order, user_id)
        
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        return program
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reordering user program workouts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reordering workouts: {str(e)}")

# Data Migration Endpoints

@router.get("/migration/status")
async def get_migration_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get migration status for current user"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        status = await migration_service.get_migration_status(user_id)
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting migration status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting migration status: {str(e)}")

@router.get("/migration/eligibility")
async def check_migration_eligibility(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check if user is eligible for data migration"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        eligibility = await migration_service.check_migration_eligibility(user_id)
        return eligibility
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking migration eligibility: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking migration eligibility: {str(e)}")

@router.post("/migration/prepare")
async def prepare_migration(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Prepare data for migration"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        preparation = await migration_service.prepare_migration_data()
        return preparation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing migration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error preparing migration: {str(e)}")

@router.post("/migration/execute")
async def execute_migration(
    migration_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Execute data migration from anonymous to authenticated account"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        programs_data = migration_data.get('programs', [])
        workouts_data = migration_data.get('workouts', [])
        options = migration_data.get('options', {})
        
        # Add user info to options
        options.update({
            'email': current_user.get('email'),
            'displayName': current_user.get('name')
        })
        
        result = await migration_service.execute_migration(user_id, programs_data, workouts_data, options)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Migration failed"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing migration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error executing migration: {str(e)}")

@router.post("/migration/rollback")
async def rollback_migration(
    rollback_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Rollback a migration (emergency use only)"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        backup_file = rollback_data.get('backup_file')
        result = await migration_service.rollback_migration(user_id, backup_file)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Rollback failed"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back migration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error rolling back migration: {str(e)}")

# Sync Status Endpoints

@router.get("/sync/status")
async def get_sync_status(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get synchronization status"""
    try:
        user_id = extract_user_id(current_user)
        
        # Get service status
        service_status = unified_data_service.get_service_status()
        
        return {
            "user_authenticated": user_id is not None,
            "storage_mode": "firestore" if user_id else "localStorage",
            "services": service_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting sync status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting sync status: {str(e)}")

@router.post("/sync/force")
async def force_sync(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Force data synchronization"""
    try:
        user_id = extract_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        # Force refresh user data
        programs = await unified_data_service.get_programs(user_id=user_id, page=1, page_size=1000)
        workouts = await unified_data_service.get_workouts(user_id=user_id, page=1, page_size=1000)
        
        return {
            "message": "Synchronization completed",
            "synced_programs": len(programs),
            "synced_workouts": len(workouts),
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forcing sync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error forcing sync: {str(e)}")

# Enhanced Stats Endpoint

@router.get("/user/stats")
async def get_user_stats(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get user statistics using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        stats = await unified_data_service.get_stats(user_id)
        
        # Add storage mode information
        stats["storage_mode"] = "firestore" if user_id else "localStorage"
        stats["user_authenticated"] = user_id is not None
        
        return stats
    except Exception as e:
        logger.error(f"Error retrieving user stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")

# Data Export/Import with Unified Service

@router.post("/user/data/backup")
async def backup_user_data(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a backup of user data using unified data service"""
    try:
        user_id = extract_user_id(current_user)
        result = await unified_data_service.backup_data(user_id)
        return result
    except Exception as e:
        logger.error(f"Error backing up user data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating backup: {str(e)}")