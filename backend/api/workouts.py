"""
Workout Template Management
Handles workout CRUD operations with Firebase dual-mode support
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging
from ..models import (
    WorkoutTemplate, CreateWorkoutRequest, UpdateWorkoutRequest,
    WorkoutListResponse
)
from ..services.data_service import DataService
from ..services.firestore_data_service import firestore_data_service
from ..services.firebase_service import firebase_service
from ..api.dependencies import get_data_service, optional_auth
from ..middleware.auth import get_current_user_optional, extract_user_id

router = APIRouter(prefix="/api/v3", tags=["Workouts"])
logger = logging.getLogger(__name__)


# Local Storage Endpoints

@router.post("/workouts", response_model=WorkoutTemplate)
async def create_workout(
    workout_request: CreateWorkoutRequest,
    data_service: DataService = Depends(get_data_service)
):
    """Create a new workout template (local storage)"""
    try:
        logger.info(f"Creating workout: {workout_request.name}")
        workout = data_service.create_workout(workout_request)
        logger.info(f"Workout created successfully with ID: {workout.id}")
        return workout
    except Exception as e:
        logger.error(f"Error creating workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workout: {str(e)}")


@router.get("/workouts", response_model=WorkoutListResponse)
async def get_workouts(
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    data_service: DataService = Depends(get_data_service)
):
    """Get all workout templates with optional filtering (local storage)"""
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


@router.get("/workouts/{workout_id}", response_model=WorkoutTemplate)
async def get_workout(
    workout_id: str,
    data_service: DataService = Depends(get_data_service)
):
    """Get a specific workout template (local storage)"""
    workout = data_service.get_workout(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.put("/workouts/{workout_id}", response_model=WorkoutTemplate)
async def update_workout(
    workout_id: str,
    update_request: UpdateWorkoutRequest,
    data_service: DataService = Depends(get_data_service)
):
    """Update a workout template (local storage)"""
    workout = data_service.update_workout(workout_id, update_request)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.delete("/workouts/{workout_id}")
async def delete_workout(
    workout_id: str,
    data_service: DataService = Depends(get_data_service)
):
    """Delete a workout template (local storage)"""
    success = data_service.delete_workout(workout_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"message": "Workout deleted successfully"}


@router.post("/workouts/{workout_id}/duplicate", response_model=WorkoutTemplate)
async def duplicate_workout(
    workout_id: str,
    new_name: str = Query(...),
    data_service: DataService = Depends(get_data_service)
):
    """Duplicate a workout template with a new name"""
    workout = data_service.duplicate_workout(workout_id, new_name)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


# Firebase Dual-Mode Endpoints

@router.post("/firebase/workouts", response_model=WorkoutTemplate)
async def create_workout_firebase(
    workout_request: CreateWorkoutRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Create a new workout template (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        logger.info(f"Creating workout: {workout_request.name}, user_id: {user_id}")
        
        if user_id and firebase_service.is_available():
            # Authenticated user - use Firestore data service
            logger.info("Using Firestore for authenticated user")
            workout = await firestore_data_service.create_workout(user_id, workout_request)
            if workout:
                logger.info(f"✅ Workout created in Firestore: {workout.name} with ID: {workout.id}")
                return workout
            else:
                # Fallback to local storage
                logger.warning("Firebase workout creation failed, falling back to local storage")
        
        # Anonymous user or Firebase unavailable - use local storage
        logger.info("Using local storage for workout creation")
        data_service = DataService()
        workout = data_service.create_workout(workout_request)
        logger.info(f"Workout created in local storage with ID: {workout.id}")
        return workout
        
    except Exception as e:
        logger.error(f"Error creating workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating workout: {str(e)}")


@router.get("/firebase/workouts", response_model=WorkoutListResponse)
async def get_workouts_firebase(
    tags: Optional[List[str]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get workout templates (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        
        if user_id and firebase_service.is_available():
            # Authenticated user - get from Firestore
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
            data_service = DataService()
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


@router.put("/firebase/workouts/{workout_id}", response_model=WorkoutTemplate)
async def update_workout_firebase(
    workout_id: str,
    workout_request: UpdateWorkoutRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Update a workout template (Firebase-enabled with fallback)"""
    try:
        user_id = extract_user_id(current_user)
        logger.info(f"Updating workout {workout_id}, user_id: {user_id}")
        
        if user_id and firebase_service.is_available():
            logger.info("Using Firestore for authenticated user workout update")
            # Authenticated user - use Firestore data service
            workout = await firestore_data_service.update_workout(user_id, workout_id, workout_request)
            if workout:
                logger.info(f"✅ Workout updated in Firestore: {workout.name} with ID: {workout.id}")
                return workout
            else:
                logger.warning("Firebase workout update failed, falling back to local storage")
        
        # Anonymous user or Firebase unavailable - use local storage
        logger.info("Using local storage for workout update")
        data_service = DataService()
        workout = data_service.update_workout(workout_id, workout_request)
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        logger.info(f"Workout updated in local storage with ID: {workout.id}")
        return workout
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workout: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating workout: {str(e)}")