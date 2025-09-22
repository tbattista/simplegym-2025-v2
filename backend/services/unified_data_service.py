"""
Unified Data Service for Ghost Gym V3 Phase 2
Handles dual-storage architecture: localStorage for anonymous, Firestore for authenticated users
"""

import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from ..models import (
    Program, WorkoutTemplate, CreateWorkoutRequest, CreateProgramRequest,
    UpdateWorkoutRequest, UpdateProgramRequest, ProgramWorkout
)
from .data_service import DataService
from .firestore_data_service import firestore_data_service

# Set up logging
logger = logging.getLogger(__name__)

class UnifiedDataService:
    """
    Unified data service that routes operations to appropriate storage backend
    based on user authentication status
    """
    
    def __init__(self):
        """Initialize unified data service"""
        self.local_service = DataService()
        self.firestore_service = firestore_data_service
        logger.info("Unified data service initialized")
    
    def _get_service(self, user_id: Optional[str]):
        """
        Get appropriate service based on user authentication
        
        Args:
            user_id: Firebase user ID (None for anonymous users)
            
        Returns:
            Tuple of (service, is_authenticated)
        """
        if user_id and self.firestore_service.is_available():
            return self.firestore_service, True
        else:
            return self.local_service, False
    
    # Workout Operations
    
    async def create_workout(self, workout_request: CreateWorkoutRequest, user_id: Optional[str] = None) -> Optional[WorkoutTemplate]:
        """Create a new workout template"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.create_workout(user_id, workout_request)
            else:
                return service.create_workout(workout_request)
        except Exception as e:
            logger.error(f"Failed to create workout: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.create_workout(workout_request)
            return None
    
    async def get_workouts(self, user_id: Optional[str] = None, tags: Optional[List[str]] = None, 
                          page: int = 1, page_size: int = 50, search: Optional[str] = None) -> List[WorkoutTemplate]:
        """Get workout templates with optional filtering"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                if search:
                    return await service.search_workouts(user_id, search, limit=page_size)
                else:
                    return await service.get_user_workouts(user_id, limit=page_size, tags=tags)
            else:
                if search:
                    return service.search_workouts(search)
                else:
                    return service.get_all_workouts(tags=tags, page=page, page_size=page_size)
        except Exception as e:
            logger.error(f"Failed to get workouts: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                if search:
                    return self.local_service.search_workouts(search)
                else:
                    return self.local_service.get_all_workouts(tags=tags, page=page, page_size=page_size)
            return []
    
    async def get_workout(self, workout_id: str, user_id: Optional[str] = None) -> Optional[WorkoutTemplate]:
        """Get a specific workout template"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.get_workout(user_id, workout_id)
            else:
                return service.get_workout(workout_id)
        except Exception as e:
            logger.error(f"Failed to get workout: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.get_workout(workout_id)
            return None
    
    async def update_workout(self, workout_id: str, update_request: UpdateWorkoutRequest, 
                           user_id: Optional[str] = None) -> Optional[WorkoutTemplate]:
        """Update a workout template"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.update_workout(user_id, workout_id, update_request)
            else:
                return service.update_workout(workout_id, update_request)
        except Exception as e:
            logger.error(f"Failed to update workout: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.update_workout(workout_id, update_request)
            return None
    
    async def delete_workout(self, workout_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a workout template"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.delete_workout(user_id, workout_id)
            else:
                return service.delete_workout(workout_id)
        except Exception as e:
            logger.error(f"Failed to delete workout: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.delete_workout(workout_id)
            return False
    
    async def duplicate_workout(self, workout_id: str, new_name: str, user_id: Optional[str] = None) -> Optional[WorkoutTemplate]:
        """Duplicate a workout template with a new name"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.duplicate_workout(user_id, workout_id, new_name)
            else:
                return service.duplicate_workout(workout_id, new_name)
        except Exception as e:
            logger.error(f"Failed to duplicate workout: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.duplicate_workout(workout_id, new_name)
            return None
    
    # Program Operations
    
    async def create_program(self, program_request: CreateProgramRequest, user_id: Optional[str] = None) -> Optional[Program]:
        """Create a new program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.create_program(user_id, program_request)
            else:
                return service.create_program(program_request)
        except Exception as e:
            logger.error(f"Failed to create program: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.create_program(program_request)
            return None
    
    async def get_programs(self, user_id: Optional[str] = None, page: int = 1, 
                          page_size: int = 20, search: Optional[str] = None) -> List[Program]:
        """Get programs with optional search"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                if search:
                    return await service.search_programs(user_id, search, limit=page_size)
                else:
                    return await service.get_user_programs(user_id, limit=page_size)
            else:
                if search:
                    return service.search_programs(search)
                else:
                    return service.get_all_programs(page=page, page_size=page_size)
        except Exception as e:
            logger.error(f"Failed to get programs: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                if search:
                    return self.local_service.search_programs(search)
                else:
                    return self.local_service.get_all_programs(page=page, page_size=page_size)
            return []
    
    async def get_program(self, program_id: str, user_id: Optional[str] = None) -> Optional[Program]:
        """Get a specific program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.get_program(user_id, program_id)
            else:
                return service.get_program(program_id)
        except Exception as e:
            logger.error(f"Failed to get program: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.get_program(program_id)
            return None
    
    async def get_program_with_workout_details(self, program_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get a program with full workout details"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.get_program_with_workout_details(user_id, program_id)
            else:
                return service.get_program_with_workout_details(program_id)
        except Exception as e:
            logger.error(f"Failed to get program with workout details: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.get_program_with_workout_details(program_id)
            return None
    
    async def update_program(self, program_id: str, update_request: UpdateProgramRequest, 
                           user_id: Optional[str] = None) -> Optional[Program]:
        """Update a program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.update_program(user_id, program_id, update_request)
            else:
                return service.update_program(program_id, update_request)
        except Exception as e:
            logger.error(f"Failed to update program: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.update_program(program_id, update_request)
            return None
    
    async def delete_program(self, program_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.delete_program(user_id, program_id)
            else:
                return service.delete_program(program_id)
        except Exception as e:
            logger.error(f"Failed to delete program: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.delete_program(program_id)
            return False
    
    # Program-Workout Management
    
    async def add_workout_to_program(self, program_id: str, workout_id: str, user_id: Optional[str] = None,
                                   order_index: Optional[int] = None, custom_name: Optional[str] = None, 
                                   custom_date: Optional[str] = None) -> Optional[Program]:
        """Add a workout to a program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.add_workout_to_program(user_id, program_id, workout_id, 
                                                          order_index, custom_name, custom_date)
            else:
                return service.add_workout_to_program(program_id, workout_id, order_index, 
                                                    custom_name, custom_date)
        except Exception as e:
            logger.error(f"Failed to add workout to program: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.add_workout_to_program(program_id, workout_id, 
                                                               order_index, custom_name, custom_date)
            return None
    
    async def remove_workout_from_program(self, program_id: str, workout_id: str, 
                                        user_id: Optional[str] = None) -> Optional[Program]:
        """Remove a workout from a program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.remove_workout_from_program(user_id, program_id, workout_id)
            else:
                return service.remove_workout_from_program(program_id, workout_id)
        except Exception as e:
            logger.error(f"Failed to remove workout from program: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.remove_workout_from_program(program_id, workout_id)
            return None
    
    async def reorder_program_workouts(self, program_id: str, workout_order: List[str], 
                                     user_id: Optional[str] = None) -> Optional[Program]:
        """Reorder workouts in a program"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.reorder_program_workouts(user_id, program_id, workout_order)
            else:
                return service.reorder_program_workouts(program_id, workout_order)
        except Exception as e:
            logger.error(f"Failed to reorder program workouts: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return self.local_service.reorder_program_workouts(program_id, workout_order)
            return None
    
    # Data Migration
    
    async def migrate_anonymous_data(self, user_id: str, programs_data: Optional[List[Dict]] = None, 
                                   workouts_data: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Migrate anonymous user data to authenticated account
        If no data provided, will read from local storage
        """
        if not self.firestore_service.is_available():
            return {"success": False, "error": "Firestore not available"}
        
        try:
            # If no data provided, read from local storage
            if programs_data is None:
                programs = self.local_service.get_all_programs(page=1, page_size=1000)
                programs_data = [program.dict() for program in programs]
            
            if workouts_data is None:
                workouts = self.local_service.get_all_workouts(page=1, page_size=1000)
                workouts_data = [workout.dict() for workout in workouts]
            
            # Migrate to Firestore
            result = await self.firestore_service.migrate_anonymous_data(user_id, programs_data, workouts_data)
            
            if result.get("success"):
                logger.info(f"Successfully migrated data for user {user_id}")
                
                # Optionally clear local storage after successful migration
                # This is commented out for safety - can be enabled later
                # self._clear_local_storage()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to migrate anonymous data: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _clear_local_storage(self):
        """Clear local storage data (use with caution)"""
        try:
            # Create backup before clearing
            backup_file = self.local_service.backup_data()
            logger.info(f"Created backup before clearing local storage: {backup_file}")
            
            # Clear the data files
            self.local_service._write_json(self.local_service.programs_file, {"programs": []})
            self.local_service._write_json(self.local_service.workouts_file, {"workouts": []})
            
            logger.info("Local storage cleared after successful migration")
        except Exception as e:
            logger.error(f"Failed to clear local storage: {str(e)}")
    
    # Statistics
    
    async def get_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get application statistics"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                return await service.get_user_stats(user_id)
            else:
                return {
                    "total_workouts": service.get_workout_count(),
                    "total_programs": service.get_program_count(),
                    "version": "v3"
                }
        except Exception as e:
            logger.error(f"Failed to get stats: {str(e)}")
            # Fallback to local service if Firestore fails
            if is_authenticated:
                logger.warning("Firestore failed, falling back to local storage")
                return {
                    "total_workouts": self.local_service.get_workout_count(),
                    "total_programs": self.local_service.get_program_count(),
                    "version": "v3"
                }
            return {"total_workouts": 0, "total_programs": 0, "version": "v3"}
    
    # Backup and Restore
    
    async def backup_data(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a backup of data"""
        service, is_authenticated = self._get_service(user_id)
        
        try:
            if is_authenticated:
                # For Firestore, we'll export the data
                programs = await service.get_user_programs(user_id, limit=1000)
                workouts = await service.get_user_workouts(user_id, limit=1000)
                
                backup_data = {
                    "backup_timestamp": datetime.now().isoformat(),
                    "user_id": user_id,
                    "programs": [program.dict() for program in programs],
                    "workouts": [workout.dict() for workout in workouts]
                }
                
                # Save to local backup file
                import json
                from pathlib import Path
                backup_dir = Path("backend/backups")
                backup_dir.mkdir(exist_ok=True)
                backup_file = backup_dir / f"firestore_backup_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                
                with open(backup_file, 'w', encoding='utf-8') as f:
                    json.dump(backup_data, f, indent=2, default=str)
                
                return {"message": "Backup created successfully", "backup_file": str(backup_file)}
            else:
                backup_file = service.backup_data()
                return {"message": "Backup created successfully", "backup_file": backup_file}
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return {"message": f"Backup failed: {str(e)}", "backup_file": None}
    
    # Health Check
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get status of both storage services"""
        return {
            "local_service": {
                "available": True,
                "type": "JSON files"
            },
            "firestore_service": {
                "available": self.firestore_service.is_available(),
                "type": "Firestore"
            },
            "unified_service": {
                "available": True,
                "fallback_enabled": True
            }
        }

# Global unified data service instance
unified_data_service = UnifiedDataService()