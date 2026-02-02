"""
Export Service for Ghost Gym
Handles generation of shareable images, text exports, and printable PDFs
"""

from typing import Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import os
import tempfile
import time

from backend.models import WorkoutTemplate

try:
    from docxtpl import DocxTemplate
    DOCXTPL_AVAILABLE = True
except ImportError:
    DOCXTPL_AVAILABLE = False


class ExportService:
    """Service for generating various export formats for workouts"""

    def __init__(self):
        # Set up Jinja2 environment for templates
        template_dir = Path(__file__).parent.parent / "templates" / "html"
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))

    def generate_text_export(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> str:
        """
        Generate plain text representation of a workout.
        Designed for SMS/copy-paste compatibility (ASCII only, no emojis).

        Args:
            workout: The workout template to export
            include_weights: Whether to include exercise weights
            exercise_weights: Dict of {exercise_name: ExerciseHistory} with last weights

        Returns:
            Formatted plain text string
        """
        lines = []

        # Header
        lines.append(workout.name.upper())
        lines.append("=" * len(workout.name))
        lines.append("")

        # Description if present
        if workout.description:
            lines.append(workout.description)
            lines.append("")

        # Exercise groups
        for i, group in enumerate(workout.exercise_groups, 1):
            # Get exercise names joined with " / "
            exercise_names_list = [name for name in group.exercises.values() if name]
            exercise_names = " / ".join(exercise_names_list)

            if not exercise_names:
                continue

            lines.append(f"{i}. {exercise_names}")

            # Build detail line with optional weight
            detail_parts = [f"{group.sets} sets x {group.reps} reps", f"{group.rest} rest"]

            # Get weight from history first, then fall back to template default
            if include_weights:
                weight = None
                weight_unit = "lbs"

                # Try to get weight from exercise history (use first exercise in group)
                if exercise_weights and exercise_names_list:
                    for name in exercise_names_list:
                        if name in exercise_weights:
                            history = exercise_weights[name]
                            weight = history.last_weight if hasattr(history, 'last_weight') else history.get('last_weight')
                            weight_unit = (history.last_weight_unit if hasattr(history, 'last_weight_unit')
                                          else history.get('last_weight_unit', 'lbs'))
                            break

                # Fall back to template default
                if not weight and group.default_weight:
                    weight = group.default_weight
                    weight_unit = group.default_weight_unit or "lbs"

                if weight:
                    detail_parts.append(f"{weight} {weight_unit}")

            lines.append(f"   {' | '.join(detail_parts)}")
            lines.append("")

        # Bonus exercises
        if workout.bonus_exercises:
            lines.append("BONUS:")
            for bonus in workout.bonus_exercises:
                if bonus.name:
                    lines.append(f"- {bonus.name}: {bonus.sets}x{bonus.reps}")
            lines.append("")

        # Tags
        if workout.tags:
            tag_str = " ".join(f"#{tag}" for tag in workout.tags)
            lines.append(tag_str)
            lines.append("")

        # Footer
        lines.append("fitnessfieldnotes.com")

        return "\n".join(lines)

    def generate_shareable_image(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> Optional[Path]:
        """
        Generate a shareable image (1080x1920 story format) for social media.
        Uses Gotenberg screenshot endpoint with dark gradient template.

        Args:
            workout: The workout template to export
            include_weights: Whether to include exercise weights in the image
            exercise_weights: Dict of {exercise_name: ExerciseHistory} with last weights

        Returns:
            Path to generated PNG file, or None if generation failed
        """
        # Import here to avoid circular imports
        from backend.services.v2.gotenberg_client import GotenbergClient

        # Load and render the template
        try:
            template = self.jinja_env.get_template("share_image_template.html")
        except Exception as e:
            raise Exception(f"Failed to load share image template: {str(e)}")

        # Prepare template data
        template_data = self._prepare_image_template_data(
            workout,
            include_weights=include_weights,
            exercise_weights=exercise_weights
        )
        html_content = template.render(**template_data)

        # Generate image using Gotenberg
        client = GotenbergClient()
        if not client.is_available():
            raise Exception("Gotenberg service is not available")

        filename = f"workout_{workout.id}_{workout.name.replace(' ', '_')[:20]}.png"
        return client.html_to_image(html_content, filename)

    def _prepare_image_template_data(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> dict:
        """Prepare data for the shareable image template"""
        # Count total exercises
        total_exercises = sum(
            len([e for e in group.exercises.values() if e])
            for group in workout.exercise_groups
        )
        total_exercises += len([b for b in workout.bonus_exercises if b.name])

        # Count total sets
        total_sets = 0
        for group in workout.exercise_groups:
            try:
                # Handle ranges like "3-4" by taking the first number
                sets_str = group.sets.split("-")[0].strip()
                sets_num = int(sets_str)
                num_exercises = len([e for e in group.exercises.values() if e])
                total_sets += sets_num * num_exercises
            except (ValueError, AttributeError):
                pass

        for bonus in workout.bonus_exercises:
            try:
                sets_str = bonus.sets.split("-")[0].strip()
                total_sets += int(sets_str)
            except (ValueError, AttributeError):
                pass

        # Get exercise preview (first 8 exercises)
        exercise_preview = []
        for group in workout.exercise_groups:
            for letter, name in sorted(group.exercises.items()):
                if name and len(exercise_preview) < 8:
                    exercise_data = {
                        "name": name,
                        "sets": group.sets,
                        "reps": group.reps,
                        "rest": group.rest
                    }
                    # Include weight if requested - check history first, then template default
                    if include_weights:
                        weight = None
                        weight_unit = "lbs"

                        # Try to get weight from exercise history
                        if exercise_weights and name in exercise_weights:
                            history = exercise_weights[name]
                            weight = history.last_weight if hasattr(history, 'last_weight') else history.get('last_weight')
                            weight_unit = (history.last_weight_unit if hasattr(history, 'last_weight_unit')
                                          else history.get('last_weight_unit', 'lbs'))

                        # Fall back to template default
                        if not weight and group.default_weight:
                            weight = group.default_weight
                            weight_unit = group.default_weight_unit or "lbs"

                        if weight:
                            exercise_data["weight"] = f"{weight} {weight_unit}"

                    exercise_preview.append(exercise_data)

        return {
            "workout_name": workout.name,
            "description": workout.description or "",
            "total_exercises": total_exercises,
            "total_sets": total_sets,
            "tags": workout.tags[:4] if workout.tags else [],  # Max 4 tags
            "exercise_preview": exercise_preview,
            "include_weights": include_weights,
        }

    def generate_printable_pdf(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> Optional[Path]:
        """
        Generate a clean, printable PDF of the workout.
        Uses simple black & white template optimized for printing.

        Args:
            workout: The workout template to export
            include_weights: Whether to include exercise weights
            exercise_weights: Dict of {exercise_name: ExerciseHistory} with last weights

        Returns:
            Path to generated PDF file, or None if generation failed
        """
        # Import here to avoid circular imports
        from backend.services.v2.gotenberg_client import GotenbergClient

        # Load and render the template
        try:
            template = self.jinja_env.get_template("print_simple_template.html")
        except Exception as e:
            raise Exception(f"Failed to load print template: {str(e)}")

        # Prepare template data
        template_data = self._prepare_print_template_data(
            workout,
            include_weights=include_weights,
            exercise_weights=exercise_weights
        )
        html_content = template.render(**template_data)

        # Generate PDF using Gotenberg
        client = GotenbergClient()
        if not client.is_available():
            raise Exception("Gotenberg service is not available")

        filename = f"workout_{workout.id}_{workout.name.replace(' ', '_')[:20]}.pdf"
        return client.html_to_pdf(html_content, filename)

    def _prepare_print_template_data(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> dict:
        """Prepare data for the printable PDF template"""
        # Build exercise list with all details
        exercises = []
        group_num = 1

        for group in workout.exercise_groups:
            exercise_names = [name for name in group.exercises.values() if name]
            if exercise_names:
                exercise_data = {
                    "group_num": group_num,
                    "names": exercise_names,
                    "sets": group.sets,
                    "reps": group.reps,
                    "rest": group.rest
                }
                # Include weight if requested - check history first, then template default
                if include_weights:
                    weight = None
                    weight_unit = "lbs"

                    # Try to get weight from exercise history (use first exercise in group)
                    if exercise_weights and exercise_names:
                        for name in exercise_names:
                            if name in exercise_weights:
                                history = exercise_weights[name]
                                weight = history.last_weight if hasattr(history, 'last_weight') else history.get('last_weight')
                                weight_unit = (history.last_weight_unit if hasattr(history, 'last_weight_unit')
                                              else history.get('last_weight_unit', 'lbs'))
                                break

                    # Fall back to template default
                    if not weight and group.default_weight:
                        weight = group.default_weight
                        weight_unit = group.default_weight_unit or "lbs"

                    if weight:
                        exercise_data["weight"] = f"{weight} {weight_unit}"

                exercises.append(exercise_data)
                group_num += 1

        return {
            "workout_name": workout.name,
            "description": workout.description or "",
            "exercises": exercises,
            "bonus_exercises": [b for b in workout.bonus_exercises if b.name],
            "tags": workout.tags if workout.tags else [],
            "include_weights": include_weights,
        }

    def generate_docx_log(self, workout: WorkoutTemplate, template_path: Optional[str] = None) -> Optional[Path]:
        """
        Generate a Word document workout log from a template.
        Uses docxtpl to fill in {{ placeholders }} while preserving formatting.

        Args:
            workout: The workout template to export
            template_path: Optional path to custom template. Defaults to master_doc.docx

        Returns:
            Path to generated .docx file, or None if generation failed
        """
        if not DOCXTPL_AVAILABLE:
            raise Exception("docxtpl library is not installed. Run: pip install docxtpl")

        # Default template path (backend/templates/docx/)
        if template_path is None:
            template_path = Path(__file__).parent.parent / "templates" / "docx" / "master_doc.docx"
        else:
            template_path = Path(template_path)

        if not template_path.exists():
            raise Exception(f"Template file not found: {template_path}")

        # Prepare context data for the template
        context = self._prepare_docx_context(workout)

        # Load template and render
        doc = DocxTemplate(str(template_path))
        doc.render(context)

        # Save to temp file
        output_dir = Path(tempfile.gettempdir()) / "ghostgym_exports"
        output_dir.mkdir(exist_ok=True)

        safe_name = workout.name.replace(' ', '_').replace('/', '-')[:30]
        timestamp = int(time.time())
        output_path = output_dir / f"workout_{workout.id}_{safe_name}_{timestamp}.docx"
        doc.save(str(output_path))

        return output_path

    def _prepare_docx_context(self, workout: WorkoutTemplate) -> dict:
        """
        Prepare context dictionary for docx template.
        Maps workout data to placeholder names like {{ exercise_1a }}, {{ sets_1 }}, etc.
        Note: Jinja2 requires underscores, not dashes, in variable names.
        """
        context = {
            "workout_name": workout.name,
        }

        # Fill exercise groups 1-6
        for i in range(6):
            group_num = i + 1

            if i < len(workout.exercise_groups):
                group = workout.exercise_groups[i]

                # Exercise names (a, b, c)
                context[f"exercise_{group_num}a"] = group.exercises.get("a", "")
                context[f"exercise_{group_num}b"] = group.exercises.get("b", "")
                context[f"exercise_{group_num}c"] = group.exercises.get("c", "")

                # Sets, reps, rest
                context[f"sets_{group_num}"] = group.sets
                context[f"reps_{group_num}"] = group.reps
                context[f"rest_{group_num}"] = group.rest
            else:
                # Empty placeholders for unused groups
                context[f"exercise_{group_num}a"] = ""
                context[f"exercise_{group_num}b"] = ""
                context[f"exercise_{group_num}c"] = ""
                context[f"sets_{group_num}"] = ""
                context[f"reps_{group_num}"] = ""
                context[f"rest_{group_num}"] = ""

        # Fill bonus exercises 1-2
        for i in range(2):
            bonus_num = i + 1

            if i < len(workout.bonus_exercises):
                bonus = workout.bonus_exercises[i]
                context[f"exercise_bonus_{bonus_num}"] = bonus.name
                context[f"sets_bonus_{bonus_num}"] = bonus.sets
                context[f"reps_bonus_{bonus_num}"] = bonus.reps
                context[f"rest_bonus_{bonus_num}"] = bonus.rest
            else:
                context[f"exercise_bonus_{bonus_num}"] = ""
                context[f"sets_bonus_{bonus_num}"] = ""
                context[f"reps_bonus_{bonus_num}"] = ""
                context[f"rest_bonus_{bonus_num}"] = ""

        return context
