"""
Workout Sharing API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging

from ..models import (
    PublicWorkout, PrivateShare, WorkoutTemplate,
    ShareWorkoutPublicRequest, ShareWorkoutPrivateRequest,
    SavePublicWorkoutRequest, PublicWorkoutListResponse,
    ShareTokenResponse
)
from ..services.sharing_service import sharing_service
from ..services.firestore_data_service import firestore_data_service
from ..middleware.auth import get_current_user_optional, extract_user_id

router = APIRouter(prefix="/api/v3/sharing", tags=["Sharing"])
logger = logging.getLogger(__name__)

# PUBLIC SHARING
@router.post("/share-public", response_model=PublicWorkout)
async def share_workout_publicly(
    request: ShareWorkoutPublicRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Share a workout publicly"""
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    workout = await firestore_data_service.get_workout(user_id, request.workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    public_workout = await sharing_service.share_workout_publicly(
        user_id=user_id,
        workout=workout,
        show_creator_name=request.show_creator_name
    )
    
    if not public_workout:
        raise HTTPException(status_code=500, detail="Failed to share workout")
    
    return public_workout

@router.get("/public-workouts", response_model=PublicWorkoutListResponse)
async def browse_public_workouts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tags: Optional[List[str]] = Query(None),
    sort_by: str = Query("created_at")
):
    """Browse public workouts"""
    result = await sharing_service.get_public_workouts(
        page=page,
        page_size=page_size,
        tags=tags,
        sort_by=sort_by
    )
    return PublicWorkoutListResponse(**result)

@router.get("/public-workouts/{public_workout_id}", response_model=PublicWorkout)
async def get_public_workout(public_workout_id: str):
    """Get specific public workout (increments view count)"""
    workout = await sharing_service.get_public_workout(public_workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Public workout not found")
    return workout

@router.post("/public-workouts/{public_workout_id}/save", response_model=WorkoutTemplate)
async def save_public_workout(
    public_workout_id: str,
    request: SavePublicWorkoutRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Save public workout to user's library"""
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    saved_workout = await sharing_service.save_public_workout(
        user_id=user_id,
        public_workout_id=public_workout_id,
        custom_name=request.custom_name
    )
    
    if not saved_workout:
        raise HTTPException(status_code=500, detail="Failed to save workout")
    
    return saved_workout

# PRIVATE SHARING
@router.post("/share-private", response_model=ShareTokenResponse)
async def share_workout_privately(
    request: ShareWorkoutPrivateRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Create private share with token"""
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    workout = await firestore_data_service.get_workout(user_id, request.workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    share_result = await sharing_service.share_workout_privately(
        user_id=user_id,
        workout=workout,
        show_creator_name=request.show_creator_name,
        expires_in_days=request.expires_in_days
    )
    
    if not share_result:
        raise HTTPException(status_code=500, detail="Failed to create share")
    
    return ShareTokenResponse(**share_result)

@router.get("/share/{token}", response_model=PrivateShare)
async def get_private_share(token: str):
    """Get private share by token"""
    share = await sharing_service.get_private_share(token)
    if not share:
        raise HTTPException(status_code=404, detail="Share not found or expired")
    return share

@router.post("/share/{token}/save", response_model=WorkoutTemplate)
async def save_private_share(
    token: str,
    request: SavePublicWorkoutRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Save private share to user's library"""
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    saved_workout = await sharing_service.save_private_share(
        user_id=user_id,
        token=token,
        custom_name=request.custom_name
    )
    
    if not saved_workout:
        raise HTTPException(status_code=500, detail="Failed to save workout")
    
    return saved_workout

@router.delete("/share/{token}")
async def delete_private_share(
    token: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Delete private share (creator only)"""
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    success = await sharing_service.delete_private_share(user_id, token)
    if not success:
        raise HTTPException(status_code=404, detail="Share not found or unauthorized")
    
    return {"message": "Share deleted successfully"}