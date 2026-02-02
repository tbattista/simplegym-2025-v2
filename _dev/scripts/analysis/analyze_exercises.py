"""
Exercise Database Analysis Script
Analyzes all exercises and identifies the top ~150 essential exercises to keep.
Uses a curated list of industry-standard exercises for scoring.
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore

# ============================================================================
# CURATED ESSENTIAL EXERCISES LIST
# Based on fitness industry research - these are the most universally used exercises
# ============================================================================

ESSENTIAL_EXERCISES = {
    # Big 5 Compounds - highest priority (exact match bonus)
    "bench press",
    "squat",
    "deadlift",
    "overhead press",
    "pull-up",
    "pull up",
    "pullup",

    # Chest
    "incline bench press",
    "decline bench press",
    "dumbbell bench press",
    "dumbbell press",
    "dumbbell fly",
    "chest fly",
    "cable fly",
    "cable crossover",
    "push-up",
    "push up",
    "pushup",
    "dips",
    "dip",
    "pec deck",
    "chest press",
    "incline dumbbell press",
    "decline dumbbell press",

    # Back
    "barbell row",
    "bent over row",
    "dumbbell row",
    "cable row",
    "seated row",
    "lat pulldown",
    "pull-down",
    "pulldown",
    "chin-up",
    "chin up",
    "chinup",
    "t-bar row",
    "face pull",
    "straight arm pulldown",
    "single arm row",
    "pendlay row",
    "meadows row",

    # Shoulders
    "shoulder press",
    "military press",
    "dumbbell shoulder press",
    "arnold press",
    "lateral raise",
    "side lateral raise",
    "front raise",
    "rear delt fly",
    "reverse fly",
    "upright row",
    "shrug",
    "barbell shrug",
    "dumbbell shrug",
    "face pull",
    "cable lateral raise",

    # Legs - Quads
    "back squat",
    "front squat",
    "goblet squat",
    "leg press",
    "lunge",
    "lunges",
    "walking lunge",
    "reverse lunge",
    "bulgarian split squat",
    "split squat",
    "leg extension",
    "hack squat",
    "step-up",
    "step up",
    "sissy squat",

    # Legs - Hamstrings/Glutes
    "romanian deadlift",
    "rdl",
    "stiff leg deadlift",
    "leg curl",
    "lying leg curl",
    "seated leg curl",
    "hamstring curl",
    "good morning",
    "hip thrust",
    "barbell hip thrust",
    "glute bridge",
    "cable kickback",
    "glute kickback",
    "sumo deadlift",
    "hip extension",
    "nordic curl",
    "glute ham raise",

    # Arms - Biceps
    "barbell curl",
    "bicep curl",
    "dumbbell curl",
    "hammer curl",
    "preacher curl",
    "cable curl",
    "concentration curl",
    "incline curl",
    "incline dumbbell curl",
    "ez bar curl",
    "spider curl",
    "drag curl",
    "reverse curl",

    # Arms - Triceps
    "tricep pushdown",
    "triceps pushdown",
    "pushdown",
    "skull crusher",
    "skull crushers",
    "lying tricep extension",
    "overhead tricep extension",
    "tricep extension",
    "tricep dip",
    "close grip bench press",
    "tricep kickback",
    "cable tricep extension",
    "diamond push-up",
    "dip",

    # Core
    "plank",
    "crunch",
    "crunches",
    "sit-up",
    "sit up",
    "leg raise",
    "hanging leg raise",
    "lying leg raise",
    "russian twist",
    "cable woodchop",
    "wood chop",
    "ab wheel",
    "ab rollout",
    "mountain climber",
    "dead bug",
    "bird dog",
    "side plank",
    "bicycle crunch",
    "cable crunch",
    "decline crunch",
    "v-up",
    "toe touch",
    "flutter kick",
    "hollow hold",

    # Calves
    "calf raise",
    "standing calf raise",
    "seated calf raise",
    "donkey calf raise",
    "calf press",

    # Functional/Full Body
    "kettlebell swing",
    "clean",
    "power clean",
    "hang clean",
    "snatch",
    "power snatch",
    "thruster",
    "burpee",
    "burpees",
    "farmer walk",
    "farmer carry",
    "turkish get-up",
    "box jump",
    "jump squat",
    "battle rope",
    "sled push",
    "sled pull",
    "rowing",
    "row machine",

    # Machine exercises (common in gyms)
    "machine chest press",
    "machine shoulder press",
    "machine row",
    "smith machine",
    "cable machine",
    "leg press machine",
    "hack squat machine",
}

# Equipment keywords that indicate a valid variation
EQUIPMENT_KEYWORDS = {
    "barbell", "dumbbell", "cable", "machine", "kettlebell",
    "ez bar", "smith machine", "resistance band", "band"
}

# Keywords that indicate obscure/specialized variations to potentially remove
OBSCURE_MODIFIERS = {
    "1.5 rep", "21s", "pause", "tempo", "banded", "chains",
    "deficit", "accommodating", "cluster", "drop set",
    "rest pause", "myo rep", "blood flow", "occlusion",
    "isometric", "eccentric", "negative", "forced rep"
}


class ExerciseAnalyzer:
    """Analyzes exercises and scores them for relevance"""

    def __init__(self):
        self.db = None
        self.app = None
        self.all_exercises = []
        self.scored_exercises = []
        self.exercises_to_keep = []
        self.exercises_to_delete = []
        self.muscle_group_counts = defaultdict(int)

    def initialize(self) -> bool:
        """Initialize Firebase connection"""
        print("\n" + "="*80)
        print("EXERCISE DATABASE ANALYSIS")
        print("="*80)

        self.app = get_firebase_app()
        if not self.app:
            print("Failed to initialize Firebase")
            return False

        self.db = firestore.client(app=self.app)
        print("Connected to Firestore")
        return True

    def fetch_all_exercises(self) -> int:
        """Fetch all exercises from global_exercises collection"""
        print("\n" + "-"*40)
        print("Fetching all exercises...")
        print("-"*40)

        exercises_ref = self.db.collection('global_exercises')
        docs = list(exercises_ref.stream())

        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            self.all_exercises.append(data)

        print(f"Found {len(self.all_exercises)} exercises in database")
        return len(self.all_exercises)

    def normalize_name(self, name: str) -> str:
        """Normalize exercise name for comparison"""
        return name.lower().strip()

    def calculate_score(self, exercise: Dict) -> Tuple[int, str]:
        """
        Calculate relevance score for an exercise.
        Returns (score, reason)
        """
        name = exercise.get('name', '')
        normalized_name = self.normalize_name(name)
        score = 0
        reasons = []

        # Check for exact match in essential exercises
        if normalized_name in ESSENTIAL_EXERCISES:
            score += 100
            reasons.append("Exact match to essential exercise (+100)")
        else:
            # Check for partial matches
            for essential in ESSENTIAL_EXERCISES:
                if essential in normalized_name or normalized_name in essential:
                    score += 50
                    reasons.append(f"Partial match: '{essential}' (+50)")
                    break

        # Check for equipment variations of essential exercises
        for equipment in EQUIPMENT_KEYWORDS:
            if equipment in normalized_name:
                # Check if base exercise (without equipment) is essential
                base_name = normalized_name.replace(equipment, "").strip()
                for essential in ESSENTIAL_EXERCISES:
                    if essential in base_name or base_name in essential:
                        score += 20
                        reasons.append(f"Equipment variation of essential (+20)")
                        break
                break

        # Penalty for obscure modifiers
        for modifier in OBSCURE_MODIFIERS:
            if modifier in normalized_name:
                score -= 30
                reasons.append(f"Obscure modifier: '{modifier}' (-30)")
                break

        # Bonus for compound movements
        mechanics = (exercise.get('mechanics') or '').lower()
        if mechanics == 'compound':
            score += 15
            reasons.append("Compound movement (+15)")

        # Bonus for foundational tier
        tier = exercise.get('exerciseTier', 3)
        if tier == 1:
            score += 10
            reasons.append("Tier 1 foundational (+10)")

        # Small bonus for existing popularity (but not weighted heavily)
        pop_score = exercise.get('popularityScore', 0)
        if pop_score and pop_score > 50:
            score += 5
            reasons.append(f"Popular (score: {pop_score}) (+5)")

        reason = "; ".join(reasons) if reasons else "No matches"
        return (score, reason)

    def analyze_exercises(self, target_count: int = 150):
        """Score all exercises and select top ones to keep"""
        print("\n" + "-"*40)
        print("Analyzing exercises...")
        print("-"*40)

        # Score all exercises
        for exercise in self.all_exercises:
            score, reason = self.calculate_score(exercise)
            self.scored_exercises.append({
                'id': exercise.get('id'),
                'name': exercise.get('name'),
                'score': score,
                'reason': reason,
                'targetMuscleGroup': exercise.get('targetMuscleGroup', 'Unknown'),
                'primaryEquipment': exercise.get('primaryEquipment', 'Unknown'),
                'mechanics': exercise.get('mechanics', 'Unknown'),
                'tier': exercise.get('exerciseTier', 3),
            })

        # Sort by score descending
        self.scored_exercises.sort(key=lambda x: x['score'], reverse=True)

        # Select top exercises, ensuring muscle group coverage
        selected_ids = set()
        muscle_group_min = 5  # Minimum exercises per muscle group

        # First pass: select top scored exercises
        for ex in self.scored_exercises:
            if len(selected_ids) >= target_count:
                break
            if ex['score'] > 0:  # Only keep exercises with positive scores
                selected_ids.add(ex['id'])
                self.muscle_group_counts[ex['targetMuscleGroup']] += 1

        # Second pass: ensure muscle group coverage
        for ex in self.scored_exercises:
            muscle_group = ex['targetMuscleGroup']
            if self.muscle_group_counts[muscle_group] < muscle_group_min:
                if ex['id'] not in selected_ids and ex['score'] >= 0:
                    selected_ids.add(ex['id'])
                    self.muscle_group_counts[muscle_group] += 1

        # Categorize exercises
        for ex in self.scored_exercises:
            if ex['id'] in selected_ids:
                self.exercises_to_keep.append(ex)
            else:
                self.exercises_to_delete.append(ex)

        print(f"\nExercises to KEEP: {len(self.exercises_to_keep)}")
        print(f"Exercises to DELETE: {len(self.exercises_to_delete)}")

    def generate_report(self, output_dir: Path):
        """Generate analysis report"""
        print("\n" + "-"*40)
        print("Generating report...")
        print("-"*40)

        output_dir.mkdir(parents=True, exist_ok=True)

        # 1. Markdown report
        report_path = output_dir / "exercise_report.md"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# Exercise Database Analysis Report\n\n")
            f.write(f"**Generated:** {datetime.now().isoformat()}\n\n")

            f.write("## Summary\n\n")
            f.write(f"- **Total exercises in database:** {len(self.all_exercises)}\n")
            f.write(f"- **Exercises to KEEP:** {len(self.exercises_to_keep)}\n")
            f.write(f"- **Exercises to DELETE:** {len(self.exercises_to_delete)}\n\n")

            f.write("## Muscle Group Coverage (Exercises to Keep)\n\n")
            f.write("| Muscle Group | Count |\n")
            f.write("|--------------|-------|\n")
            for muscle, count in sorted(self.muscle_group_counts.items()):
                f.write(f"| {muscle} | {count} |\n")
            f.write("\n")

            f.write("## Exercises to KEEP (Top Scored)\n\n")
            f.write("| Rank | Name | Score | Muscle Group | Equipment | Reason |\n")
            f.write("|------|------|-------|--------------|-----------|--------|\n")
            for i, ex in enumerate(self.exercises_to_keep[:50], 1):
                name = ex['name'][:40] + "..." if len(ex['name']) > 40 else ex['name']
                reason = ex['reason'][:50] + "..." if len(ex['reason']) > 50 else ex['reason']
                f.write(f"| {i} | {name} | {ex['score']} | {ex['targetMuscleGroup']} | {ex['primaryEquipment']} | {reason} |\n")

            if len(self.exercises_to_keep) > 50:
                f.write(f"\n*...and {len(self.exercises_to_keep) - 50} more exercises*\n")

            f.write("\n## Full List of Exercises to KEEP\n\n")
            for i, ex in enumerate(self.exercises_to_keep, 1):
                f.write(f"{i}. **{ex['name']}** (Score: {ex['score']}) - {ex['targetMuscleGroup']}\n")

            f.write("\n## Exercises to DELETE\n\n")
            f.write("The following exercises will be removed:\n\n")
            for i, ex in enumerate(self.exercises_to_delete, 1):
                f.write(f"{i}. ~~{ex['name']}~~ (Score: {ex['score']}) - {ex['reason']}\n")

        print(f"Report saved: {report_path}")

        # 2. JSON - exercises to keep
        keep_path = output_dir / "exercises_to_keep.json"
        with open(keep_path, 'w', encoding='utf-8') as f:
            json.dump({
                'count': len(self.exercises_to_keep),
                'generated': datetime.now().isoformat(),
                'exercises': [{
                    'id': ex['id'],
                    'name': ex['name'],
                    'score': ex['score'],
                    'targetMuscleGroup': ex['targetMuscleGroup']
                } for ex in self.exercises_to_keep]
            }, f, indent=2)
        print(f"Keep list saved: {keep_path}")

        # 3. JSON - exercises to delete
        delete_path = output_dir / "exercises_to_delete.json"
        with open(delete_path, 'w', encoding='utf-8') as f:
            json.dump({
                'count': len(self.exercises_to_delete),
                'generated': datetime.now().isoformat(),
                'exercises': [{
                    'id': ex['id'],
                    'name': ex['name'],
                    'score': ex['score'],
                    'reason': ex['reason']
                } for ex in self.exercises_to_delete]
            }, f, indent=2)
        print(f"Delete list saved: {delete_path}")

        # 4. Print summary to console
        print("\n" + "="*80)
        print("TOP 30 EXERCISES TO KEEP")
        print("="*80)
        for i, ex in enumerate(self.exercises_to_keep[:30], 1):
            print(f"{i:3}. {ex['name'][:50]:<50} Score: {ex['score']:3}")

        print("\n" + "="*80)
        print("SAMPLE EXERCISES TO DELETE (first 20)")
        print("="*80)
        for i, ex in enumerate(self.exercises_to_delete[:20], 1):
            print(f"{i:3}. {ex['name'][:50]:<50} Score: {ex['score']:3}")


def main():
    """Main execution"""
    analyzer = ExerciseAnalyzer()

    if not analyzer.initialize():
        print("Failed to connect to Firebase")
        return

    analyzer.fetch_all_exercises()
    analyzer.analyze_exercises(target_count=150)

    output_dir = Path(__file__).parent / "analysis_results"
    analyzer.generate_report(output_dir)

    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80)
    print(f"\nResults saved to: {output_dir}")
    print("\nNext steps:")
    print("1. Review exercise_report.md")
    print("2. Check exercises_to_keep.json and exercises_to_delete.json")
    print("3. Run delete_exercises.py --dry-run to preview deletion")
    print("4. Run delete_exercises.py to execute deletion")


if __name__ == "__main__":
    main()
