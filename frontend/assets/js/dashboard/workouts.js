/**
 * Ghost Gym Dashboard - Workout Management Orchestrator
 * Handles workout CRUD, rendering, and autosave coordination
 * @version 4.0.0 - Split into focused modules
 *
 * DEPENDENCIES (must load before this file):
 *   - common-utils.js (escapeHtml, showAlert, debounce, generateId)
 *   - autosave-manager.js (AutosaveManager)
 *   - card-renderer.js (CardRenderer)
 *   - exercise-group-manager.js (ExerciseGroupManager)
 *   - form-data-collector.js (FormDataCollector)
 *   - workout-editor-offcanvas.js (WorkoutEditorOffcanvas)
 */

/**
 * ============================================
 * AUTOSAVE INITIALIZATION
 * ============================================
 */

// Initialize AutosaveManager for workout builder
let workoutAutosaveManager = null;

/**
 * Initialize autosave manager
 */
function initializeWorkoutAutosave() {
    workoutAutosaveManager = new AutosaveManager({
        namespace: 'workoutBuilder',
        debounceMs: 3000,
        saveCallback: async (silent) => {
            // Use saveWorkoutFromEditor if available (new inline editor)
            if (window.saveWorkoutFromEditor) {
                await window.saveWorkoutFromEditor(silent);
            } else {
                // Fallback to old saveWorkout function
                await saveWorkout(silent);
            }
        },
        updateIndicatorCallback: (status) => {
            // Delegate to workout-editor's updateSaveStatus if available
            if (window.updateSaveStatus) {
                window.updateSaveStatus(status);
            }
        },
        enabled: true
    });
    
    // Start relative time updates
    workoutAutosaveManager.startRelativeTimeUpdates();
    
    // Set up beforeunload warning
    workoutAutosaveManager.setupBeforeUnloadWarning();
    
    console.log('✅ Workout autosave manager initialized');
}

// Initialize on load
if (typeof AutosaveManager !== 'undefined') {
    initializeWorkoutAutosave();
} else {
    console.warn('⚠️ AutosaveManager not loaded, autosave disabled');
}

/**
 * Wrapper functions for backward compatibility
 */
function markEditorDirty() {
    if (workoutAutosaveManager) {
        workoutAutosaveManager.markDirty();
    }
}

function scheduleAutosave() {
    if (workoutAutosaveManager) {
        workoutAutosaveManager.scheduleAutosave();
    }
}

async function autoSaveWorkout() {
    if (workoutAutosaveManager) {
        await workoutAutosaveManager.performAutosave();
    }
}

function updateSaveIndicator(status) {
    if (workoutAutosaveManager) {
        workoutAutosaveManager.updateIndicator(status);
    }
}

function initializeAutosaveListeners() {
    if (workoutAutosaveManager) {
        workoutAutosaveManager.initializeListeners([
            'workoutName',
            'workoutDescription',
            'workoutTags'
        ]);
    }
}

function addAutosaveListenersToGroup(groupElement) {
    if (workoutAutosaveManager) {
        workoutAutosaveManager.addListenersToContainer(groupElement);
    }
}

/**
 * Render workouts in grid layout (Builder view)
 */
function renderWorkouts() {
    console.log('🔍 DEBUG: renderWorkouts called with', window.ffn.workouts.length, 'workouts');
    const workoutsGrid = document.getElementById('workoutsGrid');
    const workoutsEmptyState = document.getElementById('workoutsEmptyState');
    
    if (!workoutsGrid) {
        console.log('❌ DEBUG: workoutsGrid element not found!');
        return;
    }
    
    const filteredWorkouts = window.ffn.workouts.filter(workout =>
        workout.name.toLowerCase().includes(window.ffn.searchFilters.workouts.toLowerCase())
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
        window.ffn.searchFilters.workouts = searchInput.value;
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
            if (workoutId && window.ffn.currentProgram) {
                addWorkoutToProgram(window.ffn.currentProgram.id, workoutId);
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
            exercise_groups: collectExerciseGroups()
        };
        
        // Validate required fields
        if (!workoutData.name) {
            if (!silent) showAlert('Workout name is required', 'danger');
            return;
        }
        
        if (workoutData.exercise_groups.length === 0) {
            if (!silent) showAlert('At least one exercise is required', 'danger');
            return;
        }
        
        // Show loading state (only for manual saves)
        const saveBtn = document.getElementById('saveWorkoutBtn');
        if (!silent && saveBtn) {
            saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin me-1"></i>Saving...';
            saveBtn.disabled = true;
        }
        
        // Check if this is an update or create
        const workoutId = window.ffn.workoutBuilder.selectedWorkoutId;
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
            const index = window.ffn.workouts.findIndex(w => w.id === workoutId);
            if (index !== -1) {
                window.ffn.workouts[index] = savedWorkout;
            }
        } else {
            // Create new workout
            savedWorkout = await window.dataManager.createWorkout(workoutData);
            window.ffn.workouts.unshift(savedWorkout);
            window.ffn.workoutBuilder.selectedWorkoutId = savedWorkout.id;
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
 * Edit workout by ID
 */
function editWorkout(id) {
    const workout = window.ffn.workouts.find(w => w.id === id);
    if (!workout) return;
    
    // Set selected workout ID for autosave
    if (workoutAutosaveManager) {
        workoutAutosaveManager.setSelectedItemId(workout.id);
    } else {
        // Fallback for when autosave manager isn't available
        window.ffn.workoutBuilder.selectedWorkoutId = workout.id;
        window.ffn.workoutBuilder.isDirty = false;
    }
    
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
    
    
    // Update modal title
    document.getElementById('workoutModalTitle').textContent = 'Edit Workout';
    
    // Initialize autosave listeners
    initializeAutosaveListeners();
    
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
            if (needsSave && window.ffn.workoutBuilder.selectedWorkoutId) {
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
    const workout = window.ffn.workouts.find(w => w.id === id);
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
        window.ffn.workouts.unshift(savedWorkout);
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
    const workout = window.ffn.workouts.find(w => w.id === id);
    if (!workout) return;
    
    ffnModalManager.confirm('Delete Workout', `Are you sure you want to delete "${workout.name}"? This action cannot be undone.`, () => {
        // Remove from local state
        window.ffn.workouts = window.ffn.workouts.filter(w => w.id !== id);

        renderWorkouts();
        renderWorkoutsView();
        updateStats();
        showAlert(`Workout "${workout.name}" deleted`, 'success');
    }, { confirmText: 'Delete', confirmClass: 'btn-danger', size: 'sm' });
}

/**
 * Clear workout form
 */
function clearWorkoutForm() {
    const form = document.getElementById('workoutForm');
    if (form) {
        form.reset();
        document.getElementById('exerciseGroups').innerHTML = '';
        addExerciseGroup();
        
        // Reset autosave state for new workout
        if (workoutAutosaveManager) {
            workoutAutosaveManager.reset();
        } else {
            // Fallback for when autosave manager isn't available
            window.ffn.workoutBuilder.selectedWorkoutId = null;
            window.ffn.workoutBuilder.isDirty = false;
            updateSaveIndicator();
        }
        
        // Initialize autosave listeners
        initializeAutosaveListeners();
    }
}

/**
 * Prompt user to select a program to add workout to
 */
function addWorkoutToProgramPrompt(workoutId) {
    const workout = window.ffn.workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    if (window.ffn.programs.length === 0) {
        showAlert('No programs available. Create a program first.', 'warning');
        return;
    }
    
    // Create selection dialog
    const programOptions = window.ffn.programs.map(p =>
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
window.editWorkout = editWorkout;
window.duplicateWorkout = duplicateWorkout;
window.deleteWorkout = deleteWorkout;
window.clearWorkoutForm = clearWorkoutForm;
window.addWorkoutToProgramPrompt = addWorkoutToProgramPrompt;
window.initializeExerciseAutocompletes = initializeExerciseAutocompletes;

// Make autosave functions globally available
window.markEditorDirty = markEditorDirty;
window.scheduleAutosave = scheduleAutosave;
window.autoSaveWorkout = autoSaveWorkout;
window.updateSaveIndicator = updateSaveIndicator;
window.initializeAutosaveListeners = initializeAutosaveListeners;
window.addAutosaveListenersToGroup = addAutosaveListenersToGroup;

console.log('📦 Workouts module loaded');