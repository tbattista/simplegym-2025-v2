/**
 * Ghost Gym - Workout Offcanvas Factory
 * Creates and manages bottom offcanvas modals for workout mode
 * @version 1.0.0
 * @date 2025-11-18
 */

class WorkoutOffcanvasFactory {
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
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="weightEditOffcanvas" aria-labelledby="weightEditOffcanvasLabel">
                <div class="offcanvas-header">
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

    /**
     * Create complete workout confirmation offcanvas
     * @param {Object} data - Session and workout data
     * @param {Function} onConfirm - Callback when user confirms completion
     * @returns {Object} Offcanvas instance
     */
    static createCompleteWorkout(data, onConfirm) {
        const { workoutName, minutes, totalExercises } = data;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="completeWorkoutOffcanvas" aria-labelledby="completeWorkoutOffcanvasLabel">
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

    /**
     * Create completion summary offcanvas (success screen)
     * @param {Object} data - Completed session data
     * @returns {Object} Offcanvas instance
     */
    static createCompletionSummary(data) {
        const { duration, exerciseCount } = data;
        
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
                        <button type="button" class="btn btn-outline-primary" onclick="window.location.href='workout-builder.html'">
                            <i class="bx bx-list-ul me-1"></i>View History
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
                 aria-labelledby="resumeSessionOffcanvasLabel" data-bs-backdrop="static" data-bs-keyboard="false">
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

    /**
     * Create bonus exercise offcanvas
     * @param {Object} data - Previous exercises data
     * @param {Function} onAddNew - Callback when adding new exercise
     * @param {Function} onAddPrevious - Callback when adding previous exercise
     * @returns {Object} Offcanvas instance
     */
    static createBonusExercise(data, onAddNew, onAddPrevious) {
        const { previousExercises = [] } = data;
        const hasPrevious = previousExercises && previousExercises.length > 0;
        
        const offcanvasHtml = `
            <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-tall" tabindex="-1" id="bonusExerciseOffcanvas"
                 aria-labelledby="bonusExerciseOffcanvasLabel">
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title" id="bonusExerciseOffcanvasLabel">
                        <i class="bx bx-plus-circle me-2"></i>Add Bonus Exercise
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <div class="alert alert-info d-flex align-items-start mb-4">
                        <i class="bx bx-info-circle me-2 mt-1"></i>
                        <div>
                            <strong>Add a supplementary exercise</strong>
                            <p class="mb-0 small">Bonus exercises are saved in your workout history but don't modify your workout template.</p>
                        </div>
                    </div>
                    
                    ${hasPrevious ? `
                        <div class="mb-4">
                            <h6 class="mb-3">
                                <i class="bx bx-history me-2"></i>From Last Session
                            </h6>
                            <div class="list-group" id="previousBonusList">
                                ${previousExercises.map((exercise, index) => `
                                    <div class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>${this.escapeHtml(exercise.exercise_name)}</strong>
                                            <div class="text-muted small">
                                                ${exercise.target_sets} × ${exercise.target_reps}
                                                ${exercise.weight ? ` • ${exercise.weight} ${exercise.weight_unit}` : ''}
                                            </div>
                                        </div>
                                        <button class="btn btn-sm btn-outline-primary" data-action="add-previous" data-index="${index}">
                                            <i class="bx bx-plus"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bx bx-plus-circle me-2"></i>New Exercise</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">Exercise Name</label>
                                <input type="text" class="form-control" id="bonusExerciseName"
                                       placeholder="e.g., Face Pulls, Leg Press" autofocus>
                            </div>
                            <div class="row">
                                <div class="col-6 mb-3">
                                    <label class="form-label">Sets</label>
                                    <input type="text" class="form-control" id="bonusSets" value="3" placeholder="3">
                                </div>
                                <div class="col-6 mb-3">
                                    <label class="form-label">Reps</label>
                                    <input type="text" class="form-control" id="bonusReps" value="12" placeholder="12">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-8 mb-3">
                                    <label class="form-label">Weight (Optional)</label>
                                    <input type="text" class="form-control" id="bonusWeight" placeholder="e.g., 135, 4x45">
                                </div>
                                <div class="col-4 mb-3">
                                    <label class="form-label">Unit</label>
                                    <select class="form-select" id="bonusWeightUnit">
                                        <option value="lbs">lbs</option>
                                        <option value="kg">kg</option>
                                        <option value="other">other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2 mt-4">
                        <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">Cancel</button>
                        <button type="button" class="btn btn-success flex-fill" id="addAndCloseBtn">
                            <i class="bx bx-check me-1"></i>Add Exercise
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return this.createOffcanvas('bonusExerciseOffcanvas', offcanvasHtml, (offcanvas) => {
            const addAndCloseBtn = document.getElementById('addAndCloseBtn');
            const nameInput = document.getElementById('bonusExerciseName');
            const previousBonusList = document.getElementById('previousBonusList');
            
            if (addAndCloseBtn) {
                addAndCloseBtn.addEventListener('click', async () => {
                    const name = nameInput.value.trim();
                    const sets = document.getElementById('bonusSets').value.trim();
                    const reps = document.getElementById('bonusReps').value.trim();
                    const weight = document.getElementById('bonusWeight').value.trim();
                    const unit = document.getElementById('bonusWeightUnit').value;
                    
                    if (!name) {
                        alert('Please enter an exercise name.');
                        return;
                    }
                    
                    await onAddNew({ name, sets, reps, weight, unit });
                    offcanvas.hide();
                });
            }
            
            if (previousBonusList) {
                previousBonusList.addEventListener('click', async (e) => {
                    const addBtn = e.target.closest('[data-action="add-previous"]');
                    if (addBtn) {
                        const index = parseInt(addBtn.getAttribute('data-index'));
                        await onAddPrevious(index);
                        offcanvas.hide();
                    }
                });
            }
            
            if (nameInput) {
                nameInput.addEventListener('keypress', async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addAndCloseBtn.click();
                    }
                });
            }
        });
    }

    /**
     * Create and show offcanvas (helper method)
     */
    static createOffcanvas(id, html, setupCallback = null) {
        const existing = document.getElementById(id);
        if (existing) {
            existing.remove();
        }

        document.body.insertAdjacentHTML('beforeend', html);

        const offcanvasElement = document.getElementById(id);
        const offcanvas = new window.bootstrap.Offcanvas(offcanvasElement);

        if (setupCallback) {
            setupCallback(offcanvas, offcanvasElement);
        }

        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            offcanvasElement.remove();
        });

        offcanvas.show();

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
}

// Export globally
window.WorkoutOffcanvasFactory = WorkoutOffcanvasFactory;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutOffcanvasFactory;
}

console.log('📦 WorkoutOffcanvasFactory component loaded');