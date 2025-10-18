"""
Ghost Gym V2 - Main Application Entry Point
Slim FastAPI application with modular router architecture
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
from dotenv import load_dotenv

# Load environment variables FIRST before importing Firebase services
load_dotenv()

# Import routers
from .api import health, documents, workouts, programs, exercises, favorites, auth, data, migration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Ghost Gym V2 - Advanced Log Book API",
    description="API for generating customized gym log documents. Modular architecture with Firebase integration.",
    version="2.0.0"
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(workouts.router)
app.include_router(workouts.firebase_router)  # Firebase-specific workout endpoints
app.include_router(programs.router)
app.include_router(programs.firebase_router)  # Firebase-specific program endpoints
app.include_router(exercises.router)
app.include_router(favorites.router)
app.include_router(auth.router)
app.include_router(data.router)
app.include_router(migration.router)

logger.info("✅ All routers included successfully (11 routers total)")

# Create necessary directories
os.makedirs("backend/uploads", exist_ok=True)
os.makedirs("backend/templates/html", exist_ok=True)

# Mount static files (frontend)
frontend_path = Path("frontend")

# Mount main frontend (V0.4.1 Sneat-based)
if frontend_path.exists():
    logger.info(f"✅ Frontend directory found: {frontend_path.absolute()}")
    app.mount("/static", StaticFiles(directory="frontend"), name="static")
else:
    logger.error(f"❌ Frontend directory not found at: {frontend_path.absolute()}")


# Serve HTML pages

@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the Ghost Gym dashboard"""
    try:
        with open("frontend/dashboard.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(
            content="<h1>Dashboard not found</h1><p>Please ensure frontend/dashboard.html exists</p>",
            status_code=404
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

logger.info("🚀 Ghost Gym V2 API initialized successfully")
