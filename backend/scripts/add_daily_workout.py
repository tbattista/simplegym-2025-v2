"""
Daily Workout Generator
Generates a random, research-based workout and inserts it into the public_workouts Firestore collection.

Usage:
    python backend/scripts/add_daily_workout.py              # Generate 1 random workout
    python backend/scripts/add_daily_workout.py --count 3    # Generate 3 workouts
    python backend/scripts/add_daily_workout.py --dry-run    # Preview without writing
    python backend/scripts/add_daily_workout.py --focus legs  # Bias toward a theme
"""

import sys
import argparse
import secrets
import random
from pathlib import Path
from datetime import datetime, timezone

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv(project_root / '.env')


# ── Exercise Pool (from exercise-seed-data.js) ──────────────────────────────

EXERCISES = {
    'chest': [
        'Barbell Bench Press', 'Dumbbell Bench Press', 'Barbell Incline Bench Press',
        'Dumbbell Incline Bench Press', 'Dumbbell Fly', 'Dumbbell Incline Fly',
        'Chest Dip', 'Lever Chest Press', 'Barbell Decline Bench Press',
        'Dumbbell Decline Bench Press', 'Machine Inner Chest Press',
        'Close-grip Push-up', 'Push-up', 'Diamond Push-up', 'Decline Push-up',
        'Dumbbell Close-grip Press', 'Smith Bench Press', 'Dumbbell Pullover',
    ],
    'back': [
        'Barbell Bent Over Row', 'Cable Pulldown (Pro Lat Bar)', 'Cable Seated Row',
        'Lever T Bar Row', 'Pull-up', 'Chin-up', 'Barbell Pendlay Row',
        'Barbell Incline Row', 'Lever High Row', 'Dumbbell Bent Over Row',
        'Barbell Deadlift', 'Trap Bar Deadlift', 'Barbell Rack Pull',
        'Reverse Grip Machine Lat Pulldown', 'Rear Pull-up', 'Bench Pull-ups',
    ],
    'shoulders': [
        'Dumbbell Seated Shoulder Press', 'Cable Shoulder Press', 'Dumbbell Lateral Raise',
        'Dumbbell Rear Lateral Raise', 'Dumbbell Front Raise', 'Cable Lateral Raise',
        'Dumbbell Arnold Press', 'Barbell Upright Row', 'Dumbbell Push Press',
        'Lever Military Press', 'Smith Seated Shoulder Press', 'Lever Seated Reverse Fly',
        'Dumbbell Raise',
    ],
    'biceps': [
        'Barbell Curl', 'Dumbbell Hammer Curl', 'Ez Barbell Curl',
        'Dumbbell Incline Curl', 'Dumbbell Concentration Curl', 'Cable Curl',
        'Dumbbell Preacher Curl', 'Dumbbell Alternate Biceps Curl',
        'Barbell Preacher Curl', 'Barbell Reverse Curl',
    ],
    'triceps': [
        'Cable One Arm Tricep Pushdown', 'Cable Rope High Pulley Overhead Tricep Extension',
        'Barbell Close-grip Bench Press', 'Barbell Lying Extension',
        'Dumbbell One Arm Triceps Extension (On Bench)', 'Weighted Three Bench Dips',
        'Lever Seated Dip', 'Cable Rope Incline Tricep Extension', 'Dumbbell Kickback',
        'Dumbbell Lying Extension (Across Face)',
    ],
    'quads': [
        'Barbell Full Squat', 'Barbell Front Squat', 'Sled 45° Leg Press (Back Pov)',
        'Lever Leg Extension', 'Dumbbell Goblet Squat', 'Dumbbell Lunge',
        'Sled Hack Squat', 'Smith Full Squat', 'Barbell Zercher Squat',
        'Dumbbell Squat', 'Dumbbell Single Leg Split Squat', 'Barbell Lunge',
        'Jump Squat', 'Barbell Jump Squat', 'Sissy Squat',
        'Barbell Overhead Squat', 'Suspended Split Squat',
    ],
    'hamstrings': [
        'Barbell Romanian Deadlift', 'Lever Seated Leg Curl', 'Lever Lying Leg Curl',
        'Dumbbell Romanian Deadlift', 'Barbell Good Morning', 'Standing Single Leg Curl',
        'Cable Pull Through (With Rope)', 'Band Stiff Leg Deadlift',
    ],
    'glutes': [
        'Barbell Glute Bridge', 'Lever Seated Hip Abduction', 'Lever Seated Hip Adduction',
        'Barbell Sumo Deadlift', 'Barbell Single Leg Split Squat',
    ],
    'calves': [
        'Standing Calf Raise (On a Staircase)', 'Lever Seated Calf Raise',
        'Barbell Seated Calf Raise', 'Sled Forward Angled Calf Raise',
    ],
    'core': [
        'Jackknife Sit-up', 'Hanging Leg Raise', 'Russian Twist', 'Decline Crunch',
        'Cable Kneeling Crunch', 'Lying Leg-hip Raise', 'Crunch (Hands Overhead)',
    ],
    'power': [
        'Power Clean', 'Barbell Clean and Press', 'Barbell Thruster',
        'Barbell Jump Squat', 'Dumbbell One Arm Snatch', 'Barbell One Arm Snatch',
        'Kettlebell One Arm Clean and Jerk', 'Kettlebell Hang Clean',
    ],
    'bodyweight': [
        'Push-up', 'Pull-up', 'Chin-up', 'Diamond Push-up', 'Decline Push-up',
        'Incline Push-up', 'Close-grip Push-up', 'Chest Dip', 'Burpee',
        'Jump Squat', 'Jackknife Sit-up', 'Hanging Leg Raise', 'Muscle Up',
        'Handstand', 'Elbow Lift - Reverse Push-up',
    ],
}

# ── Workout Templates ───────────────────────────────────────────────────────

WORKOUT_TEMPLATES = [
    # Push variations
    {
        'name_pool': ['Chest & Shoulder Blaster', 'Push Day Power', 'Upper Push Focus',
                       'Pressing Powerhouse', 'Horizontal Push Builder', 'Bench & Beyond'],
        'description_pool': [
            'Heavy pressing paired with shoulder work and tricep finishers.',
            'Compound pushing movements with targeted isolation accessories.',
            'Build a bigger chest and shoulders with this push-focused session.',
        ],
        'tag_pool': ['push', 'chest', 'shoulders', 'triceps', 'intermediate', 'hypertrophy', 'strength'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'chest', 'sets': '4', 'reps': '6-8', 'rest': '2min'},
            {'muscles': 'chest', 'sets': '3', 'reps': '8-12', 'rest': '90s'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '10-12', 'rest': '90s'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '12-15', 'rest': '60s'},
            {'muscles': 'triceps', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
        ],
    },
    # Pull variations
    {
        'name_pool': ['Back Attack', 'Pull Day Pump', 'Vertical & Horizontal Pull',
                       'Row & Grow', 'Back Width Builder', 'Lats & Guns'],
        'description_pool': [
            'Complete back development with pulling from multiple angles.',
            'Heavy rows and pulldowns for a wider, thicker back.',
            'Back and biceps session with compound-first ordering.',
        ],
        'tag_pool': ['pull', 'back', 'biceps', 'intermediate', 'hypertrophy', 'strength', 'lats'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'back', 'sets': '4', 'reps': '6-8', 'rest': '2min'},
            {'muscles': 'back', 'sets': '3', 'reps': '8-12', 'rest': '90s'},
            {'muscles': 'back', 'sets': '3', 'reps': '10-12', 'rest': '90s'},
            {'muscles': 'biceps', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'biceps', 'sets': '3', 'reps': '12-15', 'rest': '45s'},
        ],
    },
    # Leg variations
    {
        'name_pool': ['Leg Day Grind', 'Quad Dominant Leg Day', 'Lower Body Strength',
                       'Squat & Press Legs', 'Wheels of Steel', 'Heavy Leg Session'],
        'description_pool': [
            'Squat-focused leg session with quad and hamstring balance.',
            'Build powerful legs with compound lifts and isolation finishers.',
            'Heavy lower body training for strength and size.',
        ],
        'tag_pool': ['legs', 'quads', 'hamstrings', 'strength', 'intermediate', 'lower-body', 'hypertrophy'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'quads', 'sets': '4', 'reps': '5-8', 'rest': '3min'},
            {'muscles': 'hamstrings', 'sets': '3', 'reps': '8-10', 'rest': '2min'},
            {'muscles': 'quads', 'sets': '3', 'reps': '10-12', 'rest': '90s'},
            {'muscles': 'quads', 'sets': '3', 'reps': '12-15', 'rest': '60s'},
            {'muscles': 'hamstrings', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
        ],
    },
    # Full body
    {
        'name_pool': ['Full Body Blitz', 'Total Body Builder', 'Full Body Compound Focus',
                       'Head-to-Toe Session', 'Complete Body Workout', 'All-in-One Session'],
        'description_pool': [
            'Hit every major muscle group in one efficient session.',
            'Full body training with compound movements for maximum efficiency.',
            'A balanced session covering upper and lower body in one workout.',
        ],
        'tag_pool': ['full-body', 'compound', 'beginner', 'intermediate', 'efficient', 'strength'],
        'tag_count': (3, 4),
        'structure': [
            {'muscles': 'quads', 'sets': '4', 'reps': '6-8', 'rest': '2min'},
            {'muscles': 'chest', 'sets': '3', 'reps': '8-10', 'rest': '90s'},
            {'muscles': 'back', 'sets': '3', 'reps': '8-10', 'rest': '90s'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'hamstrings', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
        ],
    },
    # Upper body
    {
        'name_pool': ['Upper Body Sculptor', 'Push-Pull Upper Day', 'Upper Strength Session',
                       'Chest Back & Arms', 'Upper Body Volume', 'Complete Upper Day'],
        'description_pool': [
            'Balanced upper body session hitting chest, back, and arms.',
            'Push and pull in one session for upper body development.',
            'Heavy upper body compounds with isolation accessories.',
        ],
        'tag_pool': ['upper', 'chest', 'back', 'arms', 'intermediate', 'upper-lower', 'hypertrophy'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'chest', 'sets': '4', 'reps': '6-8', 'rest': '2min'},
            {'muscles': 'back', 'sets': '4', 'reps': '6-8', 'rest': '2min'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '10-12', 'rest': '90s'},
            {'muscles': 'biceps', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'triceps', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
        ],
    },
    # Posterior chain
    {
        'name_pool': ['Posterior Chain Power', 'Backside Builder', 'Hinge & Pull',
                       'Deadlift Day', 'Hip Hinge Focus', 'Glute & Ham Session'],
        'description_pool': [
            'Deadlift variations and hip hinge work for a powerful posterior chain.',
            'Build your backside with hinge-dominant movements.',
            'Glutes, hamstrings, and lower back in one focused session.',
        ],
        'tag_pool': ['posterior-chain', 'glutes', 'hamstrings', 'strength', 'intermediate', 'deadlift'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'back', 'sets': '4', 'reps': '5', 'rest': '3min'},  # deadlift variant
            {'muscles': 'hamstrings', 'sets': '3', 'reps': '8-10', 'rest': '2min'},
            {'muscles': 'glutes', 'sets': '3', 'reps': '10-12', 'rest': '90s'},
            {'muscles': 'hamstrings', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'calves', 'sets': '4', 'reps': '15-20', 'rest': '60s'},
        ],
    },
    # Arms focused
    {
        'name_pool': ['Gun Show', 'Arm Pump Session', 'Bi & Tri Blast',
                       'Sleeve Stretcher', 'Arm Hypertrophy Day', 'Curl & Press Fest'],
        'description_pool': [
            'Dedicated arm session for maximum bicep and tricep development.',
            'Alternating biceps and triceps for a massive pump.',
            'High volume arm work with varied grips and angles.',
        ],
        'tag_pool': ['arms', 'biceps', 'triceps', 'hypertrophy', 'intermediate', 'isolation'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'biceps', 'sets': '3', 'reps': '8-10', 'rest': '60s'},
            {'muscles': 'triceps', 'sets': '3', 'reps': '8-10', 'rest': '60s'},
            {'muscles': 'biceps', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'triceps', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'biceps', 'sets': '2', 'reps': '12-15', 'rest': '45s'},
            {'muscles': 'triceps', 'sets': '2', 'reps': '12-15', 'rest': '45s'},
        ],
    },
    # Power/athletic
    {
        'name_pool': ['Explosive Power Session', 'Athletic Performance', 'Power Clean Complex',
                       'Speed & Strength', 'Olympic Lift Primer', 'Dynamic Power Day'],
        'description_pool': [
            'Build explosive power with Olympic lifting derivatives.',
            'Athletic training focused on speed and power development.',
            'Barbell power movements for sport-specific strength.',
        ],
        'tag_pool': ['power', 'athletic', 'advanced', 'explosive', 'olympic', 'barbell'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'power', 'sets': '5', 'reps': '3', 'rest': '2min'},
            {'muscles': 'power', 'sets': '4', 'reps': '3-5', 'rest': '2min'},
            {'muscles': 'quads', 'sets': '3', 'reps': '5-6', 'rest': '2min'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '6-8', 'rest': '90s'},
        ],
    },
    # Core focused
    {
        'name_pool': ['Core Crusher', 'Ab Annihilator', 'Midsection Madness',
                       'Steel Core Circuit', 'Six Pack Session', 'Core Strength Builder'],
        'description_pool': [
            'Target every angle of the core with this focused circuit.',
            'Upper abs, lower abs, and obliques in one complete session.',
            'Build a strong, stable core with these proven exercises.',
        ],
        'tag_pool': ['core', 'abs', 'circuit', 'beginner', 'bodyweight', 'no-equipment'],
        'tag_count': (3, 4),
        'structure': [
            {'muscles': 'core', 'sets': '3', 'reps': '15-20', 'rest': '30s'},
            {'muscles': 'core', 'sets': '3', 'reps': '10-12', 'rest': '45s'},
            {'muscles': 'core', 'sets': '3', 'reps': '20', 'rest': '30s'},
            {'muscles': 'core', 'sets': '3', 'reps': '15-20', 'rest': '30s'},
            {'muscles': 'core', 'sets': '3', 'reps': '12-15', 'rest': '45s'},
        ],
    },
    # Bodyweight
    {
        'name_pool': ['Bodyweight Blitz', 'No-Gym No-Problem', 'Calisthenic Strength',
                       'Park Workout', 'Home Body Burner', 'Zero Equipment Session'],
        'description_pool': [
            'Complete workout using only your bodyweight. No equipment needed.',
            'Build strength and endurance without any equipment.',
            'Calisthenic movements for functional fitness anywhere.',
        ],
        'tag_pool': ['bodyweight', 'home', 'no-equipment', 'beginner', 'calisthenics', 'functional'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'bodyweight', 'sets': '3', 'reps': '10-15', 'rest': '60s'},
            {'muscles': 'bodyweight', 'sets': '3', 'reps': 'AMRAP', 'rest': '90s'},
            {'muscles': 'bodyweight', 'sets': '3', 'reps': '15-20', 'rest': '60s'},
            {'muscles': 'bodyweight', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'bodyweight', 'sets': '3', 'reps': '10', 'rest': '60s'},
        ],
    },
    # Shoulder focused
    {
        'name_pool': ['Boulder Shoulders', 'Delt Destroyer', '3D Shoulder Session',
                       'Cannonball Delts', 'Shoulder Hypertrophy Day', 'Press & Raise'],
        'description_pool': [
            'All three delt heads trained for complete shoulder development.',
            'Heavy pressing paired with lateral and rear delt isolation.',
            'Build capped shoulders with this comprehensive delt session.',
        ],
        'tag_pool': ['shoulders', 'delts', 'hypertrophy', 'intermediate', 'isolation'],
        'tag_count': (3, 4),
        'structure': [
            {'muscles': 'shoulders', 'sets': '4', 'reps': '6-8', 'rest': '2min'},
            {'muscles': 'shoulders', 'sets': '4', 'reps': '12-15', 'rest': '60s'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '12-15', 'rest': '60s'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '12-15', 'rest': '60s'},
            {'muscles': 'shoulders', 'sets': '3', 'reps': '15-20', 'rest': '45s'},
        ],
    },
    # Chest & back superset style
    {
        'name_pool': ['Chest & Back Superset', 'Push-Pull Combo', 'Antagonist Training',
                       'Chest & Back Blitz', 'Upper Body Antagonist Day'],
        'description_pool': [
            'Pair chest and back exercises for efficient antagonist training.',
            'Push-pull superset approach for upper body balance.',
            'Chest pressing paired with back pulling for maximum efficiency.',
        ],
        'tag_pool': ['chest', 'back', 'superset', 'intermediate', 'upper', 'hypertrophy'],
        'tag_count': (3, 5),
        'structure': [
            {'muscles': 'chest', 'sets': '4', 'reps': '8-10', 'rest': '90s'},
            {'muscles': 'back', 'sets': '4', 'reps': '8-10', 'rest': '90s'},
            {'muscles': 'chest', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'back', 'sets': '3', 'reps': '10-12', 'rest': '60s'},
            {'muscles': 'core', 'sets': '3', 'reps': '15-20', 'rest': '45s'},
        ],
    },
]

FAKE_CREATORS = [
    'ironmike_lifts', 'sarah_squats', 'coach_dan', 'fitgirl_amy',
    'barbell_brad', 'gym_rat_99', 'liftqueen', 'the_pump_king',
    'natty_nate', 'deadlift_diana', 'muscle_maria', 'bench_boss',
    'cardio_carl', 'power_pete', 'flexy_lexi', 'swole_sam',
    'gains_guru', 'rep_queen', 'iron_will', 'fit_for_life',
    'heavy_hitter', 'squat_queen', 'cable_king', 'press_pro',
    'lift_life_daily', 'set_and_rep', 'pump_palace', 'the_bar_bender',
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def generate_id(prefix="workout"):
    return f"{prefix}-{secrets.token_hex(4)}"


def make_group(exercise_name, sets, reps, rest):
    return {
        'group_id': generate_id('group'),
        'exercises': {'a': exercise_name},
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


def pick_exercise(muscle_group, used_exercises):
    """Pick a random exercise from the muscle group, avoiding duplicates."""
    pool = EXERCISES.get(muscle_group, EXERCISES['chest'])
    available = [e for e in pool if e not in used_exercises]
    if not available:
        available = pool  # fallback if all used
    choice = random.choice(available)
    used_exercises.add(choice)
    return choice


def generate_workout(template=None, focus=None):
    """Generate a single random workout from a template."""
    if template is None:
        if focus:
            # Try to find a template matching the focus
            focus_lower = focus.lower()
            matching = [t for t in WORKOUT_TEMPLATES
                       if any(focus_lower in tag for tag in t['tag_pool'])]
            if matching:
                template = random.choice(matching)
            else:
                template = random.choice(WORKOUT_TEMPLATES)
        else:
            template = random.choice(WORKOUT_TEMPLATES)

    name = random.choice(template['name_pool'])
    description = random.choice(template['description_pool'])
    tag_count = random.randint(*template['tag_count'])
    tags = random.sample(template['tag_pool'], min(tag_count, len(template['tag_pool'])))

    used_exercises = set()
    groups = []
    for slot in template['structure']:
        exercise = pick_exercise(slot['muscles'], used_exercises)
        groups.append(make_group(exercise, slot['sets'], slot['reps'], slot['rest']))

    workout_id = generate_id('workout')
    now = datetime.now(timezone.utc).isoformat()

    workout_data = {
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

    creator = random.choice(FAKE_CREATORS)

    return {
        'workout_data': workout_data,
        'creator_id': f'fake-user-{secrets.token_hex(3)}',
        'creator_name': creator,
        'source_workout_id': workout_id,
        'is_moderated': False,
        'stats': {
            'view_count': random.randint(5, 20),
            'save_count': random.randint(2, 12),
        }
    }


def main():
    parser = argparse.ArgumentParser(description='Generate and insert daily workout(s)')
    parser.add_argument('--count', type=int, default=1, help='Number of workouts to generate')
    parser.add_argument('--focus', type=str, default=None, help='Workout focus/theme (e.g., legs, chest, power)')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing to Firestore')
    args = parser.parse_args()

    from backend.config.firebase_config import get_firebase_app
    from firebase_admin import firestore

    app = get_firebase_app()
    if not app:
        print("ERROR: Firebase initialization failed. Check .env variables.")
        sys.exit(1)

    db = firestore.client(app=app)
    collection = db.collection('public_workouts')

    for i in range(args.count):
        workout_doc = generate_workout(focus=args.focus)
        doc_id = generate_id('public')
        workout_doc['created_at'] = firestore.SERVER_TIMESTAMP

        w = workout_doc['workout_data']
        print(f"[{i+1}/{args.count}] {w['name']} by @{workout_doc['creator_name']}")
        print(f"  Exercises: {len(w['exercise_groups'])} — Tags: {', '.join(w['tags'])}")
        for g in w['exercise_groups']:
            print(f"    • {g['exercises']['a']} ({g['sets']}×{g['reps']}, {g['rest']})")

        if not args.dry_run:
            collection.document(doc_id).set(workout_doc)
            print(f"  => Saved as {doc_id}")
        else:
            print(f"  => [DRY RUN] Would save as {doc_id}")

        print()

    status = "previewed" if args.dry_run else "created"
    print(f"Done! {args.count} workout(s) {status}.")


if __name__ == '__main__':
    main()
