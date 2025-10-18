"""
Health and Status Monitoring Endpoints
Provides system health checks and service status information
"""

from fastapi import APIRouter
from pathlib import Path
from ..services.firebase_service import firebase_service
from ..services.auth_service import auth_service
from ..services.v2.document_service_v2 import DocumentServiceV2

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    firebase_status = "available" if firebase_service.is_available() else "unavailable"
    auth_status = "available" if auth_service.is_available() else "unavailable"
    
    return {
        "status": "healthy",
        "message": "Ghost Gym V3 API is running",
        "version": "v3",
        "firebase_status": firebase_status,
        "auth_status": auth_status
    }


@router.get("/status")
async def v3_status():
    """Get V3 system status including all services"""
    try:
        document_service = DocumentServiceV2()
        gotenberg_available = document_service.is_gotenberg_available()
        firebase_available = firebase_service.is_available()
        auth_available = auth_service.is_available()
        
        return {
            "version": "v3",
            "status": "available",
            "gotenberg_available": gotenberg_available,
            "firebase_available": firebase_available,
            "auth_available": auth_available,
            "features": {
                "html_templates": True,
                "pdf_generation": gotenberg_available,
                "instant_preview": True,
                "user_authentication": auth_available,
                "cloud_storage": firebase_available,
                "multi_device_sync": firebase_available and auth_available,
                "offline_support": True
            }
        }
    except Exception as e:
        return {
            "version": "v3",
            "status": "error",
            "error": str(e),
            "gotenberg_available": False,
            "firebase_available": False,
            "auth_available": False
        }


@router.get("/debug/static")
async def debug_static():
    """Debug static file serving"""
    frontend_path = Path("frontend")
    css_path = frontend_path / "css" / "style-v2.css"
    js_path = frontend_path / "js" / "app-v2.js"
    
    return {
        "frontend_exists": frontend_path.exists(),
        "frontend_absolute": str(frontend_path.absolute()),
        "css_exists": css_path.exists(),
        "css_absolute": str(css_path.absolute()),
        "js_exists": js_path.exists(),
        "js_absolute": str(js_path.absolute()),
        "working_directory": str(Path.cwd()),
        "frontend_contents": [str(p) for p in frontend_path.iterdir()] if frontend_path.exists() else []
    }