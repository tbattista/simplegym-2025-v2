"""
Enhanced Firestore Data Service for Ghost Gym V3 Phase 2
Handles complete CRUD operations for programs and workouts with real-time sync support
"""

import logging
import traceback
from typing import Dict, List, Optional, Any
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

try:
    from firebase_admin import firestore
    FIRESTORE_AVAILABLE = True
    logger.info("✅ Firestore data service: firestore module imported successfully")
except ImportError as e:
    FIRESTORE_AVAILABLE = False
    firestore = None
    logger.error(f"❌ Firestore data service: Failed to import firestore - {str(e)}")
    logger.error(f"Traceback: {traceback.format_exc()}")

from ..config.firebase_config import get_firebase_app
from ..models import (
    Program, WorkoutTemplate, CreateWorkoutRequest, CreateProgramRequest,
    UpdateWorkoutRequest, UpdateProgramRequest, ProgramWorkout
)

class FirestoreDataService:
    """
    Enhanced Firestore service for complete data operations
    Supports real-time sync, conflict resolution, and offline capabilities
    """
    
    def __init__(self):
        """Initialize Firestore data service"""
        if not FIRESTORE_AVAILABLE:
            logger.warning("Firebase Admin SDK not available - Firestore data service disabled")
            self.db = None
            self.available = False
            self.app = None
            return
        
        try:
            self.app = get_firebase_app()
            if self.app:
                self.db = firestore.client(app=self.app)
                self.available = True
                logger.info("Firestore data service initialized successfully")
            else:
                self.db = None
                self.available = False
                logger.warning("Firestore data service not available - Firebase not initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore data service: {str(e)}")
            self.db = None
            self.available = False
    
    def is_available(self) -> bool:
        """Check if Firestore service is available"""
        return self.available and self.db is not None
    
    # User Profile Operations
    
    async def create_user_profile(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Create user profile in Firestore"""
        if not self.is_available():
            logger.warning("Firestore not available - cannot create user profile")
            return False
        
        try:
            user_ref = self.db.collection('users').document(user_id)
            
            profile_data = {
                'uid': user_id,
                'email': user_data.get('email'),
                'displayName': user_data.get('displayName'),
                'createdAt': firestore.SERVER_TIMESTAMP,
                'lastLoginAt': firestore.SERVER_TIMESTAMP,
                'preferences': {
                    'theme': 'dark',
                    'defaultUnits': 'metric',
                    'autoBackup': True,
                    'realTimeSync': True
                },
                'subscription': {
                    'plan': 'free',
                    'expiresAt': None
                },
                'stats': {
                    'totalPrograms': 0,
                    'totalWorkouts': 0,
                    'lastActivity': firestore.SERVER_TIMESTAMP
                }
            }
            
            user_ref.set(profile_data)
            logger.info(f"Created user profile for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create user profile: {str(e)}")
            return False
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Firestore"""
        if not self.is_available():
            return None
        
        try:
            user_ref = self.db.collection('users').document(user_id)
            doc = user_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                logger.info(f"User profile not found: {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            return None
    
    async def update_user_stats(self, user_id: str, stats_update: Dict[str, Any]) -> bool:
        """Update user statistics"""
        if not self.is_available():
            return False
        
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({
                'stats': stats_update,
                'lastActivity': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            logger.error(f"Failed to update user stats: {str(e)}")
            return False
    
    # Workout CRUD Operations
    
    async def create_workout(self, user_id: str, workout_request: CreateWorkoutRequest) -> Optional[WorkoutTemplate]:
        """Create a new workout template for user"""
        if not self.is_available():
            logger.warning("Firestore not available - cannot create workout")
            return None
        
        try:
            # Create workout object
            workout = WorkoutTemplate(
                name=workout_request.name,
                description=workout_request.description,
                exercise_groups=workout_request.exercise_groups,
                bonus_exercises=workout_request.bonus_exercises,
                tags=workout_request.tags
            )
            
            # Save to Firestore
            workout_ref = self.db.collection('users').document(user_id).collection('workouts').document(workout.id)
            workout_data = workout.model_dump()
            
            # Convert datetime objects to timestamps
            workout_data['created_date'] = firestore.SERVER_TIMESTAMP
            workout_data['modified_date'] = firestore.SERVER_TIMESTAMP
            workout_data['version'] = 1
            workout_data['sync_status'] = 'synced'
            
            workout_ref.set(workout_data)
            
            # Update user stats
            await self._increment_user_workout_count(user_id)
            
            logger.info(f"Created workout {workout.id} for user {user_id}")
            return workout
            
        except Exception as e:
            logger.error(f"Failed to create workout: {str(e)}")
            return None
    
    async def get_user_workouts(self, user_id: str, limit: int = 50, tags: Optional[List[str]] = None) -> List[WorkoutTemplate]:
        """Get all workouts for a user with optional filtering"""
        if not self.is_available():
            return []
        
        try:
            workouts_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workouts')
                          .order_by('modified_date', direction=firestore.Query.DESCENDING)
                          .limit(limit))
            
            # Apply tag filtering if specified
            if tags:
                workouts_ref = workouts_ref.where('tags', 'array_contains_any', tags)
            
            docs = workouts_ref.stream()
            workouts = []
            
            for doc in docs:
                try:
                    workout_data = doc.to_dict()
                    workout = WorkoutTemplate(**workout_data)
                    workouts.append(workout)
                except Exception as e:
                    logger.warning(f"Failed to parse workout {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(workouts)} workouts for user {user_id}")
            return workouts
            
        except Exception as e:
            logger.error(f"Failed to get user workouts: {str(e)}")
            return []
    
    async def get_workout(self, user_id: str, workout_id: str) -> Optional[WorkoutTemplate]:
        """Get a specific workout by ID"""
        if not self.is_available():
            return None
        
        try:
            workout_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workouts')
                          .document(workout_id))
            
            doc = workout_ref.get()
            
            if doc.exists:
                workout_data = doc.to_dict()
                return WorkoutTemplate(**workout_data)
            else:
                logger.info(f"Workout {workout_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get workout: {str(e)}")
            return None
    
    async def update_workout(self, user_id: str, workout_id: str, update_request: UpdateWorkoutRequest) -> Optional[WorkoutTemplate]:
        """Update a workout"""
        if not self.is_available():
            return None
        
        try:
            workout_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workouts')
                          .document(workout_id))
            
            # Get current workout for version checking
            current_doc = workout_ref.get()
            if not current_doc.exists:
                logger.warning(f"Workout {workout_id} not found for update")
                return None
            
            current_data = current_doc.to_dict()
            current_version = current_data.get('version', 1)
            
            # Prepare update data
            update_data = update_request.model_dump(exclude_unset=True)
            update_data['modified_date'] = firestore.SERVER_TIMESTAMP
            update_data['version'] = current_version + 1
            update_data['sync_status'] = 'synced'
            
            workout_ref.update(update_data)
            
            # Get updated workout
            return await self.get_workout(user_id, workout_id)
            
        except Exception as e:
            logger.error(f"Failed to update workout: {str(e)}")
            return None
    
    async def delete_workout(self, user_id: str, workout_id: str) -> bool:
        """Delete a workout"""
        if not self.is_available():
            return False
        
        try:
            workout_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workouts')
                          .document(workout_id))
            
            workout_ref.delete()
            
            # Update user stats
            await self._decrement_user_workout_count(user_id)
            
            logger.info(f"Deleted workout {workout_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete workout: {str(e)}")
            return False
    
    async def duplicate_workout(self, user_id: str, workout_id: str, new_name: str) -> Optional[WorkoutTemplate]:
        """Duplicate an existing workout with a new name"""
        original_workout = await self.get_workout(user_id, workout_id)
        if not original_workout:
            return None
        
        # Create new workout request from original
        duplicate_request = CreateWorkoutRequest(
            name=new_name,
            description=f"Copy of {original_workout.description}",
            exercise_groups=original_workout.exercise_groups,
            bonus_exercises=original_workout.bonus_exercises,
            tags=original_workout.tags + ["duplicate"]
        )
        
        return await self.create_workout(user_id, duplicate_request)
    
    # Program CRUD Operations
    
    async def create_program(self, user_id: str, program_request: CreateProgramRequest) -> Optional[Program]:
        """Create a new program for user"""
        if not self.is_available():
            logger.warning("Firestore not available - cannot create program")
            return None
        
        try:
            # Create program object
            program = Program(
                name=program_request.name,
                description=program_request.description,
                duration_weeks=program_request.duration_weeks,
                difficulty_level=program_request.difficulty_level,
                tags=program_request.tags
            )
            
            # Save to Firestore
            program_ref = self.db.collection('users').document(user_id).collection('programs').document(program.id)
            program_data = program.model_dump()
            
            # Convert datetime objects to timestamps
            program_data['created_date'] = firestore.SERVER_TIMESTAMP
            program_data['modified_date'] = firestore.SERVER_TIMESTAMP
            program_data['version'] = 1
            program_data['sync_status'] = 'synced'
            
            program_ref.set(program_data)
            
            # Update user stats
            await self._increment_user_program_count(user_id)
            
            logger.info(f"Created program {program.id} for user {user_id}")
            return program
            
        except Exception as e:
            logger.error(f"Failed to create program: {str(e)}")
            return None
    
    async def get_user_programs(self, user_id: str, limit: int = 20) -> List[Program]:
        """Get all programs for a user"""
        if not self.is_available():
            return []
        
        try:
            programs_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('programs')
                          .order_by('modified_date', direction=firestore.Query.DESCENDING)
                          .limit(limit))
            
            docs = programs_ref.stream()
            programs = []
            
            for doc in docs:
                try:
                    program_data = doc.to_dict()
                    program = Program(**program_data)
                    programs.append(program)
                except Exception as e:
                    logger.warning(f"Failed to parse program {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(programs)} programs for user {user_id}")
            return programs
            
        except Exception as e:
            logger.error(f"Failed to get user programs: {str(e)}")
            return []
    
    async def get_program(self, user_id: str, program_id: str) -> Optional[Program]:
        """Get a specific program by ID"""
        if not self.is_available():
            return None
        
        try:
            program_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('programs')
                          .document(program_id))
            
            doc = program_ref.get()
            
            if doc.exists:
                program_data = doc.to_dict()
                return Program(**program_data)
            else:
                logger.info(f"Program {program_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get program: {str(e)}")
            return None
    
    async def update_program(self, user_id: str, program_id: str, update_request: UpdateProgramRequest) -> Optional[Program]:
        """Update a program"""
        if not self.is_available():
            return None
        
        try:
            program_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('programs')
                          .document(program_id))
            
            # Get current program for version checking
            current_doc = program_ref.get()
            if not current_doc.exists:
                logger.warning(f"Program {program_id} not found for update")
                return None
            
            current_data = current_doc.to_dict()
            current_version = current_data.get('version', 1)
            
            # Prepare update data
            update_data = update_request.model_dump(exclude_unset=True)
            update_data['modified_date'] = firestore.SERVER_TIMESTAMP
            update_data['version'] = current_version + 1
            update_data['sync_status'] = 'synced'
            
            program_ref.update(update_data)
            
            # Get updated program
            return await self.get_program(user_id, program_id)
            
        except Exception as e:
            logger.error(f"Failed to update program: {str(e)}")
            return None
    
    async def delete_program(self, user_id: str, program_id: str) -> bool:
        """Delete a program"""
        if not self.is_available():
            return False
        
        try:
            program_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('programs')
                          .document(program_id))
            
            program_ref.delete()
            
            # Update user stats
            await self._decrement_user_program_count(user_id)
            
            logger.info(f"Deleted program {program_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete program: {str(e)}")
            return False
    
    async def get_program_with_workout_details(self, user_id: str, program_id: str) -> Optional[Dict[str, Any]]:
        """Get program with full workout details"""
        program = await self.get_program(user_id, program_id)
        if not program:
            return None
        
        workout_details = []
        for pw in program.workouts:
            workout = await self.get_workout(user_id, pw.workout_id)
            if workout:
                workout_details.append(workout)
        
        return {
            "program": program,
            "workout_details": workout_details
        }
    
    # Program-Workout Management
    
    async def add_workout_to_program(self, user_id: str, program_id: str, workout_id: str, 
                                   order_index: Optional[int] = None, custom_name: Optional[str] = None, 
                                   custom_date: Optional[str] = None) -> Optional[Program]:
        """Add a workout to a program"""
        program = await self.get_program(user_id, program_id)
        if not program:
            return None
        
        # Verify workout exists
        if not await self.get_workout(user_id, workout_id):
            return None
        
        # Determine order index
        if order_index is None:
            order_index = len(program.workouts)
        
        # Create program workout entry
        program_workout = ProgramWorkout(
            workout_id=workout_id,
            order_index=order_index,
            custom_name=custom_name,
            custom_date=custom_date
        )
        
        # Insert at specified position
        program.workouts.insert(order_index, program_workout)
        
        # Reorder indices to maintain consistency
        for i, pw in enumerate(program.workouts):
            pw.order_index = i
        
        # Update program
        update_request = UpdateProgramRequest(workouts=program.workouts)
        return await self.update_program(user_id, program_id, update_request)
    
    async def remove_workout_from_program(self, user_id: str, program_id: str, workout_id: str) -> Optional[Program]:
        """Remove a workout from a program"""
        program = await self.get_program(user_id, program_id)
        if not program:
            return None
        
        # Remove workout
        original_length = len(program.workouts)
        program.workouts = [pw for pw in program.workouts if pw.workout_id != workout_id]
        
        if len(program.workouts) == original_length:
            return None  # Workout not found in program
        
        # Reorder indices
        for i, pw in enumerate(program.workouts):
            pw.order_index = i
        
        # Update program
        update_request = UpdateProgramRequest(workouts=program.workouts)
        return await self.update_program(user_id, program_id, update_request)
    
    async def reorder_program_workouts(self, user_id: str, program_id: str, workout_order: List[str]) -> Optional[Program]:
        """Reorder workouts in a program"""
        program = await self.get_program(user_id, program_id)
        if not program:
            return None
        
        # Create new workout list in specified order
        workout_dict = {pw.workout_id: pw for pw in program.workouts}
        new_workouts = []
        
        for i, workout_id in enumerate(workout_order):
            if workout_id in workout_dict:
                pw = workout_dict[workout_id]
                pw.order_index = i
                new_workouts.append(pw)
        
        program.workouts = new_workouts
        
        # Update program
        update_request = UpdateProgramRequest(workouts=program.workouts)
        return await self.update_program(user_id, program_id, update_request)
    
    # Data Migration Support
    
    async def migrate_anonymous_data(self, user_id: str, programs_data: List[Dict], workouts_data: List[Dict]) -> Dict[str, Any]:
        """Migrate anonymous user data to authenticated account"""
        if not self.is_available():
            logger.warning("Firestore not available - cannot migrate data")
            return {"success": False, "error": "Firestore not available"}
        
        try:
            batch = self.db.batch()
            migrated_programs = 0
            migrated_workouts = 0
            errors = []
            
            # Migrate workouts first
            for workout_data in workouts_data:
                try:
                    # Remove old IDs and timestamps
                    workout_data.pop('id', None)
                    workout_data.pop('created_date', None)
                    workout_data.pop('modified_date', None)
                    
                    # Create new workout
                    workout = WorkoutTemplate(**workout_data)
                    workout_ref = (self.db.collection('users')
                                 .document(user_id)
                                 .collection('workouts')
                                 .document(workout.id))
                    
                    workout_dict = workout.model_dump()
                    workout_dict['created_date'] = firestore.SERVER_TIMESTAMP
                    workout_dict['modified_date'] = firestore.SERVER_TIMESTAMP
                    workout_dict['migrated_at'] = firestore.SERVER_TIMESTAMP
                    workout_dict['version'] = 1
                    workout_dict['sync_status'] = 'synced'
                    
                    batch.set(workout_ref, workout_dict)
                    migrated_workouts += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to migrate workout: {str(e)}")
                    errors.append(f"Workout migration error: {str(e)}")
                    continue
            
            # Migrate programs
            for program_data in programs_data:
                try:
                    # Remove old IDs and timestamps
                    program_data.pop('id', None)
                    program_data.pop('created_date', None)
                    program_data.pop('modified_date', None)
                    
                    # Create new program
                    program = Program(**program_data)
                    program_ref = (self.db.collection('users')
                                 .document(user_id)
                                 .collection('programs')
                                 .document(program.id))
                    
                    program_dict = program.model_dump()
                    program_dict['created_date'] = firestore.SERVER_TIMESTAMP
                    program_dict['modified_date'] = firestore.SERVER_TIMESTAMP
                    program_dict['migrated_at'] = firestore.SERVER_TIMESTAMP
                    program_dict['version'] = 1
                    program_dict['sync_status'] = 'synced'
                    
                    batch.set(program_ref, program_dict)
                    migrated_programs += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to migrate program: {str(e)}")
                    errors.append(f"Program migration error: {str(e)}")
                    continue
            
            # Commit batch
            batch.commit()
            
            # Update user stats
            await self.update_user_stats(user_id, {
                'totalPrograms': migrated_programs,
                'totalWorkouts': migrated_workouts,
                'lastMigration': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"Successfully migrated data for user {user_id}: {migrated_programs} programs, {migrated_workouts} workouts")
            
            return {
                "success": True,
                "migrated_programs": migrated_programs,
                "migrated_workouts": migrated_workouts,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Failed to migrate anonymous data: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Search Operations
    
    async def search_workouts(self, user_id: str, query: str, limit: int = 50) -> List[WorkoutTemplate]:
        """Search workouts by name, description, or tags"""
        if not self.is_available():
            return []
        
        try:
            # Note: Firestore doesn't support full-text search natively
            # This is a basic implementation - for production, consider using Algolia or similar
            workouts = await self.get_user_workouts(user_id, limit=limit)
            
            query_lower = query.lower()
            matching_workouts = []
            
            for workout in workouts:
                if (query_lower in workout.name.lower() or 
                    query_lower in workout.description.lower() or
                    any(query_lower in tag.lower() for tag in workout.tags)):
                    matching_workouts.append(workout)
            
            return matching_workouts
            
        except Exception as e:
            logger.error(f"Failed to search workouts: {str(e)}")
            return []
    
    async def search_programs(self, user_id: str, query: str, limit: int = 20) -> List[Program]:
        """Search programs by name, description, or tags"""
        if not self.is_available():
            return []
        
        try:
            programs = await self.get_user_programs(user_id, limit=limit)
            
            query_lower = query.lower()
            matching_programs = []
            
            for program in programs:
                if (query_lower in program.name.lower() or 
                    query_lower in program.description.lower() or
                    any(query_lower in tag.lower() for tag in program.tags)):
                    matching_programs.append(program)
            
            return matching_programs
            
        except Exception as e:
            logger.error(f"Failed to search programs: {str(e)}")
            return []
    
    # Utility Methods
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        if not self.is_available():
            return {"total_programs": 0, "total_workouts": 0}
        
        try:
            programs = await self.get_user_programs(user_id, limit=1000)
            workouts = await self.get_user_workouts(user_id, limit=1000)
            
            return {
                "total_programs": len(programs),
                "total_workouts": len(workouts),
                "last_activity": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get user stats: {str(e)}")
            return {"total_programs": 0, "total_workouts": 0}
    
    # Private helper methods
    
    async def _increment_user_program_count(self, user_id: str):
        """Increment user program count"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({
                'stats.totalPrograms': firestore.Increment(1),
                'stats.lastActivity': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            logger.warning(f"Failed to increment program count: {str(e)}")
    
    async def _decrement_user_program_count(self, user_id: str):
        """Decrement user program count"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({
                'stats.totalPrograms': firestore.Increment(-1),
                'stats.lastActivity': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            logger.warning(f"Failed to decrement program count: {str(e)}")
    
    async def _increment_user_workout_count(self, user_id: str):
        """Increment user workout count"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({
                'stats.totalWorkouts': firestore.Increment(1),
                'stats.lastActivity': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            logger.warning(f"Failed to increment workout count: {str(e)}")
    
    async def _decrement_user_workout_count(self, user_id: str):
        """Decrement user workout count"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_ref.update({
                'stats.totalWorkouts': firestore.Increment(-1),
                'stats.lastActivity': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            logger.warning(f"Failed to decrement workout count: {str(e)}")
    
    # ============================================================================
    # Workout Session Management (V3.1 - Weight Logging)
    # ============================================================================
    
    async def create_workout_session(self, user_id: str, session_request) -> Optional[Any]:
        """Create a new workout session (draft state)"""
        if not self.is_available():
            logger.warning("Firestore not available - cannot create workout session")
            return None
        
        try:
            from ..models import WorkoutSession
            
            # Create session object
            session = WorkoutSession(
                workout_id=session_request.workout_id,
                workout_name=session_request.workout_name,
                started_at=session_request.started_at,
                status="in_progress"
            )
            
            # Save to Firestore
            session_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workout_sessions')
                          .document(session.id))
            
            session_data = session.model_dump()
            session_data['started_at'] = session.started_at
            session_data['created_at'] = firestore.SERVER_TIMESTAMP
            
            session_ref.set(session_data)
            
            logger.info(f"Created workout session {session.id} for user {user_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create workout session: {str(e)}")
            return None
    
    async def get_workout_session(self, user_id: str, session_id: str) -> Optional[Any]:
        """Get a specific workout session"""
        if not self.is_available():
            return None
        
        try:
            from ..models import WorkoutSession
            
            session_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workout_sessions')
                          .document(session_id))
            
            doc = session_ref.get()
            
            if doc.exists:
                session_data = doc.to_dict()
                return WorkoutSession(**session_data)
            else:
                logger.info(f"Workout session {session_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get workout session: {str(e)}")
            return None
    
    async def update_workout_session(self, user_id: str, session_id: str, update_request) -> Optional[Any]:
        """Update session progress (auto-save during workout)"""
        if not self.is_available():
            return None
        
        try:
            session_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workout_sessions')
                          .document(session_id))
            
            # Check if session exists
            current_doc = session_ref.get()
            if not current_doc.exists:
                logger.warning(f"Workout session {session_id} not found for update")
                return None
            
            # Prepare update data
            update_data = update_request.model_dump(exclude_unset=True)
            
            # Convert exercises_performed to dict format if present
            if 'exercises_performed' in update_data and update_data['exercises_performed']:
                update_data['exercises_performed'] = [
                    ex.model_dump() if hasattr(ex, 'model_dump') else ex
                    for ex in update_data['exercises_performed']
                ]
            
            session_ref.update(update_data)
            
            # Get updated session
            return await self.get_workout_session(user_id, session_id)
            
        except Exception as e:
            logger.error(f"Failed to update workout session: {str(e)}")
            return None
    
    async def complete_workout_session(self, user_id: str, session_id: str, complete_request) -> Optional[Any]:
        """Finalize workout session and update exercise history"""
        if not self.is_available():
            return None
        
        try:
            from ..models import WorkoutSession
            
            session_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workout_sessions')
                          .document(session_id))
            
            # Check if session exists
            current_doc = session_ref.get()
            if not current_doc.exists:
                logger.warning(f"Workout session {session_id} not found for completion")
                return None
            
            current_data = current_doc.to_dict()
            
            # Calculate duration
            started_at = current_data.get('started_at')
            completed_at = complete_request.completed_at
            duration_minutes = None
            
            if started_at and completed_at:
                # Ensure both datetimes are timezone-naive for comparison
                if hasattr(started_at, 'replace') and started_at.tzinfo is not None:
                    started_at = started_at.replace(tzinfo=None)
                if hasattr(completed_at, 'replace') and completed_at.tzinfo is not None:
                    completed_at = completed_at.replace(tzinfo=None)
                
                duration = completed_at - started_at
                duration_minutes = int(duration.total_seconds() / 60)
            
            # Prepare completion data
            completion_data = {
                'completed_at': completed_at,
                'duration_minutes': duration_minutes,
                'exercises_performed': [
                    ex.model_dump() if hasattr(ex, 'model_dump') else ex
                    for ex in complete_request.exercises_performed
                ],
                'status': 'completed'
            }
            
            if complete_request.notes:
                completion_data['notes'] = complete_request.notes
            
            # Update session
            session_ref.update(completion_data)
            
            # Get completed session
            completed_session = await self.get_workout_session(user_id, session_id)
            
            # Update exercise histories
            if completed_session:
                await self._update_exercise_histories_batch(user_id, completed_session)
            
            logger.info(f"Completed workout session {session_id} for user {user_id}")
            return completed_session
            
        except Exception as e:
            logger.error(f"Failed to complete workout session: {str(e)}")
            return None
    
    async def get_user_sessions(
        self,
        user_id: str,
        workout_id: Optional[str] = None,
        limit: int = 20,
        status: Optional[str] = None
    ) -> List[Any]:
        """Get user's workout sessions with optional filtering"""
        if not self.is_available():
            return []
        
        try:
            from ..models import WorkoutSession
            
            sessions_ref = (self.db.collection('users')
                           .document(user_id)
                           .collection('workout_sessions'))
            
            # Apply filters
            if workout_id:
                sessions_ref = sessions_ref.where('workout_id', '==', workout_id)
            
            if status:
                sessions_ref = sessions_ref.where('status', '==', status)
            
            # Order by started_at descending and limit
            sessions_ref = (sessions_ref
                           .order_by('started_at', direction=firestore.Query.DESCENDING)
                           .limit(limit))
            
            docs = sessions_ref.stream()
            sessions = []
            
            for doc in docs:
                try:
                    session_data = doc.to_dict()
                    session = WorkoutSession(**session_data)
                    sessions.append(session)
                except Exception as e:
                    logger.warning(f"Failed to parse workout session {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(sessions)} workout sessions for user {user_id}")
            return sessions
            
        except Exception as e:
            logger.error(f"Failed to get user workout sessions: {str(e)}")
            return []
    
    async def delete_workout_session(self, user_id: str, session_id: str) -> bool:
        """Delete a workout session"""
        if not self.is_available():
            return False
        
        try:
            session_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workout_sessions')
                          .document(session_id))
            
            session_ref.delete()
            
            logger.info(f"Deleted workout session {session_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete workout session: {str(e)}")
            return False
    
    # ============================================================================
    # Exercise History Management
    # ============================================================================
    
    async def get_exercise_history_for_workout(self, user_id: str, workout_id: str) -> Dict[str, Any]:
        """Get last weights for all exercises in a workout"""
        if not self.is_available():
            return {}
        
        try:
            from ..models import ExerciseHistory
            
            # Query all exercise histories for this workout
            history_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('exercise_history')
                          .where('workout_id', '==', workout_id))
            
            docs = history_ref.stream()
            histories = {}
            
            for doc in docs:
                try:
                    history_data = doc.to_dict()
                    history = ExerciseHistory(**history_data)
                    histories[history.exercise_name] = history
                except Exception as e:
                    logger.warning(f"Failed to parse exercise history {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(histories)} exercise histories for workout {workout_id}")
            return histories
            
        except Exception as e:
            logger.error(f"Failed to get exercise history for workout: {str(e)}")
            return {}
    
    async def get_exercise_history(
        self,
        user_id: str,
        workout_id: str,
        exercise_name: str
    ) -> Optional[Any]:
        """Get history for specific exercise in workout"""
        if not self.is_available():
            return None
        
        try:
            from ..models import ExerciseHistory
            
            history_id = f"{workout_id}_{exercise_name}"
            history_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('exercise_history')
                          .document(history_id))
            
            doc = history_ref.get()
            
            if doc.exists:
                history_data = doc.to_dict()
                return ExerciseHistory(**history_data)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Failed to get exercise history: {str(e)}")
            return None
    
    async def update_exercise_history(
        self,
        user_id: str,
        workout_id: str,
        exercise_name: str,
        session_data: Dict[str, Any]
    ) -> bool:
        """Update exercise history after session completion"""
        if not self.is_available():
            return False
        
        try:
            from ..models import ExerciseHistory
            
            history_id = f"{workout_id}_{exercise_name}"
            history_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('exercise_history')
                          .document(history_id))
            
            # Get existing history or create new
            doc = history_ref.get()
            
            if doc.exists:
                # Update existing history
                current_history = doc.to_dict()
                
                # Update recent sessions (keep last 5)
                recent_sessions = current_history.get('recent_sessions', [])
                recent_sessions.insert(0, session_data)
                recent_sessions = recent_sessions[:5]  # Keep only last 5
                
                # Check if this is a new PR
                best_weight = current_history.get('best_weight')
                new_weight = session_data.get('weight')
                
                update_data = {
                    'last_weight': new_weight,
                    'last_weight_unit': session_data.get('weight_unit', 'lbs'),
                    'last_session_id': session_data.get('session_id'),
                    'last_session_date': session_data.get('date'),
                    'total_sessions': current_history.get('total_sessions', 0) + 1,
                    'recent_sessions': recent_sessions,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }
                
                # Update PR if applicable
                if new_weight and (not best_weight or new_weight > best_weight):
                    update_data['best_weight'] = new_weight
                    update_data['best_weight_date'] = session_data.get('date')
                
                history_ref.update(update_data)
                
            else:
                # Create new history
                new_history = ExerciseHistory(
                    id=history_id,
                    workout_id=workout_id,
                    exercise_name=exercise_name,
                    last_weight=session_data.get('weight'),
                    last_weight_unit=session_data.get('weight_unit', 'lbs'),
                    last_session_id=session_data.get('session_id'),
                    last_session_date=session_data.get('date'),
                    total_sessions=1,
                    first_session_date=session_data.get('date'),
                    best_weight=session_data.get('weight'),
                    best_weight_date=session_data.get('date'),
                    recent_sessions=[session_data]
                )
                
                history_data = new_history.model_dump()
                history_data['updated_at'] = firestore.SERVER_TIMESTAMP
                history_ref.set(history_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update exercise history: {str(e)}")
            return False
    
    async def _update_exercise_histories_batch(self, user_id: str, session: Any) -> bool:
        """Batch update all exercise histories from completed session"""
        if not self.is_available():
            return False
        
        try:
            for exercise in session.exercises_performed:
                session_data = {
                    'session_id': session.id,
                    'date': session.completed_at,
                    'weight': exercise.weight,
                    'weight_unit': exercise.weight_unit,
                    'sets': exercise.sets_completed
                }
                
                await self.update_exercise_history(
                    user_id,
                    session.workout_id,
                    exercise.exercise_name,
                    session_data
                )
            
            logger.info(f"Updated {len(session.exercises_performed)} exercise histories for session {session.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to batch update exercise histories: {str(e)}")
            return False

# Global Firestore data service instance
firestore_data_service = FirestoreDataService()