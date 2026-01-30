"""
Test script for Word document export functionality.
Run this to verify docxtpl is working correctly with master_doc.docx
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.models import WorkoutTemplate, ExerciseGroup, BonusExercise
from backend.services.export_service import ExportService


def create_sample_workout() -> WorkoutTemplate:
    """Create a sample workout for testing"""
    return WorkoutTemplate(
        id="test-001",
        name="Push Day A",
        description="Chest, shoulders, and triceps",
        exercise_groups=[
            ExerciseGroup(
                exercises={"a": "Bench Press", "b": "Incline DB Press", "c": "Cable Flyes"},
                sets="4",
                reps="8-10",
                rest="90s"
            ),
            ExerciseGroup(
                exercises={"a": "Overhead Press", "b": "Lateral Raises"},
                sets="3",
                reps="10-12",
                rest="60s"
            ),
            ExerciseGroup(
                exercises={"a": "Tricep Pushdowns", "b": "Overhead Extensions"},
                sets="3",
                reps="12-15",
                rest="45s"
            ),
        ],
        bonus_exercises=[
            BonusExercise(
                name="Face Pulls",
                sets="3",
                reps="15-20",
                rest="30s"
            ),
            BonusExercise(
                name="Abs - Planks",
                sets="3",
                reps="30s hold",
                rest="30s"
            ),
        ]
    )


def main():
    print("Testing Word document export...")
    print("-" * 50)

    # Create sample workout
    workout = create_sample_workout()
    print(f"Created sample workout: {workout.name}")
    print(f"  - {len(workout.exercise_groups)} exercise groups")
    print(f"  - {len(workout.bonus_exercises)} bonus exercises")

    # Check if template exists
    template_path = Path(__file__).parent / "backend" / "templates" / "docx" / "master_doc.docx"
    if not template_path.exists():
        print(f"\nERROR: Template not found at {template_path}")
        print("Please ensure master_doc.docx is in the project root.")
        return 1

    print(f"\nTemplate found: {template_path}")

    # Export service
    export_service = ExportService()

    try:
        # Generate the document
        output_path = export_service.generate_docx_log(workout)
        print(f"\nSUCCESS! Document generated at:")
        print(f"  {output_path}")

        # Show what context was used
        context = export_service._prepare_docx_context(workout)
        print(f"\nPlaceholder values used:")
        for key, value in sorted(context.items()):
            if value:  # Only show non-empty values
                print(f"  {key}: {value}")

        print(f"\nOpen the file to verify the placeholders were replaced correctly.")
        return 0

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
