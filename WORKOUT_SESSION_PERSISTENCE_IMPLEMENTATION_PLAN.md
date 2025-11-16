# Workout Session Persistence - Implementation Plan

## 📋 Overview

This document provides a detailed implementation plan for adding workout session persistence to Ghost Gym, ensuring users never lose their workout progress due to page refreshes, browser closures, or device issues.

## 🎯 Goals

1. **Automatic Session Persistence**: Save session state to localStorage on every change
2. **Seamless Recovery**: Restore sessions automatically on page load
3. **Smart Prompts**: Show user-friendly resume prompts with session details
4. **Session Expiration**: Auto-expire sessions after 24 hours
5. **Edge Case Handling**: Handle deleted workouts, multiple tabs, and offline scenarios

## 🏗️ Architecture Analysis

### Current State

The app already has excellent session management infrastructure:

- **[`WorkoutSessionService`](frontend/assets/js/services/workout-session-service.js:8)**: Manages session lifecycle, weight tracking, and API communication
- **[`WorkoutModeController`](frontend/assets/js/controllers/workout-mode-controller.js:8)**: Orchestrates UI and coordinates with services
- **Server-side Sessions**: API endpoints for creating, updating, and completing sessions
- **Exercise History**: Already fetches and displays previous workout data

### What's Missing

❌ **No client-side persistence** - Sessions exist only in memory  
❌ **No recovery mechanism** - Page refresh loses all progress  
❌ **No offline resilience** - Network issues can cause data loss

## 📊 Data Structure Design

### Session Storage Schema

```javascript
// localStorage key: 'ghost_gym_active_workout_session'
{
  sessionId: "session-abc123",           // Server session ID
  workoutId: "workout-xyz789",           // Workout template ID
  workoutName: "Push Day",               // Display name
  startedAt: "2025-11-16T17:30:00.000Z", // ISO timestamp
  status: "in_progress",                 // in_progress | paused | completed
  exercises: {
    "Bench Press": {
      weight: "135",                     // String (supports "4x45" format)
      weight_unit: "lbs",                // lbs | kg | other
      sets_completed: 2,                 // Number of sets done
      notes: ""                          // Optional notes
    },
    "Incline Dumbbell Press": {
      weight: "65",
      weight_unit: "lbs",
      sets_completed: 0,
      notes: ""
    }
  },
  lastUpdated: "2025-11-16T17:35:00.000Z", // Last persistence timestamp
  version: "1.0"                         // Schema version for future migrations
}
```

### Why This Structure?

✅ **Minimal but Complete**: Only stores essential data for recovery  
✅ **Self-contained**: Includes all info needed to restore UI state  
✅ **Timestamp-based**: Enables accurate elapsed time calculation  
✅ **Extensible**: Version field allows future schema updates  
✅ **Offline-friendly**: Works without network connection

## 🔧 Implementation Steps

### Step 1: Add Persistence Methods to WorkoutSessionService

**File**: [`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:1)

**Location**: After line 356 (before global instance creation)

```javascript
/**
 * Persist current session to localStorage
 */
persistSession() {
    if (!this.currentSession) {
        console.warn('⚠️ No active session to persist');
        return;
    }
    
    const sessionData = {
        sessionId: this.currentSession.id,
        workoutId: this.currentSession.workoutId,
        workoutName: this.currentSession.workoutName,
        startedAt: this.currentSession.startedAt.toISOString(),
        status: this.currentSession.status,
        exercises: this.currentSession.exercises || {},
        lastUpdated: new Date().toISOString(),
        version: '1.0'
    };
    
    try {
        localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
        console.log('💾 Session persisted:', sessionData.sessionId);
    } catch (error) {
        console.error('❌ Failed to persist session:', error);
        // Non-fatal - continue without persistence
    }
}

/**
 * Restore session from localStorage
 * @returns {Object|null} Restored session data or null
 */
restoreSession() {
    try {
        const stored = localStorage.getItem('ghost_gym_active_workout_session');
        if (!stored) {
            console.log('ℹ️ No persisted session found');
            return null;
        }
        
        const sessionData = JSON.parse(stored);
        
        // Validate required fields
        if (!sessionData.sessionId || !sessionData.workoutId || !sessionData.startedAt) {
            console.warn('⚠️ Invalid session data, clearing...');
            this.clearPersistedSession();
            return null;
        }
        
        // Check expiration (24 hours)
        const lastUpdated = new Date(sessionData.lastUpdated);
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate > 24) {
            console.log('⏰ Session expired (>24 hours), clearing...');
            this.clearPersistedSession();
            return null;
        }
        
        console.log('✅ Session restored:', sessionData.sessionId);
        return sessionData;
        
    } catch (error) {
        console.error('❌ Error restoring session:', error);
        this.clearPersistedSession();
        return null;
    }
}

/**
 * Clear persisted session from localStorage
 */
clearPersistedSession() {
    try {
        localStorage.removeItem('ghost_gym_active_workout_session');
        console.log('🧹 Persisted session cleared');
    } catch (error) {
        console.error('❌ Error clearing persisted session:', error);
    }
}

/**
 * Check if a persisted session exists
 * @returns {boolean}
 */
hasPersistedSession() {
    return !!localStorage.getItem('ghost_gym_active_workout_session');
}
```

### Step 2: Auto-Persist on Session Changes

**File**: [`frontend/assets/js/services/workout-session-service.js`](frontend/assets/js/services/workout-session-service.js:1)

**Modifications**:

1. **After [`startSession()`](frontend/assets/js/services/workout-session-service.js:70)** (line 70):
```javascript
console.log('✅ Workout session started:', session.id);
this.notifyListeners('sessionStarted', this.currentSession);

// ✨ NEW: Persist session immediately after start
this.persistSession();

return this.currentSession;
```

2. **After [`updateExerciseWeight()`](frontend/assets/js/services/workout-session-service.js:262)** (line 262):
```javascript
console.log('💪 Updated weight:', exerciseName, weight, unit);
this.notifyListeners('weightUpdated', { exerciseName, weight, unit });

// ✨ NEW: Persist after weight update
this.persistSession();
```

3. **After [`autoSaveSession()`](frontend/assets/js/services/workout-session-service.js:174)** (line 174):
```javascript
console.log('✅ Session auto-saved');
this.notifyListeners('sessionSaved', { sessionId: this.currentSession.id });

// ✨ NEW: Persist after auto-save
this.persistSession();
```

4. **After [`completeSession()`](frontend/assets/js/services/workout-session-service.js:125)** (line 125):
```javascript
console.log('✅ Workout session completed:', this.currentSession.id);
this.notifyListeners('sessionCompleted', completedSession);

// ✨ NEW: Clear persisted session after completion
this.clearPersistedSession();

return completedSession;
```

5. **In [`clearSession()`](frontend/assets/js/services/workout-session-service.js:315)** (line 315):
```javascript
console.log('🧹 Session cleared');
this.notifyListeners('sessionCleared', {});

// ✨ NEW: Clear persisted session
this.clearPersistedSession();
```

### Step 3: Add Session Restoration to Controller

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:1)

**Location**: In [`initialize()`](frontend/assets/js/controllers/workout-mode-controller.js:62) method, **BEFORE** line 76 (before getting workout ID from URL)

```javascript
async initialize() {
    try {
        console.log('🎮 Controller initialize() called');
        
        // Setup auth state listener (reuse existing service)
        this.authService.onAuthStateChange((user) => {
            this.handleAuthStateChange(user);
        });
        
        // ✨ NEW: Check for persisted session FIRST
        const persistedSession = this.sessionService.restoreSession();
        
        if (persistedSession) {
            console.log('🔄 Found persisted session, showing resume prompt...');
            await this.showResumeSessionPrompt(persistedSession);
            return; // Stop normal initialization
        }
        
        // Get workout ID from URL
        const workoutId = this.getWorkoutIdFromUrl();
        // ... rest of existing code
```

### Step 4: Create Resume Session Prompt

**File**: [`frontend/assets/js/controllers/workout-mode-controller.js`](frontend/assets/js/controllers/workout-mode-controller.js:1)

**Location**: Add new method after [`showLoginPrompt()`](frontend/assets/js/controllers/workout-mode-controller.js:1107) (around line 1177)

```javascript
/**
 * Show resume session prompt
 * @param {Object} sessionData - Persisted session data
 */
async showResumeSessionPrompt(sessionData) {
    // Calculate elapsed time
    const startedAt = new Date(sessionData.startedAt);
    const elapsedMinutes = Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60));
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    const remainingMinutes = elapsedMinutes % 60;
    
    // Format elapsed time display
    let elapsedDisplay;
    if (elapsedHours > 0) {
        elapsedDisplay = `${elapsedHours}h ${remainingMinutes}m ago`;
    } else {
        elapsedDisplay = `${elapsedMinutes} minutes ago`;
    }
    
    // Count exercises with weights
    const exercisesWithWeights = Object.keys(sessionData.exercises || {}).filter(
        name => sessionData.exercises[name].weight
    ).length;
    const totalExercises = Object.keys(sessionData.exercises || {}).length;
    
    // Create offcanvas HTML
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom" tabindex="-1" id="resumeSessionOffcanvas" 
             aria-labelledby="resumeSessionOffcanvasLabel" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="offcanvas-header border-bottom bg-primary">
                <h5 class="offcanvas-title text-white" id="resumeSessionOffcanvasLabel">
                    <i class="bx bx-history me-2"></i>Resume Workout?
                </h5>
            </div>
            <div class="offcanvas-body">
                <div class="text-center mb-4">
                    <div class="mb-3">
                        <i class="bx bx-dumbbell" style="font-size: 3rem; color: var(--bs-primary);"></i>
                    </div>
                    <h5 class="mb-2">${this.escapeHtml(sessionData.workoutName)}</h5>
                    <p class="text-muted mb-0">You have an active workout session</p>
                </div>
                
                <!-- Session Info -->
                <div class="row g-3 mb-4">
                    <div class="col-6">
                        <div class="card bg-label-primary">
                            <div class="card-body text-center py-3">
                                <div class="h5 mb-0">${elapsedDisplay}</div>
                                <small class="text-muted">Started</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-label-success">
                            <div class="card-body text-center py-3">
                                <div class="h5 mb-0">${exercisesWithWeights}/${totalExercises}</div>
                                <small class="text-muted">Weights Set</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Info Alert -->
                <div class="alert alert-info d-flex align-items-start mb-4">
                    <i class="bx bx-info-circle me-2 mt-1"></i>
                    <div>
                        <strong>Your progress is saved</strong>
                        <p class="mb-0 small">Resume to continue where you left off, or start fresh to begin a new session.</p>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="d-flex flex-column gap-2">
                    <button type="button" class="btn btn-primary" id="resumeSessionBtn">
                        <i class="bx bx-play me-1"></i>Resume Workout
                    </button>
                    <button type="button" class="btn btn-outline-secondary" id="startFreshBtn">
                        <i class="bx bx-refresh me-1"></i>Start Fresh
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing offcanvas if any
    const existingOffcanvas = document.getElementById('resumeSessionOffcanvas');
    if (existingOffcanvas) {
        existingOffcanvas.remove();
    }
    
    // Add offcanvas to body
    document.body.insertAdjacentHTML('beforeend', offcanvasHtml);
    
    // Initialize Bootstrap offcanvas
    const offcanvasElement = document.getElementById('resumeSessionOffcanvas');
    const offcanvas = new window.bootstrap.Offcanvas(offcanvasElement);
    
    // Setup button handlers
    const resumeBtn = document.getElementById('resumeSessionBtn');
    const startFreshBtn = document.getElementById('startFreshBtn');
    
    resumeBtn.addEventListener('click', async () => {
        resumeBtn.disabled = true;
        resumeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Resuming...';
        
        try {
            await this.resumeSession(sessionData);
            offcanvas.hide();
        } catch (error) {
            console.error('❌ Error resuming session:', error);
            resumeBtn.disabled = false;
            resumeBtn.innerHTML = '<i class="bx bx-play me-1"></i>Resume Workout';
            this.showError(error.message);
        }
    });
    
    startFreshBtn.addEventListener('click', () => {
        // Clear persisted session
        this.sessionService.clearPersistedSession();
        offcanvas.hide();
        
        // Continue with normal initialization
        setTimeout(() => {
            this.initialize();
        }, 300);
    });
    
    // Cleanup offcanvas on hide
    offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
        offcanvasElement.remove();
    });
    
    // Show offcanvas
    offcanvas.show();
}

/**
 * Resume a persisted session
 * @param {Object} sessionData - Persisted session data
 */
async resumeSession(sessionData) {
    try {
        console.log('🔄 Resuming workout session...');
        
        // Restore session to service
        this.sessionService.currentSession = {
            id: sessionData.sessionId,
            workoutId: sessionData.workoutId,
            workoutName: sessionData.workoutName,
            startedAt: new Date(sessionData.startedAt),
            status: sessionData.status,
            exercises: sessionData.exercises || {}
        };
        
        // Load the workout
        await this.loadWorkout(sessionData.workoutId);
        
        // Update UI to show active session
        this.updateSessionUI(true);
        
        // Start timer (will calculate from original start time)
        this.startSessionTimer();
        
        // Calculate elapsed time for display
        const elapsedMinutes = Math.floor(
            (Date.now() - this.sessionService.currentSession.startedAt.getTime()) / (1000 * 60)
        );
        
        // Show success message
        if (window.showAlert) {
            window.showAlert(
                `Workout resumed! You've been working out for ${elapsedMinutes} minutes.`,
                'success'
            );
        }
        
        console.log('✅ Session resumed successfully');
        
    } catch (error) {
        console.error('❌ Error resuming session:', error);
        
        // Clear invalid session
        this.sessionService.clearPersistedSession();
        
        // Show error and redirect
        this.showError('Failed to resume workout. The workout may have been deleted.');
        
        setTimeout(() => {
            window.location.href = 'workout-database.html';
        }, 3000);
        
        throw error;
    }
}
```

### Step 5: Handle Edge Cases

#### Edge Case 1: Workout Deleted

**Location**: In [`resumeSession()`](frontend/assets/js/controllers/workout-mode-controller.js:1) method (catch block)

Already handled above - if workout load fails, clear session and redirect.

#### Edge Case 2: Multiple Tabs

**Strategy**: Use "last write wins" - the most recent tab's session persists.

No additional code needed - localStorage naturally handles this.

#### Edge Case 3: Offline Mode

**Strategy**: Session persists in localStorage, syncs when online.

Already handled - localStorage works offline, and API calls will retry when online.

#### Edge Case 4: Session Exists but User Starts New Workout

**Location**: In [`handleStartWorkout()`](frontend/assets/js/controllers/workout-mode-controller.js:839)

**Modification**: Add check before starting new session

```javascript
async handleStartWorkout() {
    if (!this.currentWorkout) {
        console.error('No workout loaded');
        return;
    }
    
    // Check if user is authenticated
    if (!this.authService.isUserAuthenticated()) {
        this.showLoginPrompt();
        return;
    }
    
    // ✨ NEW: Check if there's a different persisted session
    const persistedSession = this.sessionService.restoreSession();
    if (persistedSession && persistedSession.workoutId !== this.currentWorkout.id) {
        const modalManager = this.getModalManager();
        modalManager.confirm(
            'Active Session Found',
            `You have an active session for "${persistedSession.workoutName}". Starting a new workout will end that session. Continue?`,
            async () => {
                // Clear old session and start new one
                this.sessionService.clearPersistedSession();
                await this.startNewSession();
            }
        );
        return;
    }
    
    await this.startNewSession();
}

/**
 * Start a new workout session (extracted for reuse)
 */
async startNewSession() {
    try {
        // Start session using service
        await this.sessionService.startSession(this.currentWorkout.id, this.currentWorkout.name);
        
        // Fetch exercise history
        await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);
        
        // Update UI
        this.updateSessionUI(true);
        
        // Re-render to show weight inputs
        this.renderWorkout();
        
        // Show success
        if (window.showAlert) {
            window.showAlert('Workout session started! 💪', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error starting workout:', error);
        const modalManager = this.getModalManager();
        modalManager.alert('Error', error.message, 'danger');
    }
}
```

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Start workout → Refresh page → Session resumes with correct timer
- [ ] Enter weights → Refresh page → Weights are restored
- [ ] Complete workout → Refresh page → No resume prompt (session cleared)
- [ ] Start workout → Close browser → Reopen → Session resumes

### Timer Accuracy
- [ ] Start workout → Wait 5 minutes → Refresh → Timer shows 5+ minutes
- [ ] Resume session → Timer continues from original start time
- [ ] Timer displays correctly in both header and floating widget

### Weight Persistence
- [ ] Set weight → Refresh → Weight appears in card badge
- [ ] Set multiple weights → Refresh → All weights restored
- [ ] Change weight → Refresh → Updated weight shown
- [ ] Weight units (lbs/kg/other) persist correctly

### Session Expiration
- [ ] Session older than 24 hours → Auto-expires, no prompt
- [ ] Session at 23 hours → Still shows resume prompt
- [ ] Expired session → localStorage cleared automatically

### Edge Cases
- [ ] Start workout A → Refresh → Try to start workout B → Confirmation prompt
- [ ] Resume session for deleted workout → Error message, redirect to database
- [ ] Multiple tabs open → Last active session persists
- [ ] Offline mode → Session persists, syncs when online
- [ ] Invalid session data → Cleared automatically, no errors

### UI/UX
- [ ] Resume prompt shows correct workout name
- [ ] Elapsed time displays correctly (minutes/hours)
- [ ] Exercise count shows weights set vs total
- [ ] "Start Fresh" clears session and allows new start
- [ ] Success message shows correct elapsed time on resume

## 📈 Success Metrics

After implementation, users should experience:

1. **Zero Data Loss**: No workout progress lost due to technical issues
2. **Seamless Recovery**: Resume within 2 clicks from any interruption
3. **Accurate Tracking**: Timer and weights exactly as they were
4. **Clear Communication**: Users understand what's happening at each step
5. **Reliable Persistence**: Works offline and across browser restarts

## 🚀 Deployment Strategy

### Phase 1: Core Implementation (Day 1)
- Add persistence methods to WorkoutSessionService
- Implement auto-persist on all session changes
- Add basic restoration check in controller

### Phase 2: UI & UX (Day 2)
- Create resume session prompt offcanvas
- Implement resumeSession() logic
- Add success/error messaging

### Phase 3: Edge Cases (Day 3)
- Handle deleted workouts
- Add session conflict detection
- Implement expiration logic

### Phase 4: Testing & Polish (Day 4)
- Comprehensive testing across scenarios
- Fix any discovered issues
- Update documentation

## 📝 Documentation Updates

After implementation, update:

1. **User Guide**: Add section on session persistence
2. **Developer Docs**: Document persistence architecture
3. **API Docs**: Note that sessions persist client-side
4. **Troubleshooting**: Add common session recovery issues

## 🎯 Next Steps

Ready to implement? Here's the recommended order:

1. ✅ Review this plan with stakeholders
2. ⏭️ Switch to Code mode to implement Step 1 (persistence methods)
3. ⏭️ Test persistence methods in isolation
4. ⏭️ Implement Step 2 (auto-persist hooks)
5. ⏭️ Implement Steps 3-4 (restoration & UI)
6. ⏭️ Implement Step 5 (edge cases)
7. ⏭️ Comprehensive testing
8. ⏭️ Deploy to production

---

**Questions or concerns?** Review this plan carefully before proceeding to implementation. The architecture is designed to integrate seamlessly with existing code while adding robust session persistence.