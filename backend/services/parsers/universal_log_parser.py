"""
Universal Log Parser - Uses Google Gemini to extract session data from photos and text.
Handles treadmill screens, Apple Watch summaries, bike computers, whiteboard workouts, etc.
Returns structured cardio or strength session data (not workout templates).
"""

import base64
import json
import logging
import os
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────

UNIVERSAL_LOG_PROMPT = """You are a fitness session data extractor. Analyze the provided content (images and/or text descriptions) and extract structured session data for logging.

CONTENT MAY INCLUDE:
- Photos of cardio equipment screens (treadmill, bike, rowing machine, elliptical)
- Apple Watch or fitness tracker workout summaries
- Apple Fitness or Garmin session screenshots
- Whiteboard workouts from gyms (OrangeTheory, F45, CrossFit, etc.)
- Text descriptions like "2.3 miles on the treadmill in 18:20, burned 340 cals"
- Mixed content: e.g., a treadmill photo PLUS a watch summary photo

STEP 1 — Identify session type:
- "cardio": running, cycling, rowing, swimming, elliptical, stair climbing, walking, hiking, or any aerobic machine session with distance/time/calories data
- "strength": exercises with sets/reps, weightlifting, bodyweight circuits, class workouts (OrangeTheory, F45, HIIT with exercises listed)
- "unknown": cannot determine from the content

STEP 2 — Extract data:

FOR CARDIO sessions, extract all available fields:
- activity_type: MUST be one of: "running", "cycling", "rowing", "swimming", "elliptical", "stair_climber", "walking", "hiking", "other"
  - Treadmill → "running" (unless at 0° and very slow → "walking")
  - Bike/spin → "cycling"
  - Rower → "rowing"
  - Stair master/step mill → "stair_climber"
- activity_name: display name if given (e.g., "Morning Run", "Peloton Ride")
- duration_minutes: total time as a decimal number (e.g., 18.5 for 18:30)
- distance: numeric value only
- distance_unit: "mi" or "km" — infer from context (mph → mi, kph → km, treadmill in US → mi)
- avg_heart_rate: average BPM as integer
- max_heart_rate: maximum BPM as integer
- calories: total calories burned as integer (Active Calories or Total Calories — use whichever is visible)
- pace_per_unit: pace in "MM:SS" format per mile or km (e.g., "8:30")
- rpe: rate of perceived exertion 1-10 if mentioned

FOR STRENGTH sessions, extract:
- workout_name: name of the workout or class (e.g., "OrangeTheory Power Day", "F45 Foxtrot", "Push Day")
- exercise_groups: array of exercises. Each has:
  - exercises: {"a": "Exercise Name"} — use {"a": "Exercise A", "b": "Exercise B"} ONLY for true alternates (pick one)
  - sets: number as string (default "3")
  - reps: reps as string (e.g., "10", "8-12", "AMRAP", "45s")
  - rest: rest period (default "60s")
  - default_weight: weight number as string or null
  - default_weight_unit: "lbs" or "kg"
- notes: any class notes, coach instructions, or general notes

STEP 3 — Decide if clarification is needed:
Set needs_clarification: true ONLY if ALL of these are true:
1. You have some data but a critical field is genuinely ambiguous (e.g., can't tell if distance is miles or km, can't read a blurry number)
2. Your confidence would be below 0.55 without clarification
3. A simple question would resolve the ambiguity

Keep questions minimal — max 3 questions. Do NOT ask about optional fields (heart rate, RPE, etc.).

RULES:
- Extract numbers as numbers (not strings with units)
- For time: convert "18:20" → 18.33 minutes, "1:05:30" → 65.5 minutes
- For pace: preserve "MM:SS" format (e.g., "8:30" per mile)
- If multiple images show the same session from different angles, combine all data
- Default exercise sets/reps only if not visible: sets="3", reps="8-12", rest="60s"
- Maximum 20 exercise groups for strength sessions
- Translate exercise names to English if needed

OUTPUT SCHEMA (respond with ONLY this JSON, no other text):
{
  "session_type": "cardio" | "strength" | "unknown",
  "needs_clarification": false,
  "questions": [],
  "confidence": 0.0,
  "cardio_data": null | {
    "activity_type": "running",
    "activity_name": null,
    "duration_minutes": null,
    "distance": null,
    "distance_unit": "mi",
    "avg_heart_rate": null,
    "max_heart_rate": null,
    "calories": null,
    "pace_per_unit": null,
    "rpe": null,
    "notes": null
  },
  "strength_data": null | {
    "workout_name": "Ad-Hoc Workout",
    "exercise_groups": [
      {
        "exercises": {"a": "Exercise Name"},
        "sets": "3",
        "reps": "8-12",
        "rest": "60s",
        "default_weight": null,
        "default_weight_unit": "lbs"
      }
    ],
    "notes": null
  }
}

When needs_clarification is true, populate questions like:
"questions": [
  {"id": "distance_unit", "question": "Is the distance in miles or kilometers?", "type": "select", "options": ["miles (mi)", "kilometers (km)"]},
  {"id": "activity_type", "question": "What type of activity was this?", "type": "select", "options": ["running", "cycling", "rowing", "elliptical", "other"]}
]
"""


@dataclass
class UniversalLogParserConfig:
    """Configuration for universal log parser."""
    model: str = "gemini-2.5-flash-lite"
    max_output_tokens: int = 4096
    temperature: float = 0.1


class UniversalLogParser:
    """Parses fitness activity data from photos and text using Gemini multimodal AI."""

    def __init__(self, api_key: str = None):
        self.config = UniversalLogParserConfig()
        self.client = None
        self._api_key = api_key

    def _get_client(self):
        """Lazy-initialize the Gemini client."""
        if self.client is None:
            from google import genai
            key = self._api_key or os.getenv("GEMINI_API_KEY")
            if not key:
                raise ValueError("GEMINI_API_KEY not configured")
            self.client = genai.Client(api_key=key)
        return self.client

    def is_available(self) -> bool:
        """Check if the parser is configured and available."""
        return bool(self._api_key or os.getenv("GEMINI_API_KEY"))

    def parse(
        self,
        text: Optional[str],
        images: Optional[List[Any]],  # List[UniversalLogImage]
        answers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Parse activity data from text and/or images.

        Args:
            text: Free-text description of the activity
            images: List of UniversalLogImage objects (base64 + mime_type)
            answers: User answers to previous clarifying questions

        Returns:
            Dict matching UniversalLogParseResponse schema
        """
        if not text and not images:
            return self._error_response("No input provided — please add a description or photo")

        try:
            from google.genai import types

            client = self._get_client()
            contents = self._build_contents(text, images, answers, types)

            response = client.models.generate_content(
                model=self.config.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=UNIVERSAL_LOG_PROMPT,
                    response_mime_type="application/json",
                    temperature=self.config.temperature,
                    max_output_tokens=self.config.max_output_tokens,
                ),
            )

            response_text = response.text.strip()
            parsed = json.loads(response_text)

            # Validate and normalize the response
            return self._normalize_response(parsed)

        except json.JSONDecodeError as e:
            logger.error(f"Universal log parser: AI returned invalid JSON: {e}")
            return self._error_response("AI returned an unexpected format — please try again")
        except Exception as e:
            logger.error(f"Universal log parser error: {e}")
            return self._error_response(f"Analysis failed: {str(e)}")

    def _build_contents(
        self,
        text: Optional[str],
        images: Optional[List[Any]],
        answers: Optional[Dict[str, str]],
        types,
    ) -> list:
        """Build the Gemini contents list from inputs."""
        contents = ["Analyze this fitness activity data and extract session information."]

        # Add each image as a multimodal Part
        if images:
            for img in images:
                try:
                    image_bytes = base64.b64decode(img.data)
                    contents.append(
                        types.Part.from_bytes(data=image_bytes, mime_type=img.mime_type)
                    )
                except Exception as e:
                    logger.warning(f"Skipping invalid image: {e}")

        # Add text description
        if text and text.strip():
            contents.append(f"\nUser description: {text.strip()}")

        # Append answers to clarifying questions
        if answers:
            lines = "; ".join(f"{k}: {v}" for k, v in answers.items())
            contents.append(f"\nUser clarifications: {lines}")

        return contents

    def _normalize_response(self, parsed: dict) -> dict:
        """Validate and normalize the AI response to match our schema."""
        session_type = parsed.get("session_type", "unknown")
        needs_clarification = bool(parsed.get("needs_clarification", False))
        questions = parsed.get("questions", [])
        confidence = float(parsed.get("confidence", 0.5))

        # Normalize cardio_data
        cardio_data = None
        if session_type == "cardio" and parsed.get("cardio_data"):
            cd = parsed["cardio_data"]
            cardio_data = {
                "activity_type": cd.get("activity_type", "other"),
                "activity_name": cd.get("activity_name"),
                "duration_minutes": _to_float(cd.get("duration_minutes")),
                "distance": _to_float(cd.get("distance")),
                "distance_unit": cd.get("distance_unit", "mi"),
                "avg_heart_rate": _to_int(cd.get("avg_heart_rate")),
                "max_heart_rate": _to_int(cd.get("max_heart_rate")),
                "calories": _to_int(cd.get("calories")),
                "pace_per_unit": cd.get("pace_per_unit"),
                "rpe": _to_int(cd.get("rpe")),
                "notes": cd.get("notes"),
            }

        # Normalize strength_data
        strength_data = None
        if session_type == "strength" and parsed.get("strength_data"):
            sd = parsed["strength_data"]
            groups = []
            for g in (sd.get("exercise_groups") or [])[:20]:
                exercises = g.get("exercises", {})
                if not exercises:
                    continue
                groups.append({
                    "exercises": exercises,
                    "sets": str(g.get("sets", "3")),
                    "reps": str(g.get("reps", "8-12")),
                    "rest": str(g.get("rest", "60s")),
                    "default_weight": g.get("default_weight"),
                    "default_weight_unit": g.get("default_weight_unit", "lbs"),
                })
            strength_data = {
                "workout_name": sd.get("workout_name") or "Ad-Hoc Workout",
                "exercise_groups": groups,
                "notes": sd.get("notes"),
            }

        # Recalculate confidence from actual data presence
        if not needs_clarification:
            confidence = self._calculate_confidence(session_type, cardio_data, strength_data, confidence)

        return {
            "success": True,
            "session_type": session_type,
            "needs_clarification": needs_clarification,
            "questions": questions,
            "cardio_data": cardio_data,
            "strength_data": strength_data,
            "confidence": confidence,
            "errors": [],
        }

    def _calculate_confidence(
        self,
        session_type: str,
        cardio_data: Optional[dict],
        strength_data: Optional[dict],
        ai_confidence: float,
    ) -> float:
        """Calculate confidence based on data completeness."""
        score = 0.5

        if session_type in ("cardio", "strength"):
            score += 0.2

        if session_type == "cardio" and cardio_data:
            if cardio_data.get("duration_minutes"):
                score += 0.1
            if cardio_data.get("distance"):
                score += 0.1
            if cardio_data.get("avg_heart_rate") or cardio_data.get("calories"):
                score += 0.05

        elif session_type == "strength" and strength_data:
            groups = strength_data.get("exercise_groups", [])
            if len(groups) >= 3:
                score += 0.1
            if len(groups) >= 1:
                score += 0.05

        # Blend with AI's own reported confidence if reasonable
        if 0.0 < ai_confidence < 1.0:
            score = (score * 0.7) + (ai_confidence * 0.3)

        return min(round(score, 2), 0.95)

    def _error_response(self, message: str) -> dict:
        return {
            "success": False,
            "session_type": "unknown",
            "needs_clarification": False,
            "questions": [],
            "cardio_data": None,
            "strength_data": None,
            "confidence": 0.0,
            "errors": [message],
        }


def _to_float(value) -> Optional[float]:
    """Safely convert a value to float."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value) -> Optional[int]:
    """Safely convert a value to int."""
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


# Lazy singleton
_universal_log_parser = None


def get_universal_log_parser() -> UniversalLogParser:
    global _universal_log_parser
    if _universal_log_parser is None:
        _universal_log_parser = UniversalLogParser()
    return _universal_log_parser
