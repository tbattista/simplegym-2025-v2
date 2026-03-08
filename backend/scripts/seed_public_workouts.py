"""
Seed Public Workouts into Firestore
Creates 20 research-based workout templates in the public_workouts collection.

Usage:
    python backend/scripts/seed_public_workouts.py --dry-run
    python backend/scripts/seed_public_workouts.py
"""

import sys
import argparse
import secrets
from pathlib import Path
from datetime import datetime, timezone

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv(project_root / '.env')


def generate_id(prefix="workout"):
    return f"{prefix}-{secrets.token_hex(4)}"


def make_group(exercises, sets, reps, rest):
    """Create an exercise group dict.
    exercises: dict like {'a': 'Bench Press'} or list of names (auto-keyed a,b,c...)
    """
    if isinstance(exercises, list):
        exercises = {chr(97 + i): name for i, name in enumerate(exercises)}

    return {
        'group_id': generate_id('group'),
        'exercises': exercises,
        'sets': sets,
        'reps': reps,
        'rest': rest,
        'default_weight': None,
        'default_weight_unit': 'lbs',
        'group_type': 'standard',
        'group_name': None,
        'block_id': None,
        'cardio_config': None,
        'interval_config': None,
    }


def make_workout(name, description, tags, groups):
    """Create a full workout template dict."""
    workout_id = generate_id('workout')
    now = datetime.now(timezone.utc).isoformat()

    return {
        'id': workout_id,
        'name': name,
        'description': description,
        'exercise_groups': groups,
        'sections': None,
        'template_notes': [],
        'is_template': True,
        'tags': tags,
        'created_date': now,
        'modified_date': now,
        'is_favorite': False,
        'is_archived': False,
    }


def build_workouts():
    """Build 20 research-based workout templates."""
    workouts = []

    # 1. PPL - Push Day
    workouts.append(make_workout(
        'Push Pull Legs - Push Day',
        'Chest, shoulders, and triceps. Classic PPL push session with compound-first ordering.',
        ['push', 'ppl', 'intermediate', 'chest', 'shoulders'],
        [
            make_group(['Barbell Bench Press'], '4', '6-8', '2min'),
            make_group(['Dumbbell Incline Bench Press'], '3', '8-10', '90s'),
            make_group(['Dumbbell Fly'], '3', '10-12', '60s'),
            make_group(['Dumbbell Lateral Raise'], '3', '12-15', '60s'),
            make_group(['Cable One Arm Tricep Pushdown'], '3', '10-12', '60s'),
        ]
    ))

    # 2. PPL - Pull Day
    workouts.append(make_workout(
        'Push Pull Legs - Pull Day',
        'Back and biceps. Heavy pulling followed by isolation work for balanced upper back development.',
        ['pull', 'ppl', 'intermediate', 'back', 'biceps'],
        [
            make_group(['Barbell Deadlift'], '3', '5', '3min'),
            make_group(['Barbell Bent Over Row'], '4', '6-8', '2min'),
            make_group(['Cable Pulldown (Pro Lat Bar)'], '3', '8-12', '90s'),
            make_group(['Dumbbell Hammer Curl'], '3', '10-12', '60s'),
            make_group(['Dumbbell Rear Lateral Raise'], '3', '12-15', '60s'),
        ]
    ))

    # 3. PPL - Leg Day
    workouts.append(make_workout(
        'Push Pull Legs - Leg Day',
        'Quads, glutes, and hamstrings. Squat-dominant with posterior chain balance.',
        ['legs', 'ppl', 'intermediate', 'quads', 'glutes'],
        [
            make_group(['Barbell Full Squat'], '4', '6-8', '3min'),
            make_group(['Barbell Romanian Deadlift'], '3', '8-10', '2min'),
            make_group(['Sled 45\u0432\u00b0 Leg Press (Back Pov)'], '3', '10-12', '90s'),
            make_group(['Lever Leg Extension'], '3', '12-15', '60s'),
            make_group(['Lever Seated Leg Curl'], '3', '10-12', '60s'),
        ]
    ))

    # 4. Upper Lower - Upper A
    workouts.append(make_workout(
        'Upper Lower - Upper A',
        'Horizontal push and pull focus. Balanced upper body session for the 4-day upper/lower split.',
        ['upper-lower', 'upper', 'strength', 'intermediate'],
        [
            make_group(['Barbell Bench Press'], '4', '6-8', '2min'),
            make_group(['Barbell Bent Over Row'], '4', '6-8', '2min'),
            make_group(['Dumbbell Seated Shoulder Press'], '3', '8-10', '90s'),
            make_group(['Cable Pulldown (Pro Lat Bar)'], '3', '10-12', '90s'),
            make_group(['Barbell Curl'], '3', '10-12', '60s'),
        ]
    ))

    # 5. Upper Lower - Lower A
    workouts.append(make_workout(
        'Upper Lower - Lower A',
        'Squat-focused lower body day. Pairs well with Upper A for a complete 4-day split.',
        ['upper-lower', 'lower', 'strength', 'intermediate'],
        [
            make_group(['Barbell Full Squat'], '4', '5-6', '3min'),
            make_group(['Barbell Romanian Deadlift'], '3', '8-10', '2min'),
            make_group(['Dumbbell Lunge'], '3', '10-12', '90s'),
            make_group(['Lever Leg Extension'], '3', '12-15', '60s'),
            make_group(['Standing Calf Raise (On a Staircase)'], '4', '15-20', '60s'),
        ]
    ))

    # 6. Full Body Beginner
    workouts.append(make_workout(
        'Full Body Beginner',
        'Total body introduction using dumbbells. Perfect for gym newcomers learning movement patterns.',
        ['full-body', 'beginner', 'dumbbell'],
        [
            make_group(['Dumbbell Goblet Squat'], '3', '10-12', '90s'),
            make_group(['Dumbbell Bench Press'], '3', '10-12', '90s'),
            make_group(['Dumbbell Bent Over Row'], '3', '10-12', '90s'),
            make_group(['Dumbbell Seated Shoulder Press'], '3', '10-12', '90s'),
            make_group(['Dumbbell Lunge'], '2', '10', '60s'),
        ]
    ))

    # 7. 5x5 Strength Foundation
    workouts.append(make_workout(
        '5x5 Strength Foundation',
        'Classic 5x5 barbell program. Focus on progressive overload with the big compound lifts.',
        ['strength', '5x5', 'beginner', 'barbell'],
        [
            make_group(['Barbell Full Squat'], '5', '5', '3min'),
            make_group(['Barbell Bench Press'], '5', '5', '3min'),
            make_group(['Barbell Bent Over Row'], '5', '5', '3min'),
        ]
    ))

    # 8. Hypertrophy Chest & Triceps
    workouts.append(make_workout(
        'Hypertrophy Chest & Triceps',
        'Volume-focused chest and triceps session. Higher rep ranges to maximize muscle growth.',
        ['chest', 'triceps', 'hypertrophy', 'intermediate'],
        [
            make_group(['Barbell Bench Press'], '4', '8-10', '2min'),
            make_group(['Dumbbell Incline Bench Press'], '3', '10-12', '90s'),
            make_group(['Dumbbell Fly'], '3', '12-15', '60s'),
            make_group(['Chest Dip'], '3', '8-12', '90s'),
            make_group(['Cable Rope High Pulley Overhead Tricep Extension'], '3', '12-15', '60s'),
        ]
    ))

    # 9. Hypertrophy Back & Biceps
    workouts.append(make_workout(
        'Hypertrophy Back & Biceps',
        'High-volume back and biceps. Multiple pulling angles for complete lat and mid-back development.',
        ['back', 'biceps', 'hypertrophy', 'intermediate'],
        [
            make_group(['Cable Pulldown (Pro Lat Bar)'], '4', '8-10', '90s'),
            make_group(['Cable Seated Row'], '3', '10-12', '90s'),
            make_group(['Lever T Bar Row'], '3', '8-10', '90s'),
            make_group(['Barbell Curl'], '3', '10-12', '60s'),
            make_group(['Dumbbell Incline Curl'], '3', '10-12', '60s'),
        ]
    ))

    # 10. Shoulder Sculpt
    workouts.append(make_workout(
        'Shoulder Sculpt',
        'Complete deltoid development hitting all three heads. Overhead pressing plus isolation work.',
        ['shoulders', 'hypertrophy', 'intermediate'],
        [
            make_group(['Dumbbell Seated Shoulder Press'], '4', '8-10', '2min'),
            make_group(['Dumbbell Lateral Raise'], '4', '12-15', '60s'),
            make_group(['Dumbbell Rear Lateral Raise'], '3', '12-15', '60s'),
            make_group(['Dumbbell Front Raise'], '3', '12-15', '60s'),
            make_group(['Cable Lateral Raise'], '3', '15-20', '45s'),
        ]
    ))

    # 11. Arm Day Blitz
    workouts.append(make_workout(
        'Arm Day Blitz',
        'Dedicated arm session alternating biceps and triceps. Great for lagging arm development.',
        ['arms', 'biceps', 'triceps', 'hypertrophy'],
        [
            make_group(['Ez Barbell Curl'], '3', '8-10', '60s'),
            make_group(['Barbell Close-grip Bench Press'], '3', '8-10', '90s'),
            make_group(['Dumbbell Hammer Curl'], '3', '10-12', '60s'),
            make_group(['Cable Rope High Pulley Overhead Tricep Extension'], '3', '10-12', '60s'),
            make_group(['Dumbbell Concentration Curl'], '2', '12-15', '45s'),
            make_group(['Dumbbell Kickback'], '2', '12-15', '45s'),
        ]
    ))

    # 12. Leg Destroyer
    workouts.append(make_workout(
        'Leg Destroyer',
        'Advanced high-volume leg session. Two squat variations plus heavy posterior chain work.',
        ['legs', 'strength', 'advanced', 'quads'],
        [
            make_group(['Barbell Full Squat'], '5', '5', '3min'),
            make_group(['Barbell Front Squat'], '3', '8-10', '2min'),
            make_group(['Barbell Romanian Deadlift'], '3', '8-10', '2min'),
            make_group(['Sled Hack Squat'], '3', '10-12', '90s'),
            make_group(['Lever Seated Leg Curl'], '3', '10-12', '60s'),
        ]
    ))

    # 13. Bodyweight Basics
    workouts.append(make_workout(
        'Bodyweight Basics',
        'No equipment needed. Build foundational strength and endurance using just your bodyweight.',
        ['bodyweight', 'beginner', 'home', 'no-equipment'],
        [
            make_group(['Push-up'], '3', '10-15', '60s'),
            make_group(['Pull-up'], '3', 'AMRAP', '90s'),
            make_group(['Jump Squat'], '3', '15', '60s'),
            make_group(['Diamond Push-up'], '3', '8-12', '60s'),
            make_group(['Jackknife Sit-up'], '3', '15-20', '45s'),
            make_group(['Burpee'], '3', '10', '60s'),
        ]
    ))

    # 14. Power & Explosiveness
    workouts.append(make_workout(
        'Power & Explosiveness',
        'Olympic-style power training. Build explosive strength with compound barbell movements.',
        ['power', 'advanced', 'athletic', 'barbell'],
        [
            make_group(['Power Clean'], '5', '3', '2min'),
            make_group(['Barbell Clean and Press'], '4', '3-5', '2min'),
            make_group(['Barbell Thruster'], '3', '6-8', '2min'),
            make_group(['Barbell Jump Squat'], '3', '5', '90s'),
            make_group(['Push-up'], '3', '15-20', '60s'),
        ]
    ))

    # 15. Core & Abs Circuit
    workouts.append(make_workout(
        'Core & Abs Circuit',
        'Complete core training circuit. Targets upper abs, lower abs, and obliques.',
        ['core', 'abs', 'circuit', 'beginner'],
        [
            make_group(['Jackknife Sit-up'], '3', '15-20', '30s'),
            make_group(['Hanging Leg Raise'], '3', '10-12', '45s'),
            make_group(['Russian Twist'], '3', '20', '30s'),
            make_group(['Decline Crunch'], '3', '15-20', '30s'),
            make_group(['Cable Kneeling Crunch'], '3', '12-15', '45s'),
            make_group(['Lying Leg-hip Raise'], '3', '12-15', '30s'),
        ]
    ))

    # 16. Glute Builder
    workouts.append(make_workout(
        'Glute Builder',
        'Posterior chain focused. Glute bridges, hip hinges, and single-leg work for maximal glute activation.',
        ['glutes', 'legs', 'posterior-chain', 'intermediate'],
        [
            make_group(['Barbell Glute Bridge'], '4', '10-12', '90s'),
            make_group(['Barbell Romanian Deadlift'], '3', '8-10', '2min'),
            make_group(['Dumbbell Single Leg Split Squat'], '3', '10', '90s'),
            make_group(['Lever Seated Hip Abduction'], '3', '12-15', '60s'),
            make_group(['Lever Seated Hip Adduction'], '3', '12-15', '60s'),
        ]
    ))

    # 17. Minimalist Full Body A
    workouts.append(make_workout(
        'Minimalist Full Body A',
        'Just 3 compound lifts. Squat, press, pull. Maximum results with minimum time investment.',
        ['full-body', 'minimalist', '3-day', 'strength'],
        [
            make_group(['Barbell Full Squat'], '5', '5', '3min'),
            make_group(['Barbell Bench Press'], '5', '5', '3min'),
            make_group(['Barbell Bent Over Row'], '5', '5', '3min'),
        ]
    ))

    # 18. Minimalist Full Body B
    workouts.append(make_workout(
        'Minimalist Full Body B',
        'Alternate with Full Body A. Deadlift, overhead press, and chin-ups for complete coverage.',
        ['full-body', 'minimalist', '3-day', 'strength'],
        [
            make_group(['Barbell Deadlift'], '3', '5', '3min'),
            make_group(['Cable Shoulder Press'], '5', '5', '3min'),
            make_group(['Chin-up'], '3', 'AMRAP', '2min'),
        ]
    ))

    # 19. Dumbbell Only Home Workout
    workouts.append(make_workout(
        'Dumbbell Only Home Workout',
        'Complete workout using only dumbbells. Great for home gyms or when the gym is crowded.',
        ['dumbbell', 'home', 'beginner', 'full-body'],
        [
            make_group(['Dumbbell Goblet Squat'], '3', '12-15', '90s'),
            make_group(['Dumbbell Bench Press'], '3', '10-12', '90s'),
            make_group(['Dumbbell Bent Over Row'], '3', '10-12', '90s'),
            make_group(['Dumbbell Seated Shoulder Press'], '3', '10-12', '90s'),
            make_group(['Dumbbell Romanian Deadlift'], '3', '10-12', '90s'),
            make_group(['Dumbbell Lateral Raise'], '3', '12-15', '60s'),
        ]
    ))

    # 20. Upper Body Strength
    workouts.append(make_workout(
        'Upper Body Strength',
        'Heavy compound upper body session. Flat and incline pressing paired with rowing variations.',
        ['upper', 'strength', 'intermediate', 'barbell'],
        [
            make_group(['Barbell Bench Press'], '4', '5-6', '3min'),
            make_group(['Barbell Incline Bench Press'], '3', '6-8', '2min'),
            make_group(['Pull-up'], '4', '6-8', '2min'),
            make_group(['Barbell Pendlay Row'], '3', '6-8', '2min'),
            make_group(['Dumbbell Arnold Press'], '3', '8-10', '90s'),
            make_group(['Weighted Three Bench Dips'], '3', '8-10', '90s'),
        ]
    ))

    return workouts


FAKE_CREATORS = [
    'ironmike_lifts', 'sarah_squats', 'coach_dan', 'fitgirl_amy',
    'barbell_brad', 'gym_rat_99', 'liftqueen', 'the_pump_king',
    'natty_nate', 'deadlift_diana', 'muscle_maria', 'bench_boss',
    'cardio_carl', 'power_pete', 'flexy_lexi', 'swole_sam',
    'gains_guru', 'rep_queen', 'iron_will', 'fit_for_life',
]


def seed_public_workouts(dry_run=False):
    """Seed public workouts into Firestore."""
    import random
    from backend.config.firebase_config import get_firebase_app
    from firebase_admin import firestore

    print(f"{'[DRY RUN] ' if dry_run else ''}Seeding public workouts...")

    app = get_firebase_app()
    if not app:
        print("ERROR: Firebase initialization failed. Check .env variables.")
        return

    db = firestore.client(app=app)
    collection = db.collection('public_workouts')

    workouts = build_workouts()
    creators = FAKE_CREATORS[:]
    random.shuffle(creators)
    print(f"Built {len(workouts)} workout templates")

    created = 0
    for i, workout_data in enumerate(workouts, 1):
        doc_id = generate_id('public')
        creator = creators[i % len(creators)]
        fake_uid = f'fake-user-{i:03d}'

        doc = {
            'workout_data': workout_data,
            'creator_id': fake_uid,
            'creator_name': creator,
            'source_workout_id': workout_data['id'],
            'created_at': firestore.SERVER_TIMESTAMP,
            'is_moderated': False,
            'stats': {
                'view_count': random.randint(3, 15),
                'save_count': random.randint(1, 8),
            }
        }

        print(f"  [{i:2d}/{len(workouts)}] {workout_data['name']}"
              f" by @{creator}"
              f" ({len(workout_data['exercise_groups'])} exercises,"
              f" tags: {', '.join(workout_data['tags'])})")

        if not dry_run:
            collection.document(doc_id).set(doc)
            created += 1

    if dry_run:
        print(f"\n[DRY RUN] Would have created {len(workouts)} public workouts.")
    else:
        print(f"\nCreated {created} public workouts in Firestore.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Seed public workouts into Firestore')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing to Firestore')
    args = parser.parse_args()

    seed_public_workouts(dry_run=args.dry_run)
