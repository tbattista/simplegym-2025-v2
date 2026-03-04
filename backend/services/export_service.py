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

from backend.models import WorkoutTemplate, migrate_exercise_groups_to_sections

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

    def _resolve_weight(self, exercise_name: str, default_weight, default_weight_unit,
                        include_weights: bool, exercise_weights: dict = None) -> Optional[str]:
        """Resolve weight for an exercise: history first, then template default."""
        if not include_weights:
            return None
        weight = None
        weight_unit = "lbs"
        if exercise_weights and exercise_name in exercise_weights:
            history = exercise_weights[exercise_name]
            weight = history.last_weight if hasattr(history, 'last_weight') else history.get('last_weight')
            weight_unit = (history.last_weight_unit if hasattr(history, 'last_weight_unit')
                          else history.get('last_weight_unit', 'lbs'))
        if not weight and default_weight:
            weight = default_weight
            weight_unit = default_weight_unit or "lbs"
        return f"{weight} {weight_unit}" if weight else None

    def _prepare_sections_data(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> list:
        """Convert workout sections into a template-friendly list with block info and weights."""
        sections = workout.sections
        if not sections:
            sections = migrate_exercise_groups_to_sections(workout.exercise_groups)

        result = []
        for section in sections:
            is_block = section.type != "standard"
            exercises = []
            for ex in section.exercises:
                all_names = [ex.name] + [a for a in ex.alternates if a]
                weight = None
                # Try each name for weight resolution
                if include_weights:
                    for name in all_names:
                        weight = self._resolve_weight(
                            name, ex.default_weight, ex.default_weight_unit,
                            include_weights, exercise_weights
                        )
                        if weight:
                            break
                exercises.append({
                    "name": ex.name,
                    "alternates": ex.alternates,
                    "all_names": all_names,
                    "sets": ex.sets,
                    "reps": ex.reps,
                    "rest": ex.rest,
                    "weight": weight,
                })
            result.append({
                "type": section.type,
                "name": section.name,
                "display_label": section.type.upper() if is_block else "",
                "is_block": is_block,
                "exercises": exercises,
            })
        return result

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

        # Section-aware exercise listing
        sections = self._prepare_sections_data(workout, include_weights, exercise_weights)
        group_num = 1

        for section in sections:
            if not section["exercises"]:
                continue

            # Block header for non-standard sections
            if section["is_block"]:
                label = section["display_label"]
                if section["name"]:
                    label += f": {section['name']}"
                lines.append(f"-- {label} --")

            for j, ex in enumerate(section["exercises"]):
                # Numbering: 1a/1b for blocks, plain 1 for standard
                if section["is_block"] and len(section["exercises"]) > 1:
                    num_label = f"{group_num}{chr(97 + j)}"
                else:
                    num_label = str(group_num)

                exercise_names = " / ".join(ex["all_names"])
                indent = "   " if not section["is_block"] else "    "
                lines.append(f"{num_label}. {exercise_names}")

                detail_parts = [f"{ex['sets']} sets x {ex['reps']} reps", f"{ex['rest']} rest"]
                if ex["weight"]:
                    detail_parts.append(ex["weight"])
                lines.append(f"{indent}{' | '.join(detail_parts)}")

            group_num += 1
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
        sections = self._prepare_sections_data(workout, include_weights, exercise_weights)

        # Count totals from sections
        total_exercises = sum(len(s["exercises"]) for s in sections)
        total_sets = 0
        for s in sections:
            for ex in s["exercises"]:
                try:
                    sets_num = int(ex["sets"].split("-")[0].strip())
                    total_sets += sets_num
                except (ValueError, AttributeError):
                    pass

        # Build exercise preview (first 8 exercises) with block flags
        exercise_preview = []
        for section in sections:
            for i, ex in enumerate(section["exercises"]):
                if len(exercise_preview) >= 8:
                    break
                exercise_preview.append({
                    "name": ex["name"],
                    "sets": ex["sets"],
                    "reps": ex["reps"],
                    "rest": ex["rest"],
                    "weight": ex["weight"],
                    "in_block": section["is_block"],
                    "block_start": section["is_block"] and i == 0,
                    "block_end": section["is_block"] and i == len(section["exercises"]) - 1,
                    "section_type": section["type"],
                    "section_name": section["name"] or section["display_label"],
                })

        return {
            "workout_name": workout.name,
            "description": workout.description or "",
            "total_exercises": total_exercises,
            "total_sets": total_sets,
            "tags": workout.tags[:4] if workout.tags else [],
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
        sections = self._prepare_sections_data(workout, include_weights, exercise_weights)

        return {
            "workout_name": workout.name,
            "description": workout.description or "",
            "sections": sections,
            "tags": workout.tags if workout.tags else [],
            "include_weights": include_weights,
        }

    def generate_gym_log_pdf(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> Optional[Path]:
        """Generate a gym-log-style PDF with exercise table and 4-week progress tracking."""
        from backend.services.v2.gotenberg_client import GotenbergClient

        try:
            template = self.jinja_env.get_template("gym_log_export_template.html")
        except Exception as e:
            raise Exception(f"Failed to load gym log template: {str(e)}")

        template_data = self._prepare_gym_log_data(workout, include_weights, exercise_weights)
        html_content = template.render(**template_data)

        client = GotenbergClient()
        if not client.is_available():
            raise Exception("Gotenberg service is not available")

        filename = f"gymlog_{workout.id}_{workout.name.replace(' ', '_')[:20]}.pdf"
        return client.html_to_pdf(html_content, filename)

    def _prepare_gym_log_data(
        self,
        workout: WorkoutTemplate,
        include_weights: bool = False,
        exercise_weights: dict = None
    ) -> dict:
        """Prepare data for the gym log PDF template including progress tracking rows."""
        sections = self._prepare_sections_data(workout, include_weights, exercise_weights)

        # Build progress tracking rows: one row per section with exercise letter labels
        progress_rows = []
        for section in sections:
            letters = [chr(97 + i) for i in range(len(section["exercises"]))]
            progress_rows.append({
                "label": " ".join(letters),
            })

        # Cap progress rows and calculate filler
        max_rows = 10
        progress_rows = progress_rows[:max_rows]
        # Each section uses 2 rows (progress + abc), aim for ~12 total visual rows
        used_rows = len(progress_rows) * 2
        filler_rows = max(0, 12 - used_rows)

        return {
            "workout_name": workout.name,
            "description": workout.description or "",
            "sections": sections,
            "progress_rows": progress_rows,
            "filler_rows": filler_rows,
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

        return context
