"""
API package for Ghost Gym V3
Contains API routers and endpoint definitions
"""

from .migration import router as migration_router

__all__ = ['migration_router']