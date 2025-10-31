"""
Firebase Configuration for Ghost Gym V3
Handles Firebase Admin SDK initialization with environment variables
"""

import os
import json
import logging
import traceback
import sys
from typing import Optional

logger = logging.getLogger(__name__)

# Enhanced diagnostic import with detailed error logging
try:
    import firebase_admin
    from firebase_admin import credentials
    FIREBASE_AVAILABLE = True
    logger.info(f"✅ Firebase Admin SDK imported successfully (version: {getattr(firebase_admin, '__version__', 'unknown')})")
except ImportError as e:
    FIREBASE_AVAILABLE = False
    firebase_admin = None
    credentials = None
    
    # Log detailed error information for Railway debugging
    logger.error("=" * 60)
    logger.error("❌ FIREBASE IMPORT FAILED")
    logger.error("=" * 60)
    logger.error(f"Import Error: {str(e)}")
    logger.error(f"Error Type: {type(e).__name__}")
    logger.error("\nFull Traceback:")
    logger.error(traceback.format_exc())
    logger.error("\nPython Path:")
    for path in sys.path:
        logger.error(f"  - {path}")
    logger.error("=" * 60)
    
    # Try to diagnose which specific package is missing
    logger.error("\n🔍 Checking Firebase dependencies:")
    dependencies = [
        ('firebase_admin', 'firebase_admin'),
        ('google-cloud-firestore', 'google.cloud.firestore'),
        ('google-auth', 'google.auth'),
        ('grpcio', 'grpcio'),
        ('cryptography', 'cryptography'),
        ('protobuf', 'google.protobuf')
    ]
    
    for package_name, import_name in dependencies:
        try:
            __import__(import_name)
            logger.error(f"  ✅ {package_name} - OK")
        except ImportError as dep_error:
            logger.error(f"  ❌ {package_name} - FAILED: {str(dep_error)}")
    
    logger.error("=" * 60)

# Global Firebase app instance
_firebase_app: Optional[firebase_admin.App] = None

def get_firebase_app() -> Optional[firebase_admin.App]:
    """
    Get or initialize Firebase Admin SDK app
    
    Returns:
        Firebase app instance or None if initialization fails
    """
    global _firebase_app
    
    if not FIREBASE_AVAILABLE:
        logger.warning("Firebase Admin SDK not available - install firebase-admin package")
        return None
    
    # Return existing app if already initialized
    if _firebase_app is not None:
        return _firebase_app
    
    # Check if Firebase is already initialized by another module
    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        logger.info("✅ Using existing Firebase app")
        return _firebase_app
    
    try:
        # Try to initialize Firebase Admin SDK
        project_id = os.getenv('FIREBASE_PROJECT_ID')
        private_key = os.getenv('FIREBASE_PRIVATE_KEY')
        client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
        
        logger.info(f"Firebase config check - Project ID: {bool(project_id)}, Private Key: {bool(private_key)}, Client Email: {bool(client_email)}")
        
        if not all([project_id, private_key, client_email]):
            logger.warning("Firebase environment variables not fully configured")
            logger.warning(f"Missing: Project ID: {not project_id}, Private Key: {not private_key}, Client Email: {not client_email}")
            return None
        
        # Create credentials from environment variables
        cred_dict = {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": private_key.replace('\\n', '\n'),  # Handle escaped newlines
            "client_email": client_email,
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
            "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}"
        }
        
        # Remove None values from credential dict
        cred_dict = {k: v for k, v in cred_dict.items() if v is not None}
        
        # Initialize Firebase with service account credentials
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred, {
            'projectId': project_id
        })
        
        logger.info(f"✅ Firebase Admin SDK initialized successfully for project: {project_id}")
        return _firebase_app
        
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {str(e)}")
        logger.info("Application will continue with local storage fallback")
        return None

def is_firebase_available() -> bool:
    """
    Check if Firebase is available and properly configured
    
    Returns:
        True if Firebase is available, False otherwise
    """
    return FIREBASE_AVAILABLE and get_firebase_app() is not None

def get_firebase_config_status() -> dict:
    """
    Get Firebase configuration status for debugging
    
    Returns:
        Dictionary with configuration status information
    """
    return {
        "firebase_admin_installed": FIREBASE_AVAILABLE,
        "app_initialized": _firebase_app is not None,
        "project_id_configured": bool(os.getenv('FIREBASE_PROJECT_ID')),
        "private_key_configured": bool(os.getenv('FIREBASE_PRIVATE_KEY')),
        "client_email_configured": bool(os.getenv('FIREBASE_CLIENT_EMAIL')),
        "environment": os.getenv('ENVIRONMENT', 'development')
    }

# Initialize Firebase on module import (optional - can be lazy loaded)
if os.getenv('FIREBASE_AUTO_INIT', 'true').lower() == 'true':
    get_firebase_app()

# Export firebase_app for backward compatibility
firebase_app = get_firebase_app()