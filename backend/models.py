from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from datetime import date, datetime
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
    
    bonus_exercises: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of bonus exercise names",
        example={
            "exercise-bonus-1": "Face Pulls",
            "exercise-bonus-2": "Calf Raises"
        }
    )
    
    bonus_sets: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of bonus exercise sets",
        example={
            "sets-bonus-1": "2",
            "sets-bonus-2": "3"
        }
    )
    
    bonus_reps: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of bonus exercise reps",
        example={
            "reps-bonus-1": "15",
            "reps-bonus-2": "20"
        }
    )
    
    bonus_rest: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary of bonus exercise rest periods",
        example={
            "rest_bonus-1": "30s",
            "rest_bonus-2": "45s"
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

class BonusExercise(BaseModel):
    """Model for bonus exercises"""
    
    exercise_id: str = Field(
        default_factory=lambda: f"bonus-{uuid4().hex[:8]}",
        description="Unique identifier for the bonus exercise"
    )
    
    name: str = Field(
        ...,
        description="Name of the bonus exercise",
        example="Face Pulls"
    )
    
    sets: str = Field(
        default="2",
        description="Number of sets",
        example="2"
    )
    
    reps: str = Field(
        default="15",
        description="Number of reps",
        example="15"
    )
    
    rest: str = Field(
        default="30s",
        description="Rest period",
        example="30s"
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
        description="List of exercise groups in this workout",
        max_items=6
    )
    
    bonus_exercises: List[BonusExercise] = Field(
        default_factory=list,
        description="List of bonus exercises",
        max_items=2
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
    exercise_groups: List[ExerciseGroup] = Field(default_factory=list, max_items=6)
    bonus_exercises: List[BonusExercise] = Field(default_factory=list, max_items=2)
    tags: List[str] = Field(default_factory=list, max_items=10)

class UpdateWorkoutRequest(BaseModel):
    """Request model for updating a workout"""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    exercise_groups: Optional[List[ExerciseGroup]] = Field(None, max_items=6)
    bonus_exercises: Optional[List[BonusExercise]] = Field(None, max_items=2)
    tags: Optional[List[str]] = Field(None, max_items=10)

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
    
    # Classification
    difficultyLevel: Optional[str] = Field(
        default=None,
        description="Difficulty level of the exercise",
        example="Beginner"
    )
    
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
    """Request model for creating a custom exercise"""
    
    name: str = Field(..., min_length=1, max_length=200)
    difficultyLevel: Optional[str] = Field(None)
    targetMuscleGroup: Optional[str] = Field(None)
    primaryEquipment: Optional[str] = Field(None)
    movementPattern1: Optional[str] = Field(None)
    bodyRegion: Optional[str] = Field(None)
    mechanics: Optional[str] = Field(None)

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
