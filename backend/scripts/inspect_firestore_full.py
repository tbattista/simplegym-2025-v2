"""
Enhanced Firestore Database Structure Inspector
Provides comprehensive analysis of the entire database structure for weight logging feature design
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)
print(f"Loading .env from: {env_path}")
print(f".env exists: {env_path.exists()}")

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore


def inspect_document_deep(doc_ref, depth=0, max_depth=3) -> Optional[Dict[str, Any]]:
    """Recursively inspect a document and its subcollections with depth limit"""
    if depth > max_depth:
        return {"_truncated": "Max depth reached"}
    
    doc = doc_ref.get()
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    structure = {
        "id": doc.id,
        "fields": {},
        "subcollections": {}
    }
    
    # Analyze fields with full detail
    for key, value in data.items():
        value_type = type(value).__name__
        if isinstance(value, dict):
            structure["fields"][key] = {
                "type": "map",
                "keys": list(value.keys()),
                "sample": value if len(str(value)) < 500 else str(value)[:500] + "..."
            }
        elif isinstance(value, list):
            structure["fields"][key] = {
                "type": "array",
                "length": len(value),
                "sample": value if len(value) <= 10 else value[:10] + ["..."]
            }
        else:
            structure["fields"][key] = {
                "type": value_type,
                "value": str(value) if len(str(value)) < 200 else str(value)[:200] + "..."
            }
    
    # Check for subcollections
    collections = doc_ref.collections()
    for collection in collections:
        coll_name = collection.id
        docs_list = list(collection.limit(100).stream())
        structure["subcollections"][coll_name] = {
            "document_count": len(docs_list),
            "sample_docs": []
        }
        
        # Get samples based on collection size
        sample_count = min(5, len(docs_list))
        for sample_doc in docs_list[:sample_count]:
            structure["subcollections"][coll_name]["sample_docs"].append(
                inspect_document_deep(sample_doc.reference, depth + 1, max_depth)
            )
    
    return structure


def inspect_user_workouts(db, user_id: str, max_workouts: int = 20) -> Dict[str, Any]:
    """Deeply inspect user workout templates"""
    print(f"\n  📋 Inspecting workouts for user: {user_id}")
    
    workouts_ref = db.collection('users').document(user_id).collection('workouts')
    workout_docs = list(workouts_ref.limit(max_workouts).stream())
    
    result = {
        "total_count": len(workout_docs),
        "workouts": [],
        "field_analysis": {
            "common_fields": set(),
            "optional_fields": set(),
            "field_types": defaultdict(set)
        }
    }
    
    for doc in workout_docs:
        data = doc.to_dict()
        workout_structure = {
            "id": doc.id,
            "name": data.get('name', 'Unknown'),
            "fields": {}
        }
        
        # Analyze each field
        for key, value in data.items():
            value_type = type(value).__name__
            workout_structure["fields"][key] = {
                "type": value_type,
                "value": value if value_type in ['str', 'int', 'bool'] else str(type(value))
            }
            
            # Track field usage
            result["field_analysis"]["common_fields"].add(key)
            result["field_analysis"]["field_types"][key].add(value_type)
        
        result["workouts"].append(workout_structure)
        print(f"    ✓ {data.get('name', 'Unknown')} ({doc.id})")
    
    # Convert sets to lists for JSON serialization
    result["field_analysis"]["common_fields"] = list(result["field_analysis"]["common_fields"])
    result["field_analysis"]["field_types"] = {k: list(v) for k, v in result["field_analysis"]["field_types"].items()}
    
    return result


def inspect_user_programs(db, user_id: str, max_programs: int = 10) -> Dict[str, Any]:
    """Deeply inspect user programs"""
    print(f"\n  📚 Inspecting programs for user: {user_id}")
    
    programs_ref = db.collection('users').document(user_id).collection('programs')
    program_docs = list(programs_ref.limit(max_programs).stream())
    
    result = {
        "total_count": len(program_docs),
        "programs": [],
        "field_analysis": {
            "common_fields": set(),
            "workout_reference_structure": {}
        }
    }
    
    for doc in program_docs:
        data = doc.to_dict()
        program_structure = {
            "id": doc.id,
            "name": data.get('name', 'Unknown'),
            "workout_count": len(data.get('workouts', [])),
            "fields": {}
        }
        
        # Analyze each field
        for key, value in data.items():
            value_type = type(value).__name__
            if key == 'workouts' and isinstance(value, list) and value:
                # Analyze workout reference structure
                program_structure["fields"][key] = {
                    "type": "array",
                    "length": len(value),
                    "sample_item": value[0] if value else None
                }
                if value and isinstance(value[0], dict):
                    result["field_analysis"]["workout_reference_structure"] = {
                        "fields": list(value[0].keys()),
                        "sample": value[0]
                    }
            else:
                program_structure["fields"][key] = {
                    "type": value_type,
                    "value": value if value_type in ['str', 'int', 'bool'] else str(type(value))
                }
            
            result["field_analysis"]["common_fields"].add(key)
        
        result["programs"].append(program_structure)
        print(f"    ✓ {data.get('name', 'Unknown')} ({doc.id}) - {len(data.get('workouts', []))} workouts")
    
    # Convert sets to lists
    result["field_analysis"]["common_fields"] = list(result["field_analysis"]["common_fields"])
    
    return result


def search_for_existing_logging(db) -> Dict[str, Any]:
    """Search for any existing workout logging/tracking collections or fields"""
    print(f"\n🔍 Searching for existing logging mechanisms...")
    
    findings = {
        "collections_found": [],
        "weight_fields_found": [],
        "session_fields_found": [],
        "users_checked": 0
    }
    
    # Check users for logging-related subcollections
    users_ref = db.collection('users')
    for user_doc in users_ref.limit(5).stream():
        findings["users_checked"] += 1
        user_id = user_doc.id
        
        # Check for common logging collection names
        logging_collection_names = [
            'workout_sessions', 'workout_logs', 'exercise_logs', 
            'performance_data', 'training_logs', 'session_history'
        ]
        
        for coll_name in logging_collection_names:
            coll_ref = user_doc.reference.collection(coll_name)
            docs = list(coll_ref.limit(1).stream())
            if docs:
                findings["collections_found"].append({
                    "user_id": user_id,
                    "collection": coll_name,
                    "document_count": len(list(coll_ref.limit(100).stream())),
                    "sample_doc": docs[0].to_dict() if docs else None
                })
                print(f"  ✓ Found: users/{user_id}/{coll_name}")
        
        # Check workouts for weight/logging fields
        workouts_ref = user_doc.reference.collection('workouts')
        for workout_doc in workouts_ref.limit(3).stream():
            data = workout_doc.to_dict()
            weight_related_keys = [k for k in data.keys() if any(term in k.lower() for term in ['weight', 'log', 'history', 'performance', 'session'])]
            if weight_related_keys:
                findings["weight_fields_found"].append({
                    "user_id": user_id,
                    "workout_id": workout_doc.id,
                    "fields": weight_related_keys
                })
    
    if not findings["collections_found"]:
        print("  ℹ️  No existing logging collections found")
    if not findings["weight_fields_found"]:
        print("  ℹ️  No weight/logging fields found in workouts")
    
    return findings


def analyze_global_exercises(db, sample_count: int = 10) -> Dict[str, Any]:
    """Analyze global exercises structure"""
    print(f"\n🏋️ Analyzing global exercises...")
    
    exercises_ref = db.collection('global_exercises')
    all_docs = list(exercises_ref.limit(100).stream())
    
    result = {
        "total_sampled": len(all_docs),
        "sample_exercises": [],
        "field_analysis": {
            "all_fields": set(),
            "required_fields": set(),
            "optional_fields": set(),
            "field_types": defaultdict(set)
        }
    }
    
    # Analyze all sampled exercises
    field_counts = defaultdict(int)
    for doc in all_docs:
        data = doc.to_dict()
        for key, value in data.items():
            field_counts[key] += 1
            result["field_analysis"]["all_fields"].add(key)
            result["field_analysis"]["field_types"][key].add(type(value).__name__)
    
    # Determine required vs optional fields
    total_docs = len(all_docs)
    for field, count in field_counts.items():
        if count == total_docs:
            result["field_analysis"]["required_fields"].add(field)
        else:
            result["field_analysis"]["optional_fields"].add(field)
    
    # Get sample exercises
    for doc in all_docs[:sample_count]:
        data = doc.to_dict()
        result["sample_exercises"].append({
            "id": doc.id,
            "name": data.get('name', 'Unknown'),
            "fields": {k: type(v).__name__ for k, v in data.items()}
        })
        print(f"  ✓ {data.get('name', 'Unknown')}")
    
    # Convert sets to lists
    result["field_analysis"]["all_fields"] = sorted(list(result["field_analysis"]["all_fields"]))
    result["field_analysis"]["required_fields"] = sorted(list(result["field_analysis"]["required_fields"]))
    result["field_analysis"]["optional_fields"] = sorted(list(result["field_analysis"]["optional_fields"]))
    result["field_analysis"]["field_types"] = {k: list(v) for k, v in result["field_analysis"]["field_types"].items()}
    
    return result


def generate_schema_diagram(structure_data: Dict[str, Any]) -> str:
    """Generate Mermaid diagram of current database schema"""
    diagram = """```mermaid
erDiagram
    USERS ||--o{ WORKOUTS : has
    USERS ||--o{ PROGRAMS : has
    USERS ||--o{ DATA : has
    PROGRAMS ||--o{ PROGRAM_WORKOUTS : contains
    PROGRAM_WORKOUTS }o--|| WORKOUTS : references
    WORKOUTS ||--o{ EXERCISE_GROUPS : contains
    EXERCISE_GROUPS }o--|| GLOBAL_EXERCISES : references
    
    USERS {
        string uid PK
        string email
        string displayName
        timestamp createdAt
        map preferences
        map stats
    }
    
    WORKOUTS {
        string id PK
        string name
        string description
        array exercise_groups
        array bonus_exercises
        array tags
        timestamp created_date
        timestamp modified_date
    }
    
    EXERCISE_GROUPS {
        string group_id
        map exercises
        string sets
        string reps
        string rest
    }
    
    PROGRAMS {
        string id PK
        string name
        string description
        array workouts
        int duration_weeks
        string difficulty_level
        array tags
    }
    
    PROGRAM_WORKOUTS {
        string workout_id FK
        int order_index
        string custom_name
        string custom_date
    }
    
    GLOBAL_EXERCISES {
        string id PK
        string name
        string targetMuscleGroup
        string primaryEquipment
        string difficultyLevel
        int popularityScore
        int favoriteCount
    }
    
    DATA {
        string type
        map favorites
        array exerciseIds
    }
```

## Current Schema Notes

### Collections Hierarchy
- `users/` (top-level)
  - `{userId}/workouts/` (subcollection) - Workout templates
  - `{userId}/programs/` (subcollection) - Training programs
  - `{userId}/data/` (subcollection) - User preferences and favorites
- `global_exercises/` (top-level) - Shared exercise database
- `programs/` (top-level) - Legacy programs (being migrated)

### Key Relationships
1. **Programs → Workouts**: Programs reference workout IDs in their `workouts` array
2. **Workouts → Exercises**: Exercise groups contain exercise names (string references to global exercises)
3. **Users → Data**: User-specific data like favorites stored in data subcollection

### Current Limitations for Weight Logging
"""
    
    # Add findings from analysis
    if structure_data.get("logging_search", {}).get("collections_found"):
        diagram += "\n**⚠️ Existing Logging Collections Found:**\n"
        for finding in structure_data["logging_search"]["collections_found"]:
            diagram += f"- `users/{finding['user_id']}/{finding['collection']}/` ({finding['document_count']} docs)\n"
    else:
        diagram += "\n**ℹ️ No existing workout session/logging collections found**\n"
    
    diagram += "\n**🎯 Missing for Weight Logging:**\n"
    diagram += "- No workout session tracking (instances of workouts performed)\n"
    diagram += "- No exercise performance history (weight, sets, reps per session)\n"
    diagram += "- No real-time workout logging mechanism\n"
    diagram += "- No change history for workout sessions\n"
    
    return diagram


def generate_summary_markdown(structure_data: Dict[str, Any], output_dir: Path) -> str:
    """Generate human-readable summary markdown"""
    summary = f"""# Firestore Database Structure Summary
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview

### Top-Level Collections
"""
    
    for coll_name, coll_data in structure_data.get("collections", {}).items():
        doc_count = coll_data.get("total_docs_sampled", 0)
        summary += f"- **{coll_name}**: {doc_count} documents sampled\n"
    
    summary += "\n## User Data Analysis\n\n"
    
    # Workouts summary
    if "user_workouts" in structure_data:
        workouts = structure_data["user_workouts"]
        summary += f"### Workout Templates\n"
        summary += f"- **Total**: {workouts['total_count']} workouts\n"
        summary += f"- **Common Fields**: {', '.join(workouts['field_analysis']['common_fields'])}\n\n"
        
        if workouts['workouts']:
            summary += "**Sample Workouts:**\n"
            for workout in workouts['workouts'][:5]:
                summary += f"- {workout['name']} (`{workout['id']}`)\n"
    
    # Programs summary
    if "user_programs" in structure_data:
        programs = structure_data["user_programs"]
        summary += f"\n### Programs\n"
        summary += f"- **Total**: {programs['total_count']} programs\n"
        summary += f"- **Common Fields**: {', '.join(programs['field_analysis']['common_fields'])}\n\n"
        
        if programs['programs']:
            summary += "**Sample Programs:**\n"
            for program in programs['programs'][:5]:
                summary += f"- {program['name']} (`{program['id']}`) - {program['workout_count']} workouts\n"
    
    # Global exercises summary
    if "global_exercises" in structure_data:
        exercises = structure_data["global_exercises"]
        summary += f"\n### Global Exercises\n"
        summary += f"- **Total Sampled**: {exercises['total_sampled']} exercises\n"
        summary += f"- **Required Fields**: {len(exercises['field_analysis']['required_fields'])} fields\n"
        summary += f"- **Optional Fields**: {len(exercises['field_analysis']['optional_fields'])} fields\n\n"
    
    # Logging search results
    if "logging_search" in structure_data:
        logging = structure_data["logging_search"]
        summary += f"\n## Existing Logging Mechanisms\n\n"
        summary += f"- **Users Checked**: {logging['users_checked']}\n"
        summary += f"- **Logging Collections Found**: {len(logging['collections_found'])}\n"
        summary += f"- **Weight Fields Found**: {len(logging['weight_fields_found'])}\n\n"
        
        if logging['collections_found']:
            summary += "**Found Collections:**\n"
            for finding in logging['collections_found']:
                summary += f"- `users/{finding['user_id']}/{finding['collection']}/` ({finding['document_count']} docs)\n"
        else:
            summary += "**ℹ️ No existing logging collections found - clean slate for implementation**\n"
    
    # Add schema diagram
    summary += "\n## Database Schema Diagram\n\n"
    summary += generate_schema_diagram(structure_data)
    
    return summary


def main():
    """Main inspection function"""
    parser = argparse.ArgumentParser(description='Inspect Firestore database structure comprehensively')
    parser.add_argument('--user-id', type=str, help='Specific user ID to inspect')
    parser.add_argument('--all-users', action='store_true', help='Inspect all users (limited to first 5)')
    parser.add_argument('--max-workouts', type=int, default=20, help='Max workouts to inspect per user')
    parser.add_argument('--max-programs', type=int, default=10, help='Max programs to inspect per user')
    args = parser.parse_args()
    
    print("="*80)
    print("ENHANCED FIRESTORE DATABASE STRUCTURE INSPECTOR")
    print("="*80)
    
    # Initialize Firebase
    app = get_firebase_app()
    if not app:
        print("❌ Failed to initialize Firebase")
        return
    
    db = firestore.client(app=app)
    print("✅ Connected to Firestore")
    
    # Prepare output directory
    output_dir = Path(__file__).parent
    
    # Full structure data
    full_structure = {
        "inspected_at": datetime.now().isoformat(),
        "collections": {},
        "user_workouts": None,
        "user_programs": None,
        "global_exercises": None,
        "logging_search": None
    }
    
    # Get all top-level collections
    collections = db.collections()
    collection_names = [coll.id for coll in collections]
    
    print(f"\n📊 Found {len(collection_names)} top-level collections:")
    for name in collection_names:
        print(f"  - {name}")
    
    # Inspect each top-level collection (basic)
    for coll_name in collection_names:
        coll_ref = db.collection(coll_name)
        docs = list(coll_ref.limit(3).stream())
        
        # Check for subcollections in first document
        subcollections = []
        if docs:
            first_doc_ref = docs[0].reference
            for subcoll in first_doc_ref.collections():
                subcollections.append(subcoll.id)
        
        full_structure["collections"][coll_name] = {
            "total_docs_sampled": len(docs),
            "sample_doc_ids": [doc.id for doc in docs],
            "subcollections": subcollections
        }
        
        if subcollections:
            print(f"  └─ Subcollections in {coll_name}: {', '.join(subcollections)}")
    
    # Check top-level workouts collection first
    print(f"\n{'='*80}")
    print(f"CHECKING TOP-LEVEL WORKOUTS COLLECTION")
    print(f"{'='*80}")
    workouts_ref = db.collection('workouts')
    top_level_workouts = list(workouts_ref.limit(10).stream())
    if top_level_workouts:
        print(f"✅ Found {len(top_level_workouts)} workouts in top-level collection")
        for workout in top_level_workouts[:3]:
            data = workout.to_dict()
            print(f"  - {data.get('name', 'Unknown')} (ID: {workout.id})")
            # Check if it has a user_id or creator_id field
            if 'user_id' in data:
                print(f"    └─ user_id: {data['user_id']}")
            if 'creator_id' in data:
                print(f"    └─ creator_id: {data['creator_id']}")
    else:
        print("ℹ️  No workouts in top-level collection")
    
    # Get user ID to inspect
    user_id = args.user_id
    if not user_id:
        # Get first user - try multiple methods
        users_ref = db.collection('users')
        try:
            print(f"\n🔍 Attempting to fetch users...")
            # Method 1: Try stream with explicit fetch
            users_list = list(users_ref.limit(10).stream())
            print(f"   Stream method returned {len(users_list)} users")
            
            if users_list:
                user_id = users_list[0].id
                print(f"\n📌 Using first user found: {user_id}")
                print(f"   Total users found: {len(users_list)}")
                # Show all user IDs
                print(f"   All user IDs: {[u.id for u in users_list]}")
            else:
                # Method 2: Try get() instead of stream()
                print(f"   Trying get() method...")
                users_docs = users_ref.limit(10).get()
                print(f"   Get method returned {len(users_docs)} users")
                
                if users_docs:
                    user_id = users_docs[0].id
                    print(f"\n📌 Using first user found (via get): {user_id}")
                    print(f"   Total users found: {len(users_docs)}")
                else:
                    print("\n⚠️  No users found in database")
                    print("   This might be a permissions issue or the users collection is empty")
                    print("\n💡 Checking if workouts have user references...")
                    # Try to extract user_id from top-level workouts
                    if top_level_workouts:
                        for workout in top_level_workouts:
                            data = workout.to_dict()
                            if 'user_id' in data:
                                user_id = data['user_id']
                                print(f"   Found user_id in workout: {user_id}")
                                break
                    
                    if not user_id:
                        print("\n❌ Cannot proceed without a user ID")
                        return
        except Exception as e:
            print(f"\n❌ Error fetching users: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return
    
    # Deep inspection of user data
    print(f"\n{'='*80}")
    print(f"DEEP USER DATA INSPECTION: {user_id}")
    print(f"{'='*80}")
    
    full_structure["user_workouts"] = inspect_user_workouts(db, user_id, args.max_workouts)
    full_structure["user_programs"] = inspect_user_programs(db, user_id, args.max_programs)
    
    # Analyze global exercises
    print(f"\n{'='*80}")
    print(f"GLOBAL EXERCISES ANALYSIS")
    print(f"{'='*80}")
    full_structure["global_exercises"] = analyze_global_exercises(db, sample_count=10)
    
    # Search for existing logging mechanisms
    print(f"\n{'='*80}")
    print(f"EXISTING LOGGING SEARCH")
    print(f"{'='*80}")
    full_structure["logging_search"] = search_for_existing_logging(db)
    
    # Generate output files
    print(f"\n{'='*80}")
    print(f"GENERATING OUTPUT FILES")
    print(f"{'='*80}")
    
    # 1. Full JSON structure
    json_file = output_dir / "firestore_structure_full.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(full_structure, f, indent=2, default=str)
    print(f"✅ Full structure: {json_file}")
    
    # 2. Workout-focused JSON
    workout_analysis = {
        "inspected_at": full_structure["inspected_at"],
        "user_id": user_id,
        "workouts": full_structure["user_workouts"],
        "programs": full_structure["user_programs"],
        "logging_search": full_structure["logging_search"]
    }
    workout_file = output_dir / "firestore_workout_analysis.json"
    with open(workout_file, 'w', encoding='utf-8') as f:
        json.dump(workout_analysis, f, indent=2, default=str)
    print(f"✅ Workout analysis: {workout_file}")
    
    # 3. Summary markdown
    summary_md = generate_summary_markdown(full_structure, output_dir)
    summary_file = output_dir / "firestore_structure_summary.md"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(summary_md)
    print(f"✅ Summary markdown: {summary_file}")
    
    # 4. Schema diagram markdown
    schema_md = generate_schema_diagram(full_structure)
    schema_file = output_dir / "firestore_schema_current.md"
    with open(schema_file, 'w', encoding='utf-8') as f:
        f.write(f"# Current Firestore Schema\n\n{schema_md}")
    print(f"✅ Schema diagram: {schema_file}")
    
    print(f"\n{'='*80}")
    print(f"✅ INSPECTION COMPLETE")
    print(f"{'='*80}")
    print(f"\nGenerated {4} output files in: {output_dir}")
    print(f"\nNext steps:")
    print(f"1. Review {summary_file.name} for overview")
    print(f"2. Check {schema_file.name} for visual schema")
    print(f"3. Examine {workout_file.name} for workout details")
    print(f"4. Use findings to design weight logging architecture")


if __name__ == "__main__":
    main()