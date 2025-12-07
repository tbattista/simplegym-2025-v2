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
     * Create enhanced bonus exercise offcanvas
     * @param {Object} data - Previous exercises data
     * @param {Function} onAddNew - Callback when adding new exercise
     * @param {Function} onAddPrevious - Callback when adding previous exercise
     * @returns {Object} Offcanvas instance
     */
    static createBonusExercise(data, onAddNew, onAddPrevious) {
        const { previousExercises = [] } = data;
        const hasPrevious = previousExercises && previousExercises.length > 0;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
                 tabindex="-1"
                 id="bonusExerciseOffcanvas"
                 aria-labelledby="bonusExerciseOffcanvasLabel"
                 data-bs-scroll="false">
                
                <!-- Header -->
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
                        <i class="bx bx-plus-circle me-2"></i>Add Bonus Exercise
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close add exercise dialog"></button>
                </div>
                
                <!-- Body -->
                <div class="offcanvas-body">
                    
                    <!-- Info Alert -->
                    <div class="alert alert-info d-flex align-items-start mb-3">
                        <i class="bx bx-info-circle me-2 mt-1 flex-shrink-0"></i>
                        <div class="flex-grow-1">
                            <strong>Add a supplementary exercise</strong>
                            <p class="mb-0 small">Bonus exercises are saved in your workout history but don't modify your workout template.</p>
                        </div>
                    </div>
                    
                    <!-- HERO: Search Section -->
                    <div class="search-section mb-4" role="search">
                        <label for="bonusExerciseSearch" class="form-label fw-semibold">
                            <i class="bx bx-search me-1"></i>Search Exercise
                        </label>
                        <div class="input-group input-group-merge input-group-lg search-input-wrapper">
                            <span class="input-group-text">
                                <i class="bx bx-search"></i>
                            </span>
                            <input type="search"
                                   class="form-control form-control-lg exercise-autocomplete-input"
                                   id="bonusExerciseSearch"
                                   placeholder="e.g., Face Pulls, Leg Press, Cable Rows..."
                                   aria-label="Search exercises"
                                   aria-describedby="searchHelp"
                                   aria-autocomplete="list"
                                   aria-controls="searchResults"
                                   autocomplete="off">
                            <button class="btn btn-outline-secondary search-clear-btn"
                                    type="button"
                                    style="display: none;"
                                    aria-label="Clear search">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                        <div id="searchHelp" class="form-text">
                            <i class="bx bx-info-circle me-1"></i>
                            Start typing to search exercises. Use ↑↓ arrows to navigate results.
                        </div>
                    </div>
                    
                    <!-- Quick Actions: Previous Exercises -->
                    ${hasPrevious ? `
                        <div class="quick-actions-section mb-4">
                            <button class="section-toggle btn btn-link text-start w-100 p-0 mb-2"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target="#previousExercisesCollapse"
                                    aria-expanded="false"
                                    aria-controls="previousExercisesCollapse">
                                <div class="d-flex align-items-center justify-content-between">
                                    <h6 class="mb-0 fw-semibold">
                                        <i class="bx bx-history me-2 text-primary"></i>
                                        From Last Session
                                        <span class="badge bg-label-primary ms-2">${previousExercises.length}</span>
                                    </h6>
                                    <i class="bx bx-chevron-down toggle-icon"></i>
                                </div>
                            </button>
                            
                            <div class="collapse" id="previousExercisesCollapse">
                                <div class="exercise-chips-container" id="previousBonusList">
                                    ${previousExercises.map((exercise, index) => `
                                        <div class="exercise-chip" data-index="${index}">
                                            <div class="chip-content">
                                                <div class="chip-name">${this.escapeHtml(exercise.exercise_name)}</div>
                                                <div class="chip-details">
                                                    ${exercise.target_sets}×${exercise.target_reps}
                                                    ${exercise.weight ? ` • ${exercise.weight} ${exercise.weight_unit}` : ''}
                                                </div>
                                            </div>
                                            <button class="chip-add-btn btn btn-sm btn-primary"
                                                    data-action="add-previous"
                                                    data-index="${index}"
                                                    aria-label="Add ${this.escapeHtml(exercise.exercise_name)}">
                                                <i class="bx bx-plus"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Manual Entry Form (Collapsible) -->
                    <div class="manual-entry-section mb-4">
                        <button class="section-toggle btn btn-link text-start w-100 p-0 mb-2"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#manualEntryCollapse"
                                aria-expanded="false"
                                aria-controls="manualEntryCollapse">
                            <div class="d-flex align-items-center justify-content-between">
                                <h6 class="mb-0 fw-semibold">
                                    <i class="bx bx-edit-alt me-2 text-primary"></i>
                                    Manual Entry
                                </h6>
                                <i class="bx bx-chevron-down toggle-icon"></i>
                            </div>
                        </button>
                        
                        <div class="collapse" id="manualEntryCollapse">
                            <div class="card">
                                <div class="card-body">
                                    <!-- Sets & Reps -->
                                    <div class="row g-2 mb-3">
                                        <div class="col-6">
                                            <label for="bonusSets" class="form-label">Sets</label>
                                            <input type="number"
                                                   class="form-control"
                                                   id="bonusSets"
                                                   value="3"
                                                   min="1"
                                                   max="10"
                                                   aria-label="Number of sets">
                                        </div>
                                        <div class="col-6">
                                            <label for="bonusReps" class="form-label">Reps</label>
                                            <input type="text"
                                                   class="form-control"
                                                   id="bonusReps"
                                                   value="12"
                                                   placeholder="8-12"
                                                   aria-label="Number of reps">
                                        </div>
                                    </div>
                                    
                                    <!-- Weight (Optional) -->
                                    <div class="row g-2 mb-3">
                                        <div class="col-8">
                                            <label for="bonusWeight" class="form-label">Weight (Optional)</label>
                                            <input type="text"
                                                   class="form-control"
                                                   id="bonusWeight"
                                                   placeholder="e.g., 135, 4×45, BW+25"
                                                   aria-label="Weight amount">
                                        </div>
                                        <div class="col-4">
                                            <label for="bonusWeightUnit" class="form-label">Unit</label>
                                            <select class="form-select" id="bonusWeightUnit" aria-label="Weight unit">
                                                <option value="lbs">lbs</option>
                                                <option value="kg">kg</option>
                                                <option value="other">other</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="form-text">
                                        <i class="bx bx-info-circle me-1"></i>
                                        Weight supports numbers (135) or descriptions (4×45 plates, BW+25)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons (inside body for proper Bootstrap structure) -->
                    <div class="bonus-exercise-actions mt-4 pt-3 border-top">
                        <div class="d-flex gap-2">
                            <button type="button"
                                    class="btn btn-outline-secondary flex-fill"
                                    data-bs-dismiss="offcanvas">
                                Cancel
                            </button>
                            <button type="button"
                                    class="btn btn-primary flex-fill"
                                    id="addAndCloseBtn"
                                    disabled
                                    aria-label="Add exercise to workout">
                                <i class="bx bx-plus-circle me-1"></i>
                                Add Exercise
                            </button>
                        </div>
                    </div>
                    
                </div>
            </div>
        `;
        
        return this.createOffcanvas('bonusExerciseOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
            // Get DOM elements
            const searchInput = offcanvasElement.querySelector('#bonusExerciseSearch');
            const clearBtn = offcanvasElement.querySelector('.search-clear-btn');
            const addBtn = offcanvasElement.querySelector('#addAndCloseBtn');
            const previousBonusList = offcanvasElement.querySelector('#previousBonusList');
            const setsInput = offcanvasElement.querySelector('#bonusSets');
            const repsInput = offcanvasElement.querySelector('#bonusReps');
            const weightInput = offcanvasElement.querySelector('#bonusWeight');
            const unitSelect = offcanvasElement.querySelector('#bonusWeightUnit');
            
            // Toggle icons for collapsible sections
            const toggleButtons = offcanvasElement.querySelectorAll('.section-toggle');
            toggleButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const icon = btn.querySelector('.toggle-icon');
                    if (icon) {
                        setTimeout(() => {
                            const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                            icon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
                        }, 50);
                    }
                });
            });
            
            // Search input: Show/hide clear button
            if (searchInput && clearBtn) {
                searchInput.addEventListener('input', () => {
                    clearBtn.style.display = searchInput.value.trim() ? 'block' : 'none';
                    this.validateAddButton(searchInput, addBtn);
                });
                
                clearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    clearBtn.style.display = 'none';
                    searchInput.focus();
                    this.validateAddButton(searchInput, addBtn);
                });
            }
            
            // Initialize exercise autocomplete
            setTimeout(() => {
                if (window.initializeExerciseAutocompletes) {
                    window.initializeExerciseAutocompletes();
                    console.log('✅ Exercise autocomplete initialized for bonus exercise search');
                } else if (window.initExerciseAutocomplete && searchInput) {
                    // Fallback to individual initialization
                    window.initExerciseAutocomplete(searchInput, {
                        allowCustom: true,
                        allowAutoCreate: true,
                        minChars: 2,
                        maxResults: 10,
                        debounceMs: 200,
                        showMuscleGroup: true,
                        showEquipment: true,
                        showDifficulty: true,
                        showTier: true,
                        onSelect: (exercise) => {
                            console.log('✅ Exercise selected:', exercise.name);
                            this.validateAddButton(searchInput, addBtn);
                        },
                        onAutoCreate: (exercise) => {
                            console.log('🚀 Auto-created exercise:', exercise.name);
                            if (window.showToast) {
                                window.showToast({
                                    message: `Created custom exercise: ${exercise.name}`,
                                    type: 'success',
                                    title: 'Exercise Created',
                                    icon: 'bx-plus-circle',
                                    delay: 3000
                                });
                            }
                        }
                    });
                    console.log('✅ Exercise autocomplete initialized individually');
                }
                
                // Auto-focus search on desktop only
                if (searchInput && window.innerWidth > 768) {
                    setTimeout(() => searchInput.focus(), 300);
                }
            }, 200);
            
            // Add Exercise button handler
            if (addBtn && searchInput) {
                addBtn.addEventListener('click', async () => {
                    const name = searchInput.value.trim();
                    const sets = setsInput?.value.trim() || '3';
                    const reps = repsInput?.value.trim() || '12';
                    const weight = weightInput?.value.trim() || '';
                    const unit = unitSelect?.value || 'lbs';
                    
                    if (!name) {
                        if (window.showAlert) {
                            window.showAlert('Please enter an exercise name', 'warning');
                        } else {
                            alert('Please enter an exercise name.');
                        }
                        searchInput.focus();
                        return;
                    }
                    
                    // Show loading state
                    addBtn.disabled = true;
                    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
                    
                    try {
                        // Auto-create custom exercise if it doesn't exist
                        if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                            const currentUser = window.dataManager.getCurrentUser();
                            const userId = currentUser?.uid || null;
                            const exercise = await window.exerciseCacheService.autoCreateIfNeeded(name, userId);
                            
                            if (exercise) {
                                console.log(`✅ Auto-created or found exercise: ${name}`);
                                window.exerciseCacheService._trackUsage(exercise);
                            }
                        }
                        
                        // Call the add callback
                        await onAddNew({ name, sets, reps, weight, unit });
                        
                        // Close offcanvas
                        offcanvas.hide();
                        
                    } catch (error) {
                        console.error('❌ Error adding exercise:', error);
                        
                        // Reset button state
                        addBtn.disabled = false;
                        addBtn.innerHTML = '<i class="bx bx-plus-circle me-1"></i>Add Exercise';
                        
                        if (window.showAlert) {
                            window.showAlert('Failed to add exercise. Please try again.', 'danger');
                        } else {
                            alert('Failed to add exercise. Please try again.');
                        }
                    }
                });
            }
            
            // Previous exercises: Quick add
            if (previousBonusList) {
                previousBonusList.addEventListener('click', async (e) => {
                    const chipAddBtn = e.target.closest('[data-action="add-previous"]');
                    if (chipAddBtn) {
                        const index = parseInt(chipAddBtn.getAttribute('data-index'));
                        
                        // Show loading state
                        chipAddBtn.disabled = true;
                        chipAddBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                        
                        try {
                            await onAddPrevious(index);
                            offcanvas.hide();
                        } catch (error) {
                            console.error('❌ Error adding previous exercise:', error);
                            chipAddBtn.disabled = false;
                            chipAddBtn.innerHTML = '<i class="bx bx-plus"></i>';
                        }
                    }
                });
            }
            
            // Enter key to submit
            if (searchInput && addBtn) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !addBtn.disabled) {
                        e.preventDefault();
                        addBtn.click();
                    }
                });
            }
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
                    if (offcanvas && offcanvasElement.isConnected) {
                        offcanvas.show();
                    }
                }, 0);
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