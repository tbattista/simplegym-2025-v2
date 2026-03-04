"""
Universal Log API Endpoints
AI-powered session logging from photos, screenshots, and text descriptions.
Supports cardio sessions (treadmill, bike, watch data) and strength workout logs.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime
import logging
import os

from ..models import (
    UniversalLogParseRequest,
    UniversalLogParseResponse,
    SaveStrengthLogRequest,
    ExerciseGroup,
    ExercisePerformance,
    CreateWorkoutRequest,
    CreateAndCompleteSessionRequest,
    UpdateWorkoutRequest,
)
from ..services.parsers.universal_log_parser import get_universal_log_parser
from ..services.firestore_data_service import firestore_data_service
from ..services.firebase_service import firebase_service
from ..services.ai_rate_limiter import ai_rate_limiter
from ..middleware.auth import get_current_user, extract_user_id

router = APIRouter(prefix="/api/v3/universal-log", tags=["Universal Log"])
logger = logging.getLogger(__name__)

# Max images per request
MAX_IMAGES = 5


def _check_ai_rate_limit(user_id: str):
    """Check AI rate limit (authenticated users only). Raises 429 if exceeded."""
    allowed, remaining = ai_rate_limiter.check_limit(user_id, is_authenticated=True)
    if not allowed:
        usage = ai_rate_limiter.get_usage(user_id, is_authenticated=True)
        raise HTTPException(
            status_code=429,
            detail=f"AI analysis limit reached ({usage['limit']}/day). Resets in ~24 hours."
        )


@router.get("/status")
async def universal_log_status():
    """Health check for universal log AI parser."""
    parser = get_universal_log_parser()
    return {
        "available": parser.is_available(),
        "gemini_key_set": bool(os.getenv("GEMINI_API_KEY")),
    }


@router.post("/parse", response_model=UniversalLogParseResponse)
async def parse_activity(
    request: UniversalLogParseRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Parse activity data (text + images) using Gemini AI.
    Returns structured session data (cardio or strength) or clarifying questions.
    Authenticated users only.
    """
    user_id = extract_user_id(current_user)

    # Validate inputs
    if not request.text and not request.images:
        raise HTTPException(status_code=400, detail="Please provide a description or at least one photo")

    if len(request.images) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_IMAGES} images per request")

    _check_ai_rate_limit(user_id)

    parser = get_universal_log_parser()
    if not parser.is_available():
        logger.warning(f"Universal log parser unavailable. GEMINI_API_KEY set: {bool(os.getenv('GEMINI_API_KEY'))}")
        raise HTTPException(status_code=503, detail="AI analysis is not available — please try again later")

    try:
        result = parser.parse(
            text=request.text,
            images=request.images,
            answers=request.answers,
        )
        ai_rate_limiter.record_request(user_id)
        return result

    except Exception as e:
        logger.error(f"Universal log parse error for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/save-strength-session")
async def save_strength_session(
    request: SaveStrengthLogRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Save a strength workout log from Universal Logger.
    Creates a minimal workout entry + completes a session atomically.
    If save_as_template is False, the workout is archived (hidden from library).
    """
    user_id = extract_user_id(current_user)

    if not firebase_service.is_available():
        raise HTTPException(status_code=503, detail="Logging service temporarily unavailable")

    if not request.exercise_groups:
        raise HTTPException(status_code=400, detail="At least one exercise is required")

    try:
        started_at = request.started_at or datetime.utcnow()

        # 1. Convert ParsedExerciseGroup → ExerciseGroup (adds auto-generated group_id)
        exercise_groups = [
            ExerciseGroup(
                exercises=g.exercises,
                sets=g.sets,
                reps=g.reps,
                rest=g.rest,
                default_weight=g.default_weight,
                default_weight_unit=g.default_weight_unit,
            )
            for g in request.exercise_groups
        ]

        # 2. Create the workout template
        workout_req = CreateWorkoutRequest(
            name=request.workout_name,
            description="Logged via Universal Logger",
            exercise_groups=exercise_groups,
            tags=[],
        )
        workout = await firestore_data_service.create_workout(user_id, workout_req)
        if not workout:
            raise HTTPException(status_code=500, detail="Failed to create workout record")

        # 3. Archive if log-only (hides from workout library)
        if not request.save_as_template:
            await firestore_data_service.update_workout(
                user_id, workout.id,
                UpdateWorkoutRequest(is_archived=True)
            )

        # 4. Map exercise_groups → ExercisePerformance for the session
        exercises_performed = []
        for i, eg in enumerate(exercise_groups):
            exercise_name = list(eg.exercises.values())[0] if eg.exercises else "Unknown"
            sets_count = int(eg.sets) if eg.sets.isdigit() else 0
            exercises_performed.append(
                ExercisePerformance(
                    exercise_name=exercise_name,
                    group_id=eg.group_id,
                    sets_completed=sets_count,
                    target_sets=eg.sets,
                    target_reps=eg.reps,
                    weight=eg.default_weight,
                    weight_unit=eg.default_weight_unit,
                    order_index=i,
                )
            )

        # 5. Create + complete the session atomically
        duration_int = int(request.duration_minutes) if request.duration_minutes and request.duration_minutes >= 1 else None
        session_req = CreateAndCompleteSessionRequest(
            workout_id=workout.id,
            workout_name=workout.name,
            started_at=started_at,
            exercises_performed=exercises_performed,
            session_mode="quick_log",
            notes=request.notes,
            duration_minutes=duration_int,
        )
        session = await firestore_data_service.create_and_complete_workout_session(user_id, session_req)
        if not session:
            raise HTTPException(status_code=500, detail="Failed to save workout session")

        logger.info(
            f"✅ Universal log: strength session {session.id} saved for user {user_id} "
            f"(template={request.save_as_template})"
        )
        return {
            "success": True,
            "session_id": session.id,
            "workout_id": workout.id,
            "saved_as_template": request.save_as_template,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving strength session for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")
