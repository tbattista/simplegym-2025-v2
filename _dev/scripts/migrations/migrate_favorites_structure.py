"""
Migration Script: Fix Favorites Structure
Converts dotted field path structure to proper nested map structure
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore


def migrate_user_favorites(db, user_id):
    """Migrate a single user's favorites from dotted paths to nested structure"""
    doc_ref = db.collection('users').document(user_id).collection('data').document('favorites')
    doc = doc_ref.get()
    
    if not doc.exists:
        print(f"  ℹ️  No favorites document for user {user_id}")
        return False
    
    data = doc.to_dict()
    
    # Check if already using nested structure
    if 'exercises' in data and isinstance(data.get('exercises'), dict):
        nested_count = len(data['exercises'])
        if nested_count > 0:
            print(f"  ✅ Already using nested structure ({nested_count} exercises)")
            return False
    
    # Find all dotted field paths
    exercises_to_migrate = {}
    for key, value in data.items():
        if key.startswith('exercises.'):
            ex_id = key.replace('exercises.', '')
            exercises_to_migrate[ex_id] = value
    
    if not exercises_to_migrate:
        print(f"  ℹ️  No dotted field paths found")
        return False
    
    print(f"  🔄 Migrating {len(exercises_to_migrate)} exercises from dotted paths to nested structure")
    
    # Create new nested structure
    new_exercises = {}
    for ex_id, ex_data in exercises_to_migrate.items():
        new_exercises[ex_id] = ex_data
    
    # Step 1: Add the nested exercises map
    doc_ref.update({'exercises': new_exercises})
    print(f"  ✅ Created nested exercises map")
    
    # Step 2: Delete old dotted field paths
    delete_updates = {}
    for key in exercises_to_migrate.keys():
        delete_updates[f'exercises.{key}'] = firestore.DELETE_FIELD
    
    doc_ref.update(delete_updates)
    print(f"  ✅ Removed old dotted field paths")
    print(f"  ✅ Migration complete for user {user_id}")
    return True


def main():
    """Main migration function"""
    print("="*80)
    print("FAVORITES STRUCTURE MIGRATION")
    print("="*80)
    
    # Initialize Firebase
    app = get_firebase_app()
    if not app:
        print("❌ Failed to initialize Firebase")
        return
    
    db = firestore.client(app=app)
    print("✅ Connected to Firestore\n")
    
    # Get all users - need to check both top-level users and look for data subcollections
    users_ref = db.collection('users')
    users = list(users_ref.stream())
    
    print(f"📊 Found {len(users)} user documents\n")
    
    # If no top-level users, check for users with data subcollections
    if len(users) == 0:
        print("ℹ️  No top-level user documents found")
        print("🔍 Checking for user IDs from other collections...\n")
        
        # Try to find user IDs from programs or workouts collections
        user_ids = set()
        
        # Check programs collection
        programs_ref = db.collection('programs')
        for prog in programs_ref.limit(100).stream():
            prog_data = prog.to_dict()
            if 'user_id' in prog_data:
                user_ids.add(prog_data['user_id'])
        
        # Check workouts collection
        workouts_ref = db.collection('workouts')
        for workout in workouts_ref.limit(100).stream():
            workout_data = workout.to_dict()
            if 'user_id' in workout_data:
                user_ids.add(workout_data['user_id'])
        
        print(f"📊 Found {len(user_ids)} unique user IDs from other collections\n")
        users = [type('obj', (object,), {'id': uid}) for uid in user_ids]
    
    migrated_count = 0
    for user_doc in users:
        user_id = user_doc.id
        print(f"Processing user: {user_id}")
        
        if migrate_user_favorites(db, user_id):
            migrated_count += 1
    
    print("\n" + "="*80)
    print(f"✅ Migration complete!")
    print(f"   - Total users processed: {len(users)}")
    print(f"   - Users migrated: {migrated_count}")
    print(f"   - Users skipped: {len(users) - migrated_count}")
    print("="*80)


if __name__ == "__main__":
    main()