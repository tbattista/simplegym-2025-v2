"""
Data Migration Service for Ghost Gym V3 Phase 2
Handles migration from anonymous localStorage to authenticated Firestore accounts
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from ..models import Program, WorkoutTemplate
from .unified_data_service import unified_data_service
from .firestore_data_service import firestore_data_service

# Set up logging
logger = logging.getLogger(__name__)

class MigrationService:
    """
    Service for handling data migration from anonymous to authenticated accounts
    """
    
    def __init__(self):
        """Initialize migration service"""
        self.unified_service = unified_data_service
        self.firestore_service = firestore_data_service
        logger.info("Migration service initialized")
    
    async def check_migration_eligibility(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user is eligible for data migration
        
        Args:
            user_id: Firebase user ID
            
        Returns:
            Dict with eligibility status and details
        """
        try:
            # Check if Firestore is available
            if not self.firestore_service.is_available():
                return {
                    "eligible": False,
                    "reason": "Firestore service not available",
                    "local_data": {"programs": 0, "workouts": 0}
                }
            
            # Check if user already has data in Firestore
            existing_programs = await self.firestore_service.get_user_programs(user_id, limit=1)
            existing_workouts = await self.firestore_service.get_user_workouts(user_id, limit=1)
            
            if existing_programs or existing_workouts:
                return {
                    "eligible": False,
                    "reason": "User already has data in cloud storage",
                    "cloud_data": {
                        "programs": len(existing_programs),
                        "workouts": len(existing_workouts)
                    }
                }
            
            # Check local data availability
            local_programs = self.unified_service.local_service.get_all_programs(page=1, page_size=1000)
            local_workouts = self.unified_service.local_service.get_all_workouts(page=1, page_size=1000)
            
            local_data_count = {
                "programs": len(local_programs),
                "workouts": len(local_workouts)
            }
            
            if local_data_count["programs"] == 0 and local_data_count["workouts"] == 0:
                return {
                    "eligible": False,
                    "reason": "No local data to migrate",
                    "local_data": local_data_count
                }
            
            return {
                "eligible": True,
                "reason": "Ready for migration",
                "local_data": local_data_count,
                "estimated_time": self._estimate_migration_time(local_data_count)
            }
            
        except Exception as e:
            logger.error(f"Failed to check migration eligibility: {str(e)}")
            return {
                "eligible": False,
                "reason": f"Error checking eligibility: {str(e)}",
                "local_data": {"programs": 0, "workouts": 0}
            }
    
    async def prepare_migration_data(self) -> Dict[str, Any]:
        """
        Prepare local data for migration
        
        Returns:
            Dict with prepared data and metadata
        """
        try:
            # Get all local data
            local_programs = self.unified_service.local_service.get_all_programs(page=1, page_size=1000)
            local_workouts = self.unified_service.local_service.get_all_workouts(page=1, page_size=1000)
            
            # Convert to dictionaries for migration
            programs_data = []
            for program in local_programs:
                program_dict = program.dict()
                # Add migration metadata
                program_dict['migration_source'] = 'localStorage'
                program_dict['migration_timestamp'] = datetime.now().isoformat()
                programs_data.append(program_dict)
            
            workouts_data = []
            for workout in local_workouts:
                workout_dict = workout.dict()
                # Add migration metadata
                workout_dict['migration_source'] = 'localStorage'
                workout_dict['migration_timestamp'] = datetime.now().isoformat()
                workouts_data.append(workout_dict)
            
            # Create backup before migration
            backup_result = await self.unified_service.backup_data()
            
            return {
                "success": True,
                "programs_data": programs_data,
                "workouts_data": workouts_data,
                "backup_info": backup_result,
                "summary": {
                    "total_programs": len(programs_data),
                    "total_workouts": len(workouts_data),
                    "preparation_time": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to prepare migration data: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "programs_data": [],
                "workouts_data": []
            }
    
    async def execute_migration(self, user_id: str, programs_data: List[Dict], 
                              workouts_data: List[Dict], options: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Execute the data migration process
        
        Args:
            user_id: Firebase user ID
            programs_data: List of program dictionaries to migrate
            workouts_data: List of workout dictionaries to migrate
            options: Migration options (e.g., clear_local_after_success)
            
        Returns:
            Dict with migration results
        """
        migration_start = datetime.now()
        options = options or {}
        
        try:
            logger.info(f"Starting migration for user {user_id}: {len(programs_data)} programs, {len(workouts_data)} workouts")
            
            # Validate user eligibility one more time
            eligibility = await self.check_migration_eligibility(user_id)
            if not eligibility["eligible"]:
                return {
                    "success": False,
                    "error": f"Migration not eligible: {eligibility['reason']}",
                    "migrated_programs": 0,
                    "migrated_workouts": 0
                }
            
            # Create user profile if it doesn't exist
            existing_profile = await self.firestore_service.get_user_profile(user_id)
            if not existing_profile:
                await self.firestore_service.create_user_profile(user_id, {
                    "email": options.get("email"),
                    "displayName": options.get("displayName")
                })
            
            # Execute migration using Firestore service
            migration_result = await self.firestore_service.migrate_anonymous_data(
                user_id, programs_data, workouts_data
            )
            
            if not migration_result.get("success"):
                return {
                    "success": False,
                    "error": migration_result.get("error", "Migration failed"),
                    "migrated_programs": 0,
                    "migrated_workouts": 0
                }
            
            migration_end = datetime.now()
            migration_duration = (migration_end - migration_start).total_seconds()
            
            # Optionally clear local storage after successful migration
            if options.get("clear_local_after_success", False):
                try:
                    self.unified_service._clear_local_storage()
                    logger.info("Local storage cleared after successful migration")
                except Exception as e:
                    logger.warning(f"Failed to clear local storage: {str(e)}")
            
            # Log successful migration
            logger.info(f"Migration completed successfully for user {user_id} in {migration_duration:.2f} seconds")
            
            return {
                "success": True,
                "migrated_programs": migration_result.get("migrated_programs", 0),
                "migrated_workouts": migration_result.get("migrated_workouts", 0),
                "errors": migration_result.get("errors", []),
                "migration_duration": migration_duration,
                "migration_timestamp": migration_end.isoformat(),
                "local_storage_cleared": options.get("clear_local_after_success", False)
            }
            
        except Exception as e:
            logger.error(f"Migration execution failed for user {user_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "migrated_programs": 0,
                "migrated_workouts": 0,
                "migration_duration": (datetime.now() - migration_start).total_seconds()
            }
    
    async def get_migration_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get current migration status for a user
        
        Args:
            user_id: Firebase user ID
            
        Returns:
            Dict with migration status information
        """
        try:
            # Check if user has data in Firestore
            firestore_programs = await self.firestore_service.get_user_programs(user_id, limit=1000)
            firestore_workouts = await self.firestore_service.get_user_workouts(user_id, limit=1000)
            
            # Check if user has local data
            local_programs = self.unified_service.local_service.get_all_programs(page=1, page_size=1000)
            local_workouts = self.unified_service.local_service.get_all_workouts(page=1, page_size=1000)
            
            # Determine migration status
            has_firestore_data = len(firestore_programs) > 0 or len(firestore_workouts) > 0
            has_local_data = len(local_programs) > 0 or len(local_workouts) > 0
            
            if has_firestore_data and not has_local_data:
                status = "completed"
            elif has_firestore_data and has_local_data:
                status = "partial_or_duplicate"
            elif not has_firestore_data and has_local_data:
                status = "pending"
            else:
                status = "no_data"
            
            # Check for migrated data markers
            migrated_programs = [p for p in firestore_programs if hasattr(p, 'migrated_at')]
            migrated_workouts = [w for w in firestore_workouts if hasattr(w, 'migrated_at')]
            
            return {
                "status": status,
                "firestore_data": {
                    "programs": len(firestore_programs),
                    "workouts": len(firestore_workouts),
                    "migrated_programs": len(migrated_programs),
                    "migrated_workouts": len(migrated_workouts)
                },
                "local_data": {
                    "programs": len(local_programs),
                    "workouts": len(local_workouts)
                },
                "recommendations": self._get_migration_recommendations(status, has_local_data, has_firestore_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get migration status: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "firestore_data": {"programs": 0, "workouts": 0},
                "local_data": {"programs": 0, "workouts": 0}
            }
    
    async def rollback_migration(self, user_id: str, backup_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Rollback a migration (emergency use only)
        
        Args:
            user_id: Firebase user ID
            backup_file: Optional backup file to restore from
            
        Returns:
            Dict with rollback results
        """
        try:
            logger.warning(f"Migration rollback requested for user {user_id}")
            
            # If backup file provided, restore from it
            if backup_file:
                restore_success = self.unified_service.local_service.restore_data(backup_file)
                if not restore_success:
                    return {
                        "success": False,
                        "error": "Failed to restore from backup file"
                    }
            
            # Note: We don't automatically delete Firestore data for safety
            # This should be done manually if needed
            
            return {
                "success": True,
                "message": "Local data restored from backup",
                "warning": "Firestore data was not automatically deleted for safety",
                "recommendation": "Contact administrator if Firestore cleanup is needed"
            }
            
        except Exception as e:
            logger.error(f"Migration rollback failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _estimate_migration_time(self, data_count: Dict[str, int]) -> str:
        """
        Estimate migration time based on data volume
        
        Args:
            data_count: Dict with programs and workouts counts
            
        Returns:
            Estimated time string
        """
        total_items = data_count["programs"] + data_count["workouts"]
        
        if total_items <= 10:
            return "< 10 seconds"
        elif total_items <= 50:
            return "10-30 seconds"
        elif total_items <= 100:
            return "30-60 seconds"
        else:
            return "1-2 minutes"
    
    def _get_migration_recommendations(self, status: str, has_local: bool, has_firestore: bool) -> List[str]:
        """
        Get migration recommendations based on current status
        
        Args:
            status: Current migration status
            has_local: Whether user has local data
            has_firestore: Whether user has Firestore data
            
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        if status == "pending":
            recommendations.append("You have local data that can be migrated to the cloud")
            recommendations.append("Migration will enable multi-device access and automatic backup")
        elif status == "completed":
            recommendations.append("Migration completed successfully")
            recommendations.append("Your data is now synced across all devices")
        elif status == "partial_or_duplicate":
            recommendations.append("You have data in both local and cloud storage")
            recommendations.append("Consider backing up local data before clearing it")
        elif status == "no_data":
            recommendations.append("No data found to migrate")
            recommendations.append("Start creating programs and workouts")
        
        return recommendations

# Global migration service instance
migration_service = MigrationService()