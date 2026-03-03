"""
Firestore Workout Session & Exercise History Operations
Mixin providing session lifecycle, exercise tracking, and history management
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

logger = logging.getLogger(__name__)


class FirestoreSessionOps:
    """Mixin for workout session and exercise history operations"""

    # ========================================================================
    # Workout Session Management
    # ========================================================================

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
                status="in_progress",
                session_mode=getattr(session_request, 'session_mode', 'timed')
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
                logger.info(f"Session {session_id} not found for user {user_id}")
                return None

            current_data = current_doc.to_dict()

            # Always capture completed_at from the request (defaults to now)
            completed_at = complete_request.completed_at

            # Calculate duration
            # For quick_log sessions, use manual duration if provided
            manual_duration = getattr(complete_request, 'duration_minutes', None)
            if manual_duration is not None:
                # Use manually provided duration (for quick_log sessions)
                duration_minutes = manual_duration
                logger.info(f"Using manual duration: {duration_minutes} minutes")
            else:
                # Auto-calculate from timestamps (for timed sessions)
                started_at = current_data.get('started_at')
                duration_minutes = None

                if started_at and completed_at:
                    # Ensure both datetimes are timezone-naive for comparison
                    if hasattr(started_at, 'replace') and started_at.tzinfo is not None:
                        started_at = started_at.replace(tzinfo=None)
                    calc_completed = completed_at
                    if hasattr(calc_completed, 'replace') and calc_completed.tzinfo is not None:
                        calc_completed = calc_completed.replace(tzinfo=None)

                    duration = calc_completed - started_at
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

            # Save session notes if provided
            if hasattr(complete_request, 'session_notes') and complete_request.session_notes:
                completion_data['session_notes'] = [
                    note.model_dump() if hasattr(note, 'model_dump') else note
                    for note in complete_request.session_notes
                ]
                logger.info(f"Saving {len(complete_request.session_notes)} session notes")

            # Save custom exercise order if provided (Phase 3 - Exercise Reordering)
            if hasattr(complete_request, 'exercise_order') and complete_request.exercise_order:
                completion_data['exercise_order'] = complete_request.exercise_order
                logger.info(f"Saving custom exercise order with {len(complete_request.exercise_order)} exercises")

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

    async def create_and_complete_workout_session(self, user_id: str, request) -> Optional[Any]:
        """
        Atomically create and complete a workout session in a single write.
        Used for recovery scenarios where the original session was lost.
        """
        if not self.is_available():
            return None

        try:
            from ..models import WorkoutSession

            # Calculate duration
            if request.duration_minutes is not None:
                duration_minutes = request.duration_minutes
                logger.info(f"Using manual duration: {duration_minutes} minutes")
            else:
                started_at = request.started_at
                completed_at = request.completed_at or datetime.now()

                # Ensure both datetimes are timezone-naive for comparison
                if hasattr(started_at, 'replace') and started_at.tzinfo is not None:
                    started_at = started_at.replace(tzinfo=None)
                if hasattr(completed_at, 'replace') and completed_at.tzinfo is not None:
                    completed_at = completed_at.replace(tzinfo=None)

                duration = completed_at - started_at
                duration_minutes = int(duration.total_seconds() / 60)
                logger.info(f"Auto-calculated duration: {duration_minutes} minutes")

            # Create session with completed status directly
            session = WorkoutSession(
                workout_id=request.workout_id,
                workout_name=request.workout_name,
                started_at=request.started_at,
                completed_at=request.completed_at or datetime.now(),
                status="completed",
                session_mode=request.session_mode,
                exercises_performed=[
                    ex.model_dump() if hasattr(ex, 'model_dump') else ex
                    for ex in request.exercises_performed
                ],
                notes=request.notes,
                session_notes=[
                    note.model_dump() if hasattr(note, 'model_dump') else note
                    for note in (request.session_notes or [])
                ],
                exercise_order=request.exercise_order,
                duration_minutes=duration_minutes
            )

            # Single write with completed state
            session_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('workout_sessions')
                          .document(session.id))

            session_data = session.model_dump()
            session_data['created_at'] = firestore.SERVER_TIMESTAMP
            session_ref.set(session_data)

            logger.info(f"Atomically created and completed session {session.id} for user {user_id}")

            # Update exercise histories
            await self._update_exercise_histories_batch(user_id, session)

            return session

        except Exception as e:
            logger.error(f"Failed to create-and-complete workout session: {str(e)}")
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

    # ========================================================================
    # Exercise History Management
    # ========================================================================

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
        session_data: Dict[str, Any],
        next_weight_direction: Optional[str] = None
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
                    'last_weight_direction': next_weight_direction,
                    'total_sessions': current_history.get('total_sessions', 0) + 1,
                    'recent_sessions': recent_sessions,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }

                # Update PR if applicable (compare numerically to avoid string ordering bugs)
                def _is_new_pr(new_w, best_w):
                    if not new_w:
                        return False
                    if not best_w:
                        return True
                    try:
                        return float(new_w) > float(best_w)
                    except (ValueError, TypeError):
                        return False  # Skip PR check for text weights like "BW+25"

                if _is_new_pr(new_weight, best_weight):
                    update_data['best_weight'] = new_weight
                    update_data['best_weight_date'] = session_data.get('date')

                history_ref.update(update_data)
                logger.debug(f"Updated exercise history: {exercise_name} (direction: {next_weight_direction or 'none'})")

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
                    last_weight_direction=next_weight_direction,
                    total_sessions=1,
                    first_session_date=session_data.get('date'),
                    best_weight=session_data.get('weight'),
                    best_weight_date=session_data.get('date'),
                    recent_sessions=[session_data]
                )

                history_data = new_history.model_dump()
                history_data['updated_at'] = firestore.SERVER_TIMESTAMP
                history_ref.set(history_data)
                logger.debug(f"Created exercise history: {exercise_name} (direction: {next_weight_direction or 'none'})")

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

                # Extract weight direction if available
                next_weight_direction = getattr(exercise, 'next_weight_direction', None)

                await self.update_exercise_history(
                    user_id,
                    session.workout_id,
                    exercise.exercise_name,
                    session_data,
                    next_weight_direction=next_weight_direction
                )

            logger.info(f"Updated {len(session.exercises_performed)} exercise histories for session {session.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to batch update exercise histories: {str(e)}")
            return False
