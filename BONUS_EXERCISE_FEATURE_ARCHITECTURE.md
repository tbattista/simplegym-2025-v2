# Bonus Exercise Feature - Architecture & Implementation Plan

## 📋 Overview

This document outlines the complete architecture for implementing a persistent bonus exercise tracking system in Ghost Gym's workout mode. The feature allows users to add supplementary exercises during workout sessions that are:

1. **Stored exclusively in workout history** (not in workout templates)
2. **Persistently tracked across all sessions** with full historical data
3. **Auto-populated from previous session** when starting a new workout
4. **Accessible via navbar button** for easy mid-workout additions

---

## 🎯 Requirements Summary

### Core Requirements
- Navbar "Bonus" button triggers modal for adding bonus exercises
- Bonus exercises stored ONLY in workout session history (not templates)
- Full historical tracking: view bonus exercises from any past session
- Auto-populate previous session's bonus exercises when starting new workout
- Support multiple bonus exercises per session
- Each bonus exercise tracks: name, sets, reps, rest, weight, notes

### User Stories
1. **As a user**, I want to add bonus exercises during my workout without modifying my template
2. **As a user**, I want to see what bonus exercises I did in previous sessions
3. **As a user**, I want my last session's bonus exercises pre-filled when I start a new workout
4. **As a user**, I want to track weights for bonus exercises just like regular exercises

---

## 🏗️ Current State Analysis

### Existing Bonus Exercise Implementation

The existing `BonusExercise` model in backend/models.py stores bonus exercises in workout TEMPLATES, which is not what we need. We need session-based tracking instead.

**Current Problem**: Template-based storage means all workouts share the same bonus exercises with no per-session customization or historical tracking.

### Existing Session Tracking

The `WorkoutSession` model already has everything we need! The `ExercisePerformance` model includes an `is_bonus: bool` flag that perfectly supports our requirements.

**Key Insight**: No database schema changes needed - we just need to build the UI and workflow!

---

## 🎨 Proposed Architecture

### 1. Data Model (Already Perfect!)

The existing `ExercisePerformance` model supports bonus exercises:

```python
class ExercisePerformance(BaseModel):
    exercise_name: str
    sets_completed: int
    target_sets: str
    target_reps: str
    weight: Optional[float]
    weight_unit: str = "lbs"
    is_bonus: bool = False  # This flag marks bonus exercises!
    order_index: int
```

**Strategy**: Use `is_bonus=True` to distinguish bonus exercises in session data.

### 2. Frontend Components

#### A. Navbar Button
- Position: Between theme toggle and user profile
- Icon: `bx-plus-circle`
- Text: "Bonus" (hidden on mobile)
- Visibility: Only during active workout session

#### B. Bonus Exercise Modal
- Type: Bottom offcanvas (Sneat pattern)
- Sections: Exercise form, previous session reference, actions
- Auto-complete: Integrate with exercise database search

#### C. Exercise Card Rendering
- Visual distinction: Green tint + "BONUS:" prefix
- Position: After regular exercises
- Full weight tracking support

### 3. API Endpoints

#### New Endpoint Required

```
GET /api/v3/workout-sessions/history/workout/{workout_id}/bonus
```

Returns bonus exercises from the most recent completed session for pre-population.

---

## 💻 Implementation Plan

### Phase 1: Backend API Enhancement (1-2 hours)

**File**: `backend/api/workout_sessions.py`

Add new endpoint to fetch bonus exercises from last session.

### Phase 2: Session Service Enhancement (2-3 hours)

**File**: `frontend/assets/js/services/workout-session-service.js`

Add methods:
- `addBonusExercise(name, sets, reps, rest, weight, unit)`
- `removeBonusExercise(exerciseName)`
- `getBonusExercises()`
- `getLastSessionBonusExercises(workoutId)`

### Phase 3: Navbar Integration (1 hour)

**Files**: 
- `frontend/assets/js/components/navbar-template.js`
- `frontend/assets/js/services/navbar-injection-service.js`

Add "Bonus" button with visibility toggle.

### Phase 4: Bonus Exercise Modal (3-4 hours)

**File**: `frontend/assets/js/controllers/workout-mode-controller.js`

Create complete modal with form, validation, and previous session display.

### Phase 5: UI Rendering Updates (2 hours)

Update `renderWorkout()` to render bonus exercises from session data.

### Phase 6: CSS Styling (1 hour)

**File**: `frontend/assets/css/workout-mode.css`

Style modal and enhance bonus exercise card styling.

### Phase 7: Testing & Polish (2-3 hours)

Comprehensive testing across all scenarios and devices.

---

## 🔄 User Flow

### Adding Bonus Exercise

1. User clicks "Bonus" button in navbar
2. Modal opens showing form + previous session's bonus exercises
3. User enters exercise details or clicks previous exercise to auto-fill
4. User clicks "Add Exercise"
5. Exercise added to session and card appears in workout view
6. Session auto-saves with bonus exercise data

### Starting Workout with Previous Bonus

1. User clicks "Start Workout"
2. System fetches last session's bonus exercises
3. Bonus exercises pre-populated in new session
4. User can modify, remove, or keep as-is
5. All changes tracked in current session

---

## 📊 Data Flow Example

### Session Data Structure

```json
{
  "id": "session-20250115-143022-abc123",
  "workout_id": "workout-push-day",
  "exercises_performed": [
    {
      "exercise_name": "Bench Press",
      "is_bonus": false,
      "order_index": 0
    },
    {
      "exercise_name": "Face Pulls",
      "is_bonus": true,
      "target_sets": "2",
      "target_reps": "15",
      "weight": 30,
      "weight_unit": "lbs",
      "order_index": 4
    }
  ]
}
```

---

## 🚀 Migration Strategy

### No Database Migration Needed!

The existing data model already supports everything we need. This is purely a UI/workflow enhancement.

**Backward Compatibility**: Fully compatible with all existing sessions.

---

## ✅ Success Criteria

### Functional Requirements
- User can add bonus exercises via navbar button
- Previous session's bonus exercises shown as reference
- Bonus exercises persist across sessions
- Weight tracking works for bonus exercises
- Historical sessions show bonus exercises performed

### Non-Functional Requirements
- Follows Sneat design patterns
- Mobile responsive
- Dark mode compatible
- Accessible
- Fast performance

---

## 📚 Related Documentation

- Workout Mode Architecture
- Workout Session Persistence
- Weight Logging Implementation
- Navbar Integration Guide

---

## 🎯 Next Steps

1. Review and approve this architecture
2. Switch to Code mode for implementation
3. Start with Phase 1 (Backend API)
4. Iterate through phases sequentially
5. Test thoroughly at each phase
6. Deploy to production

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-16  
**Status**: Ready for Implementation