"""
Test script to verify custom exercises can be fetched from Firestore
Run: python scripts/test_custom_exercises.py
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

def test_firestore_direct():
    """Test direct Firestore access to custom exercises"""
    print("\n" + "="*60)
    print("TEST 1: Direct Firestore Query")
    print("="*60)

    try:
        from firebase_admin import firestore
        from backend.config.firebase_config import get_firebase_app

        app = get_firebase_app()
        if not app:
            print("[FAIL] Firebase app not initialized")
            return False

        db = firestore.client(app=app)
        print("[OK] Connected to Firestore")

        # List all users with custom exercises
        users_ref = db.collection('users')
        users = list(users_ref.stream())
        print(f"\n[INFO] Found {len(users)} users in database")

        for user_doc in users:
            user_id = user_doc.id
            print(f"\n[USER] {user_id}")

            # Check for custom_exercises subcollection
            custom_ref = db.collection('users').document(user_id).collection('custom_exercises')
            custom_exercises = list(custom_ref.stream())

            if custom_exercises:
                print(f"   [OK] Found {len(custom_exercises)} custom exercises:")
                for ex in custom_exercises[:5]:  # Show first 5
                    data = ex.to_dict()
                    print(f"      - {data.get('name', 'Unknown')} (id: {ex.id})")
                if len(custom_exercises) > 5:
                    print(f"      ... and {len(custom_exercises) - 5} more")
            else:
                print("   [WARN] No custom exercises found")

        return True

    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_exercise_service():
    """Test the ExerciseService class"""
    print("\n" + "="*60)
    print("TEST 2: ExerciseService.get_user_custom_exercises()")
    print("="*60)

    try:
        from backend.services.exercise_service import exercise_service

        if not exercise_service.is_available():
            print("[FAIL] Exercise service not available")
            return False

        print("[OK] Exercise service initialized")

        # Get a user ID from Firestore
        from firebase_admin import firestore
        from backend.config.firebase_config import get_firebase_app

        app = get_firebase_app()
        db = firestore.client(app=app)

        users = list(db.collection('users').stream())
        if not users:
            print("[WARN] No users found to test with")
            return False

        # Test with first user that has custom exercises
        for user_doc in users:
            user_id = user_doc.id
            exercises = exercise_service.get_user_custom_exercises(user_id)

            if exercises:
                print(f"\n[OK] User {user_id}: Found {len(exercises)} custom exercises")
                for ex in exercises[:3]:
                    print(f"   - {ex.name} (id: {ex.id})")
                return True

        print("[WARN] No users with custom exercises found")
        return False

    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_specific_user(user_id: str):
    """Test fetching custom exercises for a specific user"""
    print("\n" + "="*60)
    print(f"TEST 3: Specific User - {user_id}")
    print("="*60)

    try:
        from backend.services.exercise_service import exercise_service

        if not exercise_service.is_available():
            print("[FAIL] Exercise service not available")
            return False

        exercises = exercise_service.get_user_custom_exercises(user_id)

        print(f"\n[INFO] Results for user {user_id}:")
        print(f"   Total custom exercises: {len(exercises)}")

        if exercises:
            print("\n   Exercises:")
            for ex in exercises:
                print(f"   - {ex.name}")
                print(f"     ID: {ex.id}")
                print(f"     Muscle Group: {ex.targetMuscleGroup}")
                print(f"     Equipment: {ex.primaryEquipment}")
                print()
        else:
            print("   [WARN] No custom exercises found for this user")

        return len(exercises) > 0

    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("\n[TEST] Custom Exercises Test Script")
    print("====================================")

    # Run tests
    test1_passed = test_firestore_direct()
    test2_passed = test_exercise_service()

    # Test specific user from screenshot
    specific_user_id = "mnxaBMMr5NMRFAkyINr9O4QRo7j2"
    test3_passed = test_specific_user(specific_user_id)

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Test 1 (Direct Firestore): {'PASSED' if test1_passed else 'FAILED'}")
    print(f"Test 2 (ExerciseService):  {'PASSED' if test2_passed else 'FAILED'}")
    print(f"Test 3 (Specific User):    {'PASSED' if test3_passed else 'FAILED'}")

    if all([test1_passed, test2_passed, test3_passed]):
        print("\n[OK] All tests passed! Backend can read custom exercises.")
        print("     Issue is likely in frontend code or auth token.")
    else:
        print("\n[FAIL] Some tests failed. Check errors above.")
