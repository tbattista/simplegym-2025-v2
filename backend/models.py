from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict, Optional, List
from datetime import date, datetime, timezone
from uuid import uuid4

class WorkoutData(BaseModel):
    """Data model for workout information"""
    
    workout_name: str = Field(
        ..., 
        description="Name of the workout (e.g., 'Push Day', 'Pull Day')",
        example="Push Day"
    )
    
    workout_date: str = Field(
        ...,
        description="Date of the workout in YYYY-MM-DD format",
        example="2025-01-07"
    )
    
    template_name: str = Field(
        ...,
        description="Name of the template file to use",
        example="master_doc.docx"
    )
    
    exercises: Dict[str, str] = Field(
        ...,
        description="Dictionary of exercise names keyed by exercise ID",
        example={
            "exercise-1a": "Bench Press",
            "exercise-1b": "Incline Press", 
            "exercise-1c": "Flyes",
            "exercise-2a": "Squats",
            "exercise-2b": "Leg Press",
            "exercise-2c": "Lunges"
        }
    )
    
    sets: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of sets data keyed by group ID",
        example={
            "sets-1": "3",
            "sets-2": "4",
            "sets-3": "3"
        }
    )
    
    reps: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of reps data keyed by group ID",
        example={
            "reps-1": "8-12",
            "reps-2": "10",
            "reps-3": "6-8"
        }
    )
    
    rest: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of rest periods keyed by group ID",
        example={
            "rest-1": "60s",
            "rest-2": "90s",
            "rest-3": "2min"
        }
    )
    
class TemplateInfo(BaseModel):
    """Information about available templates"""
    
    templates: list[str] = Field(
        ...,
        description="List of available template filenames"
    )
    
    count: int = Field(
        ...,
        description="Number of available templates"
    )

class HealthResponse(BaseModel):
    """Health check response"""
    
    status: str = Field(
        ...,
        description="Health status",
        example="healthy"
    )
    
    message: str = Field(
        ...,
        description="Health status message",
        example="Gym Log API is running"
    )

class ErrorResponse(BaseModel):
    """Error response model"""
    
    detail: str = Field(
        ...,
        description="Error message details"
    )

class UploadResponse(BaseModel):
    """Template upload response"""
    
    message: str = Field(
        ...,
        description="Upload status message"
    )
    
    filename: str = Field(
        ...,
        description="Name of the uploaded file"
    )

# New V3 Models for Program Management

class ExerciseGroup(BaseModel):
    """Model for exercise group within a workout"""
    
    group_id: str = Field(
        default_factory=lambda: f"group-{uuid4().hex[:8]}",
        description="Unique identifier for the exercise group"
    )
    
    exercises: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of exercises in this group (e.g., {'a': 'Bench Press', 'b': 'Incline Press'})",
        example={"a": "Bench Press", "b": "Incline Press", "c": "Flyes"}
    )
    
    sets: str = Field(
        default="3",
        description="Number of sets for this exercise group",
        example="3"
    )
    
    reps: str = Field(
        default="8-12",
        description="Rep range for this exercise group",
        example="8-12"
    )
    
    rest: str = Field(
        default="60s",
        description="Rest period between sets",
        example="60s"
    )
    
    # Weight tracking fields (Hybrid approach: stored in template + synced from history)
    default_weight: Optional[str] = Field(
        default=None,
        description="Current/default weight for this exercise (auto-syncs from workout history). Supports numeric (135) or text (4x45, BW+25) values."
    )
    
    default_weight_unit: str = Field(
        default="lbs",
        description="Weight unit: 'lbs', 'kg', or 'other'",
        example="lbs"
    )

    group_type: str = Field(
        default="standard",
        description="Type of exercise group: 'standard' (single exercise with optional alternates), 'block' (grouped exercises performed sequentially), or 'cardio' (cardio activity)"
    )

    group_name: Optional[str] = Field(
        default=None,
        description="User-defined name for exercise blocks (e.g., 'Superset A', 'Chest Circuit', 'Warmup Block'). Auto-labeled 'Block N' if null."
    )

    cardio_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Cardio-specific configuration: {activity_type, duration_minutes, distance, distance_unit, target_pace}"
    )

    interval_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Interval timer configuration: {mode, work_seconds, rest_seconds, rounds}"
    )

    block_id: Optional[str] = Field(
        default=None,
        description="Shared ID linking exercises in the same block group. All ExerciseGroups with the same block_id are displayed as visually linked cards."
    )


class SectionExercise(BaseModel):
    """Single exercise within a section."""
    exercise_id: str = Field(
        default_factory=lambda: f"ex-{uuid4().hex[:8]}",
        description="Unique identifier for the exercise"
    )
    name: str = Field(
        ...,
        description="Primary exercise name",
        example="Bench Press"
    )
    alternates: List[str] = Field(
        default_factory=list,
        description="Alternative exercise names (replaces the old exercises dict 'b', 'c', etc.)"
    )
    sets: str = Field(default="3", description="Number of sets")
    reps: str = Field(default="10", description="Rep range")
    rest: str = Field(default="60s", description="Rest period between sets")
    default_weight: Optional[str] = Field(
        default=None,
        description="Current/default weight for this exercise"
    )
    default_weight_unit: str = Field(
        default="lbs",
        description="Weight unit: 'lbs', 'kg', or 'other'"
    )
    group_type: str = Field(
        default="standard",
        description="Exercise type: 'standard', 'cardio', 'block'"
    )
    cardio_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Cardio-specific configuration: {activity_type, duration_minutes, distance, distance_unit, target_pace}"
    )
    interval_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Interval timer configuration: {mode, work_seconds, rest_seconds, rounds}"
    )


class WorkoutSection(BaseModel):
    """Container for exercises. Replaces block_id-based grouping."""
    section_id: str = Field(
        default_factory=lambda: f"section-{uuid4().hex[:8]}",
        description="Unique section identifier"
    )
    type: str = Field(
        default="standard",
        description="Section type: 'standard', 'superset', 'circuit', 'tabata', 'emom', 'amrap'"
    )
    name: Optional[str] = Field(
        default=None,
        description="User-defined label (null = default/unnamed)"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        description="User notes/description for this section"
    )
    config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Type-specific config (tabata: {work:20, rest:10}, emom: {interval:60})"
    )
    exercises: List[SectionExercise] = Field(
        default_factory=list,
        description="Exercises in this section"
    )


def migrate_exercise_groups_to_sections(exercise_groups: List[ExerciseGroup]) -> List[WorkoutSection]:
    """Convert legacy exercise_groups + block_id format to sections format.

    - Standalone exercises (no block_id) -> individual "standard" sections
    - Exercises sharing a block_id -> one "superset" section containing all of them
    - Maintains original order (first appearance of each block determines section position)
    """
    sections = []
    seen_block_ids = {}  # block_id -> index in sections list

    for eg in exercise_groups:
        # Extract primary exercise name and alternates from exercises dict
        primary_name = eg.exercises.get('a', '')
        alternates = [v for k, v in sorted(eg.exercises.items()) if k != 'a' and v]

        section_exercise = SectionExercise(
            exercise_id=eg.group_id,
            name=primary_name,
            alternates=alternates,
            sets=eg.sets,
            reps=eg.reps,
            rest=eg.rest,
            default_weight=eg.default_weight,
            default_weight_unit=eg.default_weight_unit,
            group_type=eg.group_type,
            cardio_config=eg.cardio_config,
            interval_config=eg.interval_config
        )

        if eg.block_id and eg.block_id in seen_block_ids:
            # Add to existing section
            sections[seen_block_ids[eg.block_id]].exercises.append(section_exercise)
        elif eg.block_id:
            # Create new superset section for this block
            section = WorkoutSection(
                section_id=f"section-{eg.block_id}",
                type="superset",
                name=eg.group_name,
                exercises=[section_exercise]
            )
            seen_block_ids[eg.block_id] = len(sections)
            sections.append(section)
        else:
            # Standalone exercise -> individual standard section
            section = WorkoutSection(
                section_id=f"section-{eg.group_id}",
                type="standard",
                exercises=[section_exercise]
            )
            sections.append(section)

    return sections


def migrate_sections_to_exercise_groups(sections: List[WorkoutSection]) -> List[ExerciseGroup]:
    """Convert sections format back to legacy exercise_groups + block_id format.

    Reverse of migrate_exercise_groups_to_sections(). Ensures exercise_groups
    is always populated for consumers that only read the legacy format.
    """
    groups = []

    for section in sections:
        is_named = section.type != 'standard'
        block_id = section.section_id if is_named else None

        for ex in section.exercises:
            exercises_dict = {}
            if ex.name:
                exercises_dict['a'] = ex.name
            for i, alt in enumerate(ex.alternates or []):
                if alt:
                    exercises_dict[chr(98 + i)] = alt  # b, c, d, ...

            # Preserve exercise-level group_type (cardio, interval) over section inference
            effective_group_type = ex.group_type if ex.group_type not in ('standard', None) else ('block' if is_named else 'standard')

            group = ExerciseGroup(
                group_id=ex.exercise_id,
                exercises=exercises_dict if exercises_dict else {'a': ''},
                sets=ex.sets,
                reps=ex.reps,
                rest=ex.rest,
                default_weight=ex.default_weight,
                default_weight_unit=ex.default_weight_unit,
                group_type=effective_group_type,
                group_name=section.name if is_named else None,
                block_id=block_id,
                cardio_config=ex.cardio_config,
                interval_config=ex.interval_config
            )
            groups.append(group)

    return groups


class TemplateNote(BaseModel):
    """Inline note within a workout template (permanent, saved with template)"""

    id: str = Field(
        default_factory=lambda: f"template-note-{int(datetime.now().timestamp() * 1000)}-{uuid4().hex[:6]}",
        description="Unique note identifier"
    )
    content: str = Field(
        default="",
        max_length=500,
        description="Note text content (max 500 chars)"
    )
    order_index: int = Field(
        default=0,
        ge=0,
        description="Position in workout item list"
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="When the note was created"
    )
    modified_at: Optional[datetime] = Field(
        None,
        description="When the note was last modified"
    )


class WorkoutTemplate(BaseModel):
    """Enhanced workout model for the program system"""
    
    id: str = Field(
        default_factory=lambda: f"workout-{uuid4().hex[:8]}",
        description="Unique identifier for the workout"
    )
    
    name: str = Field(
        ...,
        description="Name of the workout",
        example="Push Day A"
    )
    
    description: Optional[str] = Field(
        default="",
        description="Optional description of the workout",
        example="Chest, shoulders, and triceps focused workout"
    )
    
    exercise_groups: List[ExerciseGroup] = Field(
        default_factory=list,
        description="List of exercise groups in this workout"
    )

    sections: Optional[List[WorkoutSection]] = Field(
        default=None,
        description="Sections-based layout (new format). If present, takes precedence over exercise_groups."
    )

    template_notes: List[TemplateNote] = Field(
        default_factory=list,
        description="Inline notes within the workout template (permanent)"
    )

    is_template: bool = Field(
        default=True,
        description="Whether this workout is a reusable template"
    )
    
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for categorizing workouts",
        example=["push", "chest", "beginner"]
    )
    
    created_date: datetime = Field(
        default_factory=datetime.now,
        description="When the workout was created"
    )
    
    modified_date: datetime = Field(
        default_factory=datetime.now,
        description="When the workout was last modified"
    )

    # Favorites support
    is_favorite: bool = Field(
        default=False,
        description="Whether this workout is marked as a favorite"
    )

    favorited_at: Optional[datetime] = Field(
        default=None,
        description="When the workout was marked as favorite"
    )

    # Archive (soft-delete) support
    is_archived: bool = Field(
        default=False,
        description="Whether this workout is archived (soft-deleted)"
    )

    archived_at: Optional[datetime] = Field(
        default=None,
        description="When the workout was archived"
    )

class ProgramWorkout(BaseModel):
    """Association model for workouts within a program"""
    
    workout_id: str = Field(
        ...,
        description="ID of the workout template"
    )
    
    order_index: int = Field(
        ...,
        description="Order of this workout in the program",
        ge=0
    )
    
    custom_name: Optional[str] = Field(
        default=None,
        description="Custom name for this workout instance in the program",
        example="Week 1 - Push Day"
    )
    
    custom_date: Optional[str] = Field(
        default=None,
        description="Custom date for this workout instance",
        example="2025-01-15"
    )

class Program(BaseModel):
    """Model for workout programs"""
    
    id: str = Field(
        default_factory=lambda: f"program-{uuid4().hex[:8]}",
        description="Unique identifier for the program"
    )
    
    name: str = Field(
        ...,
        description="Name of the program",
        example="Push/Pull/Legs Split"
    )
    
    description: Optional[str] = Field(
        default="",
        description="Description of the program",
        example="A 6-day split focusing on push, pull, and leg movements"
    )
    
    workouts: List[ProgramWorkout] = Field(
        default_factory=list,
        description="List of workouts in this program with their order"
    )
    
    duration_weeks: Optional[int] = Field(
        default=None,
        description="Planned duration of the program in weeks",
        example=12
    )
    
    difficulty_level: Optional[str] = Field(
        default="intermediate",
        description="Difficulty level of the program",
        example="beginner"
    )
    
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for categorizing programs",
        example=["strength", "hypertrophy", "split"]
    )
    
    created_date: datetime = Field(
        default_factory=datetime.now,
        description="When the program was created"
    )
    
    modified_date: datetime = Field(
        default_factory=datetime.now,
        description="When the program was last modified"
    )

# Request/Response Models for API

class CreateWorkoutRequest(BaseModel):
    """Request model for creating a new workout"""
    
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=500)
    exercise_groups: List[ExerciseGroup] = Field(default_factory=list)
    sections: Optional[List[WorkoutSection]] = Field(default=None)
    template_notes: List[TemplateNote] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list, max_items=10)

class UpdateWorkoutRequest(BaseModel):
    """Request model for updating a workout"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    exercise_groups: Optional[List[ExerciseGroup]] = Field(None)
    sections: Optional[List[WorkoutSection]] = Field(default=None)
    template_notes: Optional[List[TemplateNote]] = Field(default=None)
    tags: Optional[List[str]] = Field(None, max_items=10)

    # Favorites support
    is_favorite: Optional[bool] = Field(None, description="Whether this workout is marked as a favorite")
    favorited_at: Optional[datetime] = Field(None, description="When the workout was marked as favorite")

    # Archive (soft-delete) support
    is_archived: Optional[bool] = Field(None, description="Whether this workout is archived")
    archived_at: Optional[datetime] = Field(None, description="When the workout was archived")

class CreateProgramRequest(BaseModel):
    """Request model for creating a new program"""
    
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=1000)
    duration_weeks: Optional[int] = Field(None, ge=1, le=52)
    difficulty_level: Optional[str] = Field(default="intermediate")
    tags: List[str] = Field(default_factory=list, max_items=10)

class UpdateProgramRequest(BaseModel):
    """Request model for updating a program"""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    workouts: Optional[List[ProgramWorkout]] = Field(None)
    duration_weeks: Optional[int] = Field(None, ge=1, le=52)
    difficulty_level: Optional[str] = Field(None)
    tags: Optional[List[str]] = Field(None, max_items=10)

class AddWorkoutToProgramRequest(BaseModel):
    """Request model for adding a workout to a program"""
    
    workout_id: str = Field(..., description="ID of the workout to add")
    order_index: Optional[int] = Field(None, description="Position in program (defaults to end)")
    custom_name: Optional[str] = Field(None, max_length=100)
    custom_date: Optional[str] = Field(None)

class GenerateProgramDocumentRequest(BaseModel):
    """Request model for generating a program document"""
    
    program_id: str = Field(..., description="ID of the program to generate")
    include_cover_page: bool = Field(default=True)
    include_table_of_contents: bool = Field(default=True)
    include_progress_tracking: bool = Field(default=True)
    start_date: Optional[str] = Field(None, description="Start date for the program")

# Response Models

class WorkoutListResponse(BaseModel):
    """Response model for workout list"""
    
    workouts: List[WorkoutTemplate] = Field(..., description="List of workout templates")
    total_count: int = Field(..., description="Total number of workouts")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=50, description="Number of items per page")

class ProgramListResponse(BaseModel):
    """Response model for program list"""
    
    programs: List[Program] = Field(..., description="List of programs")
    total_count: int = Field(..., description="Total number of programs")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=20, description="Number of items per page")

class ProgramWithWorkoutsResponse(BaseModel):
    """Response model for program with full workout details"""
    
    program: Program = Field(..., description="Program information")
    workout_details: List[WorkoutTemplate] = Field(..., description="Full details of all workouts in the program")

# Exercise Database Models

class Exercise(BaseModel):
    """Model for exercise in the global database"""
    
    id: str = Field(
        default_factory=lambda: f"exercise-{uuid4().hex[:8]}",
        description="Unique identifier for the exercise"
    )
    
    # Core Information
    name: str = Field(
        ...,
        description="Name of the exercise",
        example="Barbell Bench Press"
    )
    
    nameSearchTokens: List[str] = Field(
        default_factory=list,
        description="Tokenized name for search optimization",
        example=["barbell", "bench", "press"]
    )
    
    # Video Links
    shortVideoUrl: Optional[str] = Field(
        default=None,
        description="URL to short demonstration video"
    )
    
    detailedVideoUrl: Optional[str] = Field(
        default=None,
        description="URL to detailed explanation video"
    )

    # ExerciseDB Integration
    gifUrl: Optional[str] = Field(
        default=None,
        description="URL to animated GIF demonstration (from ExerciseDB)"
    )

    exerciseDbId: Optional[str] = Field(
        default=None,
        description="ExerciseDB API exercise ID for image lookup"
    )

    instructions: List[str] = Field(
        default_factory=list,
        description="Step-by-step exercise instructions"
    )

    # Classification
    difficultyLevel: Optional[str] = Field(
        default=None,
        description="Difficulty level of the exercise",
        example="Beginner"
    )
    
    @field_validator('difficultyLevel', mode='before')
    @classmethod
    def convert_difficulty_to_string(cls, v):
        """Convert integer difficulty levels to strings for backward compatibility"""
        if v is None:
            return v
        if isinstance(v, int):
            # Map integer values to string difficulty levels
            difficulty_map = {
                1: "Beginner",
                2: "Intermediate",
                3: "Advanced"
            }
            return difficulty_map.get(v, "Intermediate")
        return str(v) if v else None
    
    targetMuscleGroup: Optional[str] = Field(
        default=None,
        description="Primary target muscle group",
        example="Chest"
    )
    
    primeMoverMuscle: Optional[str] = Field(
        default=None,
        description="Prime mover muscle",
        example="Pectoralis Major"
    )
    
    secondaryMuscle: Optional[str] = Field(
        default=None,
        description="Secondary muscle involved"
    )
    
    tertiaryMuscle: Optional[str] = Field(
        default=None,
        description="Tertiary muscle involved"
    )
    
    # Equipment
    primaryEquipment: Optional[str] = Field(
        default=None,
        description="Primary equipment needed",
        example="Barbell"
    )
    
    primaryEquipmentCount: Optional[int] = Field(
        default=None,
        description="Number of primary equipment items needed"
    )
    
    secondaryEquipment: Optional[str] = Field(
        default=None,
        description="Secondary equipment needed"
    )
    
    secondaryEquipmentCount: Optional[int] = Field(
        default=None,
        description="Number of secondary equipment items needed"
    )
    
    # Movement Details
    posture: Optional[str] = Field(
        default=None,
        description="Body posture during exercise",
        example="Supine"
    )
    
    armType: Optional[str] = Field(
        default=None,
        description="Single or double arm movement",
        example="Double Arm"
    )
    
    armPattern: Optional[str] = Field(
        default=None,
        description="Continuous or alternating arm pattern",
        example="Continuous"
    )
    
    grip: Optional[str] = Field(
        default=None,
        description="Type of grip used",
        example="Pronated"
    )
    
    loadPosition: Optional[str] = Field(
        default=None,
        description="Position of load at end of movement"
    )
    
    footElevation: Optional[str] = Field(
        default=None,
        description="Whether feet are elevated",
        example="No Elevation"
    )
    
    # Exercise Classification
    combinationExercise: Optional[str] = Field(
        default=None,
        description="Whether exercise is single or combination",
        example="Single Exercise"
    )
    
    movementPattern1: Optional[str] = Field(
        default=None,
        description="Primary movement pattern",
        example="Horizontal Push"
    )
    
    movementPattern2: Optional[str] = Field(
        default=None,
        description="Secondary movement pattern"
    )
    
    movementPattern3: Optional[str] = Field(
        default=None,
        description="Tertiary movement pattern"
    )
    
    planeOfMotion1: Optional[str] = Field(
        default=None,
        description="Primary plane of motion",
        example="Sagittal Plane"
    )
    
    planeOfMotion2: Optional[str] = Field(
        default=None,
        description="Secondary plane of motion"
    )
    
    planeOfMotion3: Optional[str] = Field(
        default=None,
        description="Tertiary plane of motion"
    )
    
    # Categories
    bodyRegion: Optional[str] = Field(
        default=None,
        description="Body region targeted",
        example="Upper Body"
    )
    
    forceType: Optional[str] = Field(
        default=None,
        description="Type of force applied",
        example="Push"
    )
    
    mechanics: Optional[str] = Field(
        default=None,
        description="Exercise mechanics type",
        example="Compound"
    )
    
    laterality: Optional[str] = Field(
        default=None,
        description="Laterality of movement",
        example="Bilateral"
    )
    
    classification: Optional[str] = Field(
        default=None,
        description="Primary exercise classification",
        example="Strength"
    )
    
    # Metadata
    isGlobal: bool = Field(
        default=True,
        description="Whether this is a global exercise or user-specific"
    )

    linkedExerciseId: Optional[str] = Field(
        default=None,
        description="ID of a global exercise this custom exercise is linked to, for inheriting rich data"
    )
    
    # NEW: Popularity and Favorites tracking
    popularityScore: Optional[int] = Field(
        default=50,
        ge=0,
        le=100,
        description="Popularity score for search ranking (0-100). Higher = more popular."
    )
    
    favoriteCount: Optional[int] = Field(
        default=0,
        ge=0,
        description="Number of users who favorited this exercise"
    )
    
    # NEW: Exercise Classification System
    foundationalScore: Optional[int] = Field(
        default=50,
        ge=0,
        le=100,
        description="Foundational score (0-100). Higher = more foundational/standard. 90-100 = Tier 1 (Foundation)"
    )
    
    exerciseTier: Optional[int] = Field(
        default=2,
        ge=1,
        le=3,
        description="Exercise tier: 1=Foundation (Essential), 2=Standard (Common), 3=Specialized (Advanced/Unique)"
    )
    
    isFoundational: bool = Field(
        default=False,
        description="Quick flag for Tier 1 foundational exercises (score >= 90)"
    )
    
    classificationTags: List[str] = Field(
        default_factory=list,
        description="Classification tags like 'big-5', 'compound', 'beginner-friendly', 'equipment-free'"
    )
    
    createdAt: datetime = Field(
        default_factory=datetime.now,
        description="When the exercise was created"
    )
    
    updatedAt: datetime = Field(
        default_factory=datetime.now,
        description="When the exercise was last updated"
    )

class ExerciseReference(BaseModel):
    """Reference to an exercise used in a workout"""
    
    exerciseId: str = Field(
        ...,
        description="ID of the exercise"
    )
    
    exerciseName: str = Field(
        ...,
        description="Name of the exercise (denormalized for quick display)"
    )
    
    isCustom: bool = Field(
        default=False,
        description="Whether this is a custom user exercise"
    )

# Request/Response Models for Exercise API

class CreateExerciseRequest(BaseModel):
    """Request model for creating or updating a custom exercise"""

    name: str = Field(..., min_length=1, max_length=200)
    difficultyLevel: Optional[str] = Field(None)
    targetMuscleGroup: Optional[str] = Field(None)
    primaryEquipment: Optional[str] = Field(None)
    movementPattern1: Optional[str] = Field(None)
    bodyRegion: Optional[str] = Field(None)
    mechanics: Optional[str] = Field(None)
    linkedExerciseId: Optional[str] = Field(None)
    gifUrl: Optional[str] = Field(None)
    exerciseDbId: Optional[str] = Field(None)
    instructions: Optional[List[str]] = Field(default_factory=list)

class ExerciseListResponse(BaseModel):
    """Response model for exercise list"""
    
    exercises: List[Exercise] = Field(..., description="List of exercises")
    total_count: int = Field(..., description="Total number of exercises")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=100, description="Number of items per page")

class ExerciseSearchResponse(BaseModel):
    """Response model for exercise search"""
    
    exercises: List[Exercise] = Field(..., description="Matching exercises")
    query: str = Field(..., description="Search query used")
    total_results: int = Field(..., description="Total number of results")

# Favorites Models

class FavoriteExercise(BaseModel):
    """Denormalized favorite exercise data for quick display"""
    
    exerciseId: str = Field(..., description="ID of the favorited exercise")
    name: str = Field(..., description="Exercise name")
    targetMuscleGroup: Optional[str] = Field(None, description="Primary muscle group")
    primaryEquipment: Optional[str] = Field(None, description="Primary equipment needed")
    isGlobal: bool = Field(True, description="Whether this is a global or custom exercise")
    favoritedAt: datetime = Field(
        default_factory=datetime.now,
        description="When the exercise was favorited"
    )

class UserFavorites(BaseModel):
    """User's favorite exercises collection"""
    
    exerciseIds: List[str] = Field(
        default_factory=list,
        description="Array of favorited exercise IDs for quick lookup"
    )
    exercises: Dict[str, FavoriteExercise] = Field(
        default_factory=dict,
        description="Denormalized exercise data keyed by exercise ID"
    )
    lastUpdated: datetime = Field(
        default_factory=datetime.now,
        description="When favorites were last modified"
    )
    count: int = Field(
        default=0,
        ge=0,
        description="Total number of favorites"
    )

class AddFavoriteRequest(BaseModel):
    """Request model for adding exercise to favorites"""
    
    exerciseId: str = Field(..., description="ID of exercise to favorite")

class FavoritesResponse(BaseModel):
    """Response model for user's favorites"""
    
    favorites: List[FavoriteExercise] = Field(..., description="List of favorite exercises")
    count: int = Field(..., description="Total number of favorites")
    lastUpdated: datetime = Field(..., description="When favorites were last updated")

# Personal Records Models

class PersonalRecord(BaseModel):
    """A single personal record entry"""

    id: str = Field(..., description="Unique PR ID: '{pr_type}_{normalized_name}'")
    pr_type: str = Field(..., description="Type: 'weight', 'distance', 'duration', 'pace'")
    exercise_name: str = Field(..., description="Exercise or activity name")
    activity_type: Optional[str] = Field(None, description="Cardio activity type if applicable")
    value: str = Field(..., description="The PR value as string (e.g., '225', '5.0', '45', '7:30')")
    value_unit: str = Field(default="lbs", description="Unit: 'lbs', 'kg', 'mi', 'km', 'min', 'min/mi', etc.")
    session_id: Optional[str] = Field(None, description="Session ID where PR was achieved")
    session_date: Optional[datetime] = Field(None, description="Date of the session")
    workout_name: Optional[str] = Field(None, description="Workout name for display")
    sets_reps: Optional[str] = Field(None, description="Sets x Reps context (e.g., '3x8')")
    marked_at: datetime = Field(default_factory=datetime.now, description="When user marked this as PR")
    is_manual: bool = Field(default=True, description="True if user-marked, False if auto-detected")


class UserPersonalRecords(BaseModel):
    """User's personal records collection (single Firestore document)"""

    recordIds: List[str] = Field(default_factory=list, description="Array of PR IDs for quick lookup")
    records: Dict[str, PersonalRecord] = Field(default_factory=dict, description="PR data keyed by PR ID")
    lastUpdated: datetime = Field(default_factory=datetime.now)
    count: int = Field(default=0, ge=0)


class MarkPersonalRecordRequest(BaseModel):
    """Request model for marking a personal record"""

    pr_type: str = Field(..., description="Type: 'weight', 'distance', 'duration', 'pace'")
    exercise_name: str = Field(..., description="Exercise or activity name")
    activity_type: Optional[str] = Field(None, description="Cardio activity type")
    value: str = Field(..., description="The PR value")
    value_unit: str = Field(default="lbs", description="Unit for the value")
    session_id: Optional[str] = Field(None, description="Session ID where PR was achieved")
    session_date: Optional[datetime] = Field(None, description="Date of the session")
    workout_name: Optional[str] = Field(None, description="Workout name")
    sets_reps: Optional[str] = Field(None, description="Sets x Reps context")


class UpdatePersonalRecordRequest(BaseModel):
    """Request model for updating a PR value"""

    value: str = Field(..., description="The new PR value")
    value_unit: Optional[str] = Field(None, description="Unit for the value (optional, keeps existing if not provided)")
    session_id: Optional[str] = Field(None, description="Session ID if from a session")
    session_date: Optional[datetime] = Field(None, description="Date of the session")


class PersonalRecordsResponse(BaseModel):
    """Response model for user's personal records"""

    records: List[PersonalRecord] = Field(..., description="List of personal records")
    count: int = Field(..., description="Total number of PRs")
    lastUpdated: datetime = Field(..., description="When PRs were last updated")


# ============================================================================
# Weight Logging Models (V3.1 - Premium Feature)
# ============================================================================

class SetDetail(BaseModel):
    """Optional per-set tracking for detailed workout logging"""
    
    set_number: int = Field(..., ge=1, description="Set number (1, 2, 3, etc.)")
    reps_completed: Optional[int] = Field(None, ge=0, description="Actual reps completed")
    weight: Optional[float] = Field(None, ge=0, description="Weight used for this set")
    notes: Optional[str] = Field(None, max_length=200, description="Notes about this set")

class ExercisePerformance(BaseModel):
    """Exercise performance data within a workout session"""
    
    # Exercise Identity
    exercise_name: str = Field(..., description="Name of the exercise")
    exercise_id: Optional[str] = Field(None, description="Reference to global_exercises if applicable")
    group_id: str = Field(..., description="Links to exercise_group in workout template")
    
    # Performance Data
    sets_completed: int = Field(default=0, ge=0, description="Number of sets completed")
    target_sets: str = Field(default="3", description="Target sets from template")
    target_reps: str = Field(default="8-12", description="Target reps from template")
    
    # Weight Tracking
    weight: Optional[str] = Field(None, description="Primary weight used - supports numeric (135) or text (Body, BW+25, 4x45)")
    weight_unit: str = Field(default="lbs", description="Weight unit: 'lbs', 'kg', or 'other'")
    weight_notes: Optional[str] = Field(None, max_length=100, description="Notes about weight (e.g., 'per hand' for dumbbells)")
    
    # Set-by-Set Detail (Optional - for advanced tracking)
    set_details: List[SetDetail] = Field(default_factory=list, description="Optional per-set breakdown")
    
    # Changes from Previous Session
    previous_weight: Optional[str] = Field(None, description="Weight from last session for comparison")
    weight_change: Optional[str] = Field(None, description="Change from previous (e.g., +5, -10, or text comparison)")
    
    # PHASE 1: Modification Tracking
    is_modified: bool = Field(default=False, description="Whether user modified weight from template default")
    modified_at: Optional[datetime] = Field(None, description="When user last modified this exercise")
    
    # PHASE 2: Skip Tracking (prepared for future)
    is_skipped: bool = Field(default=False, description="Whether exercise was skipped")
    skip_reason: Optional[str] = Field(None, max_length=200, description="Reason for skipping exercise")
    
    # Weight Progression Indicator (NEW)
    next_weight_direction: Optional[str] = Field(
        None,
        description="User intent for next session: 'up', 'down', or null"
    )
    
    # Original Template Values (for modification diff display)
    original_weight: Optional[str] = Field(None, description="Original template weight before modification")
    original_sets: Optional[str] = Field(None, description="Original template sets before modification")
    original_reps: Optional[str] = Field(None, description="Original template reps before modification")

    # Metadata
    order_index: int = Field(..., ge=0, description="Position in workout (0-based)")


class SessionNote(BaseModel):
    """Inline note within a workout session (session-only, not saved to templates)"""

    id: str = Field(
        default_factory=lambda: f"note-{int(datetime.now().timestamp() * 1000)}-{uuid4().hex[:6]}",
        description="Unique note identifier"
    )
    content: str = Field(
        default="",
        max_length=500,
        description="Note text content (max 500 chars)"
    )
    order_index: int = Field(
        default=0,
        ge=0,
        description="Position in session item list"
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="When the note was created"
    )
    modified_at: Optional[datetime] = Field(
        None,
        description="When the note was last modified"
    )


class WorkoutSession(BaseModel):
    """Completed or in-progress workout session"""
    
    # Identity
    id: str = Field(
        default_factory=lambda: f"session-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:6]}",
        description="Unique session identifier"
    )
    workout_id: str = Field(..., description="Reference to workout template ID")
    workout_name: str = Field(..., description="Denormalized workout name for quick display")
    
    # Timing
    started_at: datetime = Field(..., description="When the workout session started")
    completed_at: Optional[datetime] = Field(None, description="When the workout was completed")
    duration_minutes: Optional[int] = Field(None, ge=0, description="Total workout duration in minutes")
    
    # Session Data
    exercises_performed: List[ExercisePerformance] = Field(
        default_factory=list,
        description="List of exercises performed in this session"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Session notes")

    # Session Notes (inline notes interspersed with exercises)
    session_notes: List[SessionNote] = Field(
        default_factory=list,
        description="Inline notes within the session (session-only, not saved to templates)"
    )

    # Custom Exercise Order (Phase 3 - Exercise Reordering)
    exercise_order: Optional[List[str]] = Field(
        None,
        description="Custom order of exercises and notes (list of names/IDs). If present, overrides template order."
    )
    
    @field_validator('exercise_order', mode='before')
    @classmethod
    def validate_exercise_order_unique(cls, v):
        """Ensure exercise order contains unique exercise names."""
        if v is None:
            return v
        if len(v) != len(set(v)):
            raise ValueError("Exercise order must contain unique exercise names")
        return v
    
    # Status
    status: str = Field(
        default="in_progress",
        description="Session status: 'in_progress', 'completed', or 'abandoned'"
    )

    # Session Mode (Quick Log Feature)
    session_mode: str = Field(
        default="timed",
        description="Session mode: 'timed' (real-time tracking with timer) or 'quick_log' (retrospective logging without timer)"
    )

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="When session was created")
    version: int = Field(default=1, description="Workout template version at time of session")
    sync_status: str = Field(default="synced", description="Sync status: 'synced', 'pending', 'error'")

class ExerciseHistory(BaseModel):
    """Quick lookup index for last used weights per exercise in a workout"""
    
    # Composite Key: {workout_id}_{exercise_name}
    id: str = Field(..., description="Composite ID: '{workout_id}_{exercise_name}'")
    workout_id: str = Field(..., description="Workout template ID")
    exercise_name: str = Field(..., description="Exercise name")
    
    # Last Session Data
    last_weight: Optional[str] = Field(None, description="Last weight used - supports numeric or text")
    last_weight_unit: str = Field(default="lbs", description="Unit for last weight")
    last_session_id: Optional[str] = Field(None, description="Reference to last workout session")
    last_session_date: Optional[datetime] = Field(None, description="Date of last session")
    
    # Weight Progression Indicator (NEW)
    last_weight_direction: Optional[str] = Field(
        None,
        description="Weight direction from last session: 'up', 'down', or null"
    )
    
    # Historical Tracking
    total_sessions: int = Field(default=0, ge=0, description="Total number of sessions logged")
    first_session_date: Optional[datetime] = Field(None, description="Date of first logged session")
    best_weight: Optional[str] = Field(None, description="Personal record weight - supports numeric or text")
    best_weight_date: Optional[datetime] = Field(None, description="Date PR was set")
    
    # Recent Sessions (last 5 for trend analysis)
    recent_sessions: List[Dict[str, Any]] = Field(
        default_factory=list,
        max_items=5,
        description="Last 5 sessions with date, weight, sets"
    )
    
    # Metadata
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")
    
    @field_validator('last_weight', 'best_weight', mode='before')
    @classmethod
    def convert_weight_to_string(cls, v):
        """Convert numeric weights to strings for backward compatibility with Firestore data"""
        if v is None:
            return v
        if isinstance(v, (int, float)):
            return str(v)
        return str(v) if v else None

# Request Models for Workout Sessions

class CreateSessionRequest(BaseModel):
    """Request to create/start a new workout session"""

    workout_id: str = Field(..., description="ID of the workout template")
    workout_name: str = Field(..., description="Name of the workout")
    started_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Start time (defaults to now UTC)"
    )
    session_mode: str = Field(
        default="timed",
        description="Session mode: 'timed' (real-time tracking) or 'quick_log' (retrospective logging)"
    )

class UpdateSessionRequest(BaseModel):
    """Request to update session progress (auto-save during workout)"""
    
    exercises_performed: Optional[List[ExercisePerformance]] = Field(
        None,
        description="Updated list of exercises performed"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Session notes")
    status: Optional[str] = Field(None, description="Session status")

class CompleteSessionRequest(BaseModel):
    """Request to finalize a workout session"""

    completed_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Completion time (defaults to now UTC)"
    )
    exercises_performed: List[ExercisePerformance] = Field(
        ...,
        description="Final list of all exercises performed"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Final session notes")
    session_notes: List[SessionNote] = Field(
        default_factory=list,
        description="Inline notes within the session"
    )
    exercise_order: Optional[List[str]] = Field(
        None,
        description="Custom order of exercises (list of exercise names). Saves user's preferred exercise sequence."
    )
    duration_minutes: Optional[int] = Field(
        None,
        ge=1,
        le=600,
        description="Manual duration for quick_log sessions (in minutes). If provided, overrides auto-calculated duration."
    )

    @field_validator('exercise_order', mode='before')
    @classmethod
    def validate_exercise_order_unique(cls, v):
        """Ensure exercise order contains unique exercise names."""
        if v is None:
            return v
        if len(v) != len(set(v)):
            raise ValueError("Exercise order must contain unique exercise names")
        return v


class CreateAndCompleteSessionRequest(BaseModel):
    """
    Request to atomically create and complete a workout session in one operation.
    Used for recovery scenarios where the original session was lost.
    Avoids race condition between create and complete API calls.
    """

    workout_id: str = Field(..., description="ID of the workout template")
    workout_name: str = Field(..., description="Name of the workout")
    started_at: datetime = Field(..., description="When the workout started")
    completed_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Completion time (defaults to now UTC)"
    )
    exercises_performed: List[ExercisePerformance] = Field(
        ...,
        description="Final list of all exercises performed"
    )
    session_mode: str = Field(
        default="timed",
        description="Session mode: 'timed' or 'quick_log'"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Session notes")
    session_notes: List[SessionNote] = Field(
        default_factory=list,
        description="Inline notes within the session"
    )
    exercise_order: Optional[List[str]] = Field(
        None,
        description="Custom order of exercises (list of exercise names)"
    )
    duration_minutes: Optional[int] = Field(
        None,
        ge=1,
        le=600,
        description="Manual duration for quick_log sessions (in minutes)"
    )

    @field_validator('exercise_order', mode='before')
    @classmethod
    def validate_exercise_order_unique(cls, v):
        """Ensure exercise order contains unique exercise names."""
        if v is None:
            return v
        if len(v) != len(set(v)):
            raise ValueError("Exercise order must contain unique exercise names")
        return v


# Response Models for Workout Sessions

class SessionListResponse(BaseModel):
    """Response model for workout session list"""
    
    sessions: List[WorkoutSession] = Field(..., description="List of workout sessions")
    total_count: int = Field(..., description="Total number of sessions")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=20, description="Number of items per page")

class ExerciseHistoryResponse(BaseModel):
    """Response model for exercise history lookup"""
    
    workout_id: str = Field(..., description="Workout template ID")
    workout_name: str = Field(..., description="Workout name")
    exercises: Dict[str, ExerciseHistory] = Field(
        ...,
        description="Exercise histories keyed by exercise name"
    )
    last_exercise_order: Optional[List[str]] = Field(
        None,
        description="Custom exercise order from last completed session (Phase 3 - Exercise Reordering)"
    )


# ============================================================================
# Cardio Session Models (V1 - Manual Entry)
# ============================================================================

class CardioSession(BaseModel):
    """A logged cardio activity session (running, cycling, rowing, etc.)"""

    # Identity
    id: str = Field(
        default_factory=lambda: f"cardio-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:6]}",
        description="Unique cardio session identifier"
    )
    activity_type: str = Field(
        ...,
        description="Type of cardio activity: running, cycling, rowing, swimming, elliptical, stair_climber, walking, hiking, other"
    )
    activity_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Custom name for the session (e.g., 'Morning Run', 'Trail Hike')"
    )

    # Timing
    started_at: datetime = Field(..., description="When the session started")
    completed_at: Optional[datetime] = Field(None, description="When the session ended")
    duration_minutes: Optional[int] = Field(
        None, ge=1, le=1440,
        description="Total duration in minutes"
    )

    # Distance
    distance: Optional[float] = Field(None, ge=0, description="Distance covered")
    distance_unit: str = Field(default="mi", description="Distance unit: 'mi', 'km', 'm', 'yd'")
    pace_per_unit: Optional[str] = Field(
        None,
        description="Pace as string, e.g., '8:30' (min/mile or min/km)"
    )

    # Heart Rate
    avg_heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Average heart rate in BPM")
    max_heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Maximum heart rate in BPM")

    # Effort
    calories: Optional[int] = Field(None, ge=0, le=10000, description="Estimated calories burned")
    rpe: Optional[int] = Field(None, ge=1, le=10, description="Rate of Perceived Exertion (1-10)")

    # Elevation
    elevation_gain: Optional[int] = Field(None, ge=0, description="Elevation gain")
    elevation_unit: str = Field(default="ft", description="Elevation unit: 'ft' or 'm'")

    # Activity-Specific Fields
    activity_details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Activity-specific details: stroke_rate (rowing), cadence_rpm (cycling), laps (swimming), incline_percent (elliptical/stair)"
    )

    # Notes
    notes: Optional[str] = Field(None, max_length=500, description="Session notes")

    # External Data Source (future-proof for imports)
    source: str = Field(default="manual", description="Data source: 'manual', 'strava', 'garmin', 'apple_health'")
    external_id: Optional[str] = Field(None, description="ID from external source for deduplication")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="When this record was created")
    status: str = Field(default="completed", description="Session status: 'completed' or 'abandoned'")


# Request Models for Cardio Sessions

class CreateCardioSessionRequest(BaseModel):
    """Request to log a new cardio session"""

    activity_type: str = Field(..., description="Type of cardio activity")
    activity_name: Optional[str] = Field(None, max_length=100, description="Custom session name")
    started_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Start time (defaults to now UTC)"
    )
    completed_at: Optional[datetime] = Field(None, description="End time")
    duration_minutes: int = Field(..., ge=1, le=1440, description="Total duration in minutes")
    distance: Optional[float] = Field(None, ge=0, description="Distance covered")
    distance_unit: str = Field(default="mi", description="Distance unit")
    pace_per_unit: Optional[str] = Field(None, description="Pace string")
    avg_heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Average HR")
    max_heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Max HR")
    calories: Optional[int] = Field(None, ge=0, le=10000, description="Calories burned")
    rpe: Optional[int] = Field(None, ge=1, le=10, description="RPE (1-10)")
    elevation_gain: Optional[int] = Field(None, ge=0, description="Elevation gain")
    elevation_unit: str = Field(default="ft", description="Elevation unit")
    activity_details: Dict[str, Any] = Field(default_factory=dict, description="Activity-specific fields")
    notes: Optional[str] = Field(None, max_length=500, description="Session notes")

class UpdateCardioSessionRequest(BaseModel):
    """Request to update a cardio session"""

    activity_type: Optional[str] = Field(None, description="Type of cardio activity")
    activity_name: Optional[str] = Field(None, max_length=100, description="Custom session name")
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440, description="Duration in minutes")
    distance: Optional[float] = Field(None, ge=0, description="Distance covered")
    distance_unit: Optional[str] = Field(None, description="Distance unit")
    pace_per_unit: Optional[str] = Field(None, description="Pace string")
    avg_heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Average HR")
    max_heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Max HR")
    calories: Optional[int] = Field(None, ge=0, le=10000, description="Calories burned")
    rpe: Optional[int] = Field(None, ge=1, le=10, description="RPE (1-10)")
    elevation_gain: Optional[int] = Field(None, ge=0, description="Elevation gain")
    elevation_unit: Optional[str] = Field(None, description="Elevation unit")
    activity_details: Optional[Dict[str, Any]] = Field(None, description="Activity-specific fields")
    notes: Optional[str] = Field(None, max_length=500, description="Session notes")


# Response Models for Cardio Sessions

class CardioSessionListResponse(BaseModel):
    """Response model for cardio session list"""

    sessions: List[CardioSession] = Field(..., description="List of cardio sessions")
    total_count: int = Field(..., description="Total number of sessions")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=20, description="Number of items per page")


# ============================================================================
# Workout Sharing Models (Phase 1 - Copy-on-Share)
# ============================================================================

class SharedWorkoutStats(BaseModel):
    """Statistics for shared workouts"""
    view_count: int = Field(default=0, ge=0)
    save_count: int = Field(default=0, ge=0)

class PublicWorkout(BaseModel):
    """Public shared workout"""
    id: str = Field(default_factory=lambda: f"public-{uuid4().hex[:8]}")
    workout_data: Dict[str, Any] = Field(..., description="Full workout snapshot")
    creator_id: str = Field(..., description="User ID of creator")
    creator_name: Optional[str] = Field(None, description="Display name (null = anonymous)")
    source_workout_id: str = Field(..., description="Original workout ID")
    created_at: datetime = Field(default_factory=datetime.now)
    is_moderated: bool = Field(default=False, description="Admin moderation flag")
    stats: SharedWorkoutStats = Field(default_factory=SharedWorkoutStats)

class PrivateShare(BaseModel):
    """Private workout share with token"""
    token: str = Field(..., description="Share token (document ID)")
    workout_data: Dict[str, Any] = Field(..., description="Full workout snapshot")
    creator_id: str = Field(..., description="User ID of creator")
    creator_name: Optional[str] = Field(None, description="Display name (null = anonymous)")
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: Optional[datetime] = Field(None, description="Optional expiration")
    view_count: int = Field(default=0, ge=0)

# Request Models
class ShareWorkoutPublicRequest(BaseModel):
    """Request to share workout publicly"""
    workout_id: str = Field(..., description="ID of workout to share")
    show_creator_name: bool = Field(default=True, description="Show creator attribution")

class ShareWorkoutPrivateRequest(BaseModel):
    """Request to create private share"""
    workout_id: str = Field(..., description="ID of workout to share")
    show_creator_name: bool = Field(default=True)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Expiration in days")

class SavePublicWorkoutRequest(BaseModel):
    """Request to save public workout to user's library"""
    custom_name: Optional[str] = Field(None, description="Optional custom name")

# Response Models
class PublicWorkoutListResponse(BaseModel):
    """Response for browsing public workouts"""
    workouts: List[PublicWorkout]
    total_count: int
    page: int = 1
    page_size: int = 20

class ShareTokenResponse(BaseModel):
    """Response after creating private share"""
    token: str
    share_url: str
    expires_at: Optional[datetime] = None


# ============================================================================
# Workout Import Models
# ============================================================================

class ImportParseRequest(BaseModel):
    """Request to parse raw workout content into structured data"""
    content: str = Field(..., min_length=1, max_length=50000, description="Raw workout content (text, CSV, or JSON)")
    format_hint: Optional[str] = Field(None, description="Optional format hint: 'text', 'csv', 'json'")

class ImportParseResponse(BaseModel):
    """Response from parsing workout content"""
    success: bool = Field(..., description="Whether parsing succeeded")
    workout_data: Optional[Dict[str, Any]] = Field(None, description="Parsed workout data (WorkoutTemplate-compatible)")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal parsing issues")
    errors: List[str] = Field(default_factory=list, description="Fatal parsing errors")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Parser confidence score")
    source_format: str = Field(default="unknown", description="Detected source format")

class ImportAIParseRequest(BaseModel):
    """Request to parse workout content using AI"""
    content: str = Field(..., min_length=1, max_length=100000, description="Content to parse with AI")
    anonymous_id: Optional[str] = Field(None, description="Anonymous user identifier for rate limiting")

class ImportURLRequest(BaseModel):
    """Request to parse workout from a URL"""
    url: str = Field(..., min_length=10, max_length=2000, description="URL to extract workout from")
    anonymous_id: Optional[str] = Field(None, description="Anonymous user identifier for rate limiting")


# ── Universal Logger Models ───────────────────────────────────────────────

class UniversalLogImage(BaseModel):
    """A single base64-encoded image for AI analysis"""
    data: str = Field(..., description="Base64-encoded image bytes")
    mime_type: str = Field(..., description="MIME type: image/jpeg, image/png, image/webp")

class UniversalLogQuestion(BaseModel):
    """A clarifying question returned by AI when inputs are ambiguous"""
    id: str = Field(..., description="Question identifier (used as answer key)")
    question: str = Field(..., description="Human-readable question text")
    type: str = Field(..., description="Input type: text | select | number")
    options: Optional[List[str]] = Field(None, description="Options for select type")

class ParsedCardioData(BaseModel):
    """Cardio session data extracted by AI"""
    activity_type: str = Field(default="other", description="Activity type from ActivityTypeRegistry")
    activity_name: Optional[str] = None
    duration_minutes: Optional[float] = None
    distance: Optional[float] = None
    distance_unit: str = "mi"
    avg_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    calories: Optional[int] = None
    pace_per_unit: Optional[str] = None
    rpe: Optional[int] = None
    elevation_gain: Optional[int] = None
    elevation_unit: str = "ft"
    notes: Optional[str] = None

class ParsedExerciseGroup(BaseModel):
    """Strength exercise group extracted by AI — mirrors ExerciseGroup schema"""
    exercises: Dict[str, str] = Field(..., description='Exercise dict e.g. {"a": "Bench Press"}')
    sets: str = "3"
    reps: str = "8-12"
    rest: str = "60s"
    default_weight: Optional[str] = None
    default_weight_unit: str = "lbs"

class ParsedStrengthData(BaseModel):
    """Strength workout data extracted by AI"""
    workout_name: str = "Ad-Hoc Workout"
    exercise_groups: List[ParsedExerciseGroup] = Field(default_factory=list)
    notes: Optional[str] = None

class UniversalLogParseRequest(BaseModel):
    """Request to parse activity data using AI (text + images)"""
    text: Optional[str] = Field(None, max_length=5000, description="Free-text description of the activity")
    images: List[UniversalLogImage] = Field(default_factory=list, description="Up to 5 images")
    answers: Optional[Dict[str, str]] = Field(None, description="Answers to AI clarifying questions, keyed by question id")

class UniversalLogParseResponse(BaseModel):
    """AI parse result — may contain session data or clarifying questions"""
    success: bool
    session_type: str = Field(default="unknown", description="cardio | strength | unknown")
    needs_clarification: bool = False
    questions: List[UniversalLogQuestion] = Field(default_factory=list)
    cardio_data: Optional[ParsedCardioData] = None
    strength_data: Optional[ParsedStrengthData] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    errors: List[str] = Field(default_factory=list)

class SaveStrengthLogRequest(BaseModel):
    """Request to save a strength session from Universal Logger"""
    workout_name: str = Field(..., min_length=1, max_length=50)
    exercise_groups: List[ParsedExerciseGroup]
    duration_minutes: Optional[float] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    save_as_template: bool = False
