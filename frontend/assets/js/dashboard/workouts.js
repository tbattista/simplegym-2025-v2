/**
 * Ghost Gym Dashboard - Workout Management Module
 * Handles workout CRUD operations, exercise groups, and rendering
 * @version 1.1.0 - Added autosave functionality
 */

/**
 * ============================================
 * AUTOSAVE STATE MANAGEMENT
 * ============================================
 */

// Autosave configuration
const AUTOSAVE_DEBOUNCE_MS = 3000; // 3 seconds
let autosaveTimeout = null;
let lastSaveTime = null;

// Initialize autosave state
window.ghostGym = window.ghostGym || {};
window.ghostGym.workoutBuilder = window.ghostGym.workoutBuilder || {
    isDirty: false,
    isAutosaving: false,
    selectedWorkoutId: null,
    autosaveEnabled: true
};

/**
 * Mark editor as having unsaved changes
 */
function markEditorDirty() {
    if (!window.ghostGym.workoutBuilder.selectedWorkoutId) {
        // Don't mark dirty for new unsaved workouts
        return;
    }
    
    window.ghostGym.workoutBuilder.isDirty = true;
    updateSaveIndicator('unsaved');
    scheduleAutosave();
}

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
        
        // Use saveWorkoutFromEditor if available (new inline editor)
        if (window.saveWorkoutFromEditor) {
            await window.saveWorkoutFromEditor(true); // Pass true for silent mode
        } else {
            // Fallback to old saveWorkout function
            await saveWorkout(true);
        }
        
        window.ghostGym.workoutBuilder.isDirty = false;
        lastSaveTime = new Date();
        
        console.log('✅ Workout auto-saved successfully');
        
    } catch (error) {
        console.error('❌ Autosave failed:', error);
    } finally {
        window.ghostGym.workoutBuilder.isAutosaving = false;
    }
}

/**
 * Update save status indicator
 * Now uses saveStatus element from workout-editor
 */
function updateSaveIndicator(status) {
    // Delegate to workout-editor's updateSaveStatus if available
    if (window.updateSaveStatus) {
        window.updateSaveStatus(status);
        return;
    }
    
    // Fallback for old implementation
    const indicator = document.getElementById('saveStatus');
    if (!indicator) return;
    
    indicator.className = `save-status ${status}`;
    
    switch (status) {
        case 'saving':
            indicator.textContent = 'Saving...';
            break;
        case 'saved':
            indicator.textContent = 'All changes saved';
            break;
        case 'unsaved':
            indicator.textContent = 'Unsaved changes';
            break;
        case 'error':
            indicator.textContent = 'Save failed';
            break;
        default:
            indicator.textContent = '';
    }
}

/**
 * Update relative save time display
 */
function updateRelativeSaveTime() {
    if (!lastSaveTime) return;
    
    const indicator = document.getElementById('saveStatus');
    if (!indicator) return;
    
    const now = new Date();
    const seconds = Math.floor((now - lastSaveTime) / 1000);
    
    let timeText = '';
    if (seconds < 60) {
        timeText = 'Saved just now';
    } else if (seconds < 120) {
        timeText = 'Saved 1 min ago';
    } else if (seconds < 3600) {
        timeText = `Saved ${Math.floor(seconds / 60)} mins ago`;
    } else {
        timeText = 'Saved';
    }
    
    indicator.textContent = timeText;
}

// Update relative time every 30 seconds
setInterval(updateRelativeSaveTime, 30000);

/**
 * Initialize autosave listeners on form inputs
 */
function initializeAutosaveListeners() {
    // Listen to workout name, description, tags
    const workoutName = document.getElementById('workoutName');
    const workoutDescription = document.getElementById('workoutDescription');
    const workoutTags = document.getElementById('workoutTags');
    
    [workoutName, workoutDescription, workoutTags].forEach(input => {
        if (input) {
            input.addEventListener('input', markEditorDirty);
            input.addEventListener('change', markEditorDirty);
        }
    });
    
    console.log('✅ Autosave listeners initialized');
}

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

/**
 * Warn user about unsaved changes on page unload
 */
window.addEventListener('beforeunload', (e) => {
    if (window.ghostGym.workoutBuilder.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});

/**
 * Render workouts in grid layout (Builder view)
 */
function renderWorkouts() {
    console.log('🔍 DEBUG: renderWorkouts called with', window.ghostGym.workouts.length, 'workouts');
    const workoutsGrid = document.getElementById('workoutsGrid');
    const workoutsEmptyState = document.getElementById('workoutsEmptyState');
    
    if (!workoutsGrid) {
        console.log('❌ DEBUG: workoutsGrid element not found!');
        return;
    }
    
    const filteredWorkouts = window.ghostGym.workouts.filter(workout =>
        workout.name.toLowerCase().includes(window.ghostGym.searchFilters.workouts.toLowerCase())
    );
    console.log('🔍 DEBUG: Filtered to', filteredWorkouts.length, 'workouts');
    
    if (filteredWorkouts.length === 0) {
        workoutsGrid.style.display = 'none';
        workoutsEmptyState.style.display = 'block';
        return;
    }
    
    workoutsGrid.style.display = 'grid';
    workoutsEmptyState.style.display = 'none';
    
    workoutsGrid.innerHTML = filteredWorkouts.map(workout => `
        <div class="workout-card" data-workout-id="${workout.id}" draggable="true">
            <div class="workout-card-header">
                <h6 class="workout-card-title">${escapeHtml(workout.name)}</h6>
                <div class="workout-card-menu dropdown">
                    <button class="btn btn-sm btn-ghost-secondary p-0" type="button" data-bs-toggle="dropdown">
                        <i class="bx bx-dots-vertical-rounded"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" onclick="editWorkout('${workout.id}')">
                            <i class="bx bx-edit me-2"></i>Edit
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="duplicateWorkout('${workout.id}')">
                            <i class="bx bx-copy me-2"></i>Duplicate
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteWorkout('${workout.id}')">
                            <i class="bx bx-trash me-2"></i>Delete
                        </a></li>
                    </ul>
                </div>
            </div>
            ${workout.description ? `
                <p class="workout-card-description">${escapeHtml(workout.description)}</p>
            ` : ''}
            <div class="workout-card-stats">
                <span class="workout-card-stat">
                    <i class="bx bx-list-ul"></i>
                    ${workout.exercise_groups?.length || 0} groups
                </span>
                <span class="workout-card-stat">
                    <i class="bx bx-plus-circle"></i>
                    ${workout.bonus_exercises?.length || 0} bonus
                </span>
            </div>
            ${workout.tags && workout.tags.length > 0 ? `
                <div class="workout-card-tags">
                    ${workout.tags.map(tag => `<span class="workout-card-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Add drag and drop event listeners
    addWorkoutDragListeners();
}

/**
 * Filter workouts in builder view
 */
function filterWorkouts() {
    const searchInput = document.getElementById('workoutSearch');
    if (searchInput) {
        window.ghostGym.searchFilters.workouts = searchInput.value;
        renderWorkouts();
    }
}

/**
 * Add workout drag listeners for adding to programs
 */
function addWorkoutDragListeners() {
    const workoutCards = document.querySelectorAll('.workout-card[draggable="true"]');
    
    workoutCards.forEach(card => {
        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.workoutId);
            this.classList.add('dragging');
        });
        
        card.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
        });
    });
    
    // Add drop zone for program workouts
    const programWorkouts = document.getElementById('programWorkouts');
    if (programWorkouts) {
        programWorkouts.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        programWorkouts.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        programWorkouts.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const workoutId = e.dataTransfer.getData('text/plain');
            if (workoutId && window.ghostGym.currentProgram) {
                addWorkoutToProgram(window.ghostGym.currentProgram.id, workoutId);
            }
        });
    }
}

/**
 * Save workout (create or update)
 * @param {boolean} silent - If true, don't show alerts or close modal (for autosave)
 */
async function saveWorkout(silent = false) {
    try {
        const form = document.getElementById('workoutForm');
        if (!form) return;
        
        // Collect basic workout data
        const workoutData = {
            name: document.getElementById('workoutName')?.value?.trim(),
            description: document.getElementById('workoutDescription')?.value?.trim(),
            tags: document.getElementById('workoutTags')?.value?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            exercise_groups: collectExerciseGroups(),
            bonus_exercises: collectBonusExercises()
        };
        
        // Validate required fields
        if (!workoutData.name) {
            if (!silent) showAlert('Workout name is required', 'danger');
            return;
        }
        
        if (workoutData.exercise_groups.length === 0) {
            if (!silent) showAlert('At least one exercise group is required', 'danger');
            return;
        }
        
        // Show loading state (only for manual saves)
        const saveBtn = document.getElementById('saveWorkoutBtn');
        if (!silent && saveBtn) {
            saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
            saveBtn.disabled = true;
        }
        
        // Check if this is an update or create
        const workoutId = window.ghostGym.workoutBuilder.selectedWorkoutId;
        let savedWorkout;
        
        if (workoutId) {
            // Update existing workout
            workoutData.id = workoutId;
            
            if (window.dataManager.updateWorkout) {
                savedWorkout = await window.dataManager.updateWorkout(workoutId, workoutData);
            } else {
                // Fallback: use createWorkout for updates
                savedWorkout = await window.dataManager.createWorkout(workoutData);
            }
            
            // Update in local state
            const index = window.ghostGym.workouts.findIndex(w => w.id === workoutId);
            if (index !== -1) {
                window.ghostGym.workouts[index] = savedWorkout;
            }
        } else {
            // Create new workout
            savedWorkout = await window.dataManager.createWorkout(workoutData);
            window.ghostGym.workouts.unshift(savedWorkout);
            window.ghostGym.workoutBuilder.selectedWorkoutId = savedWorkout.id;
        }
        
        renderWorkouts();
        renderWorkoutsView();
        updateStats();
        
        // Only close modal and show alert for manual saves
        if (!silent) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('workoutModal'));
            if (modal) modal.hide();
            showAlert(`Workout "${savedWorkout.name}" saved successfully!`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error saving workout:', error);
        if (!silent) showAlert('Failed to save workout: ' + error.message, 'danger');
        throw error; // Re-throw for autosave error handling
    } finally {
        // Reset button state (only for manual saves)
        if (!silent) {
            const saveBtn = document.getElementById('saveWorkoutBtn');
            if (saveBtn) {
                saveBtn.innerHTML = 'Save Workout';
                saveBtn.disabled = false;
            }
        }
    }
}

/**
 * Collect exercise groups from form
 * UPDATED: Reads from card data storage for card-based layout
 */
function collectExerciseGroups() {
    const groups = [];
    
    // Check if using card-based layout (new approach)
    const cardElements = document.querySelectorAll('#exerciseGroups .exercise-group-card');
    
    if (cardElements.length > 0) {
        // NEW: Collect from card data storage
        cardElements.forEach(cardEl => {
            const groupId = cardEl.getAttribute('data-group-id');
            const groupData = window.exerciseGroupsData[groupId];
            
            if (groupData && groupData.exercises.a) {
                // Clean up exercises object - remove empty values
                const exercises = {};
                Object.keys(groupData.exercises).forEach(key => {
                    if (groupData.exercises[key]) {
                        exercises[key] = groupData.exercises[key];
                    }
                });
                
                if (Object.keys(exercises).length > 0) {
                    groups.push({
                        exercises: exercises,
                        sets: groupData.sets || '3',
                        reps: groupData.reps || '8-12',
                        rest: groupData.rest || '60s',
                        default_weight: groupData.default_weight || null,
                        default_weight_unit: groupData.default_weight_unit || 'lbs'
                    });
                }
            }
        });
    } else {
        // FALLBACK: Old accordion-based approach for backward compatibility
        const groupElements = document.querySelectorAll('#exerciseGroups .exercise-group');
        
        groupElements.forEach(groupEl => {
            const exercises = {};
            const exerciseInputs = groupEl.querySelectorAll('.exercise-input');
            
            exerciseInputs.forEach((input, index) => {
                const value = input.value.trim();
                if (value) {
                    const letter = String.fromCharCode(97 + index);
                    exercises[letter] = value;
                }
            });
            
            if (Object.keys(exercises).length > 0) {
                const bodyEl = groupEl.querySelector('.accordion-body') || groupEl.querySelector('.card-body');
                const activeUnitBtn = bodyEl?.querySelector('.weight-unit-btn.active');
                const weightUnit = activeUnitBtn?.getAttribute('data-unit') || 'lbs';
                const weight = bodyEl?.querySelector('.weight-input')?.value?.trim() || '';
                
                groups.push({
                    exercises: exercises,
                    sets: bodyEl?.querySelector('.sets-input')?.value || '3',
                    reps: bodyEl?.querySelector('.reps-input')?.value || '8-12',
                    rest: bodyEl?.querySelector('.rest-input')?.value || '60s',
                    default_weight: weight || null,
                    default_weight_unit: weightUnit
                });
            }
        });
    }
    
    console.log('🔍 DEBUG: Collected', groups.length, 'exercise groups');
    return groups;
}

/**
 * Collect bonus exercises from form
 * UPDATED: Reads from card data storage for card-based layout
 */
function collectBonusExercises() {
    const bonusExercises = [];
    
    // Check if using card-based layout (new approach)
    const cardElements = document.querySelectorAll('#bonusExercises .bonus-exercise-card');
    
    if (cardElements.length > 0) {
        // NEW: Collect from card data storage
        cardElements.forEach(cardEl => {
            const bonusId = cardEl.getAttribute('data-bonus-id');
            const bonusData = window.bonusExercisesData[bonusId];
            
            if (bonusData && bonusData.name) {
                bonusExercises.push({
                    name: bonusData.name,
                    sets: bonusData.sets || '2',
                    reps: bonusData.reps || '15',
                    rest: bonusData.rest || '30s'
                });
            }
        });
    } else {
        // FALLBACK: Old accordion-based approach for backward compatibility
        const bonusElements = document.querySelectorAll('#bonusExercises .bonus-exercise');
        
        bonusElements.forEach(bonusEl => {
            const bodyEl = bonusEl.querySelector('.accordion-body') || bonusEl.querySelector('.card-body');
            const name = bodyEl?.querySelector('.bonus-name-input')?.value?.trim();
            
            if (name) {
                bonusExercises.push({
                    name: name,
                    sets: bodyEl?.querySelector('.bonus-sets-input')?.value || '2',
                    reps: bodyEl?.querySelector('.bonus-reps-input')?.value || '15',
                    rest: bodyEl?.querySelector('.bonus-rest-input')?.value || '30s'
                });
            }
        });
    }
    
    console.log('🔍 DEBUG: Collected', bonusExercises.length, 'bonus exercises');
    return bonusExercises;
}

/**
 * Add exercise group to workout form (UPDATED FOR CARD-BASED LAYOUT)
 */
function addExerciseGroup() {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;
    
    const groupCount = container.children.length + 1;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create card HTML
    const groupHtml = createExerciseGroupCard(groupId, null, groupCount);
    
    container.insertAdjacentHTML('beforeend', groupHtml);
    
    // Initialize Sortable if not already done
    initializeExerciseGroupSorting();
    
    // Auto-open editor for new group
    setTimeout(() => {
        openExerciseGroupEditor(groupId);
    }, 100);
    
    // Mark editor as dirty
    markEditorDirty();
    
    console.log('✅ Added new exercise group card:', groupId);
}

/**
 * Add weight unit button listeners to a group
 */
function addWeightUnitButtonListeners(groupElement) {
    const unitButtons = groupElement.querySelectorAll('.weight-unit-btn');
    
    unitButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove active class from all buttons in this group
            const allButtons = this.closest('.row').querySelectorAll('.weight-unit-btn');
            allButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.classList.add('btn-outline-secondary');
                btn.classList.remove('btn-secondary');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            this.classList.remove('btn-outline-secondary');
            this.classList.add('btn-secondary');
            
            // Mark as dirty for autosave
            markEditorDirty();
        });
    });
    
    // Set default active button (lbs)
    const defaultButton = groupElement.querySelector('.weight-unit-btn[data-unit="lbs"]');
    if (defaultButton) {
        defaultButton.classList.add('active');
        defaultButton.classList.remove('btn-outline-secondary');
        defaultButton.classList.add('btn-secondary');
    }
}

/**
 * Add bonus exercise to workout form (UPDATED FOR CARD-BASED LAYOUT)
 */
function addBonusExercise() {
    const container = document.getElementById('bonusExercises');
    if (!container) return;
    
    const bonusCount = container.children.length + 1;
    const bonusId = `bonus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create card HTML
    const bonusHtml = createBonusExerciseCard(bonusId, null, bonusCount);
    
    container.insertAdjacentHTML('beforeend', bonusHtml);
    
    // Auto-open editor for new bonus exercise
    setTimeout(() => {
        openBonusExerciseEditor(bonusId);
    }, 100);
    
    // Mark editor as dirty
    markEditorDirty();
    
    console.log('✅ Added new bonus exercise card:', bonusId);
}

/**
 * Remove exercise group with confirmation
 */
function removeExerciseGroup(button) {
    // Get the group element
    const group = button.closest('.exercise-group');
    if (!group) return;
    
    // Get exercise names for confirmation message
    const exerciseInputs = group.querySelectorAll('.exercise-input');
    const exerciseNames = Array.from(exerciseInputs)
        .map(input => input.value.trim())
        .filter(name => name);
    
    // Create confirmation message
    let confirmMessage = 'Are you sure you want to delete this exercise group?';
    if (exerciseNames.length > 0) {
        confirmMessage += '\n\nExercises in this group:\n• ' + exerciseNames.join('\n• ');
    }
    confirmMessage += '\n\nThis action cannot be undone.';
    
    // Show confirmation dialog
    if (confirm(confirmMessage)) {
        group.remove();
        renumberExerciseGroups();
        
        // Mark editor as dirty
        markEditorDirty();
        
        // Show success message
        showToast('Exercise group deleted', 'success');
    }
}

/**
 * Remove bonus exercise
 */
function removeBonusExercise(button) {
    const bonus = button.closest('.bonus-exercise');
    if (bonus) {
        bonus.remove();
        renumberBonusExercises();
        markEditorDirty();
    }
}

/**
 * Renumber bonus exercises after removal or reordering
 */
function renumberBonusExercises() {
    const bonuses = document.querySelectorAll('#bonusExercises .bonus-exercise');
    bonuses.forEach((bonus, index) => {
        const title = bonus.querySelector('.bonus-title');
        if (title) {
            title.textContent = `Bonus Exercise ${index + 1}`;
        }
    });
}

/**
 * Update bonus exercise preview in accordion header
 */
function updateBonusExercisePreview(bonusElement) {
    if (!bonusElement) return;
    
    const nameInput = bonusElement.querySelector('.bonus-name-input');
    const setsInput = bonusElement.querySelector('.bonus-sets-input');
    const repsInput = bonusElement.querySelector('.bonus-reps-input');
    const restInput = bonusElement.querySelector('.bonus-rest-input');
    const preview = bonusElement.querySelector('.bonus-preview');
    const title = bonusElement.querySelector('.bonus-title');
    
    if (!preview || !title) return;
    
    const name = nameInput?.value?.trim() || '';
    const sets = setsInput?.value || '2';
    const reps = repsInput?.value || '15';
    const rest = restInput?.value || '30s';
    
    if (name) {
        // Update title to show exercise name
        title.textContent = name;
        // Show full details in preview
        preview.textContent = `${sets}×${reps} • Rest: ${rest}`;
        preview.style.display = 'block';
    } else {
        // Reset to default title when empty
        const bonusNumber = Array.from(bonusElement.parentElement.children).indexOf(bonusElement) + 1;
        title.textContent = `Bonus Exercise ${bonusNumber}`;
        preview.textContent = '';
        preview.style.display = 'none';
    }
}

/**
 * Initialize drag-and-drop sorting for exercise groups
 */
function initializeExerciseGroupSorting() {
    const container = document.getElementById('exerciseGroups');
    if (!container) return;
    
    // Check if already initialized
    if (container.sortableInstance) {
        return;
    }
    
    // Initialize Sortable
    container.sortableInstance = new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        chosenClass: 'sortable-chosen',
        forceFallback: true,
        fallbackTolerance: 3,
        
        onStart: function(evt) {
            // Collapse all accordions during drag for cleaner UX
            const accordions = container.querySelectorAll('.accordion-collapse.show');
            accordions.forEach(acc => {
                const currentItemCollapse = evt.item.querySelector('.accordion-collapse');
                if (acc.id !== currentItemCollapse?.id) {
                    const bsCollapse = bootstrap.Collapse.getInstance(acc);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            });
        },
        
        onEnd: function(evt) {
            // Renumber groups after reordering
            renumberExerciseGroups();
            
            // Mark editor as dirty
            if (window.markEditorDirty) {
                window.markEditorDirty();
            }
            
            console.log('✅ Exercise group reordered:', {
                oldIndex: evt.oldIndex,
                newIndex: evt.newIndex
            });
        }
    });
    
    console.log('✅ Exercise group sorting initialized');
}

/**
 * Renumber exercise groups after removal or reordering
 */
function renumberExerciseGroups() {
    const groups = document.querySelectorAll('#exerciseGroups .exercise-group');
    groups.forEach((group, index) => {
        // Try accordion structure first
        const accordionTitle = group.querySelector('.group-title');
        if (accordionTitle) {
            accordionTitle.textContent = `Exercise Group ${index + 1}`;
        } else {
            // Fallback to card structure
            const cardHeader = group.querySelector('.card-header h6');
            if (cardHeader) {
                cardHeader.textContent = `Exercise Group ${index + 1}`;
            }
        }
    });
}

/**
 * Update exercise group preview in accordion header
 */
function updateExerciseGroupPreview(groupElement) {
    if (!groupElement) return;
    
    const exerciseInputs = groupElement.querySelectorAll('.exercise-input');
    const previewMain = groupElement.querySelector('.exercise-preview-main');
    const previewSecondaries = groupElement.querySelectorAll('.exercise-preview-secondary');
    const previewInfo = groupElement.querySelector('.exercise-preview-info');
    const previewWeight = groupElement.querySelector('.exercise-preview-weight');
    
    if (!previewMain) return;
    
    // Get exercise values
    const exercises = Array.from(exerciseInputs).map(input => input.value.trim()).filter(v => v);
    
    // Get sets, reps, rest values
    const bodyEl = groupElement.querySelector('.accordion-body') || groupElement.querySelector('.card-body');
    const sets = bodyEl?.querySelector('.sets-input')?.value || '3';
    const reps = bodyEl?.querySelector('.reps-input')?.value || '8-12';
    const rest = bodyEl?.querySelector('.rest-input')?.value || '60s';
    
    // Update main exercise (Exercise A) - just the name
    if (exercises.length > 0) {
        previewMain.textContent = exercises[0];
        previewMain.style.display = 'block';
    } else {
        previewMain.textContent = '';
        previewMain.style.display = 'none';
    }
    
    // Update secondary exercises (B, C, etc.) - show as "Alt" lines
    previewSecondaries.forEach((preview, index) => {
        const exerciseIndex = index + 1; // B is index 1, C is index 2
        if (exercises.length > exerciseIndex) {
            preview.textContent = exercises[exerciseIndex];
            preview.style.display = 'block';
        } else {
            preview.textContent = '';
            preview.style.display = 'none';
        }
    });
    
    // Update info line (Reps Sets Rest)
    if (previewInfo && exercises.length > 0) {
        previewInfo.textContent = `${sets} Sets • ${reps} Reps • ${rest} Rest`;
        previewInfo.style.display = 'block';
    } else if (previewInfo) {
        previewInfo.textContent = '';
        previewInfo.style.display = 'none';
    }
    
    // Update weight display with actual value
    if (previewWeight && exercises.length > 0) {
        const weightInput = bodyEl?.querySelector('.weight-input');
        const weight = weightInput?.value?.trim();
        const activeUnitBtn = bodyEl?.querySelector('.weight-unit-btn.active');
        const weightUnit = activeUnitBtn?.getAttribute('data-unit') || 'lbs';
        
        if (weight) {
            previewWeight.textContent = `${weight} ${weightUnit}`;
            console.log('🔍 DEBUG: Updated weight preview:', `${weight} ${weightUnit}`);
        } else {
            previewWeight.textContent = 'Weight';
        }
        previewWeight.style.display = 'block';
    } else if (previewWeight) {
        previewWeight.textContent = '';
        previewWeight.style.display = 'none';
    }
}

/**
 * Add exercise to existing group
 */
function addExerciseToGroup(button) {
    const group = button.closest('.exercise-group');
    const exerciseInputs = group.querySelectorAll('.exercise-input');
    const nextLetter = String.fromCharCode(97 + exerciseInputs.length); // d, e, f, etc.
    
    if (exerciseInputs.length >= 6) {
        showAlert('Maximum 6 exercises per group', 'warning');
        return;
    }
    
    const groupId = group.dataset.groupId;
    const exerciseId = `exercise-${groupId}-${nextLetter}`;
    
    const newExerciseHtml = `
        <div class="col-md-6 mb-3">
            <label class="form-label">Exercise ${nextLetter.toUpperCase()} (optional)</label>
            <div class="input-group">
                <input type="text" class="form-control exercise-input exercise-autocomplete-input"
                       id="${exerciseId}" placeholder="Search exercises...">
                <button type="button" class="btn btn-outline-danger" onclick="removeExerciseFromGroup(this)">
                    <i class="bx bx-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    const lastRow = group.querySelector('.row:last-of-type');
    lastRow.insertAdjacentHTML('beforebegin', `<div class="row">${newExerciseHtml}</div>`);
    
    // Initialize autocomplete on new input
    initializeExerciseAutocompletes();
    
    // Update preview
    updateExerciseGroupPreview(group);
}

/**
 * Remove exercise from group
 */
function removeExerciseFromGroup(button) {
    const exerciseDiv = button.closest('.col-md-6');
    const row = exerciseDiv.parentElement;
    
    exerciseDiv.remove();
    
    // Remove row if empty
    if (row.children.length === 0) {
        row.remove();
    }
}

/**
 * Edit workout by ID
 */
function editWorkout(id) {
    const workout = window.ghostGym.workouts.find(w => w.id === id);
    if (!workout) return;
    
    // Set selected workout ID for autosave
    window.ghostGym.workoutBuilder.selectedWorkoutId = workout.id;
    window.ghostGym.workoutBuilder.isDirty = false;
    
    // Populate form with workout data
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
            
            // Populate exercises in correct order (a, b, c, d, e, f)
            const exerciseInputs = lastGroup.querySelectorAll('.exercise-input');
            const orderedKeys = ['a', 'b', 'c', 'd', 'e', 'f'];
            orderedKeys.forEach((key, index) => {
                if (group.exercises && group.exercises[key] && exerciseInputs[index]) {
                    exerciseInputs[index].value = group.exercises[key];
                }
            });
            
            // Populate sets, reps, rest
            lastGroup.querySelector('.sets-input').value = group.sets || '3';
            lastGroup.querySelector('.reps-input').value = group.reps || '8-12';
            lastGroup.querySelector('.rest-input').value = group.rest || '60s';
            
            // Populate weight and weight unit
            const weightInput = lastGroup.querySelector('.weight-input');
            if (weightInput && group.default_weight) {
                weightInput.value = group.default_weight;
                console.log('🔍 DEBUG: Populated weight field:', group.default_weight);
            }
            
            // Set weight unit button
            const weightUnit = group.default_weight_unit || 'lbs';
            const unitButtons = lastGroup.querySelectorAll('.weight-unit-btn');
            unitButtons.forEach(btn => {
                btn.classList.remove('active', 'btn-secondary');
                btn.classList.add('btn-outline-secondary');
                if (btn.getAttribute('data-unit') === weightUnit) {
                    btn.classList.add('active', 'btn-secondary');
                    btn.classList.remove('btn-outline-secondary');
                    console.log('🔍 DEBUG: Set weight unit button to:', weightUnit);
                }
            });
            
            // Update preview after populating
            updateExerciseGroupPreview(lastGroup);
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
            
            // Update preview after populating
            updateBonusExercisePreview(lastBonus);
        });
    }
    
    // Update modal title
    document.getElementById('workoutModalTitle').textContent = 'Edit Workout';
    
    // Initialize autosave listeners
    initializeAutosaveListeners();
    
    // Update save indicator
    updateSaveIndicator('saved');
    lastSaveTime = new Date();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('workoutModal'));
    modal.show();
}

/**
 * Sync weights from exercise history to workout builder
 * HYBRID APPROACH: Updates UI + saves to workout template for persistence
 */
async function syncWeightsFromHistory(workoutId) {
    // Only sync for authenticated users
    if (!window.authService || !window.authService.isUserAuthenticated()) {
        return;
    }
    
    try {
        // Fetch exercise history from backend
        const url = window.config.api.getUrl(`/api/v3/firebase/workouts/exercise-history/workout/${workoutId}`);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${await window.dataManager.getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            // Silently fail - not critical for user experience
            console.log('No exercise history available yet');
            return;
        }
        
        const histories = await response.json();
        let syncedCount = 0;
        let needsSave = false;
        
        // Update weight fields for each exercise group
        const groups = document.querySelectorAll('#exerciseGroups .exercise-group');
        groups.forEach(group => {
            const mainExercise = group.querySelector('.exercise-input')?.value?.trim();
            if (!mainExercise || !histories[mainExercise]) return;
            
            const history = histories[mainExercise];
            const weightInput = group.querySelector('.weight-input');
            const unitButtons = group.querySelectorAll('.weight-unit-btn');
            
            // Check if weight is different from current value
            const currentWeight = weightInput?.value;
            const historyWeight = history.last_weight?.toString();
            
            if (historyWeight && currentWeight !== historyWeight) {
                // Update weight value
                if (weightInput) {
                    weightInput.value = history.last_weight;
                    syncedCount++;
                    needsSave = true;
                    console.log(`✅ Synced weight for ${mainExercise}: ${history.last_weight} ${history.last_weight_unit}`);
                }
                
                // Update unit button
                if (history.last_weight_unit) {
                    unitButtons.forEach(btn => {
                        const isActive = btn.getAttribute('data-unit') === history.last_weight_unit;
                        btn.classList.toggle('active', isActive);
                        btn.classList.toggle('btn-secondary', isActive);
                        btn.classList.toggle('btn-outline-secondary', !isActive);
                    });
                }
                
                // Update preview to show new weight
                updateExerciseGroupPreview(group);
            }
        });
        
        if (syncedCount > 0) {
            console.log(`✅ Synced ${syncedCount} weights from history`);
            
            // Auto-save to persist synced weights to workout template
            if (needsSave && window.ghostGym.workoutBuilder.selectedWorkoutId) {
                console.log('💾 Auto-saving synced weights to workout template...');
                await autoSaveWorkout();
            }
        }
        
    } catch (error) {
        // Fail silently - not critical for user experience
        console.warn('⚠️ Could not sync weights from history:', error.message);
    }
}

/**
 * Duplicate workout
 */
function duplicateWorkout(id) {
    const workout = window.ghostGym.workouts.find(w => w.id === id);
    if (!workout) return;
    
    // Create duplicate with new name
    const duplicateData = {
        ...workout,
        name: `${workout.name} (Copy)`,
        id: undefined,
        created_date: undefined,
        modified_date: undefined
    };
    
    // Save duplicate
    window.dataManager.createWorkout(duplicateData).then(savedWorkout => {
        window.ghostGym.workouts.unshift(savedWorkout);
        renderWorkouts();
        renderWorkoutsView();
        updateStats();
        showAlert(`Workout duplicated as "${savedWorkout.name}"`, 'success');
    }).catch(error => {
        showAlert('Failed to duplicate workout: ' + error.message, 'danger');
    });
}

/**
 * Delete workout
 */
function deleteWorkout(id) {
    const workout = window.ghostGym.workouts.find(w => w.id === id);
    if (!workout) return;
    
    if (confirm(`Are you sure you want to delete "${workout.name}"? This action cannot be undone.`)) {
        // Remove from local state
        window.ghostGym.workouts = window.ghostGym.workouts.filter(w => w.id !== id);
        
        renderWorkouts();
        renderWorkoutsView();
        updateStats();
        showAlert(`Workout "${workout.name}" deleted`, 'success');
    }
}

/**
 * Clear workout form
 */
function clearWorkoutForm() {
    const form = document.getElementById('workoutForm');
    if (form) {
        form.reset();
        document.getElementById('exerciseGroups').innerHTML = '';
        document.getElementById('bonusExercises').innerHTML = '';
        addExerciseGroup();
        
        // Reset autosave state for new workout
        window.ghostGym.workoutBuilder.selectedWorkoutId = null;
        window.ghostGym.workoutBuilder.isDirty = false;
        updateSaveIndicator();
        
        // Initialize autosave listeners
        initializeAutosaveListeners();
    }
}

/**
 * Prompt user to select a program to add workout to
 */
function addWorkoutToProgramPrompt(workoutId) {
    const workout = window.ghostGym.workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    if (window.ghostGym.programs.length === 0) {
        showAlert('No programs available. Create a program first.', 'warning');
        return;
    }
    
    // Create selection dialog
    const programOptions = window.ghostGym.programs.map(p =>
        `<option value="${p.id}">${escapeHtml(p.name)} (${p.workouts?.length || 0} workouts)</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal fade" id="addToProgramModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add "${escapeHtml(workout.name)}" to Program</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label">Select Program:</label>
                        <select class="form-select" id="selectProgramForWorkout">
                            ${programOptions}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmAddToProgram">Add to Program</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('addToProgramModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addToProgramModal'));
    modal.show();
    
    // Handle confirm button
    document.getElementById('confirmAddToProgram').addEventListener('click', () => {
        const selectedProgramId = document.getElementById('selectProgramForWorkout').value;
        if (selectedProgramId) {
            addWorkoutToProgram(selectedProgramId, workoutId);
            modal.hide();
        }
    });
    
    // Clean up modal after hiding
    document.getElementById('addToProgramModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Initialize exercise autocompletes on all exercise inputs
 */
function initializeExerciseAutocompletes() {
    const inputs = document.querySelectorAll('.exercise-autocomplete-input');
    
    inputs.forEach(input => {
        // Skip if already initialized
        if (window.exerciseAutocompleteInstances && window.exerciseAutocompleteInstances[input.id]) {
            return;
        }
        
        // Initialize autocomplete
        if (typeof initExerciseAutocomplete === 'function') {
            initExerciseAutocomplete(input, {
                minChars: 2,
                maxResults: 20,
                debounceMs: 300,
                showMuscleGroup: true,
                showEquipment: true,
                showDifficulty: true,
                allowCustom: true,
                onSelect: (exercise) => {
                    console.log('Exercise selected:', exercise.name);
                }
            });
        }
    });
}

// Make functions globally available
window.renderWorkouts = renderWorkouts;
window.syncWeightsFromHistory = syncWeightsFromHistory;
window.filterWorkouts = filterWorkouts;
window.addWorkoutDragListeners = addWorkoutDragListeners;
window.saveWorkout = saveWorkout;
window.collectExerciseGroups = collectExerciseGroups;
window.collectBonusExercises = collectBonusExercises;
window.addExerciseGroup = addExerciseGroup;
window.addBonusExercise = addBonusExercise;
window.removeExerciseGroup = removeExerciseGroup;
window.removeBonusExercise = removeBonusExercise;
window.initializeExerciseGroupSorting = initializeExerciseGroupSorting;
window.renumberExerciseGroups = renumberExerciseGroups;
window.addExerciseToGroup = addExerciseToGroup;
window.removeExerciseFromGroup = removeExerciseFromGroup;
window.editWorkout = editWorkout;
window.duplicateWorkout = duplicateWorkout;
window.deleteWorkout = deleteWorkout;
window.clearWorkoutForm = clearWorkoutForm;
window.addWorkoutToProgramPrompt = addWorkoutToProgramPrompt;
window.initializeExerciseAutocompletes = initializeExerciseAutocompletes;
window.updateExerciseGroupPreview = updateExerciseGroupPreview;
window.renumberBonusExercises = renumberBonusExercises;
window.updateBonusExercisePreview = updateBonusExercisePreview;
window.addWeightUnitButtonListeners = addWeightUnitButtonListeners;

// Make autosave functions globally available
window.markEditorDirty = markEditorDirty;
window.scheduleAutosave = scheduleAutosave;
window.autoSaveWorkout = autoSaveWorkout;
window.updateSaveIndicator = updateSaveIndicator;
window.initializeAutosaveListeners = initializeAutosaveListeners;
window.addAutosaveListenersToGroup = addAutosaveListenersToGroup;

/**
 * ============================================
 * EDIT MODE FUNCTIONALITY
 * ============================================
 */

/**
 * Initialize edit mode toggle
 */
function initializeEditMode() {
    const toggle = document.getElementById('editModeToggle');
    if (!toggle) return;
    
    toggle.addEventListener('change', function() {
        if (this.checked) {
            enterEditMode();
        } else {
            exitEditMode();
        }
    });
    
    console.log('✅ Edit mode initialized');
}

/**
 * Enter edit mode
 */
function enterEditMode() {
    console.log('🔄 Entering edit mode...');
    
    const container = document.getElementById('exerciseGroups');
    const addGroupBtn = document.getElementById('addExerciseGroupBtn');
    const toggle = document.getElementById('editModeToggle');
    
    if (!container) return;
    
    // Update state
    window.ghostGym.workoutBuilder.editMode = window.ghostGym.workoutBuilder.editMode || {};
    window.ghostGym.workoutBuilder.editMode.isActive = true;
    window.ghostGym.workoutBuilder.editMode.originalOrder = collectExerciseGroupsOrder();
    window.ghostGym.workoutBuilder.editMode.hasChanges = false;
    
    // Add edit mode class to container
    container.classList.add('edit-mode-active');
    
    // Toggle is already checked by user interaction
    // Update label if needed
    const label = document.querySelector('.edit-mode-label');
    if (label) {
        label.textContent = 'Reorder';
    }
    
    // Disable add group button
    if (addGroupBtn) {
        addGroupBtn.disabled = true;
        addGroupBtn.classList.add('disabled');
    }
    
    // Collapse all accordions
    collapseAllAccordions();
    
    // Disable accordion toggle functionality
    disableAccordionToggles();
    
    // Enable Sortable if not already enabled
    if (!container.sortableInstance) {
        initializeExerciseGroupSorting();
    }
    
    // Update Sortable to track changes
    updateSortableForEditMode(true);
    
    // Show visual feedback
    showToast('Edit mode active - Drag to reorder or delete groups', 'warning');
    
    console.log('✅ Edit mode active');
}

/**
 * Exit edit mode
 */
async function exitEditMode() {
    console.log('🔄 Exiting edit mode...');
    
    const container = document.getElementById('exerciseGroups');
    const addGroupBtn = document.getElementById('addExerciseGroupBtn');
    const toggle = document.getElementById('editModeToggle');
    
    if (!container) return;
    
    // Check if order changed
    const hasChanges = window.ghostGym.workoutBuilder.editMode?.hasChanges || false;
    
    // Remove edit mode class
    container.classList.remove('edit-mode-active');
    
    // Toggle is already unchecked by user interaction
    // Label remains as 'Edit'
    
    // Re-enable add group button
    if (addGroupBtn) {
        addGroupBtn.disabled = false;
        addGroupBtn.classList.remove('disabled');
    }
    
    // Re-enable accordion toggles
    enableAccordionToggles();
    
    // Update Sortable configuration
    updateSortableForEditMode(false);
    
    // Save order if changed
    if (hasChanges) {
        await saveExerciseGroupOrder();
    }
    
    // Update state
    if (window.ghostGym.workoutBuilder.editMode) {
        window.ghostGym.workoutBuilder.editMode.isActive = false;
        window.ghostGym.workoutBuilder.editMode.originalOrder = null;
        window.ghostGym.workoutBuilder.editMode.hasChanges = false;
    }
    
    console.log('✅ Edit mode exited');
}

/**
 * Collapse all accordions
 */
function collapseAllAccordions() {
    const accordions = document.querySelectorAll('#exerciseGroups .accordion-collapse.show');
    
    accordions.forEach(accordion => {
        const bsCollapse = bootstrap.Collapse.getInstance(accordion);
        if (bsCollapse) {
            bsCollapse.hide();
        } else {
            // Create instance and hide
            new bootstrap.Collapse(accordion, { toggle: false }).hide();
        }
    });
}

/**
 * Disable accordion toggle functionality
 */
function disableAccordionToggles() {
    const buttons = document.querySelectorAll('#exerciseGroups .accordion-button');
    
    buttons.forEach(button => {
        button.setAttribute('data-original-toggle', button.getAttribute('data-bs-toggle') || '');
        button.removeAttribute('data-bs-toggle');
        button.style.cursor = 'move';
    });
}

/**
 * Enable accordion toggle functionality
 */
function enableAccordionToggles() {
    const buttons = document.querySelectorAll('#exerciseGroups .accordion-button');
    
    buttons.forEach(button => {
        const originalToggle = button.getAttribute('data-original-toggle');
        // Always restore to 'collapse' since that's what accordion buttons use
        button.setAttribute('data-bs-toggle', originalToggle || 'collapse');
        button.removeAttribute('data-original-toggle');
        button.style.cursor = '';
    });
}

/**
 * Update Sortable configuration for edit mode
 */
function updateSortableForEditMode(isEditMode) {
    const container = document.getElementById('exerciseGroups');
    if (!container || !container.sortableInstance) return;
    
    const sortable = container.sortableInstance;
    
    if (isEditMode) {
        // Detect layout type - card-based or accordion-based
        const hasCardLayout = container.querySelector('.exercise-group-card.compact') !== null;
        const hasAccordionLayout = container.querySelector('.accordion-item') !== null;
        
        // Make entire item draggable in edit mode
        if (hasCardLayout) {
            // For card-based layout, make the entire card draggable
            sortable.option('handle', '.exercise-group-card.compact .card');
        } else if (hasAccordionLayout) {
            // For accordion-based layout, make the accordion item draggable
            sortable.option('handle', '.accordion-item');
        }
        
        sortable.option('animation', 200);
        
        // Add change tracking
        sortable.option('onEnd', function(evt) {
            if (window.ghostGym.workoutBuilder.editMode) {
                window.ghostGym.workoutBuilder.editMode.hasChanges = true;
            }
            renumberExerciseGroups();
            console.log('📝 Order changed:', {
                oldIndex: evt.oldIndex,
                newIndex: evt.newIndex
            });
        });
    } else {
        // Restore original configuration
        sortable.option('handle', '.drag-handle');
        sortable.option('animation', 150);
        
        // Restore original onEnd handler
        sortable.option('onEnd', function(evt) {
            renumberExerciseGroups();
            if (window.markEditorDirty) {
                window.markEditorDirty();
            }
        });
    }
}

/**
 * Collect current exercise group order
 */
function collectExerciseGroupsOrder() {
    const groups = document.querySelectorAll('#exerciseGroups .exercise-group');
    return Array.from(groups).map(group => group.getAttribute('data-group-id'));
}

/**
 * Save exercise group order to database
 */
async function saveExerciseGroupOrder() {
    const workoutId = window.ghostGym.workoutBuilder.selectedWorkoutId;
    if (!workoutId) {
        console.warn('⚠️ No workout selected, cannot save order');
        return;
    }
    
    try {
        // Show saving indicator
        showToast('Saving new order...', 'info');
        
        // Collect current workout data with new order
        const workoutData = {
            id: workoutId,
            exercise_groups: collectExerciseGroups(),
            bonus_exercises: collectBonusExercises(),
            name: document.getElementById('workoutName')?.value,
            description: document.getElementById('workoutDescription')?.value,
            tags: document.getElementById('workoutTags')?.value?.split(',').map(t => t.trim()).filter(t => t) || []
        };
        
        // Update workout in database
        if (window.dataManager && window.dataManager.updateWorkout) {
            await window.dataManager.updateWorkout(workoutId, workoutData);
        } else {
            console.warn('⚠️ dataManager.updateWorkout not available, using createWorkout');
            // Fallback: treat as update by recreating
            await window.dataManager.createWorkout(workoutData);
        }
        
        // Update local state
        const workoutIndex = window.ghostGym.workouts.findIndex(w => w.id === workoutId);
        if (workoutIndex !== -1) {
            window.ghostGym.workouts[workoutIndex] = {
                ...window.ghostGym.workouts[workoutIndex],
                ...workoutData
            };
        }
        
        // Show success
        showToast('Exercise group order saved!', 'success');
        
        console.log('✅ Exercise group order saved to database');
        
    } catch (error) {
        console.error('❌ Failed to save exercise group order:', error);
        showToast('Failed to save order: ' + error.message, 'danger');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Use existing toast system or create simple alert
    if (window.showAlert) {
        window.showAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Make edit mode functions globally available
window.initializeEditMode = initializeEditMode;
window.enterEditMode = enterEditMode;
window.exitEditMode = exitEditMode;
window.collapseAllAccordions = collapseAllAccordions;
window.disableAccordionToggles = disableAccordionToggles;
window.enableAccordionToggles = enableAccordionToggles;
window.updateSortableForEditMode = updateSortableForEditMode;
window.collectExerciseGroupsOrder = collectExerciseGroupsOrder;
window.saveExerciseGroupOrder = saveExerciseGroupOrder;
window.showToast = showToast;

console.log('📦 Workouts module loaded');

/**
 * ============================================
 * CARD-BASED EXERCISE GROUP FUNCTIONS
 * ============================================
 */

// Initialize storage for exercise group data
window.exerciseGroupsData = window.exerciseGroupsData || {};
window.bonusExercisesData = window.bonusExercisesData || {};

/**
 * Create exercise group card HTML
 * @param {string} groupId - Unique group ID
 * @param {object} groupData - Group data (optional)
 * @param {number} groupNumber - Group number for display
 * @returns {string} HTML string
 */
function createExerciseGroupCard(groupId, groupData = null, groupNumber = 1) {
    const data = groupData || {
        exercises: { a: '', b: '', c: '' },
        sets: '3',
        reps: '8-12',
        rest: '60s',
        default_weight: '',
        default_weight_unit: 'lbs'
    };
    
    // Store data
    window.exerciseGroupsData[groupId] = data;
    
    // Build exercise list (main, alt, alt2)
    const exercises = [];
    if (data.exercises.a) exercises.push(data.exercises.a);
    if (data.exercises.b) exercises.push(data.exercises.b);
    if (data.exercises.c) exercises.push(data.exercises.c);
    
    const hasData = data.exercises.a;
    
    // Build exercises HTML - each on new line
    let exercisesHtml = '';
    if (exercises.length > 0) {
        exercisesHtml = exercises.map((ex, idx) => {
            const label = idx === 0 ? '' : `<span class="text-muted">Alt${idx > 1 ? idx : ''}: </span>`;
            return `<div class="exercise-line">${label}${escapeHtml(ex)}</div>`;
        }).join('');
    } else {
        exercisesHtml = '<div class="exercise-line text-muted">Click edit to add exercises</div>';
    }
    
    // Build meta text (plain text, not badges)
    let metaText = '';
    if (hasData) {
        const parts = [`${data.sets} sets`, `${data.reps} reps`, `${data.rest} rest`];
        if (data.default_weight) {
            parts.push(`${data.default_weight} ${data.default_weight_unit}`);
        }
        metaText = parts.join(' • ');
    }
    
    return `
        <div class="exercise-group-card compact" data-group-id="${groupId}">
            <div class="card">
                <div class="card-body">
                    <button type="button" class="btn btn-sm btn-icon btn-edit-compact"
                            onclick="event.preventDefault(); event.stopPropagation(); openExerciseGroupEditor('${groupId}');"
                            title="Edit exercise group">
                        <i class="bx bx-edit"></i>
                    </button>
                    <div class="exercise-content">
                        <div class="exercise-list">
                            ${exercisesHtml}
                        </div>
                        ${metaText ? `<div class="exercise-meta-text text-muted small">${metaText}</div>` : ''}
                    </div>
                    <div class="drag-handle" style="display: none;">
                        <i class="bx bx-menu"></i>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Open exercise group editor offcanvas
 * @param {string} groupId - ID of group to edit
 */
function openExerciseGroupEditor(groupId) {
    const groupData = window.exerciseGroupsData[groupId] || {
        exercises: { a: '', b: '', c: '' },
        sets: '3',
        reps: '8-12',
        rest: '60s',
        default_weight: '',
        default_weight_unit: 'lbs'
    };
    
    // Populate offcanvas fields
    document.getElementById('editExerciseA').value = groupData.exercises.a || '';
    document.getElementById('editExerciseB').value = groupData.exercises.b || '';
    document.getElementById('editExerciseC').value = groupData.exercises.c || '';
    document.getElementById('editSets').value = groupData.sets || '3';
    document.getElementById('editReps').value = groupData.reps || '8-12';
    document.getElementById('editRest').value = groupData.rest || '60s';
    document.getElementById('editWeight').value = groupData.default_weight || '';
    
    // Set weight unit
    document.querySelectorAll('#exerciseGroupEditOffcanvas .weight-unit-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-unit') === (groupData.default_weight_unit || 'lbs');
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('btn-secondary', isActive);
        btn.classList.toggle('btn-outline-secondary', !isActive);
    });
    
    // Store current group ID for saving
    window.currentEditingGroupId = groupId;
    
    // Mark card as editing
    document.querySelectorAll('.exercise-group-card').forEach(c => c.classList.remove('editing'));
    document.querySelector(`[data-group-id="${groupId}"]`)?.classList.add('editing');
    
    // Initialize autocompletes
    setTimeout(() => {
        if (window.initializeExerciseAutocompletes) {
            window.initializeExerciseAutocompletes();
        }
    }, 100);
    
    // Open offcanvas
    const offcanvas = new bootstrap.Offcanvas(document.getElementById('exerciseGroupEditOffcanvas'));
    offcanvas.show();
    
    console.log('✅ Opened exercise group editor:', groupId);
}

/**
 * Save exercise group from offcanvas
 */
function saveExerciseGroupFromOffcanvas() {
    const groupId = window.currentEditingGroupId;
    if (!groupId) return;
    
    // Collect data from offcanvas
    const groupData = {
        exercises: {
            a: document.getElementById('editExerciseA').value.trim(),
            b: document.getElementById('editExerciseB').value.trim(),
            c: document.getElementById('editExerciseC').value.trim()
        },
        sets: document.getElementById('editSets').value,
        reps: document.getElementById('editReps').value,
        rest: document.getElementById('editRest').value,
        default_weight: document.getElementById('editWeight').value.trim(),
        default_weight_unit: document.querySelector('#exerciseGroupEditOffcanvas .weight-unit-btn.active')?.getAttribute('data-unit') || 'lbs'
    };
    
    // Validate
    if (!groupData.exercises.a) {
        if (window.showAlert) {
            showAlert('Primary exercise is required', 'danger');
        } else {
            alert('Primary exercise is required');
        }
        return;
    }
    
    // Store data
    window.exerciseGroupsData[groupId] = groupData;
    
    // Update card preview
    updateExerciseGroupCardPreview(groupId, groupData);
    
    // Close offcanvas
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('exerciseGroupEditOffcanvas'));
    if (offcanvas) offcanvas.hide();
    
    // Remove editing state
    document.querySelector(`[data-group-id="${groupId}"]`)?.classList.remove('editing');
    
    // Mark as dirty for autosave
    if (window.markEditorDirty) {
        window.markEditorDirty();
    }
    
    console.log('✅ Exercise group saved:', groupId);
}

/**
 * Update exercise group card preview
 * @param {string} groupId - Group ID
 * @param {object} groupData - Group data
 */
function updateExerciseGroupCardPreview(groupId, groupData) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    if (!card) return;
    
    // Build exercise list (main, alt, alt2)
    const exercises = [];
    if (groupData.exercises.a) exercises.push(groupData.exercises.a);
    if (groupData.exercises.b) exercises.push(groupData.exercises.b);
    if (groupData.exercises.c) exercises.push(groupData.exercises.c);
    
    const hasData = groupData.exercises.a;
    
    // Build exercises HTML - each on new line
    let exercisesHtml = '';
    if (exercises.length > 0) {
        exercisesHtml = exercises.map((ex, idx) => {
            const label = idx === 0 ? '' : `<span class="text-muted">Alt${idx > 1 ? idx : ''}: </span>`;
            return `<div class="exercise-line">${label}${escapeHtml(ex)}</div>`;
        }).join('');
    } else {
        exercisesHtml = '<div class="exercise-line text-muted">Click edit to add exercises</div>';
    }
    
    // Build meta text (plain text, not badges)
    let metaText = '';
    if (hasData) {
        const parts = [`${groupData.sets} sets`, `${groupData.reps} reps`, `${groupData.rest} rest`];
        if (groupData.default_weight) {
            parts.push(`${groupData.default_weight} ${groupData.default_weight_unit}`);
        }
        metaText = parts.join(' • ');
    }
    
    // Update exercise list
    const exerciseList = card.querySelector('.exercise-list');
    if (exerciseList) {
        exerciseList.innerHTML = exercisesHtml;
    }
    
    // Update meta text
    const metaTextEl = card.querySelector('.exercise-meta-text');
    if (metaTextEl) {
        if (metaText) {
            metaTextEl.textContent = metaText;
            metaTextEl.style.display = 'block';
        } else {
            metaTextEl.textContent = '';
            metaTextEl.style.display = 'none';
        }
    }
}

/**
 * Delete exercise group card
 * @param {string} groupId - Group ID to delete
 */
function deleteExerciseGroupCard(groupId) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    if (!card) return;
    
    const groupData = window.exerciseGroupsData[groupId];
    const exerciseName = groupData?.exercises?.a || 'this exercise group';
    
    if (confirm(`Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`)) {
        // Remove from DOM
        card.remove();
        
        // Remove from data storage
        delete window.exerciseGroupsData[groupId];
        
        // Mark as dirty
        if (window.markEditorDirty) {
            window.markEditorDirty();
        }
        
        console.log('✅ Exercise group deleted:', groupId);
    }
}

/**
 * Get exercise group data from storage
 * @param {string} groupId - Group ID
 * @returns {object} Group data
 */
function getExerciseGroupData(groupId) {
    return window.exerciseGroupsData[groupId] || {
        exercises: { a: '', b: '', c: '' },
        sets: '3',
        reps: '8-12',
        rest: '60s',
        default_weight: '',
        default_weight_unit: 'lbs'
    };
}

/**
 * Create bonus exercise card HTML
 * @param {string} bonusId - Unique bonus ID
 * @param {object} bonusData - Bonus data (optional)
 * @param {number} bonusNumber - Bonus number for display
 * @returns {string} HTML string
 */
function createBonusExerciseCard(bonusId, bonusData = null, bonusNumber = 1) {
    const data = bonusData || {
        name: '',
        sets: '2',
        reps: '15',
        rest: '30s'
    };
    
    // Store data
    window.bonusExercisesData[bonusId] = data;
    
    const exerciseName = data.name || `New Bonus Exercise ${bonusNumber}`;
    const hasData = data.name;
    
    // Build meta text (plain text, not badges)
    let metaText = '';
    if (hasData) {
        metaText = `${data.sets} sets • ${data.reps} reps • ${data.rest} rest`;
    } else {
        metaText = 'Click edit to add exercise';
    }
    
    return `
        <div class="bonus-exercise-card compact" data-bonus-id="${bonusId}">
            <div class="card">
                <div class="card-body">
                    <button type="button" class="btn btn-sm btn-icon btn-edit-compact"
                            onclick="event.preventDefault(); event.stopPropagation(); openBonusExerciseEditor('${bonusId}');"
                            title="Edit bonus exercise">
                        <i class="bx bx-edit"></i>
                    </button>
                    <div class="exercise-content">
                        <div class="exercise-line">${escapeHtml(exerciseName)}</div>
                        <div class="exercise-meta-text text-muted small">${metaText}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Open bonus exercise editor offcanvas
 * @param {string} bonusId - ID of bonus to edit
 */
function openBonusExerciseEditor(bonusId) {
    const bonusData = window.bonusExercisesData[bonusId] || {
        name: '',
        sets: '2',
        reps: '15',
        rest: '30s'
    };
    
    // Populate offcanvas fields
    document.getElementById('editBonusName').value = bonusData.name || '';
    document.getElementById('editBonusSets').value = bonusData.sets || '2';
    document.getElementById('editBonusReps').value = bonusData.reps || '15';
    document.getElementById('editBonusRest').value = bonusData.rest || '30s';
    
    // Store current bonus ID for saving
    window.currentEditingBonusId = bonusId;
    
    // Mark card as editing
    document.querySelectorAll('.bonus-exercise-card').forEach(c => c.classList.remove('editing'));
    document.querySelector(`[data-bonus-id="${bonusId}"]`)?.classList.add('editing');
    
    // Initialize autocompletes
    setTimeout(() => {
        if (window.initializeExerciseAutocompletes) {
            window.initializeExerciseAutocompletes();
        }
    }, 100);
    
    // Open offcanvas
    const offcanvas = new bootstrap.Offcanvas(document.getElementById('bonusExerciseEditOffcanvas'));
    offcanvas.show();
    
    console.log('✅ Opened bonus exercise editor:', bonusId);
}

/**
 * Save bonus exercise from offcanvas
 */
function saveBonusExerciseFromOffcanvas() {
    const bonusId = window.currentEditingBonusId;
    if (!bonusId) return;
    
    // Collect data from offcanvas
    const bonusData = {
        name: document.getElementById('editBonusName').value.trim(),
        sets: document.getElementById('editBonusSets').value,
        reps: document.getElementById('editBonusReps').value,
        rest: document.getElementById('editBonusRest').value
    };
    
    // Validate
    if (!bonusData.name) {
        if (window.showAlert) {
            showAlert('Exercise name is required', 'danger');
        } else {
            alert('Exercise name is required');
        }
        return;
    }
    
    // Store data
    window.bonusExercisesData[bonusId] = bonusData;
    
    // Update card preview
    updateBonusExerciseCardPreview(bonusId, bonusData);
    
    // Close offcanvas
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('bonusExerciseEditOffcanvas'));
    if (offcanvas) offcanvas.hide();
    
    // Remove editing state
    document.querySelector(`[data-bonus-id="${bonusId}"]`)?.classList.remove('editing');
    
    // Mark as dirty for autosave
    if (window.markEditorDirty) {
        window.markEditorDirty();
    }
    
    console.log('✅ Bonus exercise saved:', bonusId);
}

/**
 * Update bonus exercise card preview
 * @param {string} bonusId - Bonus ID
 * @param {object} bonusData - Bonus data
 */
function updateBonusExerciseCardPreview(bonusId, bonusData) {
    const card = document.querySelector(`[data-bonus-id="${bonusId}"]`);
    if (!card) return;
    
    const exerciseName = bonusData.name || 'New Bonus Exercise';
    const hasData = bonusData.name;
    
    // Build meta text (plain text, not badges)
    let metaText = '';
    if (hasData) {
        metaText = `${bonusData.sets} sets • ${bonusData.reps} reps • ${bonusData.rest} rest`;
    } else {
        metaText = 'Click edit to add exercise';
    }
    
    // Update exercise name
    const exerciseLine = card.querySelector('.exercise-line');
    if (exerciseLine) {
        exerciseLine.textContent = exerciseName;
    }
    
    // Update meta text
    const metaTextEl = card.querySelector('.exercise-meta-text');
    if (metaTextEl) {
        metaTextEl.textContent = metaText;
    }
}

/**
 * Delete bonus exercise card
 * @param {string} bonusId - Bonus ID to delete
 */
function deleteBonusExerciseCard(bonusId) {
    const card = document.querySelector(`[data-bonus-id="${bonusId}"]`);
    if (!card) return;
    
    const bonusData = window.bonusExercisesData[bonusId];
    const exerciseName = bonusData?.name || 'this bonus exercise';
    
    if (confirm(`Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`)) {
        // Remove from DOM
        card.remove();
        
        // Remove from data storage
        delete window.bonusExercisesData[bonusId];
        
        // Mark as dirty
        if (window.markEditorDirty) {
            window.markEditorDirty();
        }
        
        console.log('✅ Bonus exercise deleted:', bonusId);
    }
}

// Make new functions globally available
window.createExerciseGroupCard = createExerciseGroupCard;
window.openExerciseGroupEditor = openExerciseGroupEditor;
window.saveExerciseGroupFromOffcanvas = saveExerciseGroupFromOffcanvas;
window.updateExerciseGroupCardPreview = updateExerciseGroupCardPreview;
window.deleteExerciseGroupCard = deleteExerciseGroupCard;
window.getExerciseGroupData = getExerciseGroupData;
window.createBonusExerciseCard = createBonusExerciseCard;
window.openBonusExerciseEditor = openBonusExerciseEditor;
window.saveBonusExerciseFromOffcanvas = saveBonusExerciseFromOffcanvas;
window.updateBonusExerciseCardPreview = updateBonusExerciseCardPreview;
window.deleteBonusExerciseCard = deleteBonusExerciseCard;

console.log('📦 Card-based exercise group functions loaded');