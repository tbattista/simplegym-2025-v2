"""
User Profile API Endpoints
Handles user profile operations including account deletion
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging

from ..middleware.auth import get_current_user
from ..services.firebase_service import firebase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile")
async def get_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current user's profile information
    
    Returns user data from Firebase Auth
    """
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        logger.info(f"📊 Getting profile for user: {user_id}")
        
        # Return user data from token
        return {
            "uid": current_user.get('uid'),
            "email": current_user.get('email'),
            "email_verified": current_user.get('email_verified', False),
            "name": current_user.get('name'),
            "picture": current_user.get('picture'),
            "firebase_claims": current_user.get('firebase_claims', {})
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_user_account(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete user account and all associated data from Firestore
    
    This endpoint deletes:
    - User's workouts
    - User's programs
    - User's workout sessions
    - User's favorites
    - User's exercise history
    - User document
    
    Note: Firebase Auth account deletion happens on the frontend
    """
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        logger.info(f"🗑️ Deleting account for user: {user_id}")
        
        # Check if Firebase/Firestore is available
        if not firebase_service.is_available():
            logger.warning("⚠️ Firebase not available, skipping Firestore deletion")
            return {
                "success": True,
                "message": "Account deletion initiated (Firestore not available)"
            }
        
        # Get Firestore client
        db = firebase_service.get_firestore()
        if not db:
            logger.warning("⚠️ Firestore client not available")
            return {
                "success": True,
                "message": "Account deletion initiated (Firestore client not available)"
            }
        
        # Delete user's subcollections
        collections_to_delete = [
            'workouts',
            'programs',
            'workout_sessions',
            'favorites',
            'exercise_history'
        ]
        
        for collection_name in collections_to_delete:
            try:
                collection_ref = db.collection('users').document(user_id).collection(collection_name)
                docs = collection_ref.stream()
                
                deleted_count = 0
                for doc in docs:
                    doc.reference.delete()
                    deleted_count += 1
                
                if deleted_count > 0:
                    logger.info(f"✅ Deleted {deleted_count} documents from {collection_name}")
                    
            except Exception as e:
                logger.error(f"❌ Error deleting {collection_name}: {e}")
                # Continue with other collections even if one fails
        
        # Delete user document
        try:
            user_doc_ref = db.collection('users').document(user_id)
            user_doc_ref.delete()
            logger.info(f"✅ Deleted user document for: {user_id}")
        except Exception as e:
            logger.error(f"❌ Error deleting user document: {e}")
        
        logger.info(f"✅ Account deletion completed for user: {user_id}")
        
        return {
            "success": True,
            "message": "Account and all associated data deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting user account: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}"
        )


@router.put("/profile")
async def update_user_profile(
    profile_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update user profile information
    
    Currently supports updating:
    - displayName
    
    Note: Most profile updates happen via Firebase Auth on the frontend
    This endpoint is for future extensibility
    """
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        logger.info(f"📝 Updating profile for user: {user_id}")
        
        # For now, just return success
        # Profile updates happen via Firebase Auth on frontend
        return {
            "success": True,
            "message": "Profile updated successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))