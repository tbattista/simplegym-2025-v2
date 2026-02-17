"""
Import Service - Orchestrates workout import parsing.
Tries parsers in order (most structured → least) and returns the best result.
"""

import re
from typing import Optional, Dict
from uuid import uuid4

from .base_parser import ParseResult
from .json_parser import JSONParser
from .csv_parser import CSVParser
from .text_parser import PlainTextParser


class ImportService:
    """Orchestrates workout content parsing across multiple format parsers."""

    def __init__(self):
        # Order: most structured → least structured
        self.parsers = [JSONParser(), CSVParser(), PlainTextParser()]

    def parse(self, content: str, format_hint: str = None) -> ParseResult:
        """
        Parse workout content using the best matching parser.

        Args:
            content: Raw workout content (text, CSV, or JSON)
            format_hint: Optional hint ("json", "csv", "text")

        Returns:
            ParseResult with parsed workout data
        """
        content = content.strip()
        if not content:
            return ParseResult(errors=["Empty content provided"])

        # If hint provided, try that parser first
        parsers = self._ordered_parsers(format_hint)

        best_result = ParseResult()

        for parser in parsers:
            try:
                if parser.can_parse(content):
                    result = parser.parse(content)
                    if result.success and result.confidence > best_result.confidence:
                        best_result = result
                    if result.confidence > 0.8:
                        break  # Good enough
            except Exception as e:
                # Parser crashed — skip it, try others
                continue

        if best_result.success:
            return self.validate_and_normalize(best_result)

        # All parsers failed
        errors = best_result.errors if best_result.errors else ["Could not parse the provided content"]
        return ParseResult(errors=errors)

    def validate_and_normalize(self, result: ParseResult) -> ParseResult:
        """Validate and normalize parsed workout data."""
        if not result.workout_data:
            return result

        data = result.workout_data
        warnings = list(result.warnings)

        # Normalize name
        name = (data.get("name") or "").strip()
        if not name:
            name = "Imported Workout"
        if len(name) > 100:
            name = name[:100]
            warnings.append("Workout name truncated to 100 characters")
        data["name"] = name

        # Normalize description
        desc = (data.get("description") or "").strip()
        if len(desc) > 500:
            desc = desc[:500]
            warnings.append("Description truncated to 500 characters")
        data["description"] = desc

        # Normalize exercise groups
        groups = data.get("exercise_groups", [])
        if len(groups) > 20:
            groups = groups[:20]
            warnings.append("Capped at 20 exercise groups")

        for group in groups:
            # Generate group_id if missing
            if "group_id" not in group:
                group["group_id"] = f"group-{uuid4().hex[:8]}"

            # Ensure exercises dict
            exercises = group.get("exercises", {})
            if isinstance(exercises, list):
                keys = ["a", "b", "c", "d", "e", "f"]
                exercises = {keys[i]: name for i, name in enumerate(exercises) if i < len(keys)}
            # Cap at 6 exercises per group
            if len(exercises) > 6:
                keys_to_keep = list(exercises.keys())[:6]
                exercises = {k: exercises[k] for k in keys_to_keep}
                warnings.append(f"Capped exercises in a group at 6")
            # Truncate exercise names
            for key, ex_name in exercises.items():
                if len(str(ex_name)) > 100:
                    exercises[key] = str(ex_name)[:100]
            group["exercises"] = exercises

            # Normalize sets/reps/rest
            group["sets"] = str(group.get("sets", "3")).strip()
            group["reps"] = str(group.get("reps", "8-12")).strip()
            group["rest"] = self._normalize_rest(str(group.get("rest", "60s")))

            # Normalize weight
            if "default_weight" in group:
                group["default_weight"] = str(group["default_weight"]).strip()
                group["default_weight_unit"] = group.get("default_weight_unit", "lbs")

        data["exercise_groups"] = groups

        # Normalize bonus exercises
        bonus = data.get("bonus_exercises", [])
        for b in bonus:
            if "exercise_id" not in b:
                b["exercise_id"] = f"bonus-{uuid4().hex[:8]}"
            b["name"] = str(b.get("name", "")).strip()[:100]
            b["sets"] = str(b.get("sets", "2")).strip()
            b["reps"] = str(b.get("reps", "15")).strip()
            b["rest"] = self._normalize_rest(str(b.get("rest", "30s")))
        data["bonus_exercises"] = bonus

        # Normalize tags
        tags = data.get("tags", [])
        if isinstance(tags, list):
            tags = [str(t).strip().lower() for t in tags if t][:10]
        data["tags"] = tags

        # Ensure template_notes exists (empty for imports)
        if "template_notes" not in data:
            data["template_notes"] = []

        result.workout_data = data
        result.warnings = warnings
        return result

    def _ordered_parsers(self, format_hint: Optional[str]):
        """Return parsers with the hinted format first."""
        if not format_hint:
            return self.parsers

        hint = format_hint.lower()
        hint_map = {
            "json": JSONParser,
            "csv": CSVParser,
            "text": PlainTextParser,
        }
        hint_class = hint_map.get(hint)
        if not hint_class:
            return self.parsers

        # Put the hinted parser first
        ordered = []
        for p in self.parsers:
            if isinstance(p, hint_class):
                ordered.insert(0, p)
            else:
                ordered.append(p)
        return ordered

    def _normalize_rest(self, rest: str) -> str:
        """Normalize rest to standard format (e.g., '60s', '2min')."""
        rest = rest.strip().lower()
        if not rest:
            return "60s"
        # Already standard
        if re.match(r"^\d+s$", rest) or re.match(r"^\d+min$", rest):
            return rest
        # Has units
        rest = re.sub(r"\s*(seconds?|secs?)", "s", rest)
        rest = re.sub(r"\s*(minutes?|mins?)", "min", rest)
        if re.match(r"^\d+(s|min)$", rest):
            return rest
        # Just a number — assume seconds
        if re.match(r"^\d+$", rest):
            return rest + "s"
        return rest


# Singleton instance
import_service = ImportService()
