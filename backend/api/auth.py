"""
Authentication and User Profile Management
Handles user authentication, profile creation, and data migration
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging
from ..services.firebase_service import firebase_service
from ..middleware.auth import get_current_user, extract_user_id

router = APIRouter(prefix="/api/v3/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


@router.post("/migrate-data")
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


@router.get("/user")
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


@router.post("/create-profile")
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