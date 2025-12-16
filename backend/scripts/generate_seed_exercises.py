#!/usr/bin/env python3
"""
Generate seed exercise data for instant loading in the frontend.
This creates a JavaScript file with ~200 most important exercises.
"""

import csv
import json
import os
from datetime import datetime

def generate_seed_exercises():
    """Generate seed data from Exercises_Classified.csv"""
    
    csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Exercises_Classified.csv')
    output_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                               'frontend', 'assets', 'js', 'data', 'exercise-seed-data.js')
    
    exercises = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            exercise = {
                'id': f'seed-{idx:04d}',
                'name': row.get('Exercise', ''),
                'targetMuscleGroup': row.get('Target Muscle Group', ''),
                'primaryEquipment': row.get('Primary Equipment', ''),
                'difficultyLevel': row.get('Difficulty Level', ''),
                'exerciseTier': int(row.get('exerciseTier', 2)),
                'isFoundational': row.get('isFoundational', 'False') == 'True',
                'foundationalScore': int(row.get('foundationalScore', 50)),
                'mechanics': row.get('Mechanics', ''),
                'bodyRegion': row.get('Body Region', ''),
                'forceType': row.get('Force Type', ''),
                'movementPattern1': row.get('Movement Pattern #1', ''),
                'classificationTags': row.get('classificationTags', '').split(',') if row.get('classificationTags') else []
            }
            exercises.append(exercise)
    
    # Sort by foundationalScore descending, take top 200
    exercises.sort(key=lambda x: (x['foundationalScore'], x['exerciseTier'] == 1), reverse=True)
    seed_exercises = exercises[:200]
    
    # Create output directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Generate JavaScript file
    js_content = f'''// Auto-generated seed exercises for instant loading
// Generated: {datetime.now().isoformat()}
// Source: Exercises_Classified.csv
// Contains {len(seed_exercises)} exercises sorted by foundationalScore

window.EXERCISE_SEED_DATA = {json.dumps(seed_exercises, indent=2)};

// Quick stats for debugging
window.EXERCISE_SEED_STATS = {{
  count: {len(seed_exercises)},
  generated: "{datetime.now().isoformat()}",
  tier1Count: {sum(1 for e in seed_exercises if e['exerciseTier'] == 1)},
  foundationalCount: {sum(1 for e in seed_exercises if e['isFoundational'])}
}};
'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Generated seed data with {len(seed_exercises)} exercises")
    print(f"Output: {output_path}")
    print(f"Tier 1 exercises: {sum(1 for e in seed_exercises if e['exerciseTier'] == 1)}")
    print(f"Foundational exercises: {sum(1 for e in seed_exercises if e['isFoundational'])}")

if __name__ == '__main__':
    generate_seed_exercises()