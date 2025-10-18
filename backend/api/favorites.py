"""
User Exercise Favorites Management
Handles user's favorite exercises operations
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
import logging
from ..models import FavoritesResponse
from ..api.dependencies import get_favorites_service, get_exercise_service, require_auth

router = APIRouter(prefix="/api/v3/users/me/favorites", tags=["Favorites"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=FavoritesResponse)
async def get_user_favorites(
    user_id: str = Depends(require_auth),
    favorites_service = Depends(get_favorites_service)
):
    """Get all favorite exercises for authenticated user"""
    try:
        favorites = await favorites_service.get_user_favorites(user_id)
        
        return FavoritesResponse(
            favorites=list(favorites.exercises.values()),
            count=favorites.count,
            lastUpdated=favorites.lastUpdated
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting favorites: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting favorites: {str(e)}")


@router.post("/")
async def add_favorite(
    request: Dict[str, str],
    user_id: str = Depends(require_auth),
    favorites_service = Depends(get_favorites_service),
    exercise_service = Depends(get_exercise_service)
):
    """Add exercise to favorites"""
    try:
        exercise_id = request.get('exerciseId')
        if not exercise_id:
            raise HTTPException(status_code=400, detail="exerciseId is required")
        
        # Get exercise details
        exercise = await exercise_service.get_exercise_by_id(exercise_id)
        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")
        
        # Check if already favorited
        is_fav = await favorites_service.is_favorited(user_id, exercise_id)
        if is_fav:
            return {
                "message": "Exercise already in favorites",
                "exerciseId": exercise_id,
                "alreadyFavorited": True
            }
        
        # Add to favorites
        success = await favorites_service.add_favorite(user_id, exercise_id, exercise)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add favorite")
        
        logger.info(f"✅ Added favorite: {exercise.name} for user {user_id}")
        return {
            "message": "Exercise added to favorites",
            "exerciseId": exercise_id,
            "exerciseName": exercise.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding favorite: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding favorite: {str(e)}")


@router.delete("/{exercise_id}")
async def remove_favorite(
    exercise_id: str,
    user_id: str = Depends(require_auth),
    favorites_service = Depends(get_favorites_service)
):
    """Remove exercise from favorites"""
    try:
        # Check if favorited
        is_fav = await favorites_service.is_favorited(user_id, exercise_id)
        if not is_fav:
            return {
                "message": "Exercise not in favorites",
                "exerciseId": exercise_id,
                "notFavorited": True
            }
        
        # Remove from favorites
        success = await favorites_service.remove_favorite(user_id, exercise_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove favorite")
        
        logger.info(f"✅ Removed favorite: {exercise_id} for user {user_id}")
        return {
            "message": "Exercise removed from favorites",
            "exerciseId": exercise_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing favorite: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing favorite: {str(e)}")


@router.post("/check")
async def check_favorites(
    request: Dict[str, List[str]],
    user_id: str = Depends(require_auth),
    favorites_service = Depends(get_favorites_service)
):
    """Bulk check if exercises are favorited"""
    try:
        exercise_ids = request.get('exerciseIds', [])
        if not exercise_ids:
            raise HTTPException(status_code=400, detail="exerciseIds array is required")
        
        favorites_map = await favorites_service.bulk_check_favorites(user_id, exercise_ids)
        
        return {"favorites": favorites_map}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking favorites: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking favorites: {str(e)}")