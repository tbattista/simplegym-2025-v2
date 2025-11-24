# Weight Logging Frontend - Quick Start Guide
**For Developers Ready to Implement**

## 🎯 What You're Building

Add weight logging to Workout Mode so users can:
1. **Start a workout** → Creates session, fetches last weights
2. **Log weights** → Auto-saves as they type
3. **Complete workout** → Finalizes session, updates history
4. **View history** → See past sessions and progress

---

## 📋 Prerequisites

✅ **Backend is ready:**
- API endpoints working at `/api/v3/workout-sessions`
- Exercise history at `/api/v3/exercise-history`
- Test data exists in Firestore

✅ **You need:**
- Firebase authentication working
- Existing workout mode UI functional
- Basic understanding of async/await JavaScript

---

## 🚀 Implementation Order

### Phase 1: Basic Session (Start Here!)
**Time:** 4-5 hours  
**Files:** `workout-mode.html`, `workout-mode.js`

1. Add session state to global object
2. Add "Start Workout" button to HTML
3. Implement `startWorkoutSession()` function
4. Implement `fetchExerciseHistory()` function
5. Add "Complete Workout" button
6. Implement `completeWorkoutSession()` function
7. Test: Start → Complete workflow

### Phase 2: Weight Inputs & Auto-Save
**Time:** 4-5 hours  
**Files:** `workout-mode.js`, `workout-mode.css`

1. Modify `renderExerciseCard()` to add weight inputs
2. Implement `onWeightChange()` handler
3. Implement `scheduleAutoSave()` with debounce
4. Implement `autoSaveSession()` API call
5. Add CSS styles for weight inputs
6. Test: Edit weight → Auto-saves after 2 seconds

### Phase 3: Visual Polish
**Time:** 3-4 hours  
**Files:** `workout-mode.js`, `workout-mode.css`

1. Implement `updateWeightChangeIndicator()`
2. Add session timer display
3. Add loading states
4. Add success animations
5. Test: All visual feedback works

### Phase 4: History View
**Time:** 4-5 hours  
**Files:** `workout-mode.html`, `workout-mode.js`

1. Add history section to HTML
2. Implement `fetchWorkoutHistory()`
3. Implement `renderWorkoutHistory()`
4. Add toggle functionality
5. Test: History displays correctly

---

## 🔑 Key Code Snippets

### 1. Session State (Add to global object)
```javascript
window.ghostGym.workoutMode = {
    // Existing...
    currentWorkout: null,
    
    // NEW: Add these
    session: {
        id: null,
        workoutId: null,
        status: 'not_started',
        startedAt: null,
        exercises: {},
        autoSaveTimer: null
    },
    exerciseHistory: {}
};
```

### 2. Start Session (Core function)
```javascript
async function startWorkoutSession(workoutId, workoutName) {
    const token = await getAuthToken();
    
    const response = await fetch('/api/v3/workout-sessions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            workout_id: workoutId,
            workout_name: workoutName,
            started_at: new Date().toISOString()
        })
    });
    
    const session = await response.json();
    window.ghostGym.workoutMode.session.id = session.id;
    window.ghostGym.workoutMode.session.status = 'in_progress';
    
    await fetchExerciseHistory(workoutId);
    renderExerciseCards(workout); // Re-render with weights
}
```

### 3. Weight Input HTML (Add to exercise card)
```html
<div class="weight-input-section">
    <label>Weight</label>
    <div class="input-group">
        <input 
            type="number" 
            class="form-control weight-input"
            value="${lastWeight}"
            onchange="onWeightChange('${exerciseName}', this.value)"
        >
        <select class="form-select">
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
        </select>
    </div>
</div>
```

### 4. Auto-Save with Debounce
```javascript
function onWeightChange(exerciseName, weight) {
    // Update local state
    session.exercises[exerciseName] = { weight: parseFloat(weight) };
    
    // Debounce auto-save
    clearTimeout(session.autoSaveTimer);
    session.autoSaveTimer = setTimeout(autoSaveSession, 2000);
}

async function autoSaveSession() {
    await fetch(`/api/v3/workout-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            exercises_performed: Object.values(session.exercises)
        })
    });
}
```

### 5. Complete Session
```javascript
async function completeWorkoutSession() {
    const exercisesPerformed = collectExerciseData();
    
    await fetch(`/api/v3/workout-sessions/${session.id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            completed_at: new Date().toISOString(),
            exercises_performed: exercisesPerformed
        })
    });
    
    showCompletionSummary();
}
```

---

## 🧪 Testing Checklist

After each phase:

**Phase 1:**
- [ ] Click "Start Workout" → Session created
- [ ] Check browser console → Session ID logged
- [ ] Click "Complete" → Success message shown

**Phase 2:**
- [ ] Weight inputs show last used weights
- [ ] Edit weight → Auto-saves after 2 seconds
- [ ] Check Network tab → PATCH request sent

**Phase 3:**
- [ ] Weight change shows green/red badge
- [ ] Session timer counts up
- [ ] Loading spinners appear during API calls

**Phase 4:**
- [ ] History section shows past sessions
- [ ] Toggle button expands/collapses history
- [ ] Empty state shows when no history

---

## 🐛 Common Issues & Solutions

### Issue: "Authentication required" error
```javascript
// Solution: Check if user is logged in
const user = firebase.auth().currentUser;
if (!user) {
    console.error('User not authenticated');
    return;
}
```

### Issue: Auto-save not working
```javascript
// Solution: Add debug logging
function scheduleAutoSave() {
    console.log('🔄 Scheduling auto-save...');
    clearTimeout(session.autoSaveTimer);
    session.autoSaveTimer = setTimeout(() => {
        console.log('💾 Auto-saving now...');
        autoSaveSession();
    }, 2000);
}
```

### Issue: Last weights not showing
```javascript
// Solution: Check exercise name matching
console.log('Exercise name:', exerciseName);
console.log('History keys:', Object.keys(exerciseHistory));
// Names must match exactly (case-sensitive)
```

### Issue: Session timer not starting
```javascript
// Solution: Verify interval is set
function startSessionTimer() {
    console.log('⏱️ Starting timer...');
    session.timerInterval = setInterval(() => {
        console.log('Timer tick');
        updateTimerDisplay();
    }, 1000);
}
```

---

## 📁 Files to Modify

### 1. `frontend/workout-mode.html`
**Changes:**
- Add session controls section (line ~96)
- Add complete workout button (line ~156)
- Add history section (before exercise cards)

**Lines to add:** ~50 lines

### 2. `frontend/assets/js/workout-mode.js`
**Changes:**
- Add session state to global object
- Add 10+ new functions
- Modify `renderExerciseCard()`
- Modify `loadWorkout()`

**Lines to add:** ~400 lines

### 3. `frontend/assets/css/workout-mode.css`
**Changes:**
- Add weight input styles
- Add session control styles
- Add loading states
- Add mobile responsive rules

**Lines to add:** ~100 lines

---

## 🎓 Learning Resources

### API Endpoints Reference
```
POST   /api/v3/workout-sessions              # Start workout
GET    /api/v3/workout-sessions/{id}         # Get session
PATCH  /api/v3/workout-sessions/{id}         # Auto-save
POST   /api/v3/workout-sessions/{id}/complete # Complete
GET    /api/v3/workout-sessions?workout_id=X # List sessions
GET    /api/v3/exercise-history/workout/{id} # Get last weights
```

### Data Models
```javascript
// Session
{
    id: "session-20251107-140000-abc123",
    workout_id: "workout-06fad623",
    status: "in_progress",
    started_at: "2025-11-07T14:00:00Z",
    exercises_performed: [...]
}

// Exercise Performance
{
    exercise_name: "Barbell Bench Press",
    weight: 185,
    weight_unit: "lbs",
    sets_completed: 4,
    previous_weight: 180,
    weight_change: 5
}

// Exercise History
{
    last_weight: 185,
    last_weight_unit: "lbs",
    total_sessions: 12,
    best_weight: 205
}
```

---

## 🚀 Quick Start Commands

### 1. Backup Current Files
```bash
cp frontend/workout-mode.html frontend/workout-mode.html.backup
cp frontend/assets/js/workout-mode.js frontend/assets/js/workout-mode.js.backup
cp frontend/assets/css/workout-mode.css frontend/assets/css/workout-mode.css.backup
```

### 2. Test Locally
```bash
# Start local server
python run.py

# Open in browser
http://localhost:8000/workout-mode.html?id=workout-06fad623
```

### 3. Deploy
```bash
git add frontend/
git commit -m "feat: Add weight logging to Workout Mode"
git push origin main
```

---

## ✅ Success Criteria

You're done when:
- [ ] User can start a workout session
- [ ] Last weights auto-populate
- [ ] Weight changes auto-save
- [ ] User can complete workout
- [ ] History displays past sessions
- [ ] All features work on mobile
- [ ] No console errors

---

## 📞 Need Help?

**Documentation:**
- Full plan: [`WEIGHT_LOGGING_FRONTEND_INTEGRATION_PLAN.md`](WEIGHT_LOGGING_FRONTEND_INTEGRATION_PLAN.md)
- Backend API: [`WEIGHT_LOGGING_QUICK_REFERENCE.md`](WEIGHT_LOGGING_QUICK_REFERENCE.md)
- Architecture: [`WEIGHT_LOGGING_DATABASE_ARCHITECTURE.md`](WEIGHT_LOGGING_DATABASE_ARCHITECTURE.md)

**Debug Mode:**
```javascript
// In browser console
window.ghostGym.workoutMode.debug = true;
console.log(window.ghostGym.workoutMode.session);
console.log(window.ghostGym.workoutMode.exerciseHistory);
```

---

**Ready to start?** Begin with Phase 1 and work through each phase sequentially. Good luck! 💪