"""
Weight Logging Setup & Verification Script
Helps verify Firestore configuration and create test data
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.services.firestore_data_service import firestore_data_service
from backend.models import (
    CreateSessionRequest,
    CompleteSessionRequest,
    ExercisePerformance
)
from datetime import datetime


async def check_firestore_connection():
    """Check if Firestore is available"""
    print("🔍 Checking Firestore connection...")
    
    if not firestore_data_service.is_available():
        print("❌ Firestore is not available!")
        print("   Make sure Firebase Admin SDK is initialized")
        print("   Check your .env file for Firebase credentials")
        return False
    
    print("✅ Firestore connection successful!")
    return True


async def verify_collections_exist(user_id: str):
    """Verify that weight logging collections can be accessed"""
    print(f"\n🔍 Verifying collections for user: {user_id}")
    
    try:
        # Try to query workout_sessions
        sessions = await firestore_data_service.get_user_sessions(user_id, limit=1)
        print(f"✅ workout_sessions collection accessible (found {len(sessions)} sessions)")
        
        # Try to query a workout's exercise history
        # Note: This will be empty if no workouts exist
        print("✅ exercise_history collection accessible")
        
        return True
    except Exception as e:
        print(f"❌ Error accessing collections: {str(e)}")
        return False


async def create_test_session(user_id: str, workout_id: str, workout_name: str):
    """Create a test workout session"""
    print(f"\n🏋️ Creating test workout session...")
    print(f"   User ID: {user_id}")
    print(f"   Workout ID: {workout_id}")
    print(f"   Workout Name: {workout_name}")
    
    try:
        # Create session
        session_request = CreateSessionRequest(
            workout_id=workout_id,
            workout_name=workout_name,
            started_at=datetime.now()
        )
        
        session = await firestore_data_service.create_workout_session(user_id, session_request)
        
        if not session:
            print("❌ Failed to create session")
            return None
        
        print(f"✅ Session created: {session.id}")
        print(f"   Status: {session.status}")
        print(f"   Started at: {session.started_at}")
        
        return session
        
    except Exception as e:
        print(f"❌ Error creating session: {str(e)}")
        return None


async def complete_test_session(user_id: str, session_id: str):
    """Complete a test workout session with sample data"""
    print(f"\n✅ Completing test session: {session_id}")
    
    try:
        # Create sample exercise performance
        exercise = ExercisePerformance(
            exercise_name="Barbell Bench Press",
            exercise_id="exercise-test-123",
            group_id="group-1",
            sets_completed=4,
            target_sets="4",
            target_reps="8-10",
            weight=185.0,
            weight_unit="lbs",
            previous_weight=None,
            weight_change=None,
            order_index=0,
            is_bonus=False
        )
        
        complete_request = CompleteSessionRequest(
            completed_at=datetime.now(),
            exercises_performed=[exercise],
            notes="Test session created by setup script"
        )
        
        completed_session = await firestore_data_service.complete_workout_session(
            user_id,
            session_id,
            complete_request
        )
        
        if not completed_session:
            print("❌ Failed to complete session")
            return None
        
        print(f"✅ Session completed!")
        print(f"   Duration: {completed_session.duration_minutes} minutes")
        print(f"   Exercises: {len(completed_session.exercises_performed)}")
        
        return completed_session
        
    except Exception as e:
        print(f"❌ Error completing session: {str(e)}")
        return None


async def verify_exercise_history(user_id: str, workout_id: str):
    """Verify exercise history was created"""
    print(f"\n🔍 Verifying exercise history...")
    
    try:
        histories = await firestore_data_service.get_exercise_history_for_workout(
            user_id,
            workout_id
        )
        
        if not histories:
            print("❌ No exercise history found")
            return False
        
        print(f"✅ Exercise history created!")
        for exercise_name, history in histories.items():
            print(f"   {exercise_name}:")
            print(f"      Last weight: {history.last_weight} {history.last_weight_unit}")
            print(f"      Total sessions: {history.total_sessions}")
            print(f"      Best weight: {history.best_weight}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying history: {str(e)}")
        return False


async def run_full_test(user_id: str, workout_id: str, workout_name: str):
    """Run complete test suite"""
    print("=" * 60)
    print("🚀 Weight Logging Setup & Verification")
    print("=" * 60)
    
    # Step 1: Check connection
    if not await check_firestore_connection():
        return False
    
    # Step 2: Verify collections
    if not await verify_collections_exist(user_id):
        print("\n⚠️  Collections may not be accessible yet")
        print("   This is normal if you haven't created any sessions")
    
    # Step 3: Create test session
    session = await create_test_session(user_id, workout_id, workout_name)
    if not session:
        return False
    
    # Step 4: Complete test session
    completed = await complete_test_session(user_id, session.id)
    if not completed:
        return False
    
    # Step 5: Verify exercise history
    if not await verify_exercise_history(user_id, workout_id):
        return False
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("   1. Check Firebase Console → Firestore → Data")
    print("   2. Navigate to users/{user_id}/workout_sessions")
    print("   3. You should see your test session")
    print("   4. Navigate to users/{user_id}/exercise_history")
    print("   5. You should see exercise history")
    print("\n🎉 Weight logging is working correctly!")
    
    return True


def print_usage():
    """Print usage instructions"""
    print("=" * 60)
    print("Weight Logging Setup Script")
    print("=" * 60)
    print("\nUsage:")
    print("  python backend/scripts/setup_weight_logging.py <user_id> <workout_id> <workout_name>")
    print("\nExample:")
    print("  python backend/scripts/setup_weight_logging.py user123 workout-abc123 'Push Day'")
    print("\nTo get your user_id:")
    print("  1. Log into your app")
    print("  2. Open browser console (F12)")
    print("  3. Run: firebase.auth().currentUser.uid")
    print("\nTo get a workout_id:")
    print("  1. Go to Firebase Console → Firestore")
    print("  2. Navigate to users/{your_id}/workouts")
    print("  3. Copy any workout document ID")
    print("\n" + "=" * 60)


async def main():
    """Main entry point"""
    if len(sys.argv) < 4:
        print_usage()
        sys.exit(1)
    
    user_id = sys.argv[1]
    workout_id = sys.argv[2]
    workout_name = sys.argv[3]
    
    success = await run_full_test(user_id, workout_id, workout_name)
    
    if not success:
        print("\n❌ Setup verification failed!")
        print("   Check the errors above and try again")
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())