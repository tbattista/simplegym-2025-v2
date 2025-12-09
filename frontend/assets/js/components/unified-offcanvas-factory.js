/**
 * Ghost Gym - Unified Offcanvas Factory
 * Creates and manages all bottom offcanvas modals across the app
 * Based on WorkoutOffcanvasFactory.js (workout-mode styling)
 * Extended with menu, filter, and form patterns
 * 
 * @version 2.0.0
 * @date 2025-11-23
 */

class UnifiedOffcanvasFactory {
    
    /* ============================================
       MENU OFFCANVAS (for Share/More menus)
       ============================================ */
    
    /**
     * Create menu-style offcanvas with clickable items
     * @param {Object} config - Menu configuration
     * @param {string} config.id - Unique offcanvas ID
     * @param {string} config.title - Header title
     * @param {string} config.icon - Boxicon class for title
     * @param {Array} config.menuItems - Array of menu item objects
     * @returns {Object} Offcanvas instance
     */
    static createMenuOffcanvas(config) {
        const { id, title, icon, menuItems = [] } = config;
        
        const menuHtml = menuItems.map((item, index) => `
            <div class="more-menu-item ${item.variant === 'danger' ? 'danger' : ''}"
                 data-menu-action="${index}">
                <i class="bx ${item.icon}"></i>
                <div class="more-menu-item-content">
                    <div class="more-menu-item-title">${this.escapeHtml(item.title)}</div>
                    <small class="more-menu-item-description">${this.escapeHtml(item.description || '')}</small>
                </div>
            </div>
        `).join('');
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
                 id="${id}" aria-labelledby="${id}Label" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="${id}Label">
                        <i class="bx ${icon} me-2"></i>${this.escapeHtml(title)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body menu-items">
                    ${menuHtml}
                </div>
            </div>
        `;
        
        return this.createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
            // Attach click handlers to menu items
            menuItems.forEach((item, index) => {
                const element = offcanvasElement.querySelector(`[data-menu-action="${index}"]`);
                if (element && item.onClick) {
                    element.addEventListener('click', async () => {
                        try {
                            await item.onClick();
                            offcanvas.hide();
                        } catch (error) {
                            console.error('Menu item action failed:', error);
                        }
                    });
                }
            });
        });
    }
    
    static createWorkoutSelectionPrompt() {
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
                 id="workoutSelectionOffcanvas" aria-labelledby="workoutSelectionOffcanvasLabel"
                 data-bs-backdrop="static" data-bs-keyboard="false" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="workoutSelectionOffcanvasLabel">
                        <i class="bx bx-dumbbell me-2"></i>No Workout Selected
                    </h5>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <i class="bx bx-dumbbell" style="font-size: 3rem; color: var(--bs-primary);"></i>
                        <h5 class="mt-3">Let's get started!</h5>
                        <p class="text-muted">Choose how you'd like to proceed</p>
                    </div>
                    <div class="d-grid gap-3">
                        <button type="button" class="btn btn-lg btn-primary" id="createNewWorkoutOption">
                            <i class="bx bx-plus-circle me-2"></i>
                            <div class="text-start">
                                <div class="fw-bold">Create New Workout</div>
                                <small class="d-block opacity-75">Start with a blank template</small>
                            </div>
                        </button>
                        <button type="button" class="btn btn-lg btn-outline-primary" id="myWorkoutsOption">
                            <i class="bx bx-list-ul me-2"></i>
                            <div class="text-start">
                                <div class="fw-bold">My Workouts</div>
                                <small class="d-block opacity-75">Choose from your saved templates</small>
                            </div>
                        </button>
                        <button type="button" class="btn btn-lg btn-outline-secondary" id="publicWorkoutsOption">
                            <i class="bx bx-globe me-2"></i>
                            <div class="text-start">
                                <div class="fw-bold">Public Workouts</div>
                                <small class="d-block opacity-75">Browse community templates</small>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('workoutSelectionOffcanvas', offcanvasHtml, (offcanvas) => {
            const navigateTo = (url) => {
                offcanvas.hide();
                setTimeout(() => {
                    window.location.href = url;
                }, 250);
            };
            
            document.getElementById('createNewWorkoutOption')?.addEventListener('click', () => {
                offcanvas.hide();
                if (window.createNewWorkoutInEditor) {
                    window.createNewWorkoutInEditor();
                }
            });
            
            document.getElementById('myWorkoutsOption')?.addEventListener('click', () => {
                navigateTo('workout-database.html');
            });
            
            document.getElementById('publicWorkoutsOption')?.addEventListener('click', () => {
                navigateTo('public-workouts.html');
            });
        });
    }
    
    /* ============================================
        FILTER OFFCANVAS (for Exercise Database)
       ============================================ */
    
    /**
     * Create filter offcanvas with FilterBar component integration
     * @param {Object} config - Filter configuration
     * @param {string} config.id - Unique offcanvas ID
     * @param {string} config.title - Header title (default: "Filters")
     * @param {string} config.icon - Boxicon class (default: "bx-filter-alt")
     * @param {string} config.filterBarContainerId - ID for FilterBar container
     * @param {string} config.clearButtonId - ID for clear button
     * @param {Function} config.onApply - Callback when Apply is clicked
     * @param {Function} config.onClear - Callback when Clear is clicked
     * @returns {Object} Offcanvas instance
     */
    static createFilterOffcanvas(config) {
        const {
            id,
            title = 'Filters',
            icon = 'bx-filter',
            filterBarContainerId = 'filterBarContainer',
            clearButtonId = 'clearFiltersBtn',
            onApply,
            onClear
        } = config;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-tall"
                 tabindex="-1" id="${id}" aria-labelledby="${id}Label"
                 data-bs-scroll="false" style="height: 85vh;">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="${id}Label">
                        <i class="bx ${icon} me-2"></i>${this.escapeHtml(title)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body" style="overflow-y: auto;">
                    <!-- FilterBar component will inject here -->
                    <div id="${filterBarContainerId}"></div>
                    
                    <!-- Action Buttons -->
                    <div class="row mt-3">
                        <div class="col-6">
                            <button type="button" class="btn btn-outline-secondary w-100" id="${clearButtonId}">
                                <i class="bx bx-x me-1"></i>Clear
                            </button>
                        </div>
                        <div class="col-6">
                            <button type="button" class="btn btn-primary w-100" data-bs-dismiss="offcanvas">
                                <i class="bx bx-check me-1"></i>Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
            // Clear button handler
            if (onClear) {
                const clearBtn = offcanvasElement.querySelector(`#${clearButtonId}`);
                if (clearBtn) {
                    clearBtn.addEventListener('click', onClear);
                }
            }
            
            // Apply button handler
            if (onApply) {
                const applyBtn = offcanvasElement.querySelector('[data-bs-dismiss="offcanvas"]');
                if (applyBtn) {
                    applyBtn.addEventListener('click', onApply);
                }
            }
        });
    }
    
    /* ============================================
       WEIGHT EDIT OFFCANVAS (from WorkoutOffcanvasFactory)
       ============================================ */
    
    /**
     * Create weight edit offcanvas
     * @param {string} exerciseName - Exercise name
     * @param {Object} data - Weight data
     * @returns {Object} Offcanvas instance
     */
    static createWeightEdit(exerciseName, data) {
        const {
            currentWeight = '',
            currentUnit = 'lbs',
            lastWeight = '',
            lastWeightUnit = 'lbs',
            lastSessionDate = '',
            isSessionActive = false
        } = data;

        const modalContent = `
            <div class="weight-modal-content">
                <div class="mb-3">
                    <label class="form-label"><i class="bx bx-dumbbell me-2"></i>Weight</label>
                    <div class="d-flex gap-2">
                        <input
                            type="text"
                            class="form-control weight-input"
                            id="modalWeightInput"
                            data-exercise-name="${this.escapeHtml(exerciseName)}"
                            value="${currentWeight || ''}"
                            placeholder="135 or 4x45 plates"
                            maxlength="50"
                            ${!isSessionActive ? 'readonly disabled' : ''}
                            style="flex: 1;">
                        <select class="form-select weight-unit-select" id="modalWeightUnit" data-exercise-name="${this.escapeHtml(exerciseName)}" ${!isSessionActive ? 'disabled' : ''} style="width: 100px;">
                            <option value="lbs" ${currentUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>kg</option>
                            <option value="other" ${currentUnit === 'other' ? 'selected' : ''}>other</option>
                        </select>
                    </div>
                    <small class="text-muted">Enter weight as number or description (e.g., "4x45 plates", "135", "BW+25")</small>
                </div>
                ${lastWeight && lastSessionDate ? `
                    <div class="alert alert-info mb-0">
                        <i class="bx bx-history me-2"></i>Last: ${lastWeight} ${lastWeightUnit} (${lastSessionDate})
                    </div>
                ` : ''}
                ${!isSessionActive ? `
                    <div class="alert alert-warning mb-0 mt-3">
                        <i class="bx bx-lock-alt me-2"></i>Start workout to edit weights
                    </div>
                ` : ''}
            </div>
        `;

        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="weightEditOffcanvas" aria-labelledby="weightEditOffcanvasLabel" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="weightEditOffcanvasLabel">
                        <i class="bx bx-edit-alt me-2"></i>Edit Weight
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <h6 class="mb-3">${this.escapeHtml(exerciseName)}</h6>
                    ${modalContent}
                    <div class="d-flex gap-2 mt-4">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">Cancel</button>
                        ${isSessionActive ? '<button type="button" class="btn btn-primary flex-fill" id="saveWeightBtn">Save</button>' : ''}
                    </div>
                </div>
            </div>
        `;

        return this.createOffcanvas('weightEditOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
            if (isSessionActive) {
                this.setupWeightEditListeners(offcanvasElement, offcanvas, exerciseName);
            }
        });
    }

    /**
     * Setup weight edit event listeners
     */
    static setupWeightEditListeners(offcanvasElement, offcanvas, exerciseName) {
        const saveBtn = document.getElementById('saveWeightBtn');
        const weightInput = document.getElementById('modalWeightInput');
        const unitSelect = document.getElementById('modalWeightUnit');

        if (!saveBtn || !weightInput || !unitSelect) return;

        saveBtn.addEventListener('click', async () => {
            const weight = weightInput.value.trim();
            const unit = unitSelect.value;

            window.workoutSessionService.updateExerciseWeight(exerciseName, weight, unit);

            try {
                await window.workoutModeController.autoSave(null);
                console.log('✅ Weight saved successfully:', exerciseName, weight, unit);
            } catch (error) {
                console.error('❌ Failed to save weight:', error);
                alert('Failed to save weight. Please try again.');
                return;
            }

            offcanvas.hide();
            window.workoutModeController.renderWorkout();
        });

        weightInput.addEventListener('input', (e) => {
            const weight = e.target.value.trim();
            const unit = unitSelect.value;
            window.workoutSessionService.updateExerciseWeight(exerciseName, weight, unit);
        });

        unitSelect.addEventListener('change', (e) => {
            const weight = weightInput.value.trim();
            const unit = e.target.value;
            window.workoutSessionService.updateExerciseWeight(exerciseName, weight, unit);
        });
    }

    /* ============================================
       COMPLETE WORKOUT CONFIRMATION
       ============================================ */

    /**
     * Create complete workout confirmation offcanvas
     * @param {Object} data - Session and workout data
     * @param {Function} onConfirm - Callback when user confirms completion
     * @returns {Object} Offcanvas instance
     */
    static createCompleteWorkout(data, onConfirm) {
        const { workoutName, minutes, totalExercises } = data;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="completeWorkoutOffcanvas" aria-labelledby="completeWorkoutOffcanvasLabel" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="completeWorkoutOffcanvasLabel">
                        <i class="bx bx-check-circle me-2"></i>Complete Workout
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <div class="mb-3">
                            <i class="bx bx-dumbbell" style="font-size: 3rem; color: var(--bs-primary);"></i>
                        </div>
                        <h5 class="mb-2">${this.escapeHtml(workoutName)}</h5>
                        <p class="text-muted mb-0">Ready to complete your workout?</p>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-6">
                            <div class="card bg-label-primary">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0">${minutes} min</div>
                                    <small class="text-muted">Duration</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="card bg-label-success">
                                <div class="card-body text-center py-3">
                                    <div class="h4 mb-0">${totalExercises}</div>
                                    <small class="text-muted">Exercises</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-info d-flex align-items-start mb-4">
                        <i class="bx bx-info-circle me-2 mt-1"></i>
                        <div>
                            <strong>Your progress will be saved</strong>
                            <p class="mb-0 small">All weight data and exercise history will be recorded.</p>
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                            <i class="bx bx-x me-1"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-success flex-fill" id="confirmCompleteBtn">
                            <i class="bx bx-check me-1"></i>Complete Workout
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('completeWorkoutOffcanvas', offcanvasHtml, (offcanvas) => {
            const confirmBtn = document.getElementById('confirmCompleteBtn');
            confirmBtn.addEventListener('click', async () => {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Completing...';
                
                try {
                    await onConfirm();
                    offcanvas.hide();
                } catch (error) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="bx bx-check me-1"></i>Complete Workout';
                    throw error;
                }
            });
        });
    }

    /* ============================================
       COMPLETION SUMMARY (Success Screen)
       ============================================ */

    /**
     * Create completion summary offcanvas (success screen)
     * @param {Object} data - Completed session data
     * @returns {Object} Offcanvas instance
     */
    static createCompletionSummary(data) {
        const { duration, exerciseCount, workoutId } = data;
        
        // Build history URL with workout ID if available
        const historyUrl = workoutId
            ? `workout-history.html?id=${encodeURIComponent(workoutId)}`
            : 'workout-database.html';
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="completionSummaryOffcanvas"
                 aria-labelledby="completionSummaryOffcanvasLabel" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="completionSummaryOffcanvasLabel">
                        <i class="bx bx-trophy me-2"></i>Workout Complete!
                    </h5>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <div class="mb-3">
                            <i class="bx bx-trophy" style="font-size: 4rem; color: var(--bs-success);"></i>
                        </div>
                        <h4 class="mb-2">Great Job! 🎉</h4>
                        <p class="text-muted">You've successfully completed your workout</p>
                    </div>
                    
                    <div class="row g-3 mb-4">
                        <div class="col-6">
                            <div class="card bg-label-success">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0">${duration}</div>
                                    <small class="text-muted">Minutes</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="card bg-label-primary">
                                <div class="card-body text-center py-3">
                                    <div class="h3 mb-0">${exerciseCount}</div>
                                    <small class="text-muted">Exercises</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-success d-flex align-items-start mb-4">
                        <i class="bx bx-check-circle me-2 mt-1"></i>
                        <div>
                            <strong>Progress Saved!</strong>
                            <p class="mb-0 small">Your workout data has been recorded and is ready to view in your history.</p>
                        </div>
                    </div>
                    
                    <div class="d-flex flex-column gap-2">
                        <button type="button" class="btn btn-primary" onclick="window.location.href='workout-mode.html'">
                            <i class="bx bx-dumbbell me-1"></i>Start Another Workout
                        </button>
                        <button type="button" class="btn btn-outline-primary" onclick="window.location.href='${historyUrl}'">
                            <i class="bx bx-history me-1"></i>View History
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="window.location.href='index.html'">
                            <i class="bx bx-home me-1"></i>Dashboard
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('completionSummaryOffcanvas', offcanvasHtml);
    }

    /* ============================================
       RESUME SESSION PROMPT
       ============================================ */

    /**
     * Create resume session prompt offcanvas
     * @param {Object} data - Persisted session data
     * @param {Function} onResume - Callback when user chooses to resume
     * @param {Function} onStartFresh - Callback when user chooses to start fresh
     * @returns {Object} Offcanvas instance
     */
    static createResumeSession(data, onResume, onStartFresh) {
        const { workoutName, elapsedDisplay, exercisesWithWeights, totalExercises } = data;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="resumeSessionOffcanvas"
                 aria-labelledby="resumeSessionOffcanvasLabel" data-bs-backdrop="static" data-bs-keyboard="false" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="resumeSessionOffcanvasLabel">
                        <i class="bx bx-history me-2"></i>Resume Workout?
                    </h5>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <div class="mb-3">
                            <i class="bx bx-dumbbell" style="font-size: 3rem; color: var(--bs-primary);"></i>
                        </div>
                        <h5 class="mb-2">${this.escapeHtml(workoutName)}</h5>
                        <p class="text-muted mb-0">You have an active workout session</p>
                    </div>
                    
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
                    
                    <div class="alert alert-info d-flex align-items-start mb-4">
                        <i class="bx bx-info-circle me-2 mt-1"></i>
                        <div>
                            <strong>Your progress is saved</strong>
                            <p class="mb-0 small">Resume to continue where you left off, or start fresh to begin a new session.</p>
                        </div>
                    </div>
                    
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
        
        return this.createOffcanvas('resumeSessionOffcanvas', offcanvasHtml, (offcanvas) => {
            const resumeBtn = document.getElementById('resumeSessionBtn');
            const startFreshBtn = document.getElementById('startFreshBtn');
            
            resumeBtn.addEventListener('click', async () => {
                resumeBtn.disabled = true;
                resumeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Resuming...';
                
                try {
                    await onResume();
                    offcanvas.hide();
                } catch (error) {
                    resumeBtn.disabled = false;
                    resumeBtn.innerHTML = '<i class="bx bx-play me-1"></i>Resume Workout';
                    throw error;
                }
            });
            
            startFreshBtn.addEventListener('click', () => {
                onStartFresh();
                offcanvas.hide();
            });
        });
    }

    /* ============================================
       BONUS EXERCISE (ENHANCED v2.0)
       Search-first design with improved UX
       ============================================ */

    /**
     * Create demo-style bonus exercise offcanvas
     * Simple search with filter chips and clean exercise list
     * @param {Object} data - Configuration data
     * @param {Function} onAddExercise - Callback when adding exercise
     * @returns {Object} Offcanvas instance
     */
    static createBonusExercise(data, onAddExercise) {
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
                 tabindex="-1"
                 id="bonusExerciseOffcanvas"
                 aria-labelledby="bonusExerciseOffcanvasLabel"
                 data-bs-scroll="false"
                 style="height: 85vh;">
                
                <!-- Header -->
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
                        <i class="bx bx-plus-circle me-2"></i>Add Bonus Exercise
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                
                <!-- Body -->
                <div class="offcanvas-body p-0">
                    <!-- Add Exercise Section (FOCAL POINT) -->
                    <div class="add-exercise-section p-3 border-bottom bg-light">
                        <!-- Exercise Name Input -->
                        <div class="mb-3">
                            <label class="form-label fw-semibold mb-2">Exercise Name</label>
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="bx bx-search"></i>
                                </span>
                                <input
                                    type="text"
                                    class="form-control"
                                    id="exerciseNameInput"
                                    placeholder="Enter exercise name or search library..."
                                    autocomplete="off"
                                >
                                <button class="btn btn-outline-secondary" type="button" id="clearNameBtn" style="display: none;">
                                    <i class="bx bx-x"></i>
                                </button>
                            </div>
                            <small class="text-muted">Type to search library or enter custom exercise name</small>
                        </div>
                        
                        <!-- Sets, Reps, Rest Row -->
                        <div class="row g-2 mb-3">
                            <div class="col-4">
                                <label class="form-label small mb-1">Sets</label>
                                <input type="text" class="form-control" id="setsInput" value="3" maxlength="5">
                            </div>
                            <div class="col-4">
                                <label class="form-label small mb-1">Reps</label>
                                <input type="text" class="form-control" id="repsInput" value="12" maxlength="10">
                            </div>
                            <div class="col-4">
                                <label class="form-label small mb-1">Rest</label>
                                <input type="text" class="form-control" id="restInput" value="60s" maxlength="10">
                            </div>
                        </div>
                        
                        <!-- Add Exercise Button (Prominent) -->
                        <button class="btn btn-primary w-100" id="addExerciseBtn" disabled>
                            <i class="bx bx-plus-circle me-2"></i>Add Exercise
                        </button>
                    </div>
                    
                    <!-- Filter Accordion (Collapsed by Default) -->
                    <div class="filter-accordion-section border-bottom">
                        <!-- Toggle Button -->
                        <button class="btn btn-link w-100 text-start p-3 text-decoration-none" id="toggleFiltersBtn" type="button">
                            <i class="bx bx-filter-alt me-2"></i>
                            <span>Filters</span>
                            <i class="bx bx-chevron-down float-end" id="filterChevron"></i>
                        </button>
                        
                        <!-- Accordion Content (Hidden by Default) -->
                        <div id="filterAccordionContent" style="display: none;" class="p-3 pt-0">
                            <div class="row g-2">
                                <!-- Muscle Group -->
                                <div class="col-6">
                                    <label class="form-label small mb-1">Muscle Group</label>
                                    <select class="form-select form-select-sm" id="muscleGroupFilter">
                                        <option value="">All</option>
                                        <!-- Populated dynamically -->
                                    </select>
                                </div>
                                
                                <!-- Difficulty -->
                                <div class="col-6">
                                    <label class="form-label small mb-1">Difficulty</label>
                                    <select class="form-select form-select-sm" id="difficultyFilter">
                                        <option value="">All</option>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                
                                <!-- Equipment -->
                                <div class="col-12">
                                    <label class="form-label small mb-1">Equipment</label>
                                    <select class="form-select form-select-sm" id="equipmentFilter" multiple>
                                        <!-- Populated dynamically -->
                                    </select>
                                    <small class="text-muted d-block mt-1">Tap to select multiple</small>
                                </div>
                                
                                <!-- Sort By -->
                                <div class="col-6">
                                    <label class="form-label small mb-1">Sort By</label>
                                    <select class="form-select form-select-sm" id="sortBySelect">
                                        <option value="name-asc">Name (A-Z)</option>
                                        <option value="name-desc">Name (Z-A)</option>
                                        <option value="muscle">Muscle Group</option>
                                        <option value="tier">Standard First</option>
                                    </select>
                                </div>
                                
                                <!-- Favorites Toggle -->
                                <div class="col-6 d-flex align-items-end">
                                    <div class="form-check form-switch mb-0">
                                        <input class="form-check-input" type="checkbox" id="favoritesOnlyFilter">
                                        <label class="form-check-label small" for="favoritesOnlyFilter">
                                            Favorites Only
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="col-6" style="display: none;">
                                    <select class="form-select form-select-sm" id="tierFilter">
                                        <option value="">All Tiers</option>
                                        <option value="1">⭐ Standard (Tier 1)</option>
                                        <option value="2">⭐ Standard (Tier 2)</option>
                                        <option value="3">◦ Specialized</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Exercise Library Section -->
                    <div class="exercise-library-section">
                        <div class="p-3 pb-2 border-bottom bg-light">
                            <h6 class="mb-0 text-muted small">
                                <i class="bx bx-book-open me-2"></i>Exercise Library
                            </h6>
                        </div>

                        <!-- Exercise List (Scrollable) -->
                        <div id="exerciseList" class="p-3" style="overflow-y: auto; max-height: calc(85vh - 450px);">
                            <!-- Exercise cards rendered here -->
                        </div>
                        
                        <!-- Pagination Footer -->
                        <div class="p-2 border-top bg-light" id="paginationFooter" style="display: none;">
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted" id="pageInfo">Showing 1-30 of 250</small>
                                <div class="btn-group btn-group-sm" id="paginationControls">
                                    <!-- Rendered by renderPagination() -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="emptyState" class="text-center py-5" style="display: none;">
                            <i class="bx bx-search-alt display-1 text-muted"></i>
                            <p class="text-muted mt-3">No exercises found</p>
                            <small class="text-muted d-block">Try adjusting your filters or use the "Add Exercise" button above to create a custom exercise</small>
                        </div>
                        
                        <!-- Loading State -->
                        <div id="loadingState" class="text-center py-5" style="display: none;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="text-muted mt-3">Loading exercises...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('bonusExerciseOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
            // State management - UPDATED for new UX (exercise name as focal point)
            const state = {
                exerciseName: '',      // Primary: Exercise name (also used for filtering)
                sets: '3',
                reps: '12',
                rest: '60s',
                searchQuery: '',       // Synced with exerciseName for filtering
                muscleGroup: '',
                difficulty: '',
                tier: '',
                equipment: [],
                favoritesOnly: false,
                sortBy: 'name',
                sortOrder: 'asc',
                allExercises: [],
                filteredExercises: [],
                paginatedExercises: [],
                currentPage: 1,
                pageSize: window.innerWidth <= 768 ? 20 : 30,
                isLoading: false
            };
            
            // Get DOM elements - UPDATED for new structure
            const exerciseNameInput = offcanvasElement.querySelector('#exerciseNameInput');
            const clearNameBtn = offcanvasElement.querySelector('#clearNameBtn');
            const setsInput = offcanvasElement.querySelector('#setsInput');
            const repsInput = offcanvasElement.querySelector('#repsInput');
            const restInput = offcanvasElement.querySelector('#restInput');
            const addExerciseBtn = offcanvasElement.querySelector('#addExerciseBtn');
            const toggleFiltersBtn = offcanvasElement.querySelector('#toggleFiltersBtn');
            const filterAccordionContent = offcanvasElement.querySelector('#filterAccordionContent');
            const filterChevron = offcanvasElement.querySelector('#filterChevron');
            const exerciseList = offcanvasElement.querySelector('#exerciseList');
            const emptyState = offcanvasElement.querySelector('#emptyState');
            const loadingState = offcanvasElement.querySelector('#loadingState');
            const muscleGroupFilter = offcanvasElement.querySelector('#muscleGroupFilter');
            const difficultyFilter = offcanvasElement.querySelector('#difficultyFilter');
            const tierFilter = offcanvasElement.querySelector('#tierFilter');
            const equipmentFilter = offcanvasElement.querySelector('#equipmentFilter');
            const favoritesOnlyFilter = offcanvasElement.querySelector('#favoritesOnlyFilter');
            const paginationFooter = offcanvasElement.querySelector('#paginationFooter');
            const pageInfo = offcanvasElement.querySelector('#pageInfo');
            const paginationControls = offcanvasElement.querySelector('#paginationControls');
            const clearAllBtn = offcanvasElement.querySelector('#clearAllBtn');
            
            // Load exercises from cache service
            const loadExercises = async () => {
                state.isLoading = true;
                loadingState.style.display = 'block';
                exerciseList.style.display = 'none';
                emptyState.style.display = 'none';
                
                try {
                    if (window.exerciseCacheService) {
                        // Get all exercises from cache
                        await window.exerciseCacheService.loadExercises();
                        state.allExercises = window.exerciseCacheService.getAllExercises();
                        console.log(`✅ Loaded ${state.allExercises.length} exercises from cache`);
                    } else {
                        console.warn('⚠️ exerciseCacheService not available');
                        state.allExercises = [];
                    }
                    
                    // Load user favorites for filtering
                    await loadUserFavorites();
                    
                } catch (error) {
                    console.error('❌ Error loading exercises:', error);
                    state.allExercises = [];
                }
                
                state.isLoading = false;
                loadingState.style.display = 'none';
                
                // Populate muscle group filter with unique values
                const uniqueMuscleGroups = [...new Set(
                    state.allExercises
                        .map(ex => ex.targetMuscleGroup)
                        .filter(mg => mg && mg.trim() !== '')
                )].sort();
                
                muscleGroupFilter.innerHTML = '<option value="">All Muscle Groups</option>' +
                    uniqueMuscleGroups.map(mg =>
                        `<option value="${this.escapeHtml(mg)}">${this.escapeHtml(mg)}</option>`
                    ).join('');
                
                // Populate equipment filter with unique values
                const uniqueEquipment = [...new Set(
                    state.allExercises
                        .map(ex => ex.primaryEquipment)
                        .filter(eq => eq && eq.toLowerCase() !== 'none')
                )].sort();
                
                equipmentFilter.innerHTML = uniqueEquipment.map(eq =>
                    `<option value="${this.escapeHtml(eq)}">${this.escapeHtml(eq)}</option>`
                ).join('');
                
                filterExercises();
            };
            
            // Load user favorites from API
            const loadUserFavorites = async () => {
                // Initialize favorites Set if it doesn't exist
                if (!window.ghostGym) {
                    window.ghostGym = {};
                }
                if (!window.ghostGym.exercises) {
                    window.ghostGym.exercises = {};
                }
                if (!window.ghostGym.exercises.favorites) {
                    window.ghostGym.exercises.favorites = new Set();
                }
                
                // Only load if user is authenticated
                if (!window.firebaseAuth?.currentUser) {
                    console.log('ℹ️ User not authenticated, skipping favorites load');
                    return;
                }
                
                try {
                    const token = await window.firebaseAuth.currentUser.getIdToken();
                    const response = await fetch(window.getApiUrl('/api/v3/users/me/favorites'), {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        window.ghostGym.exercises.favorites = new Set(data.favorites.map(f => f.exerciseId));
                        console.log(`✅ Loaded ${window.ghostGym.exercises.favorites.size} favorites for filtering`);
                    } else {
                        console.warn('⚠️ Failed to load favorites:', response.status);
                    }
                } catch (error) {
                    console.error('❌ Error loading favorites:', error);
                }
            };
            
            // PHASE 3: Multi-criteria filtering
            const filterExercises = () => {
                let filtered = [...state.allExercises];
                
                // 1. Search query (highest priority)
                if (state.searchQuery) {
                    const query = state.searchQuery.toLowerCase();
                    filtered = filtered.filter(ex =>
                        (ex.name || '').toLowerCase().includes(query) ||
                        (ex.targetMuscleGroup || '').toLowerCase().includes(query) ||
                        (ex.primaryEquipment || '').toLowerCase().includes(query)
                    );
                }
                
                // 2. Muscle group filter
                if (state.muscleGroup) {
                    filtered = filtered.filter(ex => {
                        return ex.targetMuscleGroup === state.muscleGroup;
                    });
                }
                
                // 3. Difficulty filter
                if (state.difficulty) {
                    filtered = filtered.filter(ex =>
                        (ex.difficulty || '').toLowerCase() === state.difficulty.toLowerCase()
                    );
                }
                
                // 4. Tier filter
                if (state.tier) {
                    const tierNum = parseInt(state.tier);
                    filtered = filtered.filter(ex => {
                        const exTier = parseInt(ex.exerciseTier || '1');
                        if (tierNum === 3) {
                            return exTier === 3;
                        } else {
                            return exTier === tierNum;
                        }
                    });
                }
                
                // 5. Equipment filter (multi-select)
                if (state.equipment.length > 0) {
                    filtered = filtered.filter(ex => {
                        const exEquip = (ex.primaryEquipment || '').toLowerCase();
                        return state.equipment.some(eq => exEquip.includes(eq.toLowerCase()));
                    });
                }
                
                // 6. Favorites filter
                if (state.favoritesOnly) {
                    // Check if favorites are available
                    if (window.ghostGym?.exercises?.favorites) {
                        filtered = filtered.filter(ex => {
                            // Check if exercise ID exists in favorites Set
                            return window.ghostGym.exercises.favorites.has(ex.id);
                        });
                    } else {
                        console.warn('⚠️ Favorites filter enabled but favorites data not available');
                        // Show empty results if favorites aren't loaded
                        filtered = [];
                    }
                }
                
                state.filteredExercises = filtered;
                applySorting();         // NEW: Apply sorting after filtering
                state.currentPage = 1; // Reset to first page on new filter
                applyPagination();
            };
            
            // PHASE 5: Sorting logic
            const applySorting = () => {
                switch (state.sortBy) {
                    case 'name':
                        state.filteredExercises.sort((a, b) => {
                            const nameA = (a.name || '').toLowerCase();
                            const nameB = (b.name || '').toLowerCase();
                            return state.sortOrder === 'asc'
                                ? nameA.localeCompare(nameB)
                                : nameB.localeCompare(nameA);
                        });
                        break;
                        
                    case 'muscle':
                        state.filteredExercises.sort((a, b) => {
                            const muscleA = (a.targetMuscleGroup || '').toLowerCase();
                            const muscleB = (b.targetMuscleGroup || '').toLowerCase();
                            if (muscleA === muscleB) {
                                return (a.name || '').localeCompare(b.name || '');
                            }
                            return muscleA.localeCompare(muscleB);
                        });
                        break;
                        
                    case 'tier':
                        state.filteredExercises.sort((a, b) => {
                            const tierA = parseInt(a.exerciseTier || '1');
                            const tierB = parseInt(b.exerciseTier || '1');
                            if (tierA === tierB) {
                                return (a.name || '').localeCompare(b.name || '');
                            }
                            return tierA - tierB;  // Lower tiers (1, 2) first
                        });
                        break;
                        
                    case 'difficulty':
                        const diffOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
                        state.filteredExercises.sort((a, b) => {
                            const diffA = diffOrder[(a.difficulty || 'intermediate').toLowerCase()] || 2;
                            const diffB = diffOrder[(b.difficulty || 'intermediate').toLowerCase()] || 2;
                            if (diffA === diffB) {
                                return (a.name || '').localeCompare(b.name || '');
                            }
                            return diffA - diffB;
                        });
                        break;
                }
            };
            
            // PHASE 4: Pagination logic
            const applyPagination = () => {
                const totalPages = Math.ceil(state.filteredExercises.length / state.pageSize);
                const startIdx = (state.currentPage - 1) * state.pageSize;
                const endIdx = startIdx + state.pageSize;
                
                state.paginatedExercises = state.filteredExercises.slice(startIdx, endIdx);
                
                renderExerciseList();
                renderPagination(totalPages);
            };
            
            const renderPagination = (totalPages) => {
                if (totalPages <= 1) {
                    paginationFooter.style.display = 'none';
                    return;
                }
                
                paginationFooter.style.display = 'flex';
                
                const startIdx = (state.currentPage - 1) * state.pageSize + 1;
                const endIdx = Math.min(state.currentPage * state.pageSize, state.filteredExercises.length);
                pageInfo.textContent = `Showing ${startIdx}-${endIdx} of ${state.filteredExercises.length}`;
                
                // Render page buttons
                let buttonsHtml = '';
                
                // Previous button
                buttonsHtml += `<button class="btn btn-sm btn-outline-secondary" ${state.currentPage === 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">
                    <i class="bx bx-chevron-left"></i>
                </button>`;
                
                // Page number buttons (show max 5 pages)
                const maxButtons = 5;
                let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
                let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                
                if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                }
                
                for (let i = startPage; i <= endPage; i++) {
                    buttonsHtml += `<button class="btn btn-sm ${i === state.currentPage ? 'btn-primary' : 'btn-outline-secondary'}" data-page="${i}">${i}</button>`;
                }
                
                // Next button
                buttonsHtml += `<button class="btn btn-sm btn-outline-secondary" ${state.currentPage === totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">
                    <i class="bx bx-chevron-right"></i>
                </button>`;
                
                paginationControls.innerHTML = buttonsHtml;
                
                // Attach click handlers
                paginationControls.querySelectorAll('[data-page]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page = parseInt(btn.dataset.page);
                        if (page >= 1 && page <= totalPages) {
                            state.currentPage = page;
                            applyPagination();
                            exerciseList.scrollTop = 0;
                        }
                    });
                });
            };
            
            // PHASE 5: Enhanced card rendering with metadata
            const renderExerciseList = () => {
                if (state.paginatedExercises.length === 0) {
                    exerciseList.style.display = 'none';
                    emptyState.style.display = 'block';
                    paginationFooter.style.display = 'none';
                    return;
                }
                
                exerciseList.style.display = 'block';
                emptyState.style.display = 'none';
                
                exerciseList.innerHTML = state.paginatedExercises.map(exercise => {
                    const tier = exercise.exerciseTier || '1';
                    const difficulty = exercise.difficulty || 'Intermediate';
                    const muscle = exercise.targetMuscleGroup || '';
                    const equipment = exercise.primaryEquipment || 'None';
                    
                    // Tier badge (matching exercise database)
                    const tierBadge = (parseInt(tier) === 3)
                        ? '<span class="badge bg-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded" style="font-size: 0.75rem;"></i></span>'
                        : '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';
                    
                    // Difficulty badge
                    const difficultyColors = { 'B': 'success', 'I': 'warning', 'A': 'danger' };
                    const diffAbbr = difficulty.charAt(0).toUpperCase();
                    const diffColor = difficultyColors[diffAbbr] || 'secondary';
                    const difficultyBadge = `<span class="badge badge-outline-${diffColor}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background: transparent;">${difficulty}</span>`;
                    
                    return `
                        <div class="card mb-0" style="margin-bottom: 0.375rem !important;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="flex-grow-1">
                                        <div class="fw-semibold mb-2">${this.escapeHtml(exercise.name)}</div>
                                        <div class="d-flex gap-2 flex-wrap align-items-center">
                                            ${tierBadge}
                                            ${difficultyBadge}
                                            ${muscle ? `<span class="text-muted small">${this.escapeHtml(muscle)}</span>` : ''}
                                            ${equipment ? `<span class="text-muted small">• ${this.escapeHtml(equipment)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="flex-shrink-0 ms-3">
                                        <button class="btn btn-sm btn-primary" data-exercise-id="${this.escapeHtml(exercise.id || exercise.name)}">
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            };
            
            // Exercise name input handler (DUAL PURPOSE: name + search filter)
            exerciseNameInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                state.exerciseName = value;
                state.searchQuery = value.toLowerCase();
                
                // Update UI
                clearNameBtn.style.display = value ? 'block' : 'none';
                addExerciseBtn.disabled = !value;
                
                // Filter library as user types
                filterExercises();
            });
            
            // Clear name button
            clearNameBtn.addEventListener('click', () => {
                exerciseNameInput.value = '';
                state.exerciseName = '';
                state.searchQuery = '';
                clearNameBtn.style.display = 'none';
                addExerciseBtn.disabled = true;
                filterExercises();
                exerciseNameInput.focus();
            });
            
            // Sets/Reps/Rest input handlers
            setsInput.addEventListener('input', (e) => {
                state.sets = e.target.value.trim() || '3';
            });
            
            repsInput.addEventListener('input', (e) => {
                state.reps = e.target.value.trim() || '12';
            });
            
            restInput.addEventListener('input', (e) => {
                state.rest = e.target.value.trim() || '60s';
            });
            
            // Add Exercise Button handler (PRIMARY ACTION)
            addExerciseBtn.addEventListener('click', async () => {
                if (!state.exerciseName) return;
                
                // Show loading state
                addExerciseBtn.disabled = true;
                addExerciseBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
                
                try {
                    // Auto-create custom exercise if needed
                    if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                        const currentUser = window.dataManager.getCurrentUser();
                        const userId = currentUser?.uid || null;
                        await window.exerciseCacheService.autoCreateIfNeeded(state.exerciseName, userId);
                    }
                    
                    // Call the add callback with exercise data
                    await onAddExercise({
                        name: state.exerciseName,
                        sets: state.sets,
                        reps: state.reps,
                        rest: state.rest,
                        weight: '',
                        unit: 'lbs'
                    });
                    
                    // Close offcanvas
                    offcanvas.hide();
                    
                    // Show success toast
                    if (window.showToast) {
                        window.showToast({
                            message: `Added ${state.exerciseName} to workout`,
                            type: 'success',
                            title: 'Exercise Added',
                            icon: 'bx-plus-circle',
                            delay: 3000
                        });
                    }
                    
                } catch (error) {
                    console.error('❌ Error adding exercise:', error);
                    addExerciseBtn.disabled = false;
                    addExerciseBtn.innerHTML = '<i class="bx bx-plus-circle me-2"></i>Add Exercise';
                    
                    if (window.showToast) {
                        window.showToast({
                            message: 'Failed to add exercise. Please try again.',
                            type: 'danger',
                            title: 'Error',
                            icon: 'bx-error',
                            delay: 3000
                        });
                    }
                }
            });
            
            // Toggle Filters Accordion
            toggleFiltersBtn.addEventListener('click', () => {
                const isHidden = filterAccordionContent.style.display === 'none';
                filterAccordionContent.style.display = isHidden ? 'block' : 'none';
                filterChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            });
            
            // Clear all button (in empty state) - only exists when empty state is shown
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    exerciseNameInput.value = '';
                    state.exerciseName = '';
                    state.searchQuery = '';
                    state.muscleGroup = '';
                    state.difficulty = '';
                    state.tier = '';
                    state.equipment = [];
                    state.favoritesOnly = false;
                    clearNameBtn.style.display = 'none';
                    addExerciseBtn.disabled = true;
                    
                    // Reset all filter dropdowns
                    muscleGroupFilter.value = '';
                    difficultyFilter.value = '';
                    tierFilter.value = '';
                    equipmentFilter.selectedIndex = -1;
                    
                    // Reset favorites toggle
                    favoritesOnlyFilter.checked = false;
                    
                    filterExercises();
                });
            }
            
            // Muscle group filter handler
            muscleGroupFilter?.addEventListener('change', (e) => {
                state.muscleGroup = e.target.value;
                filterExercises();
            });
            
            // Difficulty filter
            difficultyFilter?.addEventListener('change', (e) => {
                state.difficulty = e.target.value;
                filterExercises();
            });
            
            // Tier filter
            tierFilter?.addEventListener('change', (e) => {
                state.tier = e.target.value;
                filterExercises();
            });
            
            // Equipment filter (multi-select)
            equipmentFilter?.addEventListener('change', (e) => {
                state.equipment = Array.from(e.target.selectedOptions).map(opt => opt.value);
                filterExercises();
            });
            
            // Favorites toggle switch
            favoritesOnlyFilter?.addEventListener('change', (e) => {
                state.favoritesOnly = e.target.checked;
                filterExercises();
            });
            
            // Sort handler
            const sortBySelect = offcanvasElement.querySelector('#sortBySelect');
            sortBySelect?.addEventListener('change', (e) => {
                const [sortBy, order] = e.target.value.split('-');
                state.sortBy = sortBy;
                state.sortOrder = order || 'asc';
                applySorting();
                applyPagination();
            });
            
            // Exercise click handler - delegate to button only
            exerciseList.addEventListener('click', async (e) => {
                const button = e.target.closest('button[data-exercise-id]');
                if (!button) return;
                
                const exerciseId = button.dataset.exerciseId;
                const exercise = state.filteredExercises.find(ex =>
                    (ex.id || ex.name) === exerciseId
                );
                
                if (!exercise) return;
                
                // Show loading state
                button.disabled = true;
                button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                
                try {
                    // Auto-create custom exercise if needed
                    if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                        const currentUser = window.dataManager.getCurrentUser();
                        const userId = currentUser?.uid || null;
                        await window.exerciseCacheService.autoCreateIfNeeded(exercise.name, userId);
                    }
                    
                    // Call the add callback with exercise data
                    await onAddExercise({
                        name: exercise.name,
                        sets: '3',
                        reps: '12',
                        weight: '',
                        unit: 'lbs'
                    });
                    
                    // Close offcanvas
                    offcanvas.hide();
                    
                    // Show success toast
                    if (window.showToast) {
                        window.showToast({
                            message: `Added ${exercise.name} to workout`,
                            type: 'success',
                            title: 'Exercise Added',
                            icon: 'bx-plus-circle',
                            delay: 3000
                        });
                    }
                    
                } catch (error) {
                    console.error('❌ Error adding exercise:', error);
                    button.disabled = false;
                    button.innerHTML = 'Add';
                    
                    if (window.showToast) {
                        window.showToast({
                            message: 'Failed to add exercise. Please try again.',
                            type: 'danger',
                            title: 'Error',
                            icon: 'bx-error',
                            delay: 3000
                        });
                    }
                }
            });
            
            // Initialize when offcanvas is shown
            offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
                loadExercises();
                
                // Auto-focus exercise name input on desktop only
                if (exerciseNameInput && window.innerWidth > 768) {
                    setTimeout(() => exerciseNameInput.focus(), 100);
                }
            }, { once: true });
        });
    }
    
    /* ============================================
       EXERCISE SEARCH OFFCANVAS (Reusable)
       Standalone exercise search with filters
       ============================================ */
    
    /**
     * Create standalone exercise search offcanvas
     * REUSABLE across entire app - can be used anywhere that needs exercise selection
     * @param {Object} config - Configuration options
     * @param {string} config.title - Offcanvas title (default: 'Search Exercises')
     * @param {boolean} config.showFilters - Show filter section (default: true)
     * @param {string} config.buttonText - Selection button text (default: 'Select')
     * @param {string} config.buttonIcon - Selection button icon (default: 'bx-check')
     * @param {Function} onSelectExercise - Callback when exercise is selected
     * @returns {Object} Offcanvas instance
     */
    static createExerciseSearchOffcanvas(config = {}, onSelectExercise) {
        const {
            title = 'Search Exercises',
            showFilters = true,
            buttonText = 'Select',
            buttonIcon = 'bx-check'
        } = config;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
                 tabindex="-1" id="exerciseSearchOffcanvas"
                 data-bs-scroll="false" style="height: 85vh;">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="exerciseSearchOffcanvasLabel">
                        <i class="bx bx-search me-2"></i>${this.escapeHtml(title)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body p-0 d-flex flex-column">
                    <!-- Search Box -->
                    <div class="search-section p-3 border-bottom bg-light">
                        <div class="input-group">
                            <span class="input-group-text"><i class="bx bx-search"></i></span>
                            <input type="text" class="form-control" id="exerciseSearchInput"
                                   placeholder="Search exercises..." autocomplete="off">
                        </div>
                    </div>
                    
                    <!-- Filters Section -->
                    ${showFilters ? `
                        <div class="filters-section p-3 border-bottom">
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label small mb-1">Muscle Group</label>
                                    <select class="form-select form-select-sm" id="muscleGroupFilter">
                                        <option value="">All</option>
                                    </select>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small mb-1">Difficulty</label>
                                    <select class="form-select form-select-sm" id="difficultyFilter">
                                        <option value="">All</option>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <label class="form-label small mb-1">Equipment</label>
                                    <select class="form-select form-select-sm" id="equipmentFilter" multiple>
                                    </select>
                                    <small class="text-muted d-block mt-1">Tap to select multiple</small>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small mb-1">Sort By</label>
                                    <select class="form-select form-select-sm" id="sortBySelect">
                                        <option value="name-asc">Name (A-Z)</option>
                                        <option value="name-desc">Name (Z-A)</option>
                                        <option value="muscle">Muscle Group</option>
                                        <option value="tier">Standard First</option>
                                    </select>
                                </div>
                                <div class="col-6 d-flex align-items-end">
                                    <div class="form-check form-switch mb-0">
                                        <input class="form-check-input" type="checkbox" id="favoritesOnlyFilter">
                                        <label class="form-check-label small" for="favoritesOnlyFilter">
                                            Favorites Only
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Exercise List -->
                    <div class="exercise-list-section flex-grow-1 d-flex flex-column">
                        <div class="p-3 pb-2 border-bottom bg-light">
                            <h6 class="mb-0 text-muted small">
                                <i class="bx bx-book-open me-2"></i>Exercise Library
                            </h6>
                        </div>
                        
                        <div id="exerciseListContainer" class="p-3 flex-grow-1" style="overflow-y: auto;">
                            <!-- Rendered by search core -->
                        </div>
                        
                        <!-- Pagination -->
                        <div class="p-2 border-top bg-light" id="paginationFooter" style="display: none;">
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted" id="pageInfo"></small>
                                <div class="btn-group btn-group-sm" id="paginationControls"></div>
                            </div>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="emptyState" class="text-center py-5" style="display: none;">
                            <i class="bx bx-search-alt display-1 text-muted"></i>
                            <p class="text-muted mt-3">No exercises found</p>
                            <small class="text-muted d-block">Try adjusting your filters</small>
                        </div>
                        
                        <!-- Loading State -->
                        <div id="loadingState" class="text-center py-5" style="display: none;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="text-muted mt-3">Loading exercises...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('exerciseSearchOffcanvas', offcanvasHtml, (offcanvas, element) => {
            // Initialize search core
            const searchCore = new window.ExerciseSearchCore(config);
            
            // Get DOM elements
            const searchInput = element.querySelector('#exerciseSearchInput');
            const muscleGroupFilter = element.querySelector('#muscleGroupFilter');
            const difficultyFilter = element.querySelector('#difficultyFilter');
            const equipmentFilter = element.querySelector('#equipmentFilter');
            const favoritesOnlyFilter = element.querySelector('#favoritesOnlyFilter');
            const sortBySelect = element.querySelector('#sortBySelect');
            const exerciseListContainer = element.querySelector('#exerciseListContainer');
            const paginationFooter = element.querySelector('#paginationFooter');
            const pageInfo = element.querySelector('#pageInfo');
            const paginationControls = element.querySelector('#paginationControls');
            const emptyState = element.querySelector('#emptyState');
            const loadingState = element.querySelector('#loadingState');
            
            // Render exercise list
            const renderExerciseList = () => {
                const exercises = searchCore.state.paginatedExercises;
                
                if (exercises.length === 0) {
                    exerciseListContainer.style.display = 'none';
                    emptyState.style.display = 'block';
                    paginationFooter.style.display = 'none';
                    return;
                }
                
                exerciseListContainer.style.display = 'block';
                emptyState.style.display = 'none';
                
                exerciseListContainer.innerHTML = exercises.map(exercise => {
                    const tier = exercise.exerciseTier || '1';
                    const difficulty = exercise.difficulty || 'Intermediate';
                    const muscle = exercise.targetMuscleGroup || '';
                    const equipment = exercise.primaryEquipment || 'None';
                    
                    const tierBadge = (parseInt(tier) === 3)
                        ? '<span class="badge bg-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; opacity: 0.7;"><i class="bx bx-dots-horizontal-rounded" style="font-size: 0.75rem;"></i></span>'
                        : '<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25);"><i class="bx bxs-star" style="font-size: 0.75rem;"></i> Standard</span>';
                    
                    const difficultyColors = { 'B': 'success', 'I': 'warning', 'A': 'danger' };
                    const diffAbbr = difficulty.charAt(0).toUpperCase();
                    const diffColor = difficultyColors[diffAbbr] || 'secondary';
                    const difficultyBadge = `<span class="badge badge-outline-${diffColor}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background: transparent;">${difficulty}</span>`;
                    
                    return `
                        <div class="card mb-2">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="flex-grow-1">
                                        <div class="fw-semibold mb-2">${this.escapeHtml(exercise.name)}</div>
                                        <div class="d-flex gap-2 flex-wrap align-items-center">
                                            ${tierBadge}
                                            ${difficultyBadge}
                                            ${muscle ? `<span class="text-muted small">${this.escapeHtml(muscle)}</span>` : ''}
                                            ${equipment ? `<span class="text-muted small">• ${this.escapeHtml(equipment)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="flex-shrink-0 ms-3">
                                        <button class="btn btn-sm btn-primary" data-exercise-id="${this.escapeHtml(exercise.id || exercise.name)}">
                                            <i class="bx ${buttonIcon} me-1"></i>${buttonText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            };
            
            // Render pagination
            const renderPagination = (paginationData) => {
                if (paginationData.totalPages <= 1) {
                    paginationFooter.style.display = 'none';
                    return;
                }
                
                paginationFooter.style.display = 'flex';
                pageInfo.textContent = `Showing ${paginationData.startIdx}-${paginationData.endIdx} of ${paginationData.total}`;
                
                let buttonsHtml = '';
                
                // Previous button
                buttonsHtml += `<button class="btn btn-sm btn-outline-secondary" ${paginationData.currentPage === 1 ? 'disabled' : ''} data-page="${paginationData.currentPage - 1}">
                    <i class="bx bx-chevron-left"></i>
                </button>`;
                
                // Page buttons
                const maxButtons = 5;
                let startPage = Math.max(1, paginationData.currentPage - Math.floor(maxButtons / 2));
                let endPage = Math.min(paginationData.totalPages, startPage + maxButtons - 1);
                
                if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                }
                
                for (let i = startPage; i <= endPage; i++) {
                    buttonsHtml += `<button class="btn btn-sm ${i === paginationData.currentPage ? 'btn-primary' : 'btn-outline-secondary'}" data-page="${i}">${i}</button>`;
                }
                
                // Next button
                buttonsHtml += `<button class="btn btn-sm btn-outline-secondary" ${paginationData.currentPage === paginationData.totalPages ? 'disabled' : ''} data-page="${paginationData.currentPage + 1}">
                    <i class="bx bx-chevron-right"></i>
                </button>`;
                
                paginationControls.innerHTML = buttonsHtml;
                
                // Attach click handlers
                paginationControls.querySelectorAll('[data-page]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page = parseInt(btn.dataset.page);
                        searchCore.goToPage(page);
                    });
                });
            };
            
            // Listen to search core events
            searchCore.addListener((event, data) => {
                if (event === 'loadingStart') {
                    loadingState.style.display = 'block';
                    exerciseListContainer.style.display = 'none';
                    emptyState.style.display = 'none';
                } else if (event === 'loadingEnd') {
                    loadingState.style.display = 'none';
                } else if (event === 'filtered' || event === 'paginated') {
                    renderExerciseList();
                    if (event === 'paginated') {
                        renderPagination(data);
                    }
                }
            });
            
            // Load exercises
            searchCore.loadExercises().then(() => {
                // Populate filter dropdowns
                if (showFilters) {
                    const muscleGroups = searchCore.getUniqueMuscleGroups();
                    muscleGroupFilter.innerHTML = '<option value="">All Muscle Groups</option>' +
                        muscleGroups.map(mg => `<option value="${this.escapeHtml(mg)}">${this.escapeHtml(mg)}</option>`).join('');
                    
                    const equipment = searchCore.getUniqueEquipment();
                    equipmentFilter.innerHTML = equipment.map(eq => `<option value="${this.escapeHtml(eq)}">${this.escapeHtml(eq)}</option>`).join('');
                }
            });
            
            // Event handlers
            searchInput?.addEventListener('input', (e) => {
                searchCore.setSearchQuery(e.target.value);
            });
            
            muscleGroupFilter?.addEventListener('change', (e) => {
                searchCore.setMuscleGroup(e.target.value);
            });
            
            difficultyFilter?.addEventListener('change', (e) => {
                searchCore.setDifficulty(e.target.value);
            });
            
            equipmentFilter?.addEventListener('change', (e) => {
                searchCore.setEquipment(Array.from(e.target.selectedOptions).map(opt => opt.value));
            });
            
            favoritesOnlyFilter?.addEventListener('change', (e) => {
                searchCore.setFavoritesOnly(e.target.checked);
            });
            
            sortBySelect?.addEventListener('change', (e) => {
                const [sortBy, order] = e.target.value.split('-');
                searchCore.setSort(sortBy, order || 'asc');
            });
            
            // Exercise selection handler
            exerciseListContainer.addEventListener('click', async (e) => {
                const button = e.target.closest('button[data-exercise-id]');
                if (!button) return;
                
                const exerciseId = button.dataset.exerciseId;
                const exercise = searchCore.state.filteredExercises.find(ex =>
                    (ex.id || ex.name) === exerciseId
                );
                
                if (!exercise) return;
                
                // Show loading state
                button.disabled = true;
                button.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                
                try {
                    // Auto-create custom exercise if needed
                    if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                        const currentUser = window.dataManager.getCurrentUser();
                        const userId = currentUser?.uid || null;
                        await window.exerciseCacheService.autoCreateIfNeeded(exercise.name, userId);
                    }
                    
                    // Call selection callback
                    onSelectExercise(exercise);
                    
                    // Close offcanvas
                    offcanvas.hide();
                    
                } catch (error) {
                    console.error('❌ Error selecting exercise:', error);
                    button.disabled = false;
                    button.innerHTML = `<i class="bx ${buttonIcon} me-1"></i>${buttonText}`;
                }
            });
        });
    }
    
    /* ============================================
       ADD EXERCISE FORM OFFCANVAS (Reusable)
       Simple form for exercise details
       ============================================ */
    
    /**
     * Create standalone add exercise form offcanvas
     * REUSABLE across entire app - can be used anywhere that needs exercise data collection
     * @param {Object} config - Configuration options
     * @param {string} config.title - Offcanvas title (default: 'Add Exercise')
     * @param {string} config.exerciseName - Pre-fill exercise name
     * @param {string} config.exerciseId - Link to DB exercise
     * @param {string} config.sets - Default sets value
     * @param {string} config.reps - Default reps value
     * @param {string} config.rest - Default rest value
     * @param {boolean} config.showSearchButton - Show search button (default: true)
     * @param {string} config.buttonText - Submit button text (default: 'Add Exercise')
     * @param {string} config.buttonIcon - Submit button icon (default: 'bx-plus-circle')
     * @param {Function} onAddExercise - Callback when exercise is added
     * @param {Function} onSearchClick - Optional callback when search button is clicked
     * @returns {Object} Offcanvas instance
     */
    static createAddExerciseForm(config = {}, onAddExercise, onSearchClick = null) {
        const {
            title = 'Add Exercise',
            exerciseName = '',
            exerciseId = null,
            sets = '3',
            reps = '12',
            rest = '60s',
            showSearchButton = true,
            buttonText = 'Add Exercise',
            buttonIcon = 'bx-plus-circle'
        } = config;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
                 tabindex="-1" id="addExerciseFormOffcanvas"
                 data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="addExerciseFormOffcanvasLabel">
                        <i class="bx ${buttonIcon} me-2"></i>${this.escapeHtml(title)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <!-- Exercise Name -->
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Exercise Name</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="exerciseNameInput"
                                   value="${this.escapeHtml(exerciseName)}"
                                   placeholder="Enter exercise name" autocomplete="off">
                            ${showSearchButton ? `
                                <button class="btn btn-outline-secondary" type="button" id="searchExerciseBtn">
                                    <i class="bx bx-search"></i> Search
                                </button>
                            ` : ''}
                        </div>
                        <small class="text-muted">Enter custom name or search library</small>
                    </div>
                    
                    <!-- Sets, Reps, Rest -->
                    <div class="row g-2 mb-3">
                        <div class="col-4">
                            <label class="form-label small">Sets</label>
                            <input type="text" class="form-control" id="setsInput" value="${sets}" maxlength="5">
                        </div>
                        <div class="col-4">
                            <label class="form-label small">Reps</label>
                            <input type="text" class="form-control" id="repsInput" value="${reps}" maxlength="10">
                        </div>
                        <div class="col-4">
                            <label class="form-label small">Rest</label>
                            <input type="text" class="form-control" id="restInput" value="${rest}" maxlength="10">
                        </div>
                    </div>
                    
                    <!-- Submit Button -->
                    <button class="btn btn-primary w-100" id="submitExerciseBtn" disabled>
                        <i class="bx ${buttonIcon} me-2"></i>${this.escapeHtml(buttonText)}
                    </button>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('addExerciseFormOffcanvas', offcanvasHtml, (offcanvas, element) => {
            // Store exercise ID (if linked to DB)
            let linkedExerciseId = exerciseId;
            
            // Get form elements
            const nameInput = element.querySelector('#exerciseNameInput');
            const setsInput = element.querySelector('#setsInput');
            const repsInput = element.querySelector('#repsInput');
            const restInput = element.querySelector('#restInput');
            const submitBtn = element.querySelector('#submitExerciseBtn');
            const searchBtn = element.querySelector('#searchExerciseBtn');
            
            // Validation function
            const validateForm = () => {
                const isValid = nameInput.value.trim().length > 0;
                submitBtn.disabled = !isValid;
            };
            
            // Input handlers
            nameInput?.addEventListener('input', validateForm);
            
            // Search button handler
            if (searchBtn && onSearchClick) {
                searchBtn.addEventListener('click', () => {
                    // Call parent's search handler with a callback to populate the form
                    onSearchClick((selectedExercise) => {
                        nameInput.value = selectedExercise.name;
                        linkedExerciseId = selectedExercise.id;
                        validateForm();
                    });
                });
            }
            
            // Submit handler
            submitBtn?.addEventListener('click', async () => {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
                
                try {
                    const exerciseData = {
                        name: nameInput.value.trim(),
                        exerciseId: linkedExerciseId,
                        sets: setsInput.value.trim(),
                        reps: repsInput.value.trim(),
                        rest: restInput.value.trim()
                    };
                    
                    await onAddExercise(exerciseData);
                    offcanvas.hide();
                    
                } catch (error) {
                    console.error('❌ Error adding exercise:', error);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="bx ${buttonIcon} me-2"></i>${this.escapeHtml(buttonText)}`;
                    throw error;
                }
            });
            
            // Initial validation
            validateForm();
        });
    }
    
    /**
     * Validate add button state based on search input
     * @private
     */
    static validateAddButton(searchInput, addBtn) {
        if (!searchInput || !addBtn) return;
        
        const hasValue = searchInput.value.trim().length > 0;
        addBtn.disabled = !hasValue;
        
        if (hasValue) {
            addBtn.classList.remove('btn-secondary');
            addBtn.classList.add('btn-primary');
        } else {
            addBtn.classList.remove('btn-primary');
            addBtn.classList.add('btn-secondary');
        }
    }

    /* ============================================
       SKIP EXERCISE
       ============================================ */

    /**
     * Create skip exercise offcanvas with optional reason
     * @param {Object} data - Exercise data
     * @param {string} data.exerciseName - Name of exercise to skip
     * @param {Function} onConfirm - Callback when user confirms skip
     * @returns {Object} Offcanvas instance
     */
    static createSkipExercise(data, onConfirm) {
        const { exerciseName } = data;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
                 id="skipExerciseOffcanvas" aria-labelledby="skipExerciseOffcanvasLabel" data-bs-scroll="false">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="skipExerciseOffcanvasLabel">
                        <i class="bx bx-skip-next me-2"></i>Skip Exercise
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <div class="text-center mb-4">
                        <div class="mb-3">
                            <i class="bx bx-skip-next" style="font-size: 3rem; color: var(--bs-warning);"></i>
                        </div>
                        <h5 class="mb-2">${this.escapeHtml(exerciseName)}</h5>
                        <p class="text-muted mb-0">Skip this exercise for today?</p>
                    </div>
                    
                    <div class="alert alert-info d-flex align-items-start mb-4">
                        <i class="bx bx-info-circle me-2 mt-1"></i>
                        <div>
                            <strong>Skipped exercises are tracked</strong>
                            <p class="mb-0 small">This will be recorded in your workout history. You can optionally add a reason below.</p>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="form-label">Reason (Optional)</label>
                        <textarea class="form-control" id="skipReasonInput"
                                  rows="3" maxlength="200"
                                  placeholder="e.g., Equipment unavailable, Injury, Fatigue..."></textarea>
                        <small class="text-muted">Max 200 characters</small>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                            <i class="bx bx-x me-1"></i>Cancel
                        </button>
                        <button type="button" class="btn btn-warning flex-fill" id="confirmSkipBtn">
                            <i class="bx bx-check me-1"></i>Skip Exercise
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('skipExerciseOffcanvas', offcanvasHtml, (offcanvas) => {
            const confirmBtn = document.getElementById('confirmSkipBtn');
            const reasonInput = document.getElementById('skipReasonInput');
            
            if (confirmBtn && reasonInput) {
                confirmBtn.addEventListener('click', async () => {
                    const reason = reasonInput.value.trim();
                    
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Skipping...';
                    
                    try {
                        await onConfirm(reason);
                        offcanvas.hide();
                    } catch (error) {
                        console.error('Error skipping exercise:', error);
                        confirmBtn.disabled = false;
                        confirmBtn.innerHTML = '<i class="bx bx-check me-1"></i>Skip Exercise';
                        alert('Failed to skip exercise. Please try again.');
                    }
                });
                
                // Allow Enter key to submit (with Shift+Enter for new line)
                reasonInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        confirmBtn.click();
                    }
                });
            }
        });
    }

    /* ============================================
       HELPER METHODS
       ============================================ */

    /**
     * Create and show offcanvas (helper method)
     */
    static createOffcanvas(id, html, setupCallback = null) {
        const existing = document.getElementById(id);
        if (existing) {
            // Properly dispose Bootstrap instance before removing
            const existingInstance = window.bootstrap.Offcanvas.getInstance(existing);
            if (existingInstance) {
                existingInstance.dispose();
            }
            existing.remove();
        }
        
        // CRITICAL FIX: Clean up any orphaned backdrops before creating new offcanvas
        // This prevents backdrop accumulation from previous instances
        const orphanedBackdrops = document.querySelectorAll('.offcanvas-backdrop');
        orphanedBackdrops.forEach(backdrop => {
            backdrop.remove();
        });

        document.body.insertAdjacentHTML('beforeend', html);

        const offcanvasElement = document.getElementById(id);
        
        // Ensure element exists before Bootstrap initialization
        if (!offcanvasElement) {
            console.error('❌ Failed to create offcanvas element:', id);
            return null;
        }
        
        // CRITICAL FIX: Force scroll to false before Bootstrap initialization
        // This must be set on the element BEFORE creating the Bootstrap instance
        offcanvasElement.setAttribute('data-bs-scroll', 'false');
        
        // CRITICAL: Force a layout reflow before Bootstrap initialization
        // This ensures the element is fully rendered in the DOM
        void offcanvasElement.offsetHeight;
        
        // Wrap Bootstrap initialization in try-catch for graceful error handling
        let offcanvas;
        try {
            offcanvas = new window.bootstrap.Offcanvas(offcanvasElement, {
                scroll: false  // Explicitly disable scroll in options
            });
        } catch (error) {
            console.error('❌ Bootstrap Offcanvas initialization failed:', error);
            return null;
        }

        if (setupCallback) {
            setupCallback(offcanvas, offcanvasElement);
        }

        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            // Remove the offcanvas element
            offcanvasElement.remove();
            
            // CRITICAL FIX: Explicitly remove any lingering backdrops
            // This fixes the gray screen issue when closing offcanvas
            setTimeout(() => {
                const backdrops = document.querySelectorAll('.offcanvas-backdrop');
                backdrops.forEach(backdrop => {
                    backdrop.remove();
                });
            }, 50); // Small delay to ensure Bootstrap's cleanup has attempted
        });

        // CRITICAL FIX: Use double requestAnimationFrame + setTimeout for maximum stability
        // This prevents Bootstrap's scroll error: "Cannot read properties of null (reading 'scroll')"
        // AND eliminates the "jutter" effect (open → close → open)
        //
        // Why this approach?
        // - First RAF: Browser schedules next paint frame
        // - Second RAF: Ensures element is fully rendered and layout is complete
        // - setTimeout: Additional safety buffer for Bootstrap's internal setup
        // - This gives Bootstrap a completely stable DOM to work with
        //
        // The error occurs when Bootstrap tries to access scroll properties during transition
        // before the element is fully initialized in the DOM. This multi-step approach ensures
        // the element is completely settled before show() is called.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    // Triple-check that everything is still valid before showing
                    if (offcanvas && offcanvasElement && offcanvasElement.isConnected) {
                        try {
                            // Verify the Bootstrap instance is still valid
                            const currentInstance = window.bootstrap.Offcanvas.getInstance(offcanvasElement);
                            if (currentInstance === offcanvas) {
                                offcanvas.show();
                            } else {
                                console.warn('⚠️ Offcanvas instance mismatch, skipping show()');
                            }
                        } catch (showError) {
                            console.error('❌ Error showing offcanvas:', showError);
                        }
                    }
                }, 10); // Increased delay from 0 to 10ms for more stability
            });
        });

        return { offcanvas, offcanvasElement };
    }

    /**
     * Escape HTML helper
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Force cleanup of all offcanvas backdrops
     * Utility method for debugging or emergency cleanup
     * Can be called from console: window.cleanupOffcanvasBackdrops()
     */
    static forceCleanupBackdrops() {
        const backdrops = document.querySelectorAll('.offcanvas-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });
        console.log(`🧹 Cleaned up ${backdrops.length} orphaned backdrop(s)`);
        return backdrops.length;
    }
}

// Export globally
window.UnifiedOffcanvasFactory = UnifiedOffcanvasFactory;

// Expose cleanup utility globally for debugging
window.cleanupOffcanvasBackdrops = UnifiedOffcanvasFactory.forceCleanupBackdrops;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedOffcanvasFactory;
}

console.log('📦 UnifiedOffcanvasFactory component loaded');