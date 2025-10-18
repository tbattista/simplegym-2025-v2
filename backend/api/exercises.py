"""
Exercise Database Management
Handles global exercise database and user custom exercises
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import logging
from ..models import (
    Exercise, CreateExerciseRequest,
    ExerciseListResponse, ExerciseSearchResponse
)
from ..api.dependencies import get_exercise_service, require_auth

router = APIRouter(prefix="/api/v3", tags=["Exercises"])
logger = logging.getLogger(__name__)


@router.get("/exercises", response_model=ExerciseListResponse)
async def get_all_exercises(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    exercise_service = Depends(get_exercise_service)
):
    """Get all global exercises with pagination"""
    try:
        result = exercise_service.get_all_exercises(limit=page_size, page=page)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving exercises: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving exercises: {str(e)}")


@router.get("/exercises/search", response_model=ExerciseSearchResponse)
async def search_exercises(
    q: str = Query(..., min_length=1, description="Search query"),
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    equipment: Optional[str] = Query(None, description="Filter by equipment"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    limit: int = Query(20, ge=1, le=100),
    exercise_service = Depends(get_exercise_service)
):
    """Search exercises by name and optional filters"""
    try:
        filters = {}
        if muscle_group:
            filters['muscle_group'] = muscle_group
        if equipment:
            filters['equipment'] = equipment
        if difficulty:
            filters['difficulty'] = difficulty
        
        result = exercise_service.search_exercises(
            query=q,
            filters=filters if filters else None,
            limit=limit
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching exercises: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching exercises: {str(e)}")


@router.get("/exercises/{exercise_id}", response_model=Exercise)
async def get_exercise(
    exercise_id: str,
    exercise_service = Depends(get_exercise_service)
):
    """Get a specific exercise by ID"""
    try:
        exercise = exercise_service.get_exercise_by_id(exercise_id)
        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")
        
        return exercise
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving exercise: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving exercise: {str(e)}")


@router.get("/exercises/filters/{field}")
async def get_exercise_filter_values(
    field: str,
    exercise_service = Depends(get_exercise_service)
):
    """Get unique values for a filter field (muscle groups, equipment, etc.)"""
    try:
        # Validate field name
        valid_fields = [
            'targetMuscleGroup', 'primaryEquipment', 'difficultyLevel',
            'bodyRegion', 'mechanics', 'classification'
        ]
        
        if field not in valid_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid filter field. Must be one of: {', '.join(valid_fields)}"
            )
        
        values = exercise_service.get_unique_values(field)
        return {
            "field": field,
            "values": values,
            "count": len(values)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving filter values: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving filter values: {str(e)}")


# User Custom Exercise Endpoints

@router.post("/users/me/exercises", response_model=Exercise)
async def create_custom_exercise(
    exercise_request: CreateExerciseRequest,
    user_id: str = Depends(require_auth),
    exercise_service = Depends(get_exercise_service)
):
    """Create a custom exercise for the authenticated user"""
    try:
        exercise = exercise_service.create_custom_exercise(user_id, exercise_request)
        if not exercise:
            raise HTTPException(status_code=500, detail="Failed to create custom exercise")
        
        return exercise
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating custom exercise: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating custom exercise: {str(e)}")


@router.get("/users/me/exercises")
async def get_user_custom_exercises(
    user_id: str = Depends(require_auth),
    limit: int = Query(100, ge=1, le=500),
    exercise_service = Depends(get_exercise_service)
):
    """Get all custom exercises for the authenticated user"""
    try:
        exercises = exercise_service.get_user_custom_exercises(user_id, limit=limit)
        
        return {
            "exercises": exercises,
            "total_count": len(exercises)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving custom exercises: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving custom exercises: {str(e)}")