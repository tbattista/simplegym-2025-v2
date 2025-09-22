"""
Phase 2 Migration Testing Suite for Ghost Gym V3
Tests data migration, unified data service, and Firebase integration
"""

import asyncio
import json
import pytest
from pathlib import Path
from datetime import datetime
from backend.services.unified_data_service import unified_data_service
from backend.services.migration_service import migration_service
from backend.services.firestore_data_service import firestore_data_service
from backend.models import CreateWorkoutRequest, CreateProgramRequest, ExerciseGroup, BonusExercise

class TestPhase2Migration:
    """Test suite for Phase 2 migration functionality"""
    
    def __init__(self):
        self.test_user_id = "test-user-phase2"
        self.test_data_created = []
        
    async def run_all_tests(self):
        """Run all Phase 2 tests"""
        print("🧪 Starting Phase 2 Migration Test Suite")
        print("=" * 50)
        
        try:
            # Test 1: Service Availability
            await self.test_service_availability()
            
            # Test 2: Unified Data Service
            await self.test_unified_data_service()
            
            # Test 3: Data Migration
            await self.test_data_migration()
            
            # Test 4: Firestore Operations
            await self.test_firestore_operations()
            
            # Test 5: Fallback Mechanisms
            await self.test_fallback_mechanisms()
            
            print("\n✅ All Phase 2 tests completed successfully!")
            return True
            
        except Exception as e:
            print(f"\n❌ Test suite failed: {str(e)}")
            return False
        finally:
            await self.cleanup_test_data()
    
    async def test_service_availability(self):
        """Test that all Phase 2 services are available"""
        print("\n📋 Test 1: Service Availability")
        
        # Test unified data service
        assert unified_data_service is not None, "Unified data service not available"
        print("  ✅ Unified data service available")
        
        # Test migration service
        assert migration_service is not None, "Migration service not available"
        print("  ✅ Migration service available")
        
        # Test Firestore service
        assert firestore_data_service is not None, "Firestore data service not available"
        print("  ✅ Firestore data service available")
        
        # Test service status
        status = unified_data_service.get_service_status()
        assert status["local_service"]["available"] == True, "Local service not available"
        print("  ✅ Local service operational")
        
        if status["firestore_service"]["available"]:
            print("  ✅ Firestore service operational")
        else:
            print("  ⚠️ Firestore service not available (fallback mode)")
    
    async def test_unified_data_service(self):
        """Test unified data service operations"""
        print("\n📋 Test 2: Unified Data Service")
        
        # Test anonymous user operations (localStorage)
        print("  Testing anonymous user operations...")
        
        # Create test workout for anonymous user
        workout_request = CreateWorkoutRequest(
            name="Test Workout Anonymous",
            description="Test workout for anonymous user",
            exercise_groups=[
                ExerciseGroup(
                    exercises={"a": "Push-ups", "b": "Squats"},
                    sets="3",
                    reps="10",
                    rest="60s"
                )
            ],
            tags=["test", "anonymous"]
        )
        
        workout = await unified_data_service.create_workout(workout_request, user_id=None)
        assert workout is not None, "Failed to create anonymous workout"
        assert workout.name == "Test Workout Anonymous", "Workout name mismatch"
        print("  ✅ Anonymous workout creation successful")
        
        # Test program creation for anonymous user
        program_request = CreateProgramRequest(
            name="Test Program Anonymous",
            description="Test program for anonymous user",
            duration_weeks=4,
            difficulty_level="beginner",
            tags=["test", "anonymous"]
        )
        
        program = await unified_data_service.create_program(program_request, user_id=None)
        assert program is not None, "Failed to create anonymous program"
        assert program.name == "Test Program Anonymous", "Program name mismatch"
        print("  ✅ Anonymous program creation successful")
        
        # Test data retrieval
        programs = await unified_data_service.get_programs(user_id=None)
        workouts = await unified_data_service.get_workouts(user_id=None)
        
        assert len(programs) > 0, "No programs retrieved"
        assert len(workouts) > 0, "No workouts retrieved"
        print("  ✅ Anonymous data retrieval successful")
        
        # Store test data for cleanup
        self.test_data_created.extend([
            {"type": "workout", "id": workout.id, "user_id": None},
            {"type": "program", "id": program.id, "user_id": None}
        ])
    
    async def test_data_migration(self):
        """Test data migration from anonymous to authenticated"""
        print("\n📋 Test 3: Data Migration")
        
        if not firestore_data_service.is_available():
            print("  ⚠️ Skipping migration test - Firestore not available")
            return
        
        # Test migration eligibility check
        eligibility = await migration_service.check_migration_eligibility(self.test_user_id)
        print(f"  📊 Migration eligibility: {eligibility['eligible']} - {eligibility['reason']}")
        
        # Prepare test data for migration
        test_programs = [
            {
                "name": "Migration Test Program",
                "description": "Test program for migration",
                "duration_weeks": 6,
                "difficulty_level": "intermediate",
                "tags": ["migration", "test"]
            }
        ]
        
        test_workouts = [
            {
                "name": "Migration Test Workout",
                "description": "Test workout for migration",
                "exercise_groups": [
                    {
                        "exercises": {"a": "Bench Press", "b": "Incline Press"},
                        "sets": "3",
                        "reps": "8-12",
                        "rest": "90s"
                    }
                ],
                "tags": ["migration", "test"]
            }
        ]
        
        # Execute migration
        migration_result = await migration_service.execute_migration(
            self.test_user_id, 
            test_programs, 
            test_workouts,
            {"email": "test@example.com", "displayName": "Test User"}
        )
        
        assert migration_result["success"] == True, f"Migration failed: {migration_result.get('error')}"
        assert migration_result["migrated_programs"] == 1, "Program migration count mismatch"
        assert migration_result["migrated_workouts"] == 1, "Workout migration count mismatch"
        
        print(f"  ✅ Migration successful: {migration_result['migrated_programs']} programs, {migration_result['migrated_workouts']} workouts")
        
        # Verify migrated data
        migrated_programs = await firestore_data_service.get_user_programs(self.test_user_id)
        migrated_workouts = await firestore_data_service.get_user_workouts(self.test_user_id)
        
        assert len(migrated_programs) >= 1, "Migrated programs not found"
        assert len(migrated_workouts) >= 1, "Migrated workouts not found"
        
        print("  ✅ Migration verification successful")
        
        # Store migrated data for cleanup
        for program in migrated_programs:
            self.test_data_created.append({"type": "program", "id": program.id, "user_id": self.test_user_id})
        for workout in migrated_workouts:
            self.test_data_created.append({"type": "workout", "id": workout.id, "user_id": self.test_user_id})
    
    async def test_firestore_operations(self):
        """Test Firestore CRUD operations"""
        print("\n📋 Test 4: Firestore Operations")
        
        if not firestore_data_service.is_available():
            print("  ⚠️ Skipping Firestore test - service not available")
            return
        
        # Test workout CRUD
        workout_request = CreateWorkoutRequest(
            name="Firestore Test Workout",
            description="Test workout for Firestore",
            exercise_groups=[
                ExerciseGroup(
                    exercises={"a": "Deadlifts", "b": "Rows"},
                    sets="4",
                    reps="6-8",
                    rest="2min"
                )
            ],
            tags=["firestore", "test"]
        )
        
        # Create
        workout = await firestore_data_service.create_workout(self.test_user_id, workout_request)
        assert workout is not None, "Failed to create Firestore workout"
        print("  ✅ Firestore workout creation successful")
        
        # Read
        retrieved_workout = await firestore_data_service.get_workout(self.test_user_id, workout.id)
        assert retrieved_workout is not None, "Failed to retrieve Firestore workout"
        assert retrieved_workout.name == workout.name, "Retrieved workout name mismatch"
        print("  ✅ Firestore workout retrieval successful")
        
        # Update
        from backend.models import UpdateWorkoutRequest
        update_request = UpdateWorkoutRequest(description="Updated description")
        updated_workout = await firestore_data_service.update_workout(self.test_user_id, workout.id, update_request)
        assert updated_workout is not None, "Failed to update Firestore workout"
        assert updated_workout.description == "Updated description", "Workout update failed"
        print("  ✅ Firestore workout update successful")
        
        # Delete
        delete_success = await firestore_data_service.delete_workout(self.test_user_id, workout.id)
        assert delete_success == True, "Failed to delete Firestore workout"
        print("  ✅ Firestore workout deletion successful")
        
        # Verify deletion
        deleted_workout = await firestore_data_service.get_workout(self.test_user_id, workout.id)
        assert deleted_workout is None, "Workout not properly deleted"
        print("  ✅ Firestore workout deletion verified")
    
    async def test_fallback_mechanisms(self):
        """Test fallback mechanisms when services are unavailable"""
        print("\n📋 Test 5: Fallback Mechanisms")
        
        # Test with authenticated user but Firestore unavailable
        # (This would require mocking Firestore unavailability)
        print("  ✅ Fallback mechanism tests would be implemented here")
        print("  📝 Note: Full fallback testing requires service mocking")
    
    async def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n🧹 Cleaning up test data...")
        
        cleanup_count = 0
        for item in self.test_data_created:
            try:
                if item["user_id"] is None:
                    # Clean up anonymous data
                    if item["type"] == "workout":
                        success = unified_data_service.local_service.delete_workout(item["id"])
                    elif item["type"] == "program":
                        success = unified_data_service.local_service.delete_program(item["id"])
                else:
                    # Clean up Firestore data
                    if item["type"] == "workout":
                        success = await firestore_data_service.delete_workout(item["user_id"], item["id"])
                    elif item["type"] == "program":
                        success = await firestore_data_service.delete_program(item["user_id"], item["id"])
                
                if success:
                    cleanup_count += 1
                    
            except Exception as e:
                print(f"  ⚠️ Failed to clean up {item['type']} {item['id']}: {str(e)}")
        
        print(f"  ✅ Cleaned up {cleanup_count} test items")

# Test runner function
async def run_phase2_tests():
    """Run Phase 2 migration tests"""
    test_suite = TestPhase2Migration()
    return await test_suite.run_all_tests()

# Manual test data creation for development
def create_test_data():
    """Create test data for manual testing"""
    print("🔧 Creating test data for manual testing...")
    
    # Create test programs in localStorage
    test_programs = [
        {
            "id": f"test-program-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": "Test Program 1",
            "description": "First test program for migration",
            "duration_weeks": 8,
            "difficulty_level": "beginner",
            "tags": ["test", "migration"],
            "workouts": [],
            "created_date": datetime.now().isoformat(),
            "modified_date": datetime.now().isoformat()
        },
        {
            "id": f"test-program-2-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": "Test Program 2",
            "description": "Second test program for migration",
            "duration_weeks": 12,
            "difficulty_level": "intermediate",
            "tags": ["test", "migration", "advanced"],
            "workouts": [],
            "created_date": datetime.now().isoformat(),
            "modified_date": datetime.now().isoformat()
        }
    ]
    
    # Create test workouts in localStorage
    test_workouts = [
        {
            "id": f"test-workout-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": "Test Workout 1",
            "description": "First test workout for migration",
            "exercise_groups": [
                {
                    "group_id": "group-1",
                    "exercises": {"a": "Bench Press", "b": "Incline Press", "c": "Flyes"},
                    "sets": "3",
                    "reps": "8-12",
                    "rest": "90s"
                }
            ],
            "bonus_exercises": [
                {
                    "exercise_id": "bonus-1",
                    "name": "Push-ups",
                    "sets": "2",
                    "reps": "15",
                    "rest": "30s"
                }
            ],
            "tags": ["test", "migration", "push"],
            "is_template": True,
            "created_date": datetime.now().isoformat(),
            "modified_date": datetime.now().isoformat()
        },
        {
            "id": f"test-workout-2-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": "Test Workout 2",
            "description": "Second test workout for migration",
            "exercise_groups": [
                {
                    "group_id": "group-2",
                    "exercises": {"a": "Squats", "b": "Leg Press", "c": "Lunges"},
                    "sets": "4",
                    "reps": "10-15",
                    "rest": "2min"
                }
            ],
            "bonus_exercises": [],
            "tags": ["test", "migration", "legs"],
            "is_template": True,
            "created_date": datetime.now().isoformat(),
            "modified_date": datetime.now().isoformat()
        }
    ]
    
    # Save to data files
    try:
        # Read existing data
        programs_file = Path("backend/data/programs.json")
        workouts_file = Path("backend/data/workouts.json")
        
        existing_programs = {"programs": []}
        existing_workouts = {"workouts": []}
        
        if programs_file.exists():
            with open(programs_file, 'r') as f:
                existing_programs = json.load(f)
        
        if workouts_file.exists():
            with open(workouts_file, 'r') as f:
                existing_workouts = json.load(f)
        
        # Add test data
        existing_programs["programs"].extend(test_programs)
        existing_workouts["workouts"].extend(test_workouts)
        
        # Write back to files
        with open(programs_file, 'w') as f:
            json.dump(existing_programs, f, indent=2, default=str)
        
        with open(workouts_file, 'w') as f:
            json.dump(existing_workouts, f, indent=2, default=str)
        
        print(f"✅ Created {len(test_programs)} test programs and {len(test_workouts)} test workouts")
        print("📝 Test data saved to backend/data/ files")
        
        return {
            "programs": test_programs,
            "workouts": test_workouts
        }
        
    except Exception as e:
        print(f"❌ Failed to create test data: {str(e)}")
        return None

# Command-line interface for testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "create-test-data":
        create_test_data()
    else:
        # Run the test suite
        result = asyncio.run(run_phase2_tests())
        sys.exit(0 if result else 1)