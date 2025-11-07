# Current Firestore Schema

```mermaid
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

**ℹ️ No existing workout session/logging collections found**

**🎯 Missing for Weight Logging:**
- No workout session tracking (instances of workouts performed)
- No exercise performance history (weight, sets, reps per session)
- No real-time workout logging mechanism
- No change history for workout sessions
