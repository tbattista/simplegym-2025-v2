"""
Shared Dependencies for API Routers
Provides dependency injection for services and authentication
"""

from fastapi import Depends, HTTPException
from typing import Optional, Dict, Any
from ..services.data_service import DataService
from ..services.firestore_data_service import firestore_data_service
from ..services.exercise_service import exercise_service
from ..services.favorites_service import favorites_service
from ..services.firebase_service import firebase_service
from ..services.auth_service import auth_service
from ..services.v2.document_service_v2 import DocumentServiceV2
from ..middleware.auth import get_current_user, get_current_user_optional, extract_user_id


# Service Dependencies

# Create global service instances (singletons)
_data_service = DataService()

def get_data_service() -> DataService:
    """Get local data service instance"""
    return _data_service


_document_service = DocumentServiceV2()

def get_document_service() -> DocumentServiceV2:
    """Get document service instance"""
    return _document_service


def get_exercise_service():
    """Get exercise service instance"""
    if not exercise_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Exercise service not available - Firebase not initialized"
        )
    return exercise_service


def get_favorites_service():
    """Get favorites service instance"""
    if not favorites_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Favorites service not available - Firebase not initialized"
        )
    return favorites_service


# Firebase Dual-Mode Helper

async def get_storage_service(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Get appropriate storage service based on authentication status
    Returns Firestore service for authenticated users, local service otherwise
    """
    user_id = extract_user_id(current_user)
    
    if user_id and firebase_service.is_available():
        return {
            'service': firestore_data_service,
            'user_id': user_id,
            'mode': 'firestore'
        }
    else:
        return {
            'service': _data_service,
            'user_id': None,
            'mode': 'local'
        }


# Authentication Helpers

def require_auth(current_user: Dict[str, Any] = Depends(get_current_user)) -> str:
    """Require authentication and return user ID"""
    user_id = extract_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    return user_id


def optional_auth(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> Optional[str]:
    """Optional authentication, returns user ID if authenticated"""
    return extract_user_id(current_user) if current_user else None