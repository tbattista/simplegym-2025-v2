# Add Autosave to workout-editor.js
**Simple, focused implementation plan**

## 🎯 Goal

Add the autosave feature from [`workouts.js`](frontend/assets/js/dashboard/workouts.js:1) to [`workout-editor.js`](frontend/assets/js/components/workout-editor.js:1)

## 📋 What to Copy

### 1. Autosave Configuration & State (Lines 13-25 from workouts.js)

```javascript
// Add to top of workout-editor.js after the header comment

// Autosave configuration
const AUTOSAVE_DEBOUNCE_MS = 3000; // 3 seconds
let autosaveTimeout = null;
let lastSaveTime = null;

// Ensure autosave state exists
window.ghostGym = window.ghostGym || {};
window.ghostGym.workoutBuilder = window.ghostGym.workoutBuilder || {
    isDirty: false,
    isAutosaving: false,
    selectedWorkoutId: null,
    autosaveEnabled: true
};
```

### 2. Core Autosave Functions (Lines 30-155 from workouts.js)

```javascript
/**
 * Schedule autosave with debounce
 */
function scheduleAutosave() {
    if (!window.ghostGym.workoutBuilder.autosaveEnabled) {
        return;
    }
    
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
        if (window.ghostGym.workoutBuilder.isDirty &&
            window.ghostGym.workoutBuilder.selectedWorkoutId) {
            autoSaveWorkout();
        }
    }, AUTOSAVE_DEBOUNCE_MS);
}

/**
 * Perform autosave
 */
async function autoSaveWorkout() {
    if (window.ghostGym.workoutBuilder.isAutosaving) {
        return; // Prevent concurrent saves
    }
    
    try {
        window.ghostGym.workoutBuilder.isAutosaving = true;
        updateSaveStatus('saving');
        
        // Use the existing saveWorkoutFromEditor function
        await saveWorkoutFromEditor(true); // Pass true for silent mode
        
        window.ghostGym.workoutBuilder.isDirty = false;
        lastSaveTime = new Date();
        updateSaveStatus('saved');
        
        console.log('✅ Workout auto-saved successfully');
        
    } catch (error) {
        console.error('❌ Autosave failed:', error);
        updateSaveStatus('error');
    } finally {
        window.ghostGym.workoutBuilder.isAutosaving = false;
    }
}

/**
 * Update relative save time display
 */
function updateRelativeSaveTime() {
    if (!lastSaveTime) return;
    
    const saveStatus = document.getElementById('saveStatus');
    if (!saveStatus) return;
    
    const now = new Date();
    const seconds = Math.floor((now - lastSaveTime) / 1000);
    
    if (seconds < 60) {
        saveStatus.textContent = 'Saved just now';
    } else if (seconds < 120) {
        saveStatus.textContent = 'Saved 1 min ago';
    } else if (seconds < 3600) {
        saveStatus.textContent = `Saved ${Math.floor(seconds / 60)} mins ago`;
    } else {
        saveStatus.textContent = 'All changes saved';
    }
}

// Update relative time every 30 seconds
setInterval(updateRelativeSaveTime, 30000);
```

### 3. Update Existing `markEditorDirty()` Function

**REPLACE the current function (line 365) with:**

```javascript
/**
 * Mark editor as dirty (has unsaved changes)
 */
function markEditorDirty() {
    if (!window.ghostGym.workoutBuilder.isEditing) return;
    
    // Don't mark dirty for new unsaved workouts
    if (!window.ghostGym.workoutBuilder.selectedWorkoutId) {
        return;
    }
    
    window.ghostGym.workoutBuilder.isDirty = true;
    updateSaveStatus('unsaved');
    scheduleAutosave(); // ← ADD THIS LINE
}
```

### 4. Update Existing `updateSaveStatus()` Function

**REPLACE the current function (line 376) with:**

```javascript
/**
 * Update save status indicator
 * @param {string} status - 'unsaved', 'saving', 'saved', 'error', or ''
 */
function updateSaveStatus(status) {
    const saveStatus = document.getElementById('saveStatus');
    if (!saveStatus) return;
    
    saveStatus.className = `save-status ${status}`;
    
    switch (status) {
        case 'unsaved':
            saveStatus.textContent = 'Unsaved changes';
            break;
        case 'saving':
            saveStatus.textContent = 'Saving...';
            break;
        case 'saved':
            saveStatus.textContent = 'All changes saved';
            // Show relative time after a moment
            setTimeout(() => {
                if (lastSaveTime) {
                    updateRelativeSaveTime();
                }
            }, 2000);
            break;
        case 'error':
            saveStatus.textContent = 'Save failed';
            break;
        default:
            saveStatus.textContent = '';
    }
}
```

### 5. Update `saveWorkoutFromEditor()` Function

**MODIFY to support silent mode (line 201):**

```javascript
/**
 * Save workout from editor
 * @param {boolean} silent - If true, don't show alerts (for autosave)
 */
async function saveWorkoutFromEditor(silent = false) {
    console.log('💾 Saving workout from editor...');
    
    const workoutData = {
        name: document.getElementById('workoutName').value.trim(),
        description: document.getElementById('workoutDescription').value.trim(),
        tags: document.getElementById('workoutTags').value
            .split(',').map(t => t.trim()).filter(t => t),
        exercise_groups: collectExerciseGroups(),
        bonus_exercises: collectBonusExercises()
    };
    
    // Validate
    if (!workoutData.name) {
        if (!silent) {
            showAlert('Workout name is required', 'danger');
            document.getElementById('workoutName').focus();
        }
        return;
    }
    
    if (workoutData.exercise_groups.length === 0) {
        if (!silent) {
            showAlert('At least one exercise group is required', 'danger');
        }
        return;
    }
    
    try {
        // Show saving status
        updateSaveStatus('saving');
        
        // Only update button for manual saves
        const saveBtn = document.getElementById('saveWorkoutBtn');
        if (!silent && saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
            saveBtn.disabled = true;
        }
        
        let savedWorkout;
        
        if (window.ghostGym.workoutBuilder.selectedWorkoutId) {
            // Update existing workout
            const workoutId = window.ghostGym.workoutBuilder.selectedWorkoutId;
            savedWorkout = await window.dataManager.updateWorkout(workoutId, workoutData);
            
            // Update in local array
            const index = window.ghostGym.workouts.findIndex(w => w.id === workoutId);
            if (index !== -1) {
                window.ghostGym.workouts[index] = savedWorkout;
            }
            
            if (!silent) {
                showAlert(`Workout "${savedWorkout.name}" updated successfully!`, 'success');
            }
        } else {
            // Create new workout
            savedWorkout = await window.dataManager.createWorkout(workoutData);
            window.ghostGym.workouts.unshift(savedWorkout);
            window.ghostGym.workoutBuilder.selectedWorkoutId = savedWorkout.id;
            
            if (!silent) {
                showAlert(`Workout "${savedWorkout.name}" created successfully!`, 'success');
            }
        }
        
        // Update state
        window.ghostGym.workoutBuilder.isDirty = false;
        window.ghostGym.workoutBuilder.currentWorkout = { ...savedWorkout };
        
        // Refresh library
        if (window.renderWorkoutsView) {
            window.renderWorkoutsView();
        }
        
        // Update save status
        updateSaveStatus('saved');
        lastSaveTime = new Date();
        
        // Show delete button now that workout is saved
        document.getElementById('deleteWorkoutBtn').style.display = 'inline-block';
        
        console.log('✅ Workout saved successfully');
        
    } catch (error) {
        console.error('❌ Error saving workout:', error);
        if (!silent) {
            showAlert('Failed to save workout: ' + error.message, 'danger');
        }
        updateSaveStatus('error');
        throw error; // Re-throw for autosave error handling
    } finally {
        // Reset button (only for manual saves)
        if (!silent) {
            const saveBtn = document.getElementById('saveWorkoutBtn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Workout';
                saveBtn.disabled = false;
            }
        }
    }
}
```

### 6. Add Autosave Listeners to Dynamic Elements

**ADD this function:**

```javascript
/**
 * Add autosave listeners to exercise group inputs
 */
function addAutosaveListenersToGroup(groupElement) {
    if (!groupElement) return;
    
    const inputs = groupElement.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', markEditorDirty);
        input.addEventListener('change', markEditorDirty);
    });
}
```

**UPDATE `setupWorkoutEditorListeners()` to add autosave listeners:**

```javascript
function setupWorkoutEditorListeners() {
    // Form field change listeners
    const formFields = ['workoutName', 'workoutDescription', 'workoutTags'];
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', markEditorDirty);
            field.addEventListener('change', markEditorDirty);
        }
    });
    
    // ... rest of existing listeners ...
    
    console.log('✅ Workout editor listeners setup (with autosave)');
}
```

### 7. Update Global Exports

**ADD to the bottom of the file:**

```javascript
// Make autosave functions globally available
window.scheduleAutosave = scheduleAutosave;
window.autoSaveWorkout = autoSaveWorkout;
window.updateRelativeSaveTime = updateRelativeSaveTime;
window.addAutosaveListenersToGroup = addAutosaveListenersToGroup;
```

---

## 🔗 Dependencies from workouts.js

Your `workout-editor.js` already calls these functions from `workouts.js`:

```javascript
// These are loaded from workouts.js (which is loaded on workouts.html)
- addExerciseGroup()
- addBonusExercise()
- collectExerciseGroups()
- collectBonusExercises()
- updateExerciseGroupPreview()
- initializeExerciseGroupSorting()
- initializeEditMode()
- initializeExerciseAutocompletes()
- updateMetadataButtonStates()
```

**These are fine to keep as dependencies** - they're shared utility functions that work for both systems.

---

## 📝 Complete Modified workout-editor.js

Here's the structure after adding autosave:

```javascript
/**
 * Ghost Gym - Workout Editor Component
 * Inline workout editor for the workout builder page
 * @version 2.0.0 - Added autosave functionality
 */

// ============================================
// AUTOSAVE CONFIGURATION
// ============================================

const AUTOSAVE_DEBOUNCE_MS = 3000;
let autosaveTimeout = null;
let lastSaveTime = null;

window.ghostGym = window.ghostGym || {};
window.ghostGym.workoutBuilder = window.ghostGym.workoutBuilder || {
    isDirty: false,
    isAutosaving: false,
    selectedWorkoutId: null,
    autosaveEnabled: true
};

// ============================================
// AUTOSAVE FUNCTIONS
// ============================================

function scheduleAutosave() { /* ... */ }
async function autoSaveWorkout() { /* ... */ }
function updateRelativeSaveTime() { /* ... */ }
setInterval(updateRelativeSaveTime, 30000);

// ============================================
// EDITOR FUNCTIONS (existing, with updates)
// ============================================

function loadWorkoutIntoEditor(workoutId) { /* existing code */ }
function createNewWorkoutInEditor() { /* existing code */ }
async function saveWorkoutFromEditor(silent = false) { /* UPDATED */ }
function cancelEditWorkout() { /* existing code */ }
async function deleteWorkoutFromEditor() { /* existing code */ }

function markEditorDirty() { /* UPDATED to call scheduleAutosave() */ }
function updateSaveStatus(status) { /* UPDATED with better status handling */ }
function addAutosaveListenersToGroup(groupElement) { /* NEW */ }

function highlightSelectedWorkout(workoutId) { /* existing code */ }
function setupWorkoutEditorListeners() { /* existing code */ }

// ============================================
// INITIALIZATION
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWorkoutEditorListeners);
} else {
    setupWorkoutEditorListeners();
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.loadWorkoutIntoEditor = loadWorkoutIntoEditor;
window.createNewWorkoutInEditor = createNewWorkoutInEditor;
window.saveWorkoutFromEditor = saveWorkoutFromEditor;
window.cancelEditWorkout = cancelEditWorkout;
window.deleteWorkoutFromEditor = deleteWorkoutFromEditor;
window.markEditorDirty = markEditorDirty;
window.updateSaveStatus = updateSaveStatus;
window.highlightSelectedWorkout = highlightSelectedWorkout;

// Autosave exports
window.scheduleAutosave = scheduleAutosave;
window.autoSaveWorkout = autoSaveWorkout;
window.updateRelativeSaveTime = updateRelativeSaveTime;
window.addAutosaveListenersToGroup = addAutosaveListenersToGroup;

console.log('📦 Workout Editor component loaded (with autosave)');
```

---

## ✅ Testing Checklist

After implementing:

1. ✅ Open `workouts.html`
2. ✅ Create or edit a workout
3. ✅ Make a change (type in name field)
4. ✅ Wait 3 seconds
5. ✅ Verify "Saving..." appears
6. ✅ Verify "All changes saved" appears
7. ✅ Verify relative time updates ("Saved just now", "Saved 1 min ago")
8. ✅ Refresh page and verify changes persisted
9. ✅ Test manual save still works
10. ✅ Test that new workouts don't trigger autosave until first saved

---

## 🎯 Summary

**What to do:**
1. Copy autosave configuration and functions from `workouts.js` lines 13-155
2. Update `markEditorDirty()` to call `scheduleAutosave()`
3. Update `updateSaveStatus()` with better status handling
4. Update `saveWorkoutFromEditor()` to support silent mode
5. Add `addAutosaveListenersToGroup()` function
6. Export autosave functions globally
7. Test thoroughly

**What NOT to do:**
- Don't touch `workouts.js` yet
- Don't remove any existing functions from `workout-editor.js`
- Don't change the dependencies on shared utility functions

**Result:**
- `workout-editor.js` will have full autosave functionality
- Works independently on `workouts.html`
- No breaking changes to existing code

---

**Ready to implement?** I can create the updated `workout-editor.js` file for you if you'd like!