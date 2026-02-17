"""
JSON Parser - Parses workout data from JSON content.

Supports:
1. FFN native format (WorkoutTemplate schema)
2. Array of exercise objects: [{name, sets, reps, rest}]
3. Simple object with exercises array
"""

import json
from typing import Dict, List, Any
from .base_parser import BaseParser, ParseResult


DEFAULTS = {
    "sets": "3",
    "reps": "8-12",
    "rest": "60s",
}


class JSONParser(BaseParser):

    def can_parse(self, content: str, content_type: str = None) -> bool:
        if content_type and content_type in ("application/json", "json"):
            return True
        content = content.strip()
        return content.startswith("{") or content.startswith("[")

    def parse(self, content: str, hints: Dict = None) -> ParseResult:
        content = content.strip()
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            return ParseResult(errors=[f"Invalid JSON: {str(e)}"])

        # Try FFN native format first
        if isinstance(data, dict):
            result = self._try_ffn_format(data)
            if result.success:
                return result

            # Try object with exercises array
            result = self._try_exercises_object(data)
            if result.success:
                return result

        # Try array of exercise objects
        if isinstance(data, list):
            result = self._try_exercise_array(data)
            if result.success:
                return result

        return ParseResult(errors=["Could not recognize JSON workout format"])

    # ── FFN Native Format ──────────────────────────────────────────

    def _try_ffn_format(self, data: Dict[str, Any]) -> ParseResult:
        """
        Parse FFN WorkoutTemplate format:
        {
            "name": "Push Day",
            "exercise_groups": [...],
            "bonus_exercises": [...],
            ...
        }
        """
        if "exercise_groups" not in data:
            return ParseResult(success=False)

        exercise_groups = data.get("exercise_groups", [])
        if not isinstance(exercise_groups, list) or not exercise_groups:
            return ParseResult(errors=["exercise_groups is empty or invalid"])

        warnings = []
        normalized_groups = []

        for i, group in enumerate(exercise_groups):
            if not isinstance(group, dict):
                warnings.append(f"Skipped invalid exercise group at index {i}")
                continue

            exercises = group.get("exercises", {})
            if not exercises:
                warnings.append(f"Skipped empty exercise group at index {i}")
                continue

            # Ensure exercises is a dict with letter keys
            if isinstance(exercises, list):
                keys = ["a", "b", "c", "d", "e", "f"]
                exercises = {keys[j]: name for j, name in enumerate(exercises) if j < len(keys)}

            normalized_groups.append({
                "exercises": exercises,
                "sets": str(group.get("sets", DEFAULTS["sets"])),
                "reps": str(group.get("reps", DEFAULTS["reps"])),
                "rest": str(group.get("rest", DEFAULTS["rest"])),
                **({
                    "default_weight": str(group["default_weight"]),
                    "default_weight_unit": group.get("default_weight_unit", "lbs"),
                } if group.get("default_weight") else {}),
            })

        if not normalized_groups:
            return ParseResult(errors=["No valid exercise groups found"])

        # Parse bonus exercises
        bonus_exercises = []
        for bonus in data.get("bonus_exercises", []):
            if isinstance(bonus, dict) and bonus.get("name"):
                bonus_exercises.append({
                    "name": bonus["name"],
                    "sets": str(bonus.get("sets", "2")),
                    "reps": str(bonus.get("reps", "15")),
                    "rest": str(bonus.get("rest", "30s")),
                })

        workout_data = {
            "name": data.get("name", "Imported Workout"),
            "description": data.get("description", ""),
            "exercise_groups": normalized_groups,
            "bonus_exercises": bonus_exercises,
            "tags": data.get("tags", [])[:10],
        }

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=warnings,
            confidence=0.95,
            source_format="json (FFN format)",
        )

    # ── Object with Exercises Array ────────────────────────────────

    def _try_exercises_object(self, data: Dict[str, Any]) -> ParseResult:
        """
        Parse object with exercises array:
        {
            "name": "Push Day",
            "exercises": [
                {"name": "Bench Press", "sets": 3, "reps": "8-12"},
                ...
            ]
        }
        """
        exercises = data.get("exercises")
        if not isinstance(exercises, list) or not exercises:
            return ParseResult(success=False)

        return self._exercises_to_groups(
            exercises,
            name=data.get("name", "Imported Workout"),
            description=data.get("description", ""),
            tags=data.get("tags", []),
        )

    # ── Array of Exercise Objects ──────────────────────────────────

    def _try_exercise_array(self, data: List[Any]) -> ParseResult:
        """
        Parse array of exercise objects:
        [
            {"name": "Bench Press", "sets": 3, "reps": "8-12"},
            ...
        ]
        """
        if not data or not isinstance(data[0], dict):
            return ParseResult(success=False)

        # Check that objects have exercise-like fields
        first = data[0]
        if not (first.get("name") or first.get("exercise") or first.get("exercise_name")):
            return ParseResult(success=False)

        return self._exercises_to_groups(data)

    # ── Helpers ────────────────────────────────────────────────────

    def _exercises_to_groups(
        self,
        exercises: List[Dict],
        name: str = "Imported Workout",
        description: str = "",
        tags: List[str] = None,
    ) -> ParseResult:
        """Convert a flat list of exercise dicts into exercise groups."""
        groups = []
        warnings = []

        for ex in exercises:
            if not isinstance(ex, dict):
                continue

            ex_name = ex.get("name") or ex.get("exercise") or ex.get("exercise_name")
            if not ex_name:
                continue

            group = {
                "exercises": {"a": str(ex_name)},
                "sets": str(ex.get("sets", DEFAULTS["sets"])),
                "reps": str(ex.get("reps", DEFAULTS["reps"])),
                "rest": str(ex.get("rest", DEFAULTS["rest"])),
            }

            weight = ex.get("weight") or ex.get("default_weight")
            if weight:
                group["default_weight"] = str(weight)
                group["default_weight_unit"] = ex.get("weight_unit") or ex.get("default_weight_unit") or "lbs"

            groups.append(group)

        if not groups:
            return ParseResult(errors=["No valid exercises found in array"])

        workout_data = {
            "name": name,
            "description": description,
            "exercise_groups": groups,
            "bonus_exercises": [],
            "tags": (tags or [])[:10],
        }

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=warnings,
            confidence=0.7,
            source_format="json (exercise array)",
        )
