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
                    <!-- Search Section -->
                    <div class="p-3 border-bottom bg-light">
                        <div class="input-group">
                            <span class="input-group-text">
                                <i class="bx bx-search"></i>
                            </span>
                            <input
                                type="text"
                                class="form-control"
                                id="bonusExerciseSearch"
                                placeholder="Search exercises..."
                                autocomplete="off"
                            >
                            <button class="btn btn-outline-secondary" type="button" id="clearSearchBtn" style="display: none;">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                        
                        <!-- Filter Chips -->
                        <div class="mt-3 d-flex flex-wrap gap-2" id="filterChips">
                            <button class="btn btn-sm btn-primary active" data-filter="all">All</button>
                            <button class="btn btn-sm btn-outline-primary" data-filter="chest">Chest</button>
                            <button class="btn btn-sm btn-outline-primary" data-filter="shoulders">Shoulders</button>
                            <button class="btn btn-sm btn-outline-primary" data-filter="triceps">Triceps</button>
                            <button class="btn btn-sm btn-outline-primary" data-filter="back">Back</button>
                            <button class="btn btn-sm btn-outline-primary" data-filter="legs">Legs</button>
                            <button class="btn btn-sm btn-outline-primary" data-filter="arms">Arms</button>
                        </div>
                    </div>

                    <!-- Exercise List -->
                    <div class="list-group list-group-flush" id="bonusExerciseList" style="max-height: calc(85vh - 200px); overflow-y: auto;">
                        <!-- Exercise items will be rendered here -->
                    </div>

                    <!-- Empty State -->
                    <div id="emptyState" class="text-center py-5" style="display: none;">
                        <i class="bx bx-search-alt display-1 text-muted"></i>
                        <p class="text-muted mt-3">No exercises found</p>
                        <button class="btn btn-sm btn-outline-primary" id="clearAllBtn">
                            Clear Search
                        </button>
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
        `;
        
        return this.createOffcanvas('bonusExerciseOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
            // State management
            const state = {
                searchQuery: '',
                activeFilter: 'all',
                allExercises: [],
                filteredExercises: [],
                isLoading: false
            };
            
            // Get DOM elements
            const searchInput = offcanvasElement.querySelector('#bonusExerciseSearch');
            const clearBtn = offcanvasElement.querySelector('#clearSearchBtn');
            const clearAllBtn = offcanvasElement.querySelector('#clearAllBtn');
            const exerciseList = offcanvasElement.querySelector('#bonusExerciseList');
            const emptyState = offcanvasElement.querySelector('#emptyState');
            const loadingState = offcanvasElement.querySelector('#loadingState');
            const filterChips = offcanvasElement.querySelectorAll('[data-filter]');
            
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
                } catch (error) {
                    console.error('❌ Error loading exercises:', error);
                    state.allExercises = [];
                }
                
                state.isLoading = false;
                loadingState.style.display = 'none';
                filterExercises();
            };
            
            // Filter exercises based on search and category
            const filterExercises = () => {
                let filtered = [...state.allExercises];
                
                // Apply category filter
                if (state.activeFilter !== 'all') {
                    filtered = filtered.filter(ex => {
                        const muscleGroup = (ex.muscle_group || '').toLowerCase();
                        return muscleGroup.includes(state.activeFilter);
                    });
                }
                
                // Apply search filter
                if (state.searchQuery) {
                    const query = state.searchQuery.toLowerCase();
                    filtered = filtered.filter(ex =>
                        (ex.name || '').toLowerCase().includes(query) ||
                        (ex.muscle_group || '').toLowerCase().includes(query) ||
                        (ex.equipment || '').toLowerCase().includes(query)
                    );
                }
                
                state.filteredExercises = filtered;
                renderExerciseList();
            };
            
            // Render exercise list
            const renderExerciseList = () => {
                if (state.filteredExercises.length === 0) {
                    exerciseList.style.display = 'none';
                    emptyState.style.display = 'block';
                    return;
                }
                
                exerciseList.style.display = 'block';
                emptyState.style.display = 'none';
                
                exerciseList.innerHTML = state.filteredExercises.map(exercise => `
                    <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                            data-exercise-id="${this.escapeHtml(exercise.id || exercise.name)}">
                        <div class="me-auto">
                            <div class="fw-semibold">${this.escapeHtml(exercise.name)}</div>
                            <small class="text-muted">
                                ${exercise.muscle_group ? this.escapeHtml(exercise.muscle_group) : ''}
                                ${exercise.equipment ? ` • ${this.escapeHtml(exercise.equipment)}` : ''}
                            </small>
                        </div>
                        <span class="badge bg-primary rounded-pill text-capitalize">
                            ${exercise.muscle_group ? this.escapeHtml(exercise.muscle_group.split(',')[0].trim()) : 'Other'}
                        </span>
                    </button>
                `).join('');
            };
            
            // Search input handler
            searchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value.toLowerCase();
                clearBtn.style.display = e.target.value ? 'block' : 'none';
                filterExercises();
            });
            
            // Clear search button
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                state.searchQuery = '';
                clearBtn.style.display = 'none';
                filterExercises();
                searchInput.focus();
            });
            
            // Clear all button (in empty state)
            clearAllBtn.addEventListener('click', () => {
                searchInput.value = '';
                state.searchQuery = '';
                state.activeFilter = 'all';
                clearBtn.style.display = 'none';
                
                // Reset filter chips
                filterChips.forEach(chip => {
                    if (chip.dataset.filter === 'all') {
                        chip.classList.remove('btn-outline-primary');
                        chip.classList.add('active', 'btn-primary');
                    } else {
                        chip.classList.remove('active', 'btn-primary');
                        chip.classList.add('btn-outline-primary');
                    }
                });
                
                filterExercises();
            });
            
            // Filter chip handlers
            filterChips.forEach(chip => {
                chip.addEventListener('click', (e) => {
                    // Update active state
                    filterChips.forEach(c => {
                        c.classList.remove('active', 'btn-primary');
                        c.classList.add('btn-outline-primary');
                    });
                    e.target.classList.remove('btn-outline-primary');
                    e.target.classList.add('active', 'btn-primary');
                    
                    // Update filter
                    state.activeFilter = e.target.dataset.filter;
                    filterExercises();
                });
            });
            
            // Exercise click handler
            exerciseList.addEventListener('click', async (e) => {
                const listItem = e.target.closest('[data-exercise-id]');
                if (!listItem) return;
                
                const exerciseId = listItem.dataset.exerciseId;
                const exercise = state.filteredExercises.find(ex =>
                    (ex.id || ex.name) === exerciseId
                );
                
                if (!exercise) return;
                
                // Show loading state on clicked item
                listItem.disabled = true;
                listItem.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';
                
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
                    
                    // Reset button state
                    renderExerciseList();
                    
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
                
                // Auto-focus search on desktop only
                if (searchInput && window.innerWidth > 768) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }, { once: true });
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