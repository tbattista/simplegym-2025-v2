/**
 * Ghost Gym - Workout Editor Component
 * Inline workout editor for the workout builder page
 * @version 1.0.0
 */

/**
 * Load workout into the inline editor
 * @param {string} workoutId - ID of workout to load
 */
function loadWorkoutIntoEditor(workoutId) {
    console.log('📝 Loading workout into editor:', workoutId);
    
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    if (!workout) {
        console.error('❌ Workout not found:', workoutId);
        return;
    }
    
    // Update builder state
    window.ghostGym.workoutBuilder.selectedWorkoutId = workoutId;
    window.ghostGym.workoutBuilder.isEditing = true;
    window.ghostGym.workoutBuilder.isDirty = false;
    window.ghostGym.workoutBuilder.currentWorkout = { ...workout };
    
    // Show "Hide Workouts" button
    const hideWorkoutsBtn = document.getElementById('hideWorkoutsBtn');
    if (hideWorkoutsBtn) {
        hideWorkoutsBtn.style.display = 'block';
    }
    
    // Populate form fields
    document.getElementById('workoutName').value = workout.name || '';
    document.getElementById('workoutDescription').value = workout.description || '';
    document.getElementById('workoutTags').value = workout.tags ? workout.tags.join(', ') : '';
    
    // Clear and populate exercise groups
    const exerciseGroupsContainer = document.getElementById('exerciseGroups');
    exerciseGroupsContainer.innerHTML = '';
    
    if (workout.exercise_groups && workout.exercise_groups.length > 0) {
        workout.exercise_groups.forEach(group => {
            addExerciseGroup();
            const lastGroup = exerciseGroupsContainer.lastElementChild;
            
            // Populate exercises
            const exerciseInputs = lastGroup.querySelectorAll('.exercise-input');
            Object.entries(group.exercises || {}).forEach(([key, value], index) => {
                if (exerciseInputs[index]) {
                    exerciseInputs[index].value = value;
                }
            });
            
            // Populate sets, reps, rest
            lastGroup.querySelector('.sets-input').value = group.sets || '3';
            lastGroup.querySelector('.reps-input').value = group.reps || '8-12';
            lastGroup.querySelector('.rest-input').value = group.rest || '60s';
        });
    } else {
        addExerciseGroup();
    }
    
    // Clear and populate bonus exercises
    const bonusExercisesContainer = document.getElementById('bonusExercises');
    bonusExercisesContainer.innerHTML = '';
    
    if (workout.bonus_exercises && workout.bonus_exercises.length > 0) {
        workout.bonus_exercises.forEach(bonus => {
            addBonusExercise();
            const lastBonus = bonusExercisesContainer.lastElementChild;
            
            lastBonus.querySelector('.bonus-name-input').value = bonus.name || '';
            lastBonus.querySelector('.bonus-sets-input').value = bonus.sets || '2';
            lastBonus.querySelector('.bonus-reps-input').value = bonus.reps || '15';
            lastBonus.querySelector('.bonus-rest-input').value = bonus.rest || '30s';
        });
    }
    
    // Show editor, hide empty state
    document.getElementById('workoutEditorEmptyState').style.display = 'none';
    document.getElementById('workoutEditorForm').style.display = 'block';
    
    // Show delete button for existing workouts
    document.getElementById('deleteWorkoutBtn').style.display = 'inline-block';
    
    // Update save status
    updateSaveStatus('saved');
    
    // Highlight selected card in library
    highlightSelectedWorkout(workoutId);
    
    // Collapse workout library and show collapse button
    collapseWorkoutLibrary(workout.name);
    
    // Initialize autocompletes
    if (window.initializeExerciseAutocompletes) {
        setTimeout(() => window.initializeExerciseAutocompletes(), 100);
    }
    
    // Initialize Sortable for drag-and-drop
    if (window.initializeExerciseGroupSorting) {
        setTimeout(() => window.initializeExerciseGroupSorting(), 150);
    }
    
    // Initialize edit mode toggle
    if (window.initializeEditMode) {
        setTimeout(() => window.initializeEditMode(), 200);
    }
    
    // Update exercise previews and add listeners
    setTimeout(() => {
        const groups = document.querySelectorAll('#exerciseGroups .exercise-group');
        groups.forEach(group => {
            if (window.updateExerciseGroupPreview) {
                window.updateExerciseGroupPreview(group);
            }
            // Add input listeners
            const exerciseInputs = group.querySelectorAll('.exercise-input');
            exerciseInputs.forEach(input => {
                input.addEventListener('input', () => window.updateExerciseGroupPreview(group));
                input.addEventListener('change', () => window.updateExerciseGroupPreview(group));
            });
        });
    }, 200);
    
    // Update metadata button states (tags and description)
    if (window.updateMetadataButtonStates) {
        setTimeout(() => window.updateMetadataButtonStates(), 250);
    }
    
    console.log('✅ Workout loaded into editor');
}

/**
 * Create new workout in editor
 */
function createNewWorkoutInEditor() {
    console.log('📝 Creating new workout in editor');
    
    // Update builder state
    window.ghostGym.workoutBuilder.selectedWorkoutId = null;
    window.ghostGym.workoutBuilder.isEditing = true;
    window.ghostGym.workoutBuilder.isDirty = false;
    window.ghostGym.workoutBuilder.currentWorkout = {
        id: null,
        name: '',
        description: '',
        tags: [],
        exercise_groups: [],
        bonus_exercises: []
    };
    
    // Collapse workout library content
    collapseWorkoutLibrary('New Workout');
    
    // Hide "Change Workout" button for new workouts
    const changeWorkoutBtn = document.getElementById('changeWorkoutBtn');
    if (changeWorkoutBtn) {
        changeWorkoutBtn.style.display = 'none';
    }
    
    // Clear form
    document.getElementById('workoutName').value = '';
    document.getElementById('workoutDescription').value = '';
    document.getElementById('workoutTags').value = '';
    
    // Clear exercise groups and add one default
    const exerciseGroupsContainer = document.getElementById('exerciseGroups');
    exerciseGroupsContainer.innerHTML = '';
    addExerciseGroup();
    
    // Clear bonus exercises
    document.getElementById('bonusExercises').innerHTML = '';
    
    // Show editor, hide empty state
    document.getElementById('workoutEditorEmptyState').style.display = 'none';
    document.getElementById('workoutEditorForm').style.display = 'block';
    
    // Hide delete button for new workouts
    document.getElementById('deleteWorkoutBtn').style.display = 'none';
    
    // Update save status
    updateSaveStatus('');
    
    // Clear selection in library
    document.querySelectorAll('.workout-card-compact').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Initialize autocompletes
    if (window.initializeExerciseAutocompletes) {
        setTimeout(() => window.initializeExerciseAutocompletes(), 100);
    }
    
    // Initialize Sortable for drag-and-drop
    if (window.initializeExerciseGroupSorting) {
        setTimeout(() => window.initializeExerciseGroupSorting(), 150);
    }
    
    // Initialize edit mode toggle
    if (window.initializeEditMode) {
        setTimeout(() => window.initializeEditMode(), 200);
    }
    
    // Focus on name input
    document.getElementById('workoutName').focus();
    
    // Reset metadata button states
    if (window.updateMetadataButtonStates) {
        setTimeout(() => window.updateMetadataButtonStates(), 250);
    }
    
    console.log('✅ New workout editor ready');
}

/**
 * Save workout from editor
 * @param {boolean} silent - If true, don't show alerts or update button (for autosave)
 */
async function saveWorkoutFromEditor(silent = false) {
    console.log('💾 Saving workout from editor...', silent ? '(autosave)' : '(manual)');
    
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

/**
 * Cancel editing and return to empty state
 */
function cancelEditWorkout() {
    if (window.ghostGym.workoutBuilder.isDirty) {
        if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
            return;
        }
    }
    
    // Reset state
    window.ghostGym.workoutBuilder.selectedWorkoutId = null;
    window.ghostGym.workoutBuilder.isEditing = false;
    window.ghostGym.workoutBuilder.isDirty = false;
    
    // Hide "Hide Workouts" button
    const hideWorkoutsBtn = document.getElementById('hideWorkoutsBtn');
    if (hideWorkoutsBtn) {
        hideWorkoutsBtn.style.display = 'none';
    }
    
    // Expand workout library content
    expandWorkoutLibrary();
    
    // Hide editor, show empty state
    document.getElementById('workoutEditorForm').style.display = 'none';
    document.getElementById('workoutEditorEmptyState').style.display = 'block';
    
    // Clear selection in library
    document.querySelectorAll('.workout-card-compact').forEach(card => {
        card.classList.remove('selected');
    });
    
    console.log('✅ Edit cancelled');
}

/**
 * Delete workout from editor
 */
async function deleteWorkoutFromEditor() {
    const workoutId = window.ghostGym.workoutBuilder.selectedWorkoutId;
    if (!workoutId) return;
    
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    if (!confirm(`Are you sure you want to delete "${workout.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        // Show deleting status
        const deleteBtn = document.getElementById('deleteWorkoutBtn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Deleting...';
        deleteBtn.disabled = true;
        
        // Delete from database
        await window.dataManager.deleteWorkout(workoutId);
        
        // Remove from local state
        window.ghostGym.workouts = window.ghostGym.workouts.filter(w => w.id !== workoutId);
        
        // Refresh library
        if (window.renderWorkoutsView) {
            window.renderWorkoutsView();
        }
        
        // Return to empty state
        cancelEditWorkout();
        
        showAlert(`Workout "${workout.name}" deleted successfully`, 'success');
        
        console.log('✅ Workout deleted');
        
    } catch (error) {
        console.error('❌ Error deleting workout:', error);
        showAlert('Failed to delete workout: ' + error.message, 'danger');
        
        // Reset button on error
        const deleteBtn = document.getElementById('deleteWorkoutBtn');
        deleteBtn.innerHTML = '<i class="bx bx-trash me-1"></i>Delete';
        deleteBtn.disabled = false;
    }
}

/**
 * Mark editor as dirty (has unsaved changes)
 * Integrates with autosave system from workouts.js
 */
function markEditorDirty() {
    if (!window.ghostGym.workoutBuilder.isEditing) return;
    if (!window.ghostGym.workoutBuilder.selectedWorkoutId) return; // Don't autosave new workouts
    
    window.ghostGym.workoutBuilder.isDirty = true;
    updateSaveStatus('unsaved');
    
    // Trigger autosave if available
    if (window.scheduleAutosave) {
        window.scheduleAutosave();
    }
}

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
        case 'dirty':
            saveStatus.textContent = 'Unsaved changes';
            break;
        case 'saving':
            saveStatus.textContent = 'Saving...';
            break;
        case 'saved':
            saveStatus.textContent = 'All changes saved';
            break;
        case 'error':
            saveStatus.textContent = 'Save failed';
            break;
        default:
            saveStatus.textContent = '';
    }
}

/**
 * Highlight selected workout in library
 * @param {string} workoutId - ID of workout to highlight
 */
function highlightSelectedWorkout(workoutId) {
    document.querySelectorAll('.workout-card-compact').forEach(card => {
        if (card.dataset.workoutId === workoutId) {
            card.classList.add('selected');
            // Scroll into view
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            card.classList.remove('selected');
        }
    });
}

/**
 * Collapse workout library after selection
 * @param {string} workoutName - Name of selected workout to display
 */
function collapseWorkoutLibrary(workoutName) {
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    
    // Hide the workout library content (search, cards)
    if (expandedContent) {
        expandedContent.style.display = 'none';
    }
    
    console.log('✅ Workout library collapsed');
}

/**
 * Expand workout library
 */
function expandWorkoutLibrary() {
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    const hideWorkoutsBtn = document.getElementById('hideWorkoutsBtn');
    
    // Show the workout library content
    if (expandedContent) {
        expandedContent.style.display = 'block';
    }
    
    // Hide "Hide Workouts" button when expanding (back to initial state)
    if (hideWorkoutsBtn) {
        hideWorkoutsBtn.style.display = 'none';
    }
    
    console.log('✅ Workout library expanded');
}

/**
 * Setup event listeners for editor
 */
function setupWorkoutEditorListeners() {
    // Form field change listeners
    const formFields = ['workoutName', 'workoutDescription', 'workoutTags'];
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', markEditorDirty);
        }
    });
    
    // Save button
    const saveBtn = document.getElementById('saveWorkoutBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveWorkoutFromEditor);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEditWorkout);
    }
    
    // Delete button
    const deleteBtn = document.getElementById('deleteWorkoutBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteWorkoutFromEditor);
    }
    
    // New workout button
    const newBtn = document.getElementById('workoutsViewNewBtn');
    if (newBtn) {
        newBtn.addEventListener('click', createNewWorkoutInEditor);
    }
    
    // Add Exercise Group button
    const addGroupBtn = document.getElementById('addExerciseGroupBtn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', () => {
            if (window.addExerciseGroup) {
                window.addExerciseGroup();
                markEditorDirty();
            }
        });
    }
    
    // Add Bonus Exercise button
    const addBonusBtn = document.getElementById('addBonusExerciseBtn');
    if (addBonusBtn) {
        addBonusBtn.addEventListener('click', () => {
            if (window.addBonusExercise) {
                window.addBonusExercise();
                markEditorDirty();
            }
        });
    }
    
    // Warn on navigation if dirty
    window.addEventListener('beforeunload', (e) => {
        if (window.ghostGym.workoutBuilder.isDirty) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
    
    console.log('✅ Workout editor listeners setup');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWorkoutEditorListeners);
} else {
    setupWorkoutEditorListeners();
}

// Make functions globally available
window.loadWorkoutIntoEditor = loadWorkoutIntoEditor;
window.createNewWorkoutIntoEditor = createNewWorkoutInEditor;
window.saveWorkoutFromEditor = saveWorkoutFromEditor;
window.cancelEditWorkout = cancelEditWorkout;
window.deleteWorkoutFromEditor = deleteWorkoutFromEditor;
window.markEditorDirty = markEditorDirty;
window.updateSaveStatus = updateSaveStatus;
window.highlightSelectedWorkout = highlightSelectedWorkout;
window.collapseWorkoutLibrary = collapseWorkoutLibrary;
window.expandWorkoutLibrary = expandWorkoutLibrary;

console.log('📦 Workout Editor component loaded');