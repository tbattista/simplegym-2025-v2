"""
Direct User Data Pull Script
Pulls specific user data directly by ID
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore

def pull_user_data(user_id: str):
    """Pull all data for a specific user"""
    print(f"\n{'='*80}")
    print(f"PULLING DATA FOR USER: {user_id}")
    print(f"{'='*80}\n")
    
    app = get_firebase_app()
    if not app:
        print("❌ Failed to initialize Firebase")
        return None
    
    db = firestore.client(app=app)
    
    user_data = {
        "user_id": user_id,
        "pulled_at": datetime.now().isoformat(),
        "user_document": None,
        "subcollections": {}
    }
    
    # Get user document
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            print(f"✅ Found user document")
            user_data["user_document"] = user_doc.to_dict()
        else:
            print(f"⚠️  User document does not exist (this is normal - user data is in subcollections)")
    except Exception as e:
        print(f"❌ Error getting user document: {e}")
    
    # Get all subcollections
    subcollections = ['workouts', 'programs', 'custom_exercises', 'data', 
                     'workout_sessions', 'exercise_history']
    
    for subcoll_name in subcollections:
        print(f"\n📂 Checking {subcoll_name}...")
        try:
            subcoll_ref = user_ref.collection(subcoll_name)
            docs = list(subcoll_ref.stream())
            
            user_data["subcollections"][subcoll_name] = []
            
            for doc in docs:
                doc_data = doc.to_dict()
                user_data["subcollections"][subcoll_name].append({
                    "id": doc.id,
                    "data": serialize_data(doc_data)
                })
            
            print(f"  ✅ Found {len(docs)} documents in {subcoll_name}")
            
        except Exception as e:
            print(f"  ❌ Error reading {subcoll_name}: {e}")
            user_data["subcollections"][subcoll_name] = {"error": str(e)}
    
    return user_data

def serialize_data(data):
    """Serialize Firestore data to JSON-compatible format"""
    if data is None:
        return None
    elif isinstance(data, dict):
        return {k: serialize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [serialize_data(item) for item in data]
    elif hasattr(data, 'isoformat'):  # datetime objects
        return data.isoformat()
    else:
        return data

def list_all_users():
    """List all user IDs in the database"""
    print(f"\n{'='*80}")
    print(f"LISTING ALL USERS")
    print(f"{'='*80}\n")
    
    app = get_firebase_app()
    if not app:
        print("❌ Failed to initialize Firebase")
        return []
    
    db = firestore.client(app=app)
    
    try:
        users_ref = db.collection('users')
        
        # Try to list all documents
        print("Attempting to list all user documents...")
        users = list(users_ref.list_documents())
        
        user_ids = [user.id for user in users]
        
        print(f"\n✅ Found {len(user_ids)} users:")
        for uid in user_ids:
            print(f"  - {uid}")
        
        return user_ids
        
    except Exception as e:
        print(f"❌ Error listing users: {e}")
        return []

def main():
    """Main function"""
    print("\n" + "="*80)
    print("FIRESTORE USER DATA PULL")
    print("="*80)
    
    # First, list all users
    user_ids = list_all_users()
    
    if not user_ids:
        print("\n⚠️  No users found. Trying with known user ID from screenshot...")
        user_ids = ["mnxaBMMr5NMRFAkyINr9Q4QRo7j2"]
    
    # Pull data for each user
    all_user_data = []
    for user_id in user_ids:
        user_data = pull_user_data(user_id)
        if user_data:
            all_user_data.append(user_data)
    
    # Save results
    output_dir = Path(__file__).parent / "analysis_results"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / "user_data_complete.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_user_data, f, indent=2, default=str)
    
    print(f"\n{'='*80}")
    print(f"✅ DATA PULL COMPLETE")
    print(f"{'='*80}")
    print(f"\nSaved to: {output_file}")
    print(f"Total users pulled: {len(all_user_data)}")
    
    # Print summary
    for user_data in all_user_data:
        print(f"\n📊 User: {user_data['user_id']}")
        for subcoll, docs in user_data['subcollections'].items():
            if isinstance(docs, list):
                print(f"  - {subcoll}: {len(docs)} documents")
            else:
                print(f"  - {subcoll}: {docs}")

if __name__ == "__main__":
    main()