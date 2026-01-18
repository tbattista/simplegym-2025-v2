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
    
    // Persist workout ID to localStorage for page refresh recovery
    try {
        localStorage.setItem('currentEditingWorkoutId', workoutId);
        console.log('💾 Saved workout ID to localStorage for refresh recovery');
    } catch (error) {
        console.warn('⚠️ Could not save to localStorage:', error);
    }
    
    // Show "Hide Workouts" button
    const hideWorkoutsBtn = document.getElementById('hideWorkoutsBtn');
    if (hideWorkoutsBtn) {
        hideWorkoutsBtn.style.display = 'block';
    }
    
    // Populate form fields
    document.getElementById('workoutName').value = workout.name || '';
    document.getElementById('workoutDescription').value = workout.description || '';
    document.getElementById('workoutTags').value = workout.tags ? workout.tags.join(', ') : '';
    
    // Clear and populate exercise groups (UPDATED FOR CARD-BASED LAYOUT)
    const exerciseGroupsContainer = document.getElementById('exerciseGroups');
    exerciseGroupsContainer.innerHTML = '';
    
    // Clear data storage
    window.exerciseGroupsData = {};
    
    if (workout.exercise_groups && workout.exercise_groups.length > 0) {
        const totalCards = workout.exercise_groups.length;
        workout.exercise_groups.forEach((group, index) => {
            const groupId = `group-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
            const groupNumber = index + 1;

            // Create card with data (pass index and totalCards for menu boundary detection)
            const cardHtml = window.createExerciseGroupCard(groupId, group, groupNumber, index, totalCards);
            exerciseGroupsContainer.insertAdjacentHTML('beforeend', cardHtml);
            
            // CRITICAL FIX: Explicitly ensure data is stored in memory
            // This guarantees the data is available when collectExerciseGroups() runs
            window.exerciseGroupsData[groupId] = {
                exercises: group.exercises || { a: '', b: '', c: '' },
                sets: group.sets || '3',
                reps: group.reps || '8-12',
                rest: group.rest || '60s',
                default_weight: group.default_weight || '',
                default_weight_unit: group.default_weight_unit || 'lbs'
            };
            
            console.log('🔍 DEBUG: Loaded exercise group card:', groupId, group);
            console.log('✅ DEBUG: Stored in exerciseGroupsData:', groupId, window.exerciseGroupsData[groupId]);
        });
    } else {
        addExerciseGroup();
    }

    // Render template notes
    if (workout.template_notes && workout.template_notes.length > 0) {
        // Initialize template_notes in current workout
        window.ghostGym.workoutBuilder.currentWorkout.template_notes = [...workout.template_notes];

        // Render notes after exercise groups are rendered
        setTimeout(() => {
            if (window.renderTemplateNotes) {
                window.renderTemplateNotes(workout.template_notes);
            }
        }, 50);
    } else {
        window.ghostGym.workoutBuilder.currentWorkout.template_notes = [];
    }

    // Bonus exercises section removed - no longer needed
    
    // Show editor, hide empty state
    document.getElementById('workoutEditorEmptyState').style.display = 'none';
    document.getElementById('workoutEditorForm').style.display = 'block';
    
    // Show delete button for existing workouts (if it exists)
    const deleteBtn = document.getElementById('deleteWorkoutBtn');
    if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
    }
    
    // Update save status
    updateSaveStatus('saved');
    
    // Highlight selected card in library
    highlightSelectedWorkout(workoutId);
    
    // Collapse workout library using the same function as the button
    // This ensures the button state updates correctly
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    if (expandedContent && expandedContent.style.display !== 'none') {
        toggleWorkoutLibraryContent();
    }
    
    // Initialize autocompletes with auto-creation support
    if (window.initializeExerciseAutocompletesWithAutoCreate) {
        setTimeout(() => window.initializeExerciseAutocompletesWithAutoCreate(), 100);
    } else if (window.initializeExerciseAutocompletes) {
        setTimeout(() => window.initializeExerciseAutocompletes(), 100);
    }
    
    // Initialize Sortable for drag-and-drop (legacy, may be removed)
    if (window.initializeExerciseGroupSorting) {
        setTimeout(() => window.initializeExerciseGroupSorting(), 150);
    }

    // Update card menu boundaries after cards are loaded
    if (window.builderCardMenu?.updateAllMenuBoundaries) {
        setTimeout(() => window.builderCardMenu.updateAllMenuBoundaries(), 200);
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
 * Auto-saves a new workout with default name so it persists on refresh
 */
async function createNewWorkoutInEditor() {
    console.log('📝 Creating new workout in editor');
    
    try {
        // Show loading state
        updateSaveStatus('saving');
        
        // Create a new workout with default name and one exercise group
        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const newWorkoutData = {
            name: `New Workout - ${timestamp}`,
            description: '',
            tags: [],
            exercise_groups: [{
                exercises: { a: 'Exercise Name' },
                sets: '3',
                reps: '8-12',
                rest: '60s',
                default_weight: null,
                default_weight_unit: 'lbs'
            }],
            bonus_exercises: [],
            template_notes: []
        };
        
        // Save to database
        const savedWorkout = await window.dataManager.createWorkout(newWorkoutData);
        console.log('✅ New workout auto-saved:', savedWorkout.id);
        
        // Initialize workouts array if it doesn't exist
        if (!window.ghostGym.workouts) {
            window.ghostGym.workouts = [];
        }
        
        // Add to local state
        window.ghostGym.workouts.unshift(savedWorkout);
        
        // Update builder state
        window.ghostGym.workoutBuilder.selectedWorkoutId = savedWorkout.id;
        window.ghostGym.workoutBuilder.isEditing = true;
        window.ghostGym.workoutBuilder.isDirty = false;
        window.ghostGym.workoutBuilder.currentWorkout = { ...savedWorkout };
        
        // Store in localStorage for refresh recovery
        try {
            localStorage.setItem('currentEditingWorkoutId', savedWorkout.id);
            console.log('💾 Saved workout ID to localStorage for refresh recovery');
        } catch (error) {
            console.warn('⚠️ Could not save to localStorage:', error);
        }
        
        // Collapse workout library
        const expandedContent = document.getElementById('workoutLibraryExpandedContent');
        if (expandedContent && expandedContent.style.display !== 'none') {
            toggleWorkoutLibraryContent();
        }
        
        // Populate form with saved workout data
        document.getElementById('workoutName').value = savedWorkout.name;
        document.getElementById('workoutDescription').value = savedWorkout.description || '';
        document.getElementById('workoutTags').value = savedWorkout.tags ? savedWorkout.tags.join(', ') : '';
        
        // Clear and populate exercise groups
        const exerciseGroupsContainer = document.getElementById('exerciseGroups');
        exerciseGroupsContainer.innerHTML = '';
        window.exerciseGroupsData = {};

        const totalCards = savedWorkout.exercise_groups.length;
        savedWorkout.exercise_groups.forEach((group, index) => {
            const groupId = `group-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
            const groupNumber = index + 1;
            const cardHtml = window.createExerciseGroupCard(groupId, group, groupNumber, index, totalCards);
            exerciseGroupsContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
        
        // Show editor, hide empty state
        document.getElementById('workoutEditorEmptyState').style.display = 'none';
        document.getElementById('workoutEditorForm').style.display = 'block';
        
        // Show delete button (if it exists)
        const deleteBtn = document.getElementById('deleteWorkoutBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }
        
        // Update save status
        updateSaveStatus('saved');
        
        // Refresh library to show new workout
        if (window.renderWorkoutsView) {
            window.renderWorkoutsView();
        }
        
        // Highlight in library
        highlightSelectedWorkout(savedWorkout.id);
        
        // Initialize autocompletes with auto-creation support
        if (window.initializeExerciseAutocompletesWithAutoCreate) {
            setTimeout(() => window.initializeExerciseAutocompletesWithAutoCreate(), 100);
        } else if (window.initializeExerciseAutocompletes) {
            setTimeout(() => window.initializeExerciseAutocompletes(), 100);
        }
        
        // Initialize Sortable for drag-and-drop (legacy, may be removed)
        if (window.initializeExerciseGroupSorting) {
            setTimeout(() => window.initializeExerciseGroupSorting(), 150);
        }

        // Update card menu boundaries after cards are loaded
        if (window.builderCardMenu?.updateAllMenuBoundaries) {
            setTimeout(() => window.builderCardMenu.updateAllMenuBoundaries(), 200);
        }

        // Focus on name input and select the text so user can easily rename
        const nameInput = document.getElementById('workoutName');
        nameInput.focus();
        nameInput.select();
        
        // Reset metadata button states
        if (window.updateMetadataButtonStates) {
            setTimeout(() => window.updateMetadataButtonStates(), 250);
        }
        
        console.log('✅ New workout created and ready for editing');
        
    } catch (error) {
        console.error('❌ Failed to create new workout:', error);
        if (window.showAlert) {
            showAlert('Failed to create new workout: ' + error.message, 'danger');
        }
        updateSaveStatus('error');
    }
}

/**
 * Auto-create custom exercises for any unknown exercise names in groups
 * @param {Array} exerciseGroups - Array of exercise group objects
 * @returns {Promise<void>}
 */
async function autoCreateExercisesInGroups(exerciseGroups) {
    if (!exerciseGroups || exerciseGroups.length === 0) {
        console.log('ℹ️ WORKOUT SAVE DEBUG: No exercise groups to process');
        return;
    }
    if (!window.exerciseCacheService) {
        console.warn('⚠️ ExerciseCacheService not available');
        return;
    }
    if (!window.dataManager || !window.dataManager.isUserAuthenticated()) {
        console.log('ℹ️ User not authenticated, skipping auto-create');
        return;
    }
    
    try {
        console.log(`📋 WORKOUT SAVE DEBUG: Processing ${exerciseGroups.length} exercise group(s)`);
        
        // Get user ID from auth service
        const userId = window.authService?.currentUser?.uid ||
                      window.dataManager?.currentUser?.uid ||
                      'anonymous';
        
        console.log(`📋 WORKOUT SAVE DEBUG: User ID: ${userId}`);
        
        const allExerciseNames = new Set();
        
        // Collect all unique exercise names from all groups
        exerciseGroups.forEach((group, groupIndex) => {
            console.log(`📋 WORKOUT SAVE DEBUG: Group ${groupIndex + 1}:`, group);
            if (group.exercises) {
                Object.entries(group.exercises).forEach(([key, name]) => {
                    console.log(`   Exercise ${key}: "${name}" (${name ? name.length : 0} chars)`);
                    if (name && name.trim()) {
                        allExerciseNames.add(name.trim());
                    }
                });
            }
        });
        
        if (allExerciseNames.size === 0) {
            console.log('ℹ️ WORKOUT SAVE DEBUG: No exercise names to process after filtering');
            return;
        }
        
        console.log(`🔍 WORKOUT SAVE DEBUG: Found ${allExerciseNames.size} unique exercise name(s):`);
        allExerciseNames.forEach(name => console.log(`   - "${name}" (${name.length} chars)`));
        
        // Auto-create each exercise if needed (parallel processing)
        const createPromises = Array.from(allExerciseNames).map(exerciseName =>
            window.exerciseCacheService.autoCreateIfNeeded(exerciseName, userId)
        );
        
        const results = await Promise.allSettled(createPromises);
        
        // Count results
        const created = results.filter(r => r.status === 'fulfilled' && r.value && !r.value.isGlobal).length;
        const existing = results.filter(r => r.status === 'fulfilled' && r.value && r.value.isGlobal).length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (created > 0) {
            console.log(`✅ Auto-created ${created} custom exercise(s)`);
        }
        if (existing > 0) {
            console.log(`ℹ️ ${existing} exercise(s) already exist in database`);
        }
        if (failed > 0) {
            console.warn(`⚠️ Failed to process ${failed} exercise(s)`);
        }
        
    } catch (error) {
        console.error('❌ Error in autoCreateExercisesInGroups:', error);
        // Don't throw - allow workout save to continue even if auto-create fails
    }
}

/**
 * Save workout from editor
 * @param {boolean} silent - If true, don't show alerts or update button (for autosave)
 */
async function saveWorkoutFromEditor(silent = false) {
    console.log('💾 ========== SAVE WORKOUT START ==========');
    console.log('💾 Saving workout from editor...', silent ? '(autosave)' : '(manual)');
    
    // Collect template notes from state and update order indices based on DOM order
    const templateNotes = collectTemplateNotes();

    const workoutData = {
        name: document.getElementById('workoutName').value.trim(),
        description: document.getElementById('workoutDescription').value.trim(),
        tags: document.getElementById('workoutTags').value
            .split(',').map(t => t.trim()).filter(t => t),
        exercise_groups: collectExerciseGroups(),
        bonus_exercises: collectBonusExercises(),
        template_notes: templateNotes
    };
    
    console.log('📊 SAVE DEBUG: Collected workout data:', {
        name: workoutData.name,
        exerciseGroupCount: workoutData.exercise_groups.length,
        bonusExerciseCount: workoutData.bonus_exercises.length
    });
    console.log('📊 SAVE DEBUG: Exercise groups:', workoutData.exercise_groups);
    
    // Validate
    if (!workoutData.name) {
        if (!silent) {
            showAlert('Workout name is required', 'danger');
            document.getElementById('workoutName').focus();
        }
        return;
    }
    
    // Allow workouts with only notes (no exercise groups required)
    // But if there are no exercise groups AND no notes, show a warning
    if (workoutData.exercise_groups.length === 0 && workoutData.template_notes.length === 0) {
        if (!silent) {
            showAlert('Add at least one exercise group or note to save', 'warning');
        }
        return;
    }
    
    try {
        // CLIENT-SIDE VALIDATION: Check exercise groups structure before API call
        console.log('🔍 VALIDATION: Checking exercise groups structure...');
        const validationErrors = [];
        
        workoutData.exercise_groups.forEach((group, index) => {
            // Check for group_id (required by backend)
            if (!group.group_id) {
                validationErrors.push(`Group ${index + 1}: Missing group_id field`);
            }
            
            // Check for exercises object
            if (!group.exercises || typeof group.exercises !== 'object') {
                validationErrors.push(`Group ${index + 1}: Invalid or missing exercises object`);
            }
            
            // Check for required fields
            if (!group.sets) validationErrors.push(`Group ${index + 1}: Missing sets`);
            if (!group.reps) validationErrors.push(`Group ${index + 1}: Missing reps`);
            if (!group.rest) validationErrors.push(`Group ${index + 1}: Missing rest`);
        });
        
        if (validationErrors.length > 0) {
            console.error('❌ VALIDATION FAILED:');
            validationErrors.forEach(err => console.error(`   - ${err}`));
            throw new Error('Workout data validation failed: ' + validationErrors.join(', '));
        }
        
        console.log('✅ VALIDATION: Exercise groups structure is valid');
        
        console.log('🚀 SAVE DEBUG: About to call autoCreateExercisesInGroups...');
        // Auto-create custom exercises for any unknown exercise names
        await autoCreateExercisesInGroups(workoutData.exercise_groups);
        console.log('✅ SAVE DEBUG: autoCreateExercisesInGroups completed');
        
        // Show saving status
        updateSaveStatus('saving');
        
        // Update bottom action bar button state (save button is right-0)
        if (window.bottomActionBar && !silent) {
            window.bottomActionBar.updateButtonState('right-0', 'saving');
        }
        
        // Only update hidden button for manual saves
        const saveBtn = document.getElementById('saveWorkoutBtn');
        if (!silent && saveBtn) {
            saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
            saveBtn.disabled = true;
        }
        
        let savedWorkout;
        const workoutId = window.ghostGym.workoutBuilder.selectedWorkoutId;
        
        // Check if this is a shared workout (temporary ID starting with "shared-")
        const isSharedWorkout = workoutId && workoutId.startsWith('shared-');
        
        if (isSharedWorkout) {
            // Shared workout: Create a new workout (save as copy to user's library)
            console.log('📋 Saving shared workout as new workout in user library');
            savedWorkout = await window.dataManager.createWorkout(workoutData);
            
            // Add to local array
            window.ghostGym.workouts.unshift(savedWorkout);
            
            // Update to the new workout ID
            window.ghostGym.workoutBuilder.selectedWorkoutId = savedWorkout.id;
            
            // Update localStorage to track the new workout ID
            try {
                localStorage.setItem('currentEditingWorkoutId', savedWorkout.id);
                console.log('💾 Updated localStorage with new workout ID:', savedWorkout.id);
            } catch (error) {
                console.warn('⚠️ Could not update localStorage:', error);
            }
            
            if (!silent) {
                showAlert(`Workout "${savedWorkout.name}" saved to your library!`, 'success');
            }
        } else if (workoutId) {
            // Update existing workout
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
        
        // Save success toast notification
        if (!silent && window.toastNotifications) {
            window.toastNotifications.saved();
        }
        
        // Update bottom action bar button state (save button is right-0)
        if (window.bottomActionBar && !silent) {
            window.bottomActionBar.updateButtonState('right-0', 'saved');
        }
        
        // Show delete button now that workout is saved (if it exists)
        const deleteBtn = document.getElementById('deleteWorkoutBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }
        
        console.log('✅ Workout saved successfully');
        
    } catch (error) {
        console.error('❌ Error saving workout:', error);
        
        // Show error alert for manual saves
        if (!silent) {
            showAlert('Failed to save workout: ' + error.message, 'danger');
        }
        
        updateSaveStatus('error');
        
        // Save failure toast notification
        if (!silent && window.toastNotifications) {
            window.toastNotifications.saveFailed(error.message);
        }
        
        // Update bottom action bar button state (save button is right-0)
        if (window.bottomActionBar && !silent) {
            window.bottomActionBar.updateButtonState('right-0', 'error');
        }
        
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
    
    // Clear localStorage when user intentionally cancels
    try {
        localStorage.removeItem('currentEditingWorkoutId');
        console.log('🗑️ Cleared workout ID from localStorage (cancelled)');
    } catch (error) {
        console.warn('⚠️ Could not clear localStorage:', error);
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
    
    // Expand workout library using the same function as the button
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    if (expandedContent && expandedContent.style.display === 'none') {
        toggleWorkoutLibraryContent();
    }
    
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
        
        // Clear localStorage before canceling (workout no longer exists)
        try {
            localStorage.removeItem('currentEditingWorkoutId');
            console.log('🗑️ Cleared workout ID from localStorage (deleted)');
        } catch (error) {
            console.warn('⚠️ Could not clear localStorage:', error);
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
 * Open the reorder offcanvas with current exercise groups
 * Uses UnifiedOffcanvasFactory.createReorderOffcanvas from workout-mode
 */
function openReorderOffcanvas() {
    const container = document.getElementById('exerciseGroups');
    if (!container) {
        console.error('❌ Exercise groups container not found');
        return;
    }

    const cards = container.querySelectorAll('.exercise-group-card');

    // Build exercises array for reorder offcanvas (even if empty or single item)
    // The offcanvas will display appropriate messaging for 0/1 exercises
    const exercises = Array.from(cards).map((card, index) => {
        const groupId = card.getAttribute('data-group-id');
        const groupData = window.exerciseGroupsData?.[groupId] || {};

        return {
            groupId: groupId,
            name: groupData.exercises?.a || `Exercise ${index + 1}`,
            sets: groupData.sets || '3',
            reps: groupData.reps || '8-12',
            index: index
        };
    });

    console.log('📋 Opening reorder offcanvas with exercises:', exercises);

    // Use UnifiedOffcanvasFactory to create reorder offcanvas
    if (window.UnifiedOffcanvasFactory?.createReorderOffcanvas) {
        window.UnifiedOffcanvasFactory.createReorderOffcanvas(exercises, (reorderedExercises) => {
            // Apply the new order
            applyReorderedExercises(reorderedExercises);
        });
    } else {
        console.error('❌ UnifiedOffcanvasFactory.createReorderOffcanvas not available');
        alert('Reorder feature is not available. Please refresh the page.');
    }
}

/**
 * Apply reordered exercises to the DOM
 * @param {Array} reorderedExercises - Array of exercises in new order
 */
function applyReorderedExercises(reorderedExercises) {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log('📋 Applying new exercise order:', reorderedExercises.map(e => e.name));

    // Reorder DOM elements based on new order
    reorderedExercises.forEach((exercise, newIndex) => {
        const card = container.querySelector(`[data-group-id="${exercise.groupId}"]`);
        if (card) {
            container.appendChild(card);
        }
    });

    // Update all menu boundaries after reorder
    if (window.builderCardMenu?.updateAllMenuBoundaries) {
        window.builderCardMenu.updateAllMenuBoundaries();
    }

    // Mark editor as dirty (triggers autosave)
    markEditorDirty();

    // Show success toast
    if (window.showToast) {
        window.showToast({
            message: 'Exercise order updated',
            type: 'success',
            title: 'Reordered',
            icon: 'bx-check',
            delay: 2000
        });
    }

    console.log('✅ Exercise order applied successfully');
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
 * Now uses toggleWorkoutLibraryContent() for consistent button state
 * @param {string} workoutName - Name of selected workout to display (deprecated parameter)
 * @deprecated Use toggleWorkoutLibraryContent() directly instead
 */
function collapseWorkoutLibrary(workoutName) {
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    if (expandedContent && expandedContent.style.display !== 'none') {
        toggleWorkoutLibraryContent();
    }
    console.log('✅ Workout library collapsed via wrapper');
}

/**
 * Expand workout library
 * Now uses toggleWorkoutLibraryContent() for consistent button state
 * @deprecated Use toggleWorkoutLibraryContent() directly instead
 */
function expandWorkoutLibrary() {
    const expandedContent = document.getElementById('workoutLibraryExpandedContent');
    if (expandedContent && expandedContent.style.display === 'none') {
        toggleWorkoutLibraryContent();
    }
    console.log('✅ Workout library expanded via wrapper');
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
    
    // Save button with diagnostic logging
    const saveBtn = document.getElementById('saveWorkoutBtn');
    if (saveBtn) {
        console.log('✅ Save button found, attaching click listener');
        saveBtn.addEventListener('click', () => {
            console.log('🖱️ Save button clicked!');
            console.log('📊 Current workout state:', window.ghostGym?.workoutBuilder);
            saveWorkoutFromEditor();
        });
    } else {
        console.error('❌ Save button (#saveWorkoutBtn) not found in DOM!');
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
    
    // Add Exercise Group button (visible inline button only)
    const addGroupBtnVisible = document.getElementById('addExerciseGroupBtnVisible');
    
    if (addGroupBtnVisible) {
        addGroupBtnVisible.addEventListener('click', () => {
            console.log('🖱️ Add Exercise Group button clicked');
            if (window.addExerciseGroup) {
                window.addExerciseGroup();
                markEditorDirty();
            }
        });
    }
    
    // NEW: Save Exercise Group from Offcanvas button
    const saveExerciseGroupBtn = document.getElementById('saveExerciseGroupBtn');
    if (saveExerciseGroupBtn) {
        saveExerciseGroupBtn.addEventListener('click', () => {
            if (window.saveExerciseGroupFromOffcanvas) {
                window.saveExerciseGroupFromOffcanvas();
            }
        });
    }
    
    // NEW: Delete Exercise Group from Offcanvas button
    const deleteExerciseGroupBtn = document.getElementById('deleteExerciseGroupBtn');
    if (deleteExerciseGroupBtn) {
        deleteExerciseGroupBtn.addEventListener('click', () => {
            const groupId = window.currentEditingGroupId;
            if (groupId && window.deleteExerciseGroupCard) {
                // Close offcanvas first
                const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('exerciseGroupEditOffcanvas'));
                if (offcanvas) offcanvas.hide();
                
                // Delete after a short delay to allow offcanvas to close
                setTimeout(() => {
                    window.deleteExerciseGroupCard(groupId);
                }, 300);
            }
        });
    }
    
    // NEW: Weight unit button listeners in offcanvas
    const setupOffcanvasWeightButtons = () => {
        document.querySelectorAll('#exerciseGroupEditOffcanvas .weight-unit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const container = this.closest('.btn-group');
                container.querySelectorAll('.weight-unit-btn').forEach(b => {
                    b.classList.remove('active', 'btn-secondary');
                    b.classList.add('btn-outline-secondary');
                });
                this.classList.add('active', 'btn-secondary');
                this.classList.remove('btn-outline-secondary');
            });
        });
    };
    setupOffcanvasWeightButtons();
    
    // NEW: More Menu - Cancel Workout Item
    const cancelWorkoutMenuItem = document.getElementById('cancelWorkoutMenuItem');
    if (cancelWorkoutMenuItem) {
        cancelWorkoutMenuItem.addEventListener('click', () => {
            console.log('❌ Cancel workout menu item clicked');
            
            // Close more menu offcanvas first
            const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
            if (moreMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }
            
            // Trigger cancel after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.cancelEditWorkout) {
                    window.cancelEditWorkout();
                } else {
                    console.error('❌ cancelEditWorkout function not found');
                }
            }, 300);
        });
        console.log('✅ Cancel workout menu item listener attached');
    } else {
        console.warn('⚠️ Cancel workout menu item not found in DOM');
    }
    
    // NEW: More Menu - Share Workout Item
    const shareWorkoutMenuItem = document.getElementById('shareWorkoutMenuItem');
    if (shareWorkoutMenuItem) {
        shareWorkoutMenuItem.addEventListener('click', () => {
            console.log('🔗 Share workout menu item clicked');
            
            // Close more menu offcanvas first
            const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
            if (moreMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }
            
            // Get current workout ID
            const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                            window.ghostGym?.workoutBuilder?.currentWorkout?.id;
            
            if (workoutId) {
                // Open share offcanvas after more menu closes (300ms animation)
                setTimeout(() => {
                    if (window.shareModal && window.shareModal.open) {
                        window.shareModal.open(workoutId);
                    } else {
                        console.error('❌ shareModal.open function not found');
                        alert('Share feature is loading. Please try again in a moment.');
                    }
                }, 300);
            } else {
                console.warn('⚠️ No workout ID available for sharing');
                alert('Please save the workout first before sharing');
            }
        });
        console.log('✅ Share workout menu item listener attached');
    } else {
        console.warn('⚠️ Share workout menu item not found in DOM');
    }
    
    // NEW: Share Menu - Public Share Item
    const publicShareMenuItem = document.getElementById('publicShareMenuItem');
    if (publicShareMenuItem) {
        publicShareMenuItem.addEventListener('click', () => {
            console.log('🌐 Public share menu item clicked');
            
            // Close share menu offcanvas first
            const shareMenuOffcanvas = document.getElementById('shareMenuOffcanvas');
            if (shareMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(shareMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }
            
            // Trigger public share after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.shareModal && window.shareModal.handlePublicShare) {
                    // Get current workout ID
                    const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                                    window.ghostGym?.workoutBuilder?.currentWorkout?.id;
                    
                    if (workoutId) {
                        // Set current workout in share modal and open modal dialog
                        window.shareModal.currentWorkoutId = workoutId;
                        const workouts = window.ghostGym?.workouts || [];
                        window.shareModal.currentWorkout = workouts.find(w => w.id === workoutId);
                        window.shareModal.openModal(workoutId);
                    } else {
                        console.error('❌ No workout ID available for public share');
                        alert('Please save the workout first before sharing');
                    }
                } else {
                    console.error('❌ shareModal.handlePublicShare function not found');
                }
            }, 300);
        });
        console.log('✅ Public share menu item listener attached');
    } else {
        console.warn('⚠️ Public share menu item not found in DOM');
    }

    // NEW: Share Menu - Private Share Item
    const privateShareMenuItem = document.getElementById('privateShareMenuItem');
    if (privateShareMenuItem) {
        privateShareMenuItem.addEventListener('click', () => {
            console.log('🔗 Private share menu item clicked');
            
            // Close share menu offcanvas first
            const shareMenuOffcanvas = document.getElementById('shareMenuOffcanvas');
            if (shareMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(shareMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }
            
            // Trigger private share after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.shareModal && window.shareModal.handlePrivateShare) {
                    // Get current workout ID
                    const workoutId = window.ghostGym?.workoutBuilder?.selectedWorkoutId ||
                                    window.ghostGym?.workoutBuilder?.currentWorkout?.id;
                    
                    if (workoutId) {
                        // Set current workout in share modal and open modal dialog
                        window.shareModal.currentWorkoutId = workoutId;
                        const workouts = window.ghostGym?.workouts || [];
                        window.shareModal.currentWorkout = workouts.find(w => w.id === workoutId);
                        window.shareModal.openModal(workoutId);
                    } else {
                        console.error('❌ No workout ID available for private share');
                        alert('Please save the workout first before sharing');
                    }
                } else {
                    console.error('❌ shareModal.handlePrivateShare function not found');
                }
            }, 300);
        });
        console.log('✅ Private share menu item listener attached');
    } else {
        console.warn('⚠️ Private share menu item not found in DOM');
    }
    
    // NEW: More Menu - Delete Workout Item
    const deleteWorkoutMenuItem = document.getElementById('deleteWorkoutMenuItem');
    if (deleteWorkoutMenuItem) {
        deleteWorkoutMenuItem.addEventListener('click', () => {
            console.log('🗑️ Delete workout menu item clicked');
            
            // Close the more menu offcanvas first
            const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
            if (moreMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }
            
            // Trigger delete after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.deleteWorkoutFromEditor) {
                    window.deleteWorkoutFromEditor();
                } else {
                    console.error('❌ deleteWorkoutFromEditor function not found');
                }
            }, 300);
        });
        console.log('✅ Delete workout menu item listener attached');
    } else {
        console.warn('⚠️ Delete workout menu item not found in DOM');
    }
    
    // Reorder Exercises Button - Opens reorder offcanvas
    const reorderBtn = document.getElementById('reorderExercisesBtn');
    if (reorderBtn) {
        reorderBtn.addEventListener('click', () => {
            console.log('📋 Reorder button clicked');
            openReorderOffcanvas();
        });
        console.log('✅ Reorder button listener attached');
    }

    // Warn on navigation if dirty, and clean up localStorage on intentional navigation
    window.addEventListener('beforeunload', (e) => {
        if (window.ghostGym.workoutBuilder.isDirty) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
    
    // Clear localStorage when navigating away from workout builder (but not on refresh)
    // This uses pagehide which fires on actual navigation but not on refresh
    let isRefreshing = false;
    window.addEventListener('beforeunload', () => {
        // Check if this is a refresh (F5, Ctrl+R, etc.) vs navigation
        // Performance navigation type 1 = reload
        isRefreshing = true;
    });
    
    window.addEventListener('pagehide', () => {
        // Only clear if we're not on the workout builder page anymore
        // and it's not a refresh
        if (!isRefreshing && !window.location.pathname.includes('workout-builder')) {
            try {
                localStorage.removeItem('currentEditingWorkoutId');
                console.log('🗑️ Cleared workout ID from localStorage (navigated away)');
            } catch (error) {
                console.warn('⚠️ Could not clear localStorage:', error);
            }
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
window.createNewWorkoutInEditor = createNewWorkoutInEditor;
window.saveWorkoutFromEditor = saveWorkoutFromEditor;
window.cancelEditWorkout = cancelEditWorkout;
window.deleteWorkoutFromEditor = deleteWorkoutFromEditor;
window.markEditorDirty = markEditorDirty;
window.updateSaveStatus = updateSaveStatus;
window.highlightSelectedWorkout = highlightSelectedWorkout;
window.collapseWorkoutLibrary = collapseWorkoutLibrary;
window.openReorderOffcanvas = openReorderOffcanvas;
window.applyReorderedExercises = applyReorderedExercises;
window.expandWorkoutLibrary = expandWorkoutLibrary;
window.autoCreateExercisesInGroups = autoCreateExercisesInGroups;

/**
 * Initialize exercise autocompletes with auto-creation support
 * This function enables the auto-create custom exercises feature in workout builder
 */
function initializeExerciseAutocompletesWithAutoCreate() {
    console.log('🚀 Initializing exercise autocompletes with auto-creation support');
    
    // Check if required services are available
    if (!window.autoCreateExerciseService) {
        console.warn('⚠️ Auto-Create Exercise Service not available, falling back to standard initialization');
        if (window.initializeExerciseAutocompletes) {
            window.initializeExerciseAutocompletes();
        }
        return;
    }
    
    if (!window.initExerciseAutocomplete) {
        console.error('❌ Exercise autocomplete component not available');
        return;
    }
    
    // Find all exercise autocomplete inputs
    const exerciseInputs = document.querySelectorAll('.exercise-autocomplete-input');
    
    if (exerciseInputs.length === 0) {
        console.log('ℹ️ No exercise autocomplete inputs found');
        return;
    }
    
    console.log(`🔍 Found ${exerciseInputs.length} exercise inputs to initialize`);
    
    // Initialize each input with auto-creation support
    exerciseInputs.forEach((input, index) => {
        try {
            // Get the input ID or generate one
            if (!input.id) {
                input.id = `exercise-input-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Initialize autocomplete with auto-creation enabled
            const autocomplete = window.initExerciseAutocomplete(input, {
                allowCustom: true,
                allowAutoCreate: true,
                minChars: 2,
                maxResults: 20,
                debounceMs: 300,
                showMuscleGroup: true,
                showEquipment: true,
                showDifficulty: true,
                showTier: true,
                onSelect: (exercise) => {
                    console.log('✅ Exercise selected:', exercise.name);
                    // Trigger dirty state for autosave
                    if (window.markEditorDirty) {
                        window.markEditorDirty();
                    }
                },
                onAutoCreate: (exercise) => {
                    console.log('🚀 Auto-created exercise:', exercise.name);
                    // Show success notification
                    if (window.showToast) {
                        window.showToast({
                            message: `Created custom exercise: ${exercise.name}`,
                            type: 'success',
                            title: 'Exercise Created',
                            icon: 'bx-plus-circle',
                            delay: 3000
                        });
                    }
                    // Trigger dirty state for autosave
                    if (window.markEditorDirty) {
                        window.markEditorDirty();
                    }
                }
            });
            
            console.log(`✅ Initialized autocomplete for input: ${input.id}`);
            
        } catch (error) {
            console.error(`❌ Failed to initialize autocomplete for input ${index}:`, error);
        }
    });
    
    console.log(`✅ Successfully initialized ${exerciseInputs.length} exercise autocompletes with auto-creation`);
}

// Make the function globally available
window.initializeExerciseAutocompletesWithAutoCreate = initializeExerciseAutocompletesWithAutoCreate;

// ============================================
// TEMPLATE NOTE MANAGEMENT
// ============================================

/**
 * Handle adding a new template note
 * Opens position picker and creates note at selected position
 */
window.handleAddTemplateNote = async function() {
    console.log('📝 Add template note clicked');

    // Ensure workout is being edited
    if (!window.ghostGym?.workoutBuilder?.isEditing) {
        console.warn('⚠️ No workout being edited');
        return;
    }

    // Initialize template_notes array if not exists
    if (!window.ghostGym.workoutBuilder.currentWorkout.template_notes) {
        window.ghostGym.workoutBuilder.currentWorkout.template_notes = [];
    }

    try {
        // Build items list for position picker
        const items = getTemplateItemsForPositionPicker();

        // Use UnifiedOffcanvasFactory to create position picker if available
        if (window.UnifiedOffcanvasFactory?.createNotePositionPicker) {
            window.UnifiedOffcanvasFactory.createNotePositionPicker({
                items: items,
                onSelect: (position) => {
                    createTemplateNoteAtPosition(position);
                },
                title: 'Add Note',
                subtitle: 'Select where to insert the note'
            });
        } else {
            // Fallback: Create note at the end
            console.log('📝 Position picker not available, adding note at end');
            createTemplateNoteAtPosition(items.length);
        }
    } catch (error) {
        console.error('❌ Error adding template note:', error);
    }
};

/**
 * Get all template items (exercises + notes) for position picker
 * @returns {Array} Array of items with type, name, and index
 */
function getTemplateItemsForPositionPicker() {
    const items = [];
    const container = document.getElementById('exerciseGroups');
    if (!container) return items;

    // Get all cards (exercise groups and notes) in DOM order
    const cards = container.querySelectorAll('.exercise-group-card, .template-note-card');

    cards.forEach((card, index) => {
        if (card.classList.contains('exercise-group-card')) {
            const groupId = card.getAttribute('data-group-id');
            const groupData = window.exerciseGroupsData?.[groupId];
            const exerciseName = groupData?.exercises?.a || 'Exercise';
            items.push({
                type: 'exercise',
                id: groupId,
                name: exerciseName,
                index: index
            });
        } else if (card.classList.contains('template-note-card')) {
            const noteId = card.getAttribute('data-note-id');
            const notes = window.ghostGym.workoutBuilder.currentWorkout.template_notes || [];
            const note = notes.find(n => n.id === noteId);
            const preview = note?.content ?
                (note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content) :
                'Empty note';
            items.push({
                type: 'note',
                id: noteId,
                name: preview,
                index: index
            });
        }
    });

    return items;
}

/**
 * Create a template note at the specified position
 * @param {number} position - Position index to insert note at
 */
function createTemplateNoteAtPosition(position) {
    console.log('📝 Creating template note at position:', position);

    // Generate unique note ID
    const noteId = `template-note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Create note data
    const note = {
        id: noteId,
        content: '',
        order_index: position,
        created_at: new Date().toISOString(),
        modified_at: null
    };

    // Add to state
    if (!window.ghostGym.workoutBuilder.currentWorkout.template_notes) {
        window.ghostGym.workoutBuilder.currentWorkout.template_notes = [];
    }
    window.ghostGym.workoutBuilder.currentWorkout.template_notes.push(note);

    // Render note card
    if (window.templateNoteCardRenderer) {
        const container = document.getElementById('exerciseGroups');
        const totalCards = container.querySelectorAll('.exercise-group-card, .template-note-card').length;
        const cardHtml = window.templateNoteCardRenderer.createNoteCard(note, position, totalCards + 1);

        // Insert at correct position
        const existingCards = container.querySelectorAll('.exercise-group-card, .template-note-card');
        if (position >= existingCards.length) {
            // Insert at end
            container.insertAdjacentHTML('beforeend', cardHtml);
        } else {
            // Insert before the card at this position
            existingCards[position].insertAdjacentHTML('beforebegin', cardHtml);
        }

        // Mark as dirty
        markEditorDirty();

        // Auto-open edit mode for the new note
        setTimeout(() => {
            window.handleEditTemplateNote(noteId);
        }, 100);
    }

    console.log('✅ Template note created:', noteId);
}

/**
 * Handle editing a template note
 * @param {string} noteId - ID of note to edit
 */
window.handleEditTemplateNote = function(noteId) {
    console.log('📝 Edit template note:', noteId);

    const notes = window.ghostGym.workoutBuilder.currentWorkout.template_notes || [];
    const note = notes.find(n => n.id === noteId);

    if (!note) {
        console.error('❌ Note not found:', noteId);
        return;
    }

    // Use UnifiedOffcanvasFactory to create edit offcanvas
    if (window.UnifiedOffcanvasFactory?.createTemplateNoteEditor) {
        window.UnifiedOffcanvasFactory.createTemplateNoteEditor({
            note: note,
            onSave: (content) => {
                saveTemplateNoteContent(noteId, content);
            },
            onDelete: () => {
                window.handleDeleteTemplateNote(noteId);
            }
        });
    } else {
        // Fallback: Use prompt
        const newContent = prompt('Edit note:', note.content || '');
        if (newContent !== null) {
            saveTemplateNoteContent(noteId, newContent);
        }
    }
};

/**
 * Save template note content
 * @param {string} noteId - Note ID
 * @param {string} content - New content
 */
function saveTemplateNoteContent(noteId, content) {
    console.log('💾 Saving template note:', noteId);

    const notes = window.ghostGym.workoutBuilder.currentWorkout.template_notes || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex === -1) {
        console.error('❌ Note not found:', noteId);
        return;
    }

    // Update note content
    notes[noteIndex].content = content;
    notes[noteIndex].modified_at = new Date().toISOString();

    // Update card preview
    if (window.templateNoteCardRenderer) {
        window.templateNoteCardRenderer.updateNoteCardPreview(noteId, content);
    }

    // Mark as dirty
    markEditorDirty();

    console.log('✅ Template note saved');
}

/**
 * Handle deleting a template note
 * @param {string} noteId - ID of note to delete
 */
window.handleDeleteTemplateNote = function(noteId) {
    console.log('🗑️ Delete template note:', noteId);

    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    // Remove from state
    const notes = window.ghostGym.workoutBuilder.currentWorkout.template_notes || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
    }

    // Remove card from DOM
    if (window.templateNoteCardRenderer) {
        window.templateNoteCardRenderer.removeNoteCard(noteId);
    }

    // Mark as dirty
    markEditorDirty();

    console.log('✅ Template note deleted');
};

/**
 * Render all template notes for a workout
 * @param {Array} templateNotes - Array of template notes
 */
function renderTemplateNotes(templateNotes) {
    if (!templateNotes || templateNotes.length === 0) {
        console.log('ℹ️ No template notes to render');
        return;
    }

    if (!window.templateNoteCardRenderer) {
        console.warn('⚠️ TemplateNoteCardRenderer not available');
        return;
    }

    const container = document.getElementById('exerciseGroups');
    if (!container) return;

    console.log(`📝 Rendering ${templateNotes.length} template note(s)`);

    // Sort notes by order_index
    const sortedNotes = [...templateNotes].sort((a, b) => a.order_index - b.order_index);

    // Get all existing cards to determine positions
    const existingCards = container.querySelectorAll('.exercise-group-card, .template-note-card');
    const totalCards = existingCards.length + sortedNotes.length;

    sortedNotes.forEach((note, idx) => {
        const cardHtml = window.templateNoteCardRenderer.createNoteCard(note, note.order_index, totalCards);

        // Insert at the correct position based on order_index
        const targetPosition = note.order_index;
        const currentCards = container.querySelectorAll('.exercise-group-card, .template-note-card');

        if (targetPosition >= currentCards.length) {
            container.insertAdjacentHTML('beforeend', cardHtml);
        } else {
            currentCards[targetPosition].insertAdjacentHTML('beforebegin', cardHtml);
        }
    });

    console.log('✅ Template notes rendered');
}

/**
 * Collect template notes from state with updated order indices based on DOM order
 * @returns {Array} Array of template note objects
 */
function collectTemplateNotes() {
    const notes = window.ghostGym.workoutBuilder.currentWorkout?.template_notes || [];
    if (notes.length === 0) {
        return [];
    }

    const container = document.getElementById('exerciseGroups');
    if (!container) {
        return notes;
    }

    // Get all cards in DOM order to determine actual positions
    const allCards = container.querySelectorAll('.exercise-group-card, .template-note-card');
    const noteCardsInDom = Array.from(allCards)
        .map((card, index) => ({
            card: card,
            index: index,
            isNote: card.classList.contains('template-note-card'),
            noteId: card.getAttribute('data-note-id')
        }))
        .filter(item => item.isNote);

    // Update order indices based on DOM position
    const updatedNotes = notes.map(note => {
        const domItem = noteCardsInDom.find(item => item.noteId === note.id);
        const orderIndex = domItem ? domItem.index : note.order_index;

        return {
            id: note.id,
            content: note.content || '',
            order_index: orderIndex,
            created_at: note.created_at,
            modified_at: note.modified_at
        };
    });

    console.log('📝 Collected template notes:', updatedNotes.length);
    return updatedNotes;
}

// Export functions
window.renderTemplateNotes = renderTemplateNotes;
window.createTemplateNoteAtPosition = createTemplateNoteAtPosition;
window.saveTemplateNoteContent = saveTemplateNoteContent;
window.collectTemplateNotes = collectTemplateNotes;

console.log('📦 Workout Editor component loaded');