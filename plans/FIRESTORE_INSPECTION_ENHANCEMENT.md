# Firestore Database Inspection Enhancement

## Overview
Enhancement plan for the existing [`inspect_firestore_structure.py`](backend/scripts/inspect_firestore_structure.py) script to provide comprehensive database structure analysis for weight logging feature design.

## Current Script Capabilities
The existing script at [`backend/scripts/inspect_firestore_structure.py`](backend/scripts/inspect_firestore_structure.py:1-192) provides:
- Top-level collection discovery
- Document field type analysis
- Subcollection detection
- Sample document inspection (3 docs per collection)
- Favorites structure analysis

## Required Enhancements

### 1. Deeper User Data Inspection
**Current Limitation**: Only samples 1 user and 3 documents per collection
**Enhancement Needed**:
```python
# Inspect ALL user subcollections comprehensively
- users/{userId}/workouts (all workout templates)
- users/{userId}/programs (all programs)
- users/{userId}/data (user preferences, favorites)
- Check for any existing workout_sessions or workout_logs collections
```

### 2. Workout Template Structure Analysis
**What to Capture**:
```python
{
  "workout_template_structure": {
    "fields": ["id", "name", "description", "exercise_groups", "bonus_exercises", "tags"],
    "exercise_group_structure": {
      "fields": ["group_id", "exercises", "sets", "reps", "rest"],
      "exercises_format": "Dict[str, str]  # {'a': 'Exercise Name', 'b': 'Alt 1'}"
    },
    "sample_workouts": [
      # Full workout documents with all fields
    ]
  }
}
```

### 3. Program Structure Analysis
**What to Capture**:
```python
{
  "program_structure": {
    "fields": ["id", "name", "description", "workouts", "duration_weeks"],
    "workout_reference_structure": {
      "fields": ["workout_id", "order_index", "custom_name", "custom_date"]
    },
    "sample_programs": [
      # Full program documents
    ]
  }
}
```

### 4. Check for Existing Weight/Session Data
**Search for**:
- Any collections named: `workout_sessions`, `workout_logs`, `exercise_logs`, `performance_data`
- Any fields in workouts containing: `weight`, `logged`, `history`, `performance`
- Document any existing tracking mechanisms

### 5. Global Exercises Analysis
**What to Capture**:
```python
{
  "global_exercises": {
    "total_count": "number",
    "sample_exercises": [
      # 5-10 sample exercises with full field structure
    ],
    "field_analysis": {
      "required_fields": [],
      "optional_fields": [],
      "classification_fields": []
    }
  }
}
```

### 6. Output Format Enhancement
**Generate Multiple Output Files**:
1. `firestore_structure_full.json` - Complete raw structure
2. `firestore_structure_summary.md` - Human-readable summary
3. `firestore_workout_analysis.json` - Focused workout/program data
4. `firestore_schema_diagram.md` - Mermaid diagram of current structure

## Enhanced Script Structure

```python
def inspect_user_workouts(db, user_id, max_workouts=10):
    """Deeply inspect user workout templates"""
    workouts_ref = db.collection('users').document(user_id).collection('workouts')
    # Get all workout documents
    # Analyze structure
    # Return comprehensive workout data
    
def inspect_user_programs(db, user_id, max_programs=5):
    """Deeply inspect user programs"""
    programs_ref = db.collection('users').document(user_id).collection('programs')
    # Get all program documents
    # Analyze workout references
    # Return comprehensive program data

def search_for_existing_logging(db):
    """Search for any existing workout logging/tracking collections"""
    # Check all users for session/log collections
    # Check for weight/performance fields in workouts
    # Return findings

def generate_schema_diagram(structure_data):
    """Generate Mermaid diagram of current database schema"""
    # Create visual representation
    # Show relationships between collections
    # Highlight key fields

def main():
    # Run all inspections
    # Generate all output files
    # Print summary to console
```

## Usage Instructions

### Running the Enhanced Script
```bash
# From project root
cd backend/scripts
python inspect_firestore_full.py

# Or with specific user ID
python inspect_firestore_full.py --user-id <user_id>

# Or inspect all users
python inspect_firestore_full.py --all-users
```

### Expected Output Files
1. **firestore_structure_full.json** - Complete database dump
2. **firestore_structure_summary.md** - Readable summary with:
   - Collection counts
   - Field inventories
   - Sample data
   - Relationship diagrams
3. **firestore_workout_analysis.json** - Workout-specific data:
   - All workout templates
   - All programs
   - Exercise references
   - Current data patterns
4. **firestore_schema_current.md** - Mermaid diagram showing:
   - Collections hierarchy
   - Document structures
   - Relationships
   - Key fields

## Next Steps After Inspection

1. **Review Output Files** - Understand current structure completely
2. **Identify Gaps** - What's missing for weight logging?
3. **Design New Schema** - Based on actual current state
4. **Plan Migration** - How to add new collections/fields without breaking existing data

## Implementation Priority

1. ✅ **High Priority**: User workouts and programs inspection
2. ✅ **High Priority**: Search for existing logging mechanisms  
3. ⚠️ **Medium Priority**: Generate schema diagrams
4. ⚠️ **Medium Priority**: Multi-user analysis
5. ℹ️ **Low Priority**: Performance metrics and statistics

## Code Mode Task

Once this plan is approved, switch to **Code mode** to:
1. Create `backend/scripts/inspect_firestore_full.py`
2. Implement all enhancement functions
3. Run the script against live Firestore
4. Generate all output files
5. Review results and proceed with architecture design