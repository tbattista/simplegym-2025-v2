"""
Authentication Middleware for Ghost Gym V3
Handles Firebase JWT token validation and user authentication
"""

import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    import firebase_admin
    from firebase_admin import auth
    FIREBASE_AUTH_AVAILABLE = True
except ImportError:
    FIREBASE_AUTH_AVAILABLE = False
    firebase_admin = None
    auth = None

from ..config.firebase_config import get_firebase_app

logger = logging.getLogger(__name__)

# Security scheme for Bearer token
security = HTTPBearer(auto_error=False)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Get current user from Firebase token (optional - returns None if not authenticated)
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        User information dict or None if not authenticated
    """
    if not credentials or not FIREBASE_AUTH_AVAILABLE:
        return None
    
    try:
        # Get Firebase app
        app = get_firebase_app()
        if not app:
            logger.warning("Firebase app not available for authentication")
            return None
        
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(credentials.credentials, app=app)
        
        # Extract user information
        user_info = {
            'uid': decoded_token.get('uid'),
            'email': decoded_token.get('email'),
            'email_verified': decoded_token.get('email_verified', False),
            'name': decoded_token.get('name'),
            'picture': decoded_token.get('picture'),
            'provider': decoded_token.get('firebase', {}).get('sign_in_provider'),
            'auth_time': decoded_token.get('auth_time'),
            'exp': decoded_token.get('exp'),
            'iat': decoded_token.get('iat')
        }
        
        logger.info(f"✅ User authenticated: {user_info.get('email', user_info.get('uid'))}")
        return user_info
        
    except auth.InvalidIdTokenError:
        logger.warning("Invalid Firebase ID token provided")
        return None
    except auth.ExpiredIdTokenError:
        logger.warning("Expired Firebase ID token provided")
        return None
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {str(e)}")
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Get current user from Firebase token (required - raises exception if not authenticated)
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        User information dict
        
    Raises:
        HTTPException: If user is not authenticated or token is invalid
    """
    user = await get_current_user_optional(credentials)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Firebase ID token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user

def extract_user_id(user: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Extract user ID from user information dict
    
    Args:
        user: User information dict from get_current_user functions
        
    Returns:
        User ID string or None if not available
    """
    if not user:
        return None
    
    return user.get('uid')

def extract_user_email(user: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    Extract user email from user information dict
    
    Args:
        user: User information dict from get_current_user functions
        
    Returns:
        User email string or None if not available
    """
    if not user:
        return None
    
    return user.get('email')

def is_user_verified(user: Optional[Dict[str, Any]]) -> bool:
    """
    Check if user's email is verified
    
    Args:
        user: User information dict from get_current_user functions
        
    Returns:
        True if user's email is verified, False otherwise
    """
    if not user:
        return False
    
    return user.get('email_verified', False)

class AuthService:
    """
    Authentication service for managing user authentication state
    """
    
    def __init__(self):
        self.available = FIREBASE_AUTH_AVAILABLE and get_firebase_app() is not None
    
    def is_available(self) -> bool:
        """Check if authentication service is available"""
        return self.available
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate Firebase ID token
        
        Args:
            token: Firebase ID token string
            
        Returns:
            User information dict or None if invalid
        """
        if not self.available:
            return None
        
        try:
            app = get_firebase_app()
            if not app:
                return None
            
            decoded_token = auth.verify_id_token(token, app=app)
            return {
                'uid': decoded_token.get('uid'),
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture'),
                'provider': decoded_token.get('firebase', {}).get('sign_in_provider')
            }
            
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            return None
    
    def get_auth_status(self) -> Dict[str, Any]:
        """
        Get authentication service status
        
        Returns:
            Status information dict
        """
        return {
            "available": self.available,
            "firebase_auth_installed": FIREBASE_AUTH_AVAILABLE,
            "firebase_app_initialized": get_firebase_app() is not None,
            "service_type": "Firebase Authentication"
        }

# Global authentication service instance
auth_service = AuthService()