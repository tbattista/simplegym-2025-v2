"""
CSV Parser - Parses workout data from CSV/TSV content.

Supports:
- Auto-detect delimiter (comma, tab, semicolon)
- Auto-detect header row by matching known column names
- Rows with same group value become block-linked exercises (shared block_id)
- Falls back to positional columns if no headers detected
"""

import csv
import io
import re
from typing import Dict, List, Optional
from uuid import uuid4
from .base_parser import BaseParser, ParseResult


# Known column name mappings (lowercase)
COLUMN_ALIASES = {
    "exercise": ["exercise", "exercise_name", "name", "exercise name", "movement"],
    "sets": ["sets", "set", "num_sets", "set_count"],
    "reps": ["reps", "rep", "num_reps", "rep_range", "repetitions"],
    "rest": ["rest", "rest_period", "rest_time", "rest period"],
    "weight": ["weight", "load", "default_weight", "weight_lbs", "weight_kg"],
    "group": ["group", "group_id", "superset", "superset_group", "circuit"],
}

DEFAULTS = {
    "sets": "3",
    "reps": "8-12",
    "rest": "60s",
}


class CSVParser(BaseParser):

    def can_parse(self, content: str, content_type: str = None) -> bool:
        if content_type and content_type in ("text/csv", "csv"):
            return True
        content = content.strip()
        if not content:
            return False
        # Quick heuristic: has commas/tabs and multiple lines
        lines = content.split("\n")
        if len(lines) < 2:
            return False
        delimiter = self._detect_delimiter(content)
        if not delimiter:
            return False
        # Check if first line has at least 2 fields
        first_line_fields = len(lines[0].split(delimiter))
        return first_line_fields >= 2

    def parse(self, content: str, hints: Dict = None) -> ParseResult:
        content = content.strip()
        if not content:
            return ParseResult(errors=["Empty content"])

        delimiter = self._detect_delimiter(content)
        if not delimiter:
            return ParseResult(errors=["Could not detect CSV delimiter"])

        try:
            reader = csv.reader(io.StringIO(content), delimiter=delimiter)
            rows = list(reader)
        except csv.Error as e:
            return ParseResult(errors=[f"CSV parsing error: {str(e)}"])

        if len(rows) < 2:
            return ParseResult(errors=["CSV needs at least a header row and one data row"])

        # Try to detect header row
        column_map = self._detect_headers(rows[0])
        warnings = []

        if column_map and "exercise" in column_map:
            data_rows = rows[1:]
            confidence = 0.8
        else:
            # No headers detected — try positional: [exercise, sets, reps, rest]
            column_map = self._positional_mapping(rows[0])
            if column_map and "exercise" in column_map:
                data_rows = rows  # No header row to skip
                warnings.append("No header row detected — using positional column mapping")
                confidence = 0.5
            else:
                return ParseResult(errors=["Could not detect exercise column in CSV"])

        # Parse rows into exercise groups
        exercise_groups = []
        group_buckets: Dict[str, List[Dict]] = {}  # group_key -> list of exercises

        for row in data_rows:
            if not row or all(not cell.strip() for cell in row):
                continue

            exercise_name = self._get_field(row, column_map, "exercise")
            if not exercise_name:
                continue

            sets = self._get_field(row, column_map, "sets") or DEFAULTS["sets"]
            reps = self._get_field(row, column_map, "reps") or DEFAULTS["reps"]
            rest = self._get_field(row, column_map, "rest") or DEFAULTS["rest"]
            rest = self._normalize_rest(rest)
            group_key = self._get_field(row, column_map, "group")
            weight = self._get_field(row, column_map, "weight")

            exercise_data = {
                "name": exercise_name.strip(),
                "sets": sets.strip(),
                "reps": reps.strip(),
                "rest": rest,
                "weight": weight.strip() if weight else None,
            }

            if group_key:
                group_key = group_key.strip()
                if group_key not in group_buckets:
                    group_buckets[group_key] = []
                group_buckets[group_key].append(exercise_data)
            else:
                # Each row is its own group
                exercise_groups.append(self._make_group([exercise_data]))

        # Convert grouped exercises into exercise groups linked by block_id
        for group_key in sorted(group_buckets.keys()):
            exercises_in_group = group_buckets[group_key]
            if len(exercises_in_group) > 1:
                # Multiple exercises in same group = block (superset/circuit)
                block_id = f"block-{uuid4().hex[:8]}"
                for ex in exercises_in_group:
                    group = {
                        "exercises": {"a": ex["name"]},
                        "sets": ex["sets"],
                        "reps": ex["reps"],
                        "rest": ex["rest"],
                        "block_id": block_id,
                        "group_name": group_key,
                    }
                    if ex.get("weight"):
                        group["default_weight"] = ex["weight"]
                        group["default_weight_unit"] = "lbs"
                    exercise_groups.append(group)
            else:
                # Single exercise in group, no block needed
                exercise_groups.append(self._make_group(exercises_in_group))

        if not exercise_groups:
            return ParseResult(errors=["No exercises found in CSV data"])

        workout_data = {
            "name": "Imported Workout",
            "description": "",
            "exercise_groups": exercise_groups,
            "bonus_exercises": [],
            "tags": [],
        }

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=warnings,
            confidence=confidence,
            source_format="csv",
        )

    # ── Helpers ────────────────────────────────────────────────────

    def _detect_delimiter(self, content: str) -> Optional[str]:
        """Auto-detect CSV delimiter."""
        first_line = content.split("\n")[0]
        tab_count = first_line.count("\t")
        comma_count = first_line.count(",")
        semicolon_count = first_line.count(";")

        if tab_count > comma_count and tab_count > semicolon_count:
            return "\t"
        if semicolon_count > comma_count:
            return ";"
        if comma_count > 0:
            return ","
        return None

    def _detect_headers(self, row: List[str]) -> Optional[Dict[str, int]]:
        """Match header row to known column names. Returns {field: col_index} or None."""
        column_map = {}
        for i, cell in enumerate(row):
            cell_lower = cell.strip().lower()
            for field, aliases in COLUMN_ALIASES.items():
                if cell_lower in aliases:
                    column_map[field] = i
                    break

        # Must have at least an exercise column
        return column_map if "exercise" in column_map else None

    def _positional_mapping(self, first_row: List[str]) -> Optional[Dict[str, int]]:
        """Try positional mapping: assume col 0=exercise, 1=sets, 2=reps, 3=rest."""
        if len(first_row) < 1:
            return None
        # Check that first column looks like an exercise name (not a number)
        first_val = first_row[0].strip()
        if not first_val or first_val.isdigit():
            return None

        mapping = {"exercise": 0}
        if len(first_row) >= 2:
            mapping["sets"] = 1
        if len(first_row) >= 3:
            mapping["reps"] = 2
        if len(first_row) >= 4:
            mapping["rest"] = 3
        return mapping

    def _get_field(self, row: List[str], column_map: Dict[str, int], field: str) -> Optional[str]:
        """Get field value from row using column map."""
        idx = column_map.get(field)
        if idx is not None and idx < len(row):
            val = row[idx].strip()
            return val if val else None
        return None

    def _make_group(self, exercises: List[Dict]) -> Dict:
        """Create an exercise group from a list of exercise dicts."""
        keys = ["a", "b", "c", "d", "e", "f"]
        exercise_map = {}
        for i, ex in enumerate(exercises):
            if i < len(keys):
                exercise_map[keys[i]] = ex["name"]

        # Use sets/reps/rest from the first exercise in the group
        first = exercises[0]
        group = {
            "exercises": exercise_map,
            "sets": first["sets"],
            "reps": first["reps"],
            "rest": first["rest"],
        }
        if first.get("weight"):
            group["default_weight"] = first["weight"]
            group["default_weight_unit"] = "lbs"

        return group

    def _normalize_rest(self, rest: str) -> str:
        """Normalize rest period to standard format."""
        if not rest:
            return DEFAULTS["rest"]
        rest = rest.strip().lower()
        if re.match(r"^\d+\s*(s|sec|seconds?|min|minutes?)$", rest):
            rest = re.sub(r"\s*(seconds?|secs?)", "s", rest)
            rest = re.sub(r"\s*(minutes?|mins?)", "min", rest)
            return rest
        if re.match(r"^\d+$", rest):
            return rest + "s"
        return rest
