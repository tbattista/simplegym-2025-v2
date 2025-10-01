"""
Authentication Service for Ghost Gym V3 Phase 2
Handles Firebase Auth token verification and user management
"""

import os
import json
import logging
from typing import Dict, Optional, Any
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    firebase_admin = None
    auth = None

from ..config.firebase_config import get_firebase_app, is_firebase_available

logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service for Firebase Auth integration"""
    
    def __init__(self):
        self._available = False
        self.app = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Firebase Auth service using centralized config"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase Admin SDK not available - install firebase-admin package")
            return
        
        try:
            # Use centralized Firebase configuration
            self.app = get_firebase_app()
            self._available = self.app is not None
            
            if self._available:
                logger.info("✅ Auth service connected successfully")
            else:
                logger.warning("❌ Auth service not available - check Firebase configuration")
                
        except Exception as e:
            logger.error(f"❌ Auth service initialization failed: {e}")
            self._available = False
    
    def is_available(self) -> bool:
        """Check if auth service is available"""
        if not FIREBASE_AVAILABLE:
            return False
        
        # Re-check Firebase app availability if not available
        if not self._available:
            self.app = get_firebase_app()
            self._available = self.app is not None
            if self._available:
                logger.info("✅ Auth service now available")
        
        return self._available
    
    async def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token and return user info"""
        if not self.is_available():
            logger.warning("Auth service not available for token verification")
            return None
        
        try:
            # Verify the ID token using the specific app
            decoded_token = auth.verify_id_token(id_token, app=self.app)
            
            user_info = {
                'uid': decoded_token.get('uid'),
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture'),
                'firebase_claims': decoded_token
            }
            
            logger.info(f"✅ Token verified for user: {user_info['uid']}")
            return user_info
            
        except auth.InvalidIdTokenError:
            logger.warning("❌ Invalid ID token provided")
            return None
        except auth.ExpiredIdTokenError:
            logger.warning("❌ Expired ID token provided")
            return None
        except Exception as e:
            logger.error(f"❌ Error verifying token: {e}")
            return None
    
    async def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user information by UID"""
        if not self.is_available():
            return None
        
        try:
            user_record = auth.get_user(uid, app=self.app)
            
            user_info = {
                'uid': user_record.uid,
                'email': user_record.email,
                'email_verified': user_record.email_verified,
                'display_name': user_record.display_name,
                'photo_url': user_record.photo_url,
                'disabled': user_record.disabled,
                'creation_timestamp': user_record.user_metadata.creation_timestamp,
                'last_sign_in_timestamp': user_record.user_metadata.last_sign_in_timestamp
            }
            
            return user_info
            
        except auth.UserNotFoundError:
            logger.warning(f"❌ User not found: {uid}")
            return None
        except Exception as e:
            logger.error(f"❌ Error getting user: {e}")
            return None
    
    async def create_custom_token(self, uid: str, additional_claims: Optional[Dict] = None) -> Optional[str]:
        """Create a custom token for a user"""
        if not self.is_available():
            return None
        
        try:
            custom_token = auth.create_custom_token(uid, additional_claims, app=self.app)
            logger.info(f"✅ Custom token created for user: {uid}")
            return custom_token.decode('utf-8')
            
        except Exception as e:
            logger.error(f"❌ Error creating custom token: {e}")
            return None
    
    async def set_custom_claims(self, uid: str, custom_claims: Dict[str, Any]) -> bool:
        """Set custom claims for a user"""
        if not self.is_available():
            return False
        
        try:
            auth.set_custom_user_claims(uid, custom_claims, app=self.app)
            logger.info(f"✅ Custom claims set for user: {uid}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error setting custom claims: {e}")
            return False
    
    async def revoke_refresh_tokens(self, uid: str) -> bool:
        """Revoke all refresh tokens for a user"""
        if not self.is_available():
            return False
        
        try:
            auth.revoke_refresh_tokens(uid, app=self.app)
            logger.info(f"✅ Refresh tokens revoked for user: {uid}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error revoking refresh tokens: {e}")
            return False
    
    def extract_user_from_token(self, authorization_header: str) -> Optional[str]:
        """Extract user ID from Authorization header"""
        if not authorization_header or not authorization_header.startswith('Bearer '):
            return None
        
        try:
            id_token = authorization_header.split('Bearer ')[1]
            # This is a synchronous version for quick extraction
            if not self.is_available():
                return None
            
            decoded_token = auth.verify_id_token(id_token, app=self.app)
            return decoded_token.get('uid')
            
        except Exception as e:
            logger.warning(f"❌ Error extracting user from token: {e}")
            return None

# Create global instance
auth_service = AuthService()