"""
API Routers Package
Contains all API endpoint routers organized by domain
"""

from . import health, documents, workouts, programs, exercises, favorites, auth, data

__all__ = [
    'health',
    'documents', 
    'workouts',
    'programs',
    'exercises',
    'favorites',
    'auth',
    'data',
    'migration'  # ← Added this
]