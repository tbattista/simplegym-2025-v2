# Workout Session Persistence - Implementation Prompt

## Problem Statement

Currently, when a user is in an active workout session and:
- Refreshes the page
- Closes their browser/phone
- Phone dies or loses connection
- Navigates away accidentally

**The workout session is lost.** They have to start over from scratch, losing all progress including:
- Elapsed workout time
- Weights entered for exercises
- Which exercises they've completed
- Any notes or modifications made during the session

## Goal

Implement **workout session persistence** so that active workouts continue running in the background and can be seamlessly restored when the user returns, as if they never left the page.

## Requirements

### 1. Session State Persistence
When a workout session is active, persist to storage:
- ✅ Session ID
- ✅ Workout ID and name
- ✅ Start timestamp (to calculate elapsed time)
- ✅ Current session status (`in_progress`, `paused`, `completed`)
- ✅ All exercise weights entered so far
- ✅ Exercise completion status
- ✅ Any session notes or modifications

### 2. Automatic Session Recovery
On page load:
- ✅ Check if there's an active session in storage
- ✅ If found, automatically restore the session state
- ✅ Calculate correct elapsed time from original start timestamp
- ✅ Restore all exercise weights and progress
- ✅ Show a notification: "Resuming your workout from [X] minutes ago"
- ✅ Continue timer from where it left off

### 3. Session Cleanup
- ✅ Clear persisted session when workout is completed
- ✅ Clear persisted session when user explicitly abandons workout
- ✅ Optional: Auto-expire sessions after 24 hours

### 4. Edge Cases to Handle
- ✅ User starts new workout while old session exists → Prompt to resume or start fresh
- ✅ Session exists but workout template was deleted → Show error, clear session
- ✅ Multiple tabs open → Use last active session
- ✅ Offline mode → Session persists in localStorage, syncs when online

## Technical Implementation

### Storage Strategy

**Use localStorage for session persistence** (works offline, persists across page reloads):

```javascript
// Session storage key
const SESSION_KEY = 'ghost_gym_active_workout_session';

// Session data structure
{
  sessionId: "session-123",
  workoutId: "workout-456",
  workoutName: "Push Day",
  startedAt: "2025-11-16T17:30:00.000Z", // ISO timestamp
  status: "in_progress",
  exercises: {
    "Bench Press": {
      weight: "135",
      weight_unit: "lbs",
      sets_completed: 2,
      notes: ""
    },
    "Incline Dumbbell Press": {
      weight: "65",
      weight_unit: "lbs",
      sets_completed: 0,
      notes: ""
    }
  },
  lastUpdated: "2025-11-16T17:35:00.000Z"
}
```

### Files to Modify

1. **`frontend/assets/js/services/workout-session-service.js`**
   - Add `persistSession()` method
   - Add `restoreSession()` method
   - Add `clearPersistedSession()` method
   - Call `persistSession()` on every weight update
   - Call `clearPersistedSession()` on workout completion

2. **`frontend/assets/js/controllers/workout-mode-controller.js`**
   - Check for persisted session in `initialize()` method
   - Show resume prompt if session found
   - Restore session state if user chooses to resume
   - Calculate elapsed time from original start timestamp

3. **New: `frontend/assets/js/services/session-persistence-service.js`** (Optional)
   - Dedicated service for session persistence logic
   - Handles storage, retrieval, and cleanup
   - Manages session expiration

### Implementation Steps

#### Step 1: Add Session Persistence to Service
```javascript
// In workout-session-service.js

persistSession() {
  if (!this.currentSession) return;
  
  const sessionData = {
    sessionId: this.currentSession.id,
    workoutId: this.currentSession.workoutId,
    workoutName: this.currentSession.workoutName,
    startedAt: this.currentSession.startedAt.toISOString(),
    status: this.currentSession.status,
    exercises: this.currentSession.exercises,
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
  console.log('💾 Session persisted to localStorage');
}

restoreSession() {
  const stored = localStorage.getItem('ghost_gym_active_workout_session');
  if (!stored) return null;
  
  try {
    const sessionData = JSON.parse(stored);
    
    // Check if session is expired (older than 24 hours)
    const lastUpdated = new Date(sessionData.lastUpdated);
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 24) {
      console.log('⏰ Session expired, clearing...');
      this.clearPersistedSession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('❌ Error restoring session:', error);
    return null;
  }
}

clearPersistedSession() {
  localStorage.removeItem('ghost_gym_active_workout_session');
  console.log('🧹 Persisted session cleared');
}
```

#### Step 2: Auto-persist on Updates
```javascript
// In workout-session-service.js

updateExerciseWeight(exerciseName, weight, unit) {
  // ... existing code ...
  
  // Auto-persist after every update
  this.persistSession();
}

async autoSaveSession(exercisesPerformed) {
  // ... existing code ...
  
  // Persist after auto-save
  this.persistSession();
}
```

#### Step 3: Check for Session on Page Load
```javascript
// In workout-mode-controller.js

async initialize() {
  try {
    // ... existing code ...
    
    // Check for persisted session BEFORE loading workout
    const persistedSession = this.sessionService.restoreSession();
    
    if (persistedSession) {
      // Show resume prompt
      await this.showResumeSessionPrompt(persistedSession);
      return; // Don't continue normal initialization
    }
    
    // ... rest of existing code ...
  } catch (error) {
    console.error('❌ Controller initialization failed:', error);
  }
}
```

#### Step 4: Resume Session Prompt
```javascript
// In workout-mode-controller.js

async showResumeSessionPrompt(sessionData) {
  const elapsedMinutes = Math.floor((Date.now() - new Date(sessionData.startedAt).getTime()) / (1000 * 60));
  
  const modalManager = this.getModalManager();
  
  modalManager.confirm(
    '🏋️ Resume Workout?',
    `You have an active workout session for <strong>${sessionData.workoutName}</strong> that started ${elapsedMinutes} minutes ago. Would you like to resume where you left off?`,
    async () => {
      // User chose to resume
      await this.resumeSession(sessionData);
    },
    () => {
      // User chose to start fresh
      this.sessionService.clearPersistedSession();
      // Continue with normal initialization
      this.initialize();
    }
  );
}
```

#### Step 5: Resume Session Logic
```javascript
// In workout-mode-controller.js

async resumeSession(sessionData) {
  try {
    console.log('🔄 Resuming workout session...');
    
    // Restore session to service
    this.currentSession = {
      id: sessionData.sessionId,
      workoutId: sessionData.workoutId,
      workoutName: sessionData.workoutName,
      startedAt: new Date(sessionData.startedAt),
      status: sessionData.status,
      exercises: sessionData.exercises
    };
    
    this.sessionService.currentSession = this.currentSession;
    
    // Load the workout
    await this.loadWorkout(sessionData.workoutId);
    
    // Update UI to show active session
    this.updateSessionUI(true);
    
    // Start timer (will calculate from original start time)
    this.startSessionTimer();
    
    // Show success message
    if (window.showAlert) {
      window.showAlert(`Workout resumed! You've been working out for ${Math.floor((Date.now() - this.currentSession.startedAt.getTime()) / (1000 * 60))} minutes.`, 'success');
    }
    
  } catch (error) {
    console.error('❌ Error resuming session:', error);
    this.sessionService.clearPersistedSession();
    this.showError('Failed to resume workout. Starting fresh.');
  }
}
```

#### Step 6: Clear on Completion
```javascript
// In workout-mode-controller.js

async handleCompleteWorkout() {
  // ... existing code ...
  
  // Clear persisted session after completion
  this.sessionService.clearPersistedSession();
}
```

## User Experience Flow

### Scenario 1: Normal Resume
1. User starts workout at 2:00 PM
2. Phone dies at 2:15 PM (15 minutes in)
3. User charges phone, opens app at 2:30 PM
4. **Prompt appears:** "Resume workout? Started 30 minutes ago"
5. User clicks "Resume"
6. Timer shows 30:00 and continues counting
7. All weights are still there
8. User continues workout seamlessly

### Scenario 2: Start Fresh
1. User has old session from yesterday
2. Opens app today
3. **Prompt appears:** "Resume workout? Started 1440 minutes ago"
4. User clicks "Start Fresh"
5. Old session cleared
6. New workout starts normally

### Scenario 3: Expired Session
1. User has session from 2 days ago
2. Opens app
3. Session auto-expires (>24 hours old)
4. No prompt shown
5. Normal workout selection flow

## Testing Checklist

- [ ] Start workout, refresh page → Session resumes
- [ ] Start workout, close browser, reopen → Session resumes
- [ ] Start workout, wait 5 minutes, refresh → Timer shows correct elapsed time
- [ ] Enter weights, refresh → Weights are restored
- [ ] Complete workout → Persisted session is cleared
- [ ] Start workout, abandon, start new → Prompt to resume or start fresh
- [ ] Session older than 24 hours → Auto-expires, no prompt
- [ ] Offline mode → Session persists in localStorage
- [ ] Multiple tabs → Last active session is used

## Benefits

✅ **Never lose workout progress** - Phone dies? No problem.
✅ **Seamless experience** - Resume exactly where you left off
✅ **Accurate time tracking** - Timer continues from original start time
✅ **Offline support** - Works without internet connection
✅ **User confidence** - Users can freely navigate without fear of losing data

## Potential Enhancements

1. **Session History** - Show list of recent sessions to resume
2. **Auto-save indicator** - Show "Saved" badge when session persists
3. **Sync across devices** - Store session in Firestore for multi-device access
4. **Session notes** - Allow users to add notes during workout
5. **Pause/Resume** - Explicit pause button to stop timer but keep session

---

## Copy-Paste Prompt for New Chat

```
I need to implement workout session persistence in my Ghost Gym app. Currently, if a user refreshes the page, closes their browser, or their phone dies during an active workout, they lose all progress and have to start over.

I want to implement a system where:
1. Active workout sessions are automatically saved to localStorage
2. When the user returns, they see a prompt to resume their workout
3. The timer continues from the original start time
4. All exercise weights and progress are restored
5. Sessions auto-expire after 24 hours

Key files to modify:
- frontend/assets/js/services/workout-session-service.js (add persistence methods)
- frontend/assets/js/controllers/workout-mode-controller.js (add resume logic)

The session should persist:
- Session ID and workout ID
- Start timestamp
- All exercise weights entered
- Session status

Please implement this feature with proper error handling and a good UX for the resume prompt.