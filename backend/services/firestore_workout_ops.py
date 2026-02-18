"""
Firestore Workout CRUD Operations
Mixin providing workout template create/read/update/delete functionality
"""

import logging
from typing import List, Optional

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

from ..models import WorkoutTemplate, CreateWorkoutRequest, UpdateWorkoutRequest

logger = logging.getLogger(__name__)


class FirestoreWorkoutOps:
    """Mixin for workout template CRUD operations"""

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
        """Update a workout. Returns None if not found. Raises on transient errors."""
        if not self.is_available():
            raise RuntimeError("Firestore service is not available")

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
            raise

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
