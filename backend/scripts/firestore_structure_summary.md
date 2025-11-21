# Firestore Database Structure Summary
Generated: 2025-11-20 14:27:11

## Overview

### Top-Level Collections
- **global_exercises**: 3 documents sampled
- **users**: 0 documents sampled
- **workouts**: 1 documents sampled

## User Data Analysis

### Workout Templates
- **Total**: 4 workouts
- **Common Fields**: created_date, id, is_template, name, sync_status, exercise_groups, bonus_exercises, modified_date, tags, description, version

**Sample Workouts:**
- Push Day (`workout-542be09e`)
- Test Exercise with Everything (`workout-62ca91db`)
- Back & Biceps (`workout-9a39855b`)
- Classic Chest Day (`workout-afcb8448`)

### Programs
- **Total**: 10 programs
- **Common Fields**: created_date, id, workouts, name, sync_status, difficulty_level, modified_date, tags, description, version, duration_weeks

**Sample Programs:**
- Fall 2025 v6 (`program-076b2a0c`) - 0 workouts
- Fall 2025 (`program-1f5a9d66`) - 0 workouts
- Fall 2026 (`program-29adc784`) - 0 workouts
- Fall 2025 (`program-2c5c1c98`) - 0 workouts
- Fall 2025 (Copy) (`program-2e3713ec`) - 0 workouts

### Global Exercises
- **Total Sampled**: 100 exercises
- **Required Fields**: 41 fields
- **Optional Fields**: 0 fields


## Existing Logging Mechanisms

- **Users Checked**: 0
- **Logging Collections Found**: 0
- **Weight Fields Found**: 0

**ℹ️ No existing logging collections found - clean slate for implementation**

## Database Schema Diagram

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
