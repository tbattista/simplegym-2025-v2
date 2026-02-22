"""
Plain Text Parser - Parses workout text in various common formats.

Supported formats:
1. FFN export format: Title with ===, numbered exercises, sets x reps | rest, #tags
2. Compact notation: Bench Press 3x10, Squats 4x8-12
3. Numbered lists: 1. Bench Press - 3 sets x 8 reps
4. Superset notation: A1) Bench Press 3x10 / A2) Row 3x10
5. Exercise names only: falls back to defaults (3 sets, 8-12 reps, 60s rest)
"""

import re
from uuid import uuid4
from typing import Dict, List, Optional, Tuple
from .base_parser import BaseParser, ParseResult


# Default values when not specified
DEFAULTS = {
    "sets": "3",
    "reps": "8-12",
    "rest": "60s",
}


class PlainTextParser(BaseParser):

    def can_parse(self, content: str, content_type: str = None) -> bool:
        if content_type and content_type not in ("text/plain", "text", None):
            return False
        # Text parser is the fallback — it can always attempt parsing
        content = content.strip()
        if not content:
            return False
        # Reject if content looks like JSON or CSV with headers
        if content.startswith("{") or content.startswith("["):
            return False
        return True

    def parse(self, content: str, hints: Dict = None) -> ParseResult:
        content = content.strip()
        if not content:
            return ParseResult(errors=["Empty content"])

        lines = [line.rstrip() for line in content.split("\n")]

        # Try FFN format first (highest confidence)
        result = self._try_ffn_format(lines)
        if result.success and result.confidence >= 0.7:
            return result

        # Try compact notation (e.g., "Bench Press 3x10")
        result = self._try_compact_format(lines)
        if result.success and result.confidence >= 0.5:
            return result

        # Try numbered list format
        result = self._try_numbered_list(lines)
        if result.success and result.confidence >= 0.5:
            return result

        # Fallback: treat each non-empty line as an exercise name
        result = self._try_exercise_names_only(lines)
        if result.success:
            return result

        return ParseResult(errors=["Could not parse any exercises from the text"])

    # ── FFN Export Format ──────────────────────────────────────────

    def _try_ffn_format(self, lines: List[str]) -> ParseResult:
        """
        Parse FFN export format:
            PUSH DAY
            ========
            Optional description

            1. Bench Press / Incline Press
               3 sets x 8-12 reps | 60s rest
            2. Overhead Press
               3 sets x 8-12 reps | 90s rest

            #push #chest
        """
        warnings = []
        name = None
        description = None
        exercise_groups = []
        tags = []
        confidence = 0.0

        i = 0

        # Skip empty lines at start
        while i < len(lines) and not lines[i].strip():
            i += 1

        if i >= len(lines):
            return ParseResult(errors=["Empty content"])

        # Detect title: line followed by === underline
        if i + 1 < len(lines) and re.match(r"^=+$", lines[i + 1].strip()):
            name = lines[i].strip()
            confidence += 0.3
            i += 2
        else:
            # First non-empty line is the title
            name = lines[i].strip()
            i += 1

        # Skip empty lines after title
        while i < len(lines) and not lines[i].strip():
            i += 1

        # Check for description (non-numbered line before exercises)
        if i < len(lines) and not re.match(r"^\d+\.", lines[i].strip()):
            # Could be a description if the NEXT line is a numbered exercise
            peek = i + 1
            while peek < len(lines) and not lines[peek].strip():
                peek += 1
            if peek < len(lines) and re.match(r"^\d+\.", lines[peek].strip()):
                description = lines[i].strip()
                i = peek

        # Parse exercise groups (numbered: "1. Exercise Name / Alternate")
        current_group = None
        while i < len(lines):
            line = lines[i].strip()

            # Stop at tags
            if line.startswith("#"):
                break

            # Skip footer lines
            if line.lower().startswith("fitnessfieldnotes") or line.lower().startswith("fitness field notes"):
                i += 1
                continue

            # Numbered exercise line: "1. Bench Press / Incline Press"
            num_match = re.match(r"^(\d+)\.\s+(.+)$", line)
            if num_match:
                if current_group:
                    exercise_groups.append(current_group)

                exercise_text = num_match.group(2).strip()
                exercises, is_superset, superset_parts = self._parse_exercise_names_with_blocks(exercise_text)
                if is_superset:
                    block_id = f"block-{uuid4().hex[:8]}"
                    current_group = {
                        "_is_superset": True,
                        "_block_id": block_id,
                        "_parts": superset_parts,
                        "sets": DEFAULTS["sets"],
                        "reps": DEFAULTS["reps"],
                        "rest": DEFAULTS["rest"],
                    }
                else:
                    current_group = {
                        "exercises": exercises,
                        "sets": DEFAULTS["sets"],
                        "reps": DEFAULTS["reps"],
                        "rest": DEFAULTS["rest"],
                    }
                confidence += 0.1
                i += 1
                continue

            # Detail line: "3 sets x 8-12 reps | 60s rest" or "3 sets x 8-12 reps | 60s rest | 135 lbs"
            detail_match = re.match(
                r"^\s*(\S+)\s+sets?\s*x\s*(\S+)\s+reps?\s*\|\s*(\S+)\s+rest(?:\s*\|\s*(.+))?$",
                line, re.IGNORECASE
            )
            if detail_match and current_group:
                current_group["sets"] = detail_match.group(1)
                current_group["reps"] = detail_match.group(2)
                current_group["rest"] = detail_match.group(3)
                weight_str = detail_match.group(4)
                if weight_str:
                    weight, unit = self._parse_weight(weight_str.strip())
                    if weight:
                        current_group["default_weight"] = weight
                        current_group["default_weight_unit"] = unit
                confidence += 0.1
                i += 1
                continue

            # Skip empty lines
            if not line:
                i += 1
                continue

            i += 1

        # Don't forget the last group
        if current_group:
            exercise_groups.append(current_group)

        # Expand superset groups into separate block_id-linked groups
        exercise_groups = self._expand_all_groups(exercise_groups)
        # Parse tags
        for j in range(i, len(lines)):
            line = lines[j].strip()
            tag_matches = re.findall(r"#(\w+)", line)
            tags.extend(tag_matches)

        if not exercise_groups:
            return ParseResult(
                success=False,
                confidence=0.0,
                source_format="text",
                errors=["No exercise groups found in FFN format"]
            )

        # Build workout data
        workout_data = {
            "name": name or "Imported Workout",
            "description": description or "",
            "exercise_groups": exercise_groups,
            "tags": tags[:10],
        }

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=warnings,
            confidence=min(confidence, 1.0),
            source_format="text (FFN format)",
        )

    # ── Compact Notation ───────────────────────────────────────────

    def _try_compact_format(self, lines: List[str]) -> ParseResult:
        """
        Parse compact notation:
            Bench Press 3x10
            Squats 4x8-12
            Rows 3x12 60s
        """
        exercise_groups = []
        warnings = []
        non_empty_lines = [l.strip() for l in lines if l.strip()]

        if not non_empty_lines:
            return ParseResult(errors=["Empty content"])

        name = None
        start_idx = 0

        # Check if first line looks like a title (no sets/reps pattern)
        if non_empty_lines and not re.search(r"\d+\s*x\s*\d+", non_empty_lines[0]):
            name = non_empty_lines[0]
            start_idx = 1
            # Skip === underline if present
            if start_idx < len(non_empty_lines) and re.match(r"^=+$", non_empty_lines[start_idx]):
                start_idx += 1

        for line in non_empty_lines[start_idx:]:
            # Skip tag lines, footers
            if line.startswith("#") or "fitnessfieldnotes" in line.lower():
                continue

            # Match: "Exercise Name 3x10" or "Exercise Name 3x8-12" or "Exercise Name 3x10 60s"
            match = re.match(
                r"^(.+?)\s+(\d+)\s*x\s*(\S+)(?:\s+(\S+))?$",
                line, re.IGNORECASE
            )
            if match:
                exercise_name = match.group(1).strip()
                sets = match.group(2)
                reps = match.group(3)
                rest = match.group(4) if match.group(4) else DEFAULTS["rest"]
                rest = self._normalize_rest(rest)

                # Handle superset notation: "A1) Bench Press / A2) Row 3x10"
                exercises, is_superset, superset_parts = self._parse_exercise_names_with_blocks(exercise_name)
                if is_superset:
                    block_id = f"block-{uuid4().hex[:8]}"
                    exercise_groups.append({
                        "_is_superset": True,
                        "_block_id": block_id,
                        "_parts": superset_parts,
                        "sets": sets,
                        "reps": reps,
                        "rest": rest,
                    })
                else:
                    exercise_groups.append({
                        "exercises": exercises,
                        "sets": sets,
                        "reps": reps,
                        "rest": rest,
                    })

        # Expand superset groups into separate block_id-linked groups
        exercise_groups = self._expand_all_groups(exercise_groups)

        if not exercise_groups:
            return ParseResult(
                success=False,
                confidence=0.0,
                source_format="text",
                errors=["No exercises with sets/reps pattern found"]
            )

        workout_data = {
            "name": name or "Imported Workout",
            "description": "",
            "exercise_groups": exercise_groups,
            "tags": [],
        }

        confidence = min(0.4 + len(exercise_groups) * 0.1, 0.9)

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=warnings,
            confidence=confidence,
            source_format="text (compact notation)",
        )

    # ── Numbered List ──────────────────────────────────────────────

    def _try_numbered_list(self, lines: List[str]) -> ParseResult:
        """
        Parse numbered list format:
            1. Bench Press - 3 sets x 8 reps
            2. Squats - 4 sets x 10 reps - 90s rest
        Or simple:
            1. Bench Press
            2. Squats
        """
        exercise_groups = []
        warnings = []
        non_empty_lines = [l.strip() for l in lines if l.strip()]

        if not non_empty_lines:
            return ParseResult(errors=["Empty content"])

        name = None
        has_numbered = False

        for line in non_empty_lines:
            # Detect numbered exercise
            num_match = re.match(r"^(\d+)[.)]\s+(.+)$", line)
            if num_match:
                has_numbered = True
                exercise_text = num_match.group(2).strip()

                # Try to extract sets/reps from the line
                # "Bench Press - 3 sets x 8 reps - 90s rest"
                detail_match = re.match(
                    r"^(.+?)\s*[-–]\s*(\d+)\s+sets?\s*x\s*(\S+)\s+reps?(?:\s*[-–]\s*(\S+)\s+rest)?$",
                    exercise_text, re.IGNORECASE
                )
                if detail_match:
                    ex_name = detail_match.group(1).strip()
                    exercises, is_superset, superset_parts = self._parse_exercise_names_with_blocks(ex_name)
                    sets = detail_match.group(2)
                    reps = detail_match.group(3)
                    rest = self._normalize_rest(detail_match.group(4)) if detail_match.group(4) else DEFAULTS["rest"]
                    if is_superset:
                        block_id = f"block-{uuid4().hex[:8]}"
                        exercise_groups.append({
                            "_is_superset": True,
                            "_block_id": block_id,
                            "_parts": superset_parts,
                            "sets": sets,
                            "reps": reps,
                            "rest": rest,
                        })
                    else:
                        exercise_groups.append({
                            "exercises": exercises,
                            "sets": sets,
                            "reps": reps,
                            "rest": rest,
                        })
                else:
                    # Just exercise name, use defaults
                    exercises, is_superset, superset_parts = self._parse_exercise_names_with_blocks(exercise_text)
                    if is_superset:
                        block_id = f"block-{uuid4().hex[:8]}"
                        exercise_groups.append({
                            "_is_superset": True,
                            "_block_id": block_id,
                            "_parts": superset_parts,
                            "sets": DEFAULTS["sets"],
                            "reps": DEFAULTS["reps"],
                            "rest": DEFAULTS["rest"],
                        })
                    else:
                        exercise_groups.append({
                            "exercises": exercises,
                            "sets": DEFAULTS["sets"],
                            "reps": DEFAULTS["reps"],
                            "rest": DEFAULTS["rest"],
                        })
                    if not warnings or "defaults" not in warnings[-1]:
                        warnings.append("Some exercises missing sets/reps — using defaults (3 sets x 8-12 reps)")

            elif not name and not has_numbered:
                # First non-numbered line before any exercises = title
                name = line

        # Expand superset groups into separate block_id-linked groups
        exercise_groups = self._expand_all_groups(exercise_groups)

        if not exercise_groups:
            return ParseResult(
                success=False,
                confidence=0.0,
                source_format="text",
                errors=["No numbered exercises found"]
            )

        workout_data = {
            "name": name or "Imported Workout",
            "description": "",
            "exercise_groups": exercise_groups,
            "tags": [],
        }

        confidence = min(0.4 + len(exercise_groups) * 0.1, 0.85)

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=warnings,
            confidence=confidence,
            source_format="text (numbered list)",
        )

    # ── Exercise Names Only (Fallback) ─────────────────────────────

    def _try_exercise_names_only(self, lines: List[str]) -> ParseResult:
        """Last resort: treat each non-empty line as an exercise name."""
        non_empty = [l.strip() for l in lines if l.strip()]

        if not non_empty:
            return ParseResult(errors=["Empty content"])

        name = None
        exercises_start = 0

        # First line is title if there are multiple lines
        if len(non_empty) > 1:
            name = non_empty[0]
            exercises_start = 1
            # Skip === underline
            if exercises_start < len(non_empty) and re.match(r"^=+$", non_empty[exercises_start]):
                exercises_start += 1

        exercise_groups = []
        for line in non_empty[exercises_start:]:
            # Skip tags, footers
            if line.startswith("#") or "fitnessfieldnotes" in line.lower():
                continue
            # Skip lines that are just numbers or very short
            if len(line) < 2:
                continue

            exercises, is_superset, superset_parts = self._parse_exercise_names_with_blocks(line)
            if is_superset:
                block_id = f"block-{uuid4().hex[:8]}"
                exercise_groups.append({
                    "_is_superset": True,
                    "_block_id": block_id,
                    "_parts": superset_parts,
                    "sets": DEFAULTS["sets"],
                    "reps": DEFAULTS["reps"],
                    "rest": DEFAULTS["rest"],
                })
            else:
                exercise_groups.append({
                    "exercises": exercises,
                    "sets": DEFAULTS["sets"],
                    "reps": DEFAULTS["reps"],
                    "rest": DEFAULTS["rest"],
                })

        # Expand superset groups into separate block_id-linked groups
        exercise_groups = self._expand_all_groups(exercise_groups)

        if not exercise_groups:
            return ParseResult(errors=["No exercises found"])

        workout_data = {
            "name": name or "Imported Workout",
            "description": "",
            "exercise_groups": exercise_groups,
            "tags": [],
        }

        return ParseResult(
            success=True,
            workout_data=workout_data,
            warnings=["All exercises using default sets/reps/rest (3 x 8-12, 60s rest)"],
            confidence=0.3,
            source_format="text (exercise names only)",
        )

    # ── Helpers ────────────────────────────────────────────────────

    def _parse_exercise_names_with_blocks(self, text: str) -> tuple:
        """Parse exercise names, detecting supersets vs alternates.

        Returns: (exercises_dict, is_superset, superset_parts_list)
        - If is_superset is True, superset_parts contains individual exercise names
          and exercises_dict is empty.
        - If is_superset is False, exercises_dict has the packed alternates
          and superset_parts is empty.
        """
        # Detect superset labels: A1), A2), B1), B2) etc.
        superset_pattern = re.findall(r'[A-Z]\d+\)', text)
        if len(superset_pattern) >= 2:
            # This is superset notation — split into individual exercises
            parts = re.split(r'[A-Z]\d+\)\s*', text)
            parts = [p.strip().rstrip('/').strip() for p in parts if p.strip()]
            if len(parts) >= 2:
                return {}, True, parts

        # No superset notation — use standard alternate parsing
        exercises = self._parse_exercise_names(text)
        return exercises, False, []

    def _expand_group(self, group: dict) -> list:
        """Expand a group, handling supersets with block_id.

        Regular groups are returned as a single-element list.
        Superset groups are expanded into multiple groups sharing a block_id.
        """
        if group.get("_is_superset"):
            block_id = group["_block_id"]
            result = []
            for part_name in group["_parts"]:
                expanded = {
                    "exercises": {"a": part_name},
                    "sets": group["sets"],
                    "reps": group["reps"],
                    "rest": group["rest"],
                    "block_id": block_id,
                    "group_name": "Superset",
                }
                if "default_weight" in group:
                    expanded["default_weight"] = group["default_weight"]
                    expanded["default_weight_unit"] = group.get("default_weight_unit", "lbs")
                result.append(expanded)
            return result
        return [group]

    def _expand_all_groups(self, exercise_groups: list) -> list:
        """Expand all groups, handling any superset markers."""
        expanded = []
        for group in exercise_groups:
            expanded.extend(self._expand_group(group))
        return expanded

    def _parse_exercise_names(self, text: str) -> Dict[str, str]:
        """Parse exercise names, handling supersets separated by / or 'and'."""
        keys = ["a", "b", "c", "d", "e", "f"]
        # Remove superset labels like "A1)", "A2)", "B1)", etc.
        text = re.sub(r"[A-Z]\d+\)\s*", "", text)
        # Split on " / " or " AND " (case-insensitive)
        parts = re.split(r"\s*/\s*|\s+and\s+", text, flags=re.IGNORECASE)
        exercises = {}
        for i, part in enumerate(parts):
            part = part.strip()
            if part and i < len(keys):
                exercises[keys[i]] = part
        return exercises if exercises else {"a": text.strip()}

    def _parse_weight(self, text: str) -> Tuple[Optional[str], str]:
        """Extract weight value and unit from a string like '135 lbs' or '60kg'."""
        match = re.match(r"^([\d.]+)\s*(lbs?|kg|other)?$", text, re.IGNORECASE)
        if match:
            weight = match.group(1)
            unit = (match.group(2) or "lbs").lower()
            if unit == "lb":
                unit = "lbs"
            return weight, unit
        return None, "lbs"

    def _normalize_rest(self, rest: str) -> str:
        """Normalize rest period to standard format."""
        if not rest:
            return DEFAULTS["rest"]
        rest = rest.strip().lower()
        # Already has unit
        if re.match(r"^\d+\s*(s|sec|seconds?|min|minutes?)$", rest):
            # Normalize to short form
            rest = re.sub(r"\s*(seconds?|secs?)", "s", rest)
            rest = re.sub(r"\s*(minutes?|mins?)", "min", rest)
            return rest
        # Just a number — assume seconds
        if re.match(r"^\d+$", rest):
            return rest + "s"
        return rest
