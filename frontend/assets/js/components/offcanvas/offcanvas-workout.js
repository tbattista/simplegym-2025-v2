/**
 * Ghost Gym - Workout Offcanvas Components
 * Creates workout-related offcanvas: weight edit, complete, completion summary, resume session
 * 
 * @module offcanvas-workout
 * @version 3.0.0
 * @date 2025-12-20
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/* ============================================
   WEIGHT EDIT OFFCANVAS (from WorkoutOffcanvasFactory)
   ============================================ */

/**
 * Create weight edit offcanvas
 * @param {string} exerciseName - Exercise name
 * @param {Object} data - Weight data
 * @returns {Object} Offcanvas instance
 */
export function createWeightEdit(exerciseName, data) {
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
                        data-exercise-name="${escapeHtml(exerciseName)}"
                        value="${currentWeight || ''}"
                        placeholder="135 or 4x45 plates"
                        maxlength="50"
                        ${!isSessionActive ? 'readonly disabled' : ''}
                        style="flex: 1;">
                    <select class="form-select weight-unit-select" id="modalWeightUnit" data-exercise-name="${escapeHtml(exerciseName)}" ${!isSessionActive ? 'disabled' : ''} style="width: 100px;">
                        <option value="lbs" ${currentUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                        <option value="kg" ${currentUnit === 'kg' ? 'selected' : ''}>kg</option>
                        <option value="other" ${currentUnit === 'other' ? 'selected' : ''}>DIY</option>
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
                <h6 class="mb-3">${escapeHtml(exerciseName)}</h6>
                ${modalContent}
                <div class="d-flex gap-2 mt-4">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">Cancel</button>
                    ${isSessionActive ? '<button type="button" class="btn btn-primary flex-fill" id="saveWeightBtn">Save</button>' : ''}
                </div>
            </div>
        </div>
    `;

    return createOffcanvas('weightEditOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        if (isSessionActive) {
            setupWeightEditListeners(offcanvasElement, offcanvas, exerciseName);
        }
    });
}

/**
 * Setup weight edit event listeners
 */
export function setupWeightEditListeners(offcanvasElement, offcanvas, exerciseName) {
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
export function createCompleteWorkout(data, onConfirm) {
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
                    <h5 class="mb-2">${escapeHtml(workoutName)}</h5>
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
    
    return createOffcanvas('completeWorkoutOffcanvas', offcanvasHtml, (offcanvas) => {
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
export function createCompletionSummary(data) {
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
    
    return createOffcanvas('completionSummaryOffcanvas', offcanvasHtml);
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
export function createResumeSession(data, onResume, onStartFresh) {
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
                    <h5 class="mb-2">${escapeHtml(workoutName)}</h5>
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
    
    return createOffcanvas('resumeSessionOffcanvas', offcanvasHtml, (offcanvas) => {
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
   PLATE CALCULATOR SETTINGS
   ============================================ */

/**
 * Create plate calculator settings offcanvas
 * @param {Function} onSave - Callback when user saves settings
 * @returns {Object} Offcanvas instance
 */
export function createPlateSettings(onSave) {
    // Load current config from service
    const config = window.plateCalculatorService?.getConfig() || {
        barWeight: 45,
        unit: 'lbs',
        availablePlates: [45, 35, 25, 10, 5, 2.5],
        customPlates: []
    };
    
    const standardPlates = [45, 35, 25, 10, 5, 2.5];
    
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="plateSettingsOffcanvas" aria-labelledby="plateSettingsOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="plateSettingsOffcanvasLabel">
                    <i class="bx bx-cog me-2"></i>Plate Calculator Settings
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div class="mb-4">
                    <h6 class="mb-3">Bar Weight</h6>
                    <div class="d-flex gap-2">
                        <input type="number" class="form-control" id="barWeightInput" value="${config.barWeight}" min="0" step="5" style="flex: 1;">
                        <select class="form-select" id="unitSelect" style="width: 100px;">
                            <option value="lbs" ${config.unit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${config.unit === 'kg' ? 'selected' : ''}>kg</option>
                        </select>
                    </div>
                    <small class="text-muted">Standard barbell is 45 lbs / 20 kg</small>
                </div>
                
                <div class="mb-4">
                    <h6 class="mb-3">Available Plates</h6>
                    <p class="small text-muted mb-2">Select which plates are available at your gym</p>
                    <div class="d-flex flex-wrap gap-2" id="standardPlatesContainer">
                        ${standardPlates.map(weight => `
                            <label class="btn btn-sm ${config.availablePlates.includes(weight) ? 'btn-primary' : 'btn-outline-primary'}" style="cursor: pointer;">
                                <input type="checkbox" class="plate-checkbox" data-weight="${weight}"
                                       ${config.availablePlates.includes(weight) ? 'checked' : ''} style="display: none;">
                                ${weight}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-4">
                    <h6 class="mb-3">Custom Plates</h6>
                    <p class="small text-muted mb-2">Add non-standard plates (e.g., 15, 100)</p>
                    <div id="customPlatesContainer">
                        ${config.customPlates.map((weight, index) => `
                            <div class="d-flex gap-2 mb-2 custom-plate-row" data-index="${index}">
                                <input type="number" class="form-control custom-plate-input" value="${weight}" min="0" step="0.5" style="flex: 1;">
                                <button type="button" class="btn btn-sm btn-outline-danger remove-custom-plate" data-index="${index}">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="addCustomPlateBtn">
                        <i class="bx bx-plus me-1"></i>Add Custom Plate
                    </button>
                </div>
                
                <div class="alert alert-info d-flex align-items-start mb-4">
                    <i class="bx bx-info-circle me-2 mt-1"></i>
                    <div>
                        <strong>How it works</strong>
                        <p class="mb-0 small">The plate calculator will show you the optimal combination of plates needed to reach your target weight.</p>
                    </div>
                </div>
                
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary" id="resetToDefaultsBtn">
                        <i class="bx bx-refresh me-1"></i>Reset to Defaults
                    </button>
                    <button type="button" class="btn btn-primary flex-fill" id="savePlateSettingsBtn">
                        <i class="bx bx-check me-1"></i>Save Settings
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return createOffcanvas('plateSettingsOffcanvas', offcanvasHtml, (offcanvas) => {
        setupPlateSettingsListeners(offcanvas, onSave);
    });
}

/**
 * Setup plate settings event listeners
 */
function setupPlateSettingsListeners(offcanvas, onSave) {
    const saveBtn = document.getElementById('savePlateSettingsBtn');
    const resetBtn = document.getElementById('resetToDefaultsBtn');
    const addCustomBtn = document.getElementById('addCustomPlateBtn');
    const barWeightInput = document.getElementById('barWeightInput');
    const unitSelect = document.getElementById('unitSelect');
    const standardPlatesContainer = document.getElementById('standardPlatesContainer');
    const customPlatesContainer = document.getElementById('customPlatesContainer');
    
    // Toggle standard plate selection
    standardPlatesContainer.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.plate-checkbox');
        if (checkbox) {
            const label = checkbox.closest('label');
            if (checkbox.checked) {
                label.classList.remove('btn-outline-primary');
                label.classList.add('btn-primary');
            } else {
                label.classList.remove('btn-primary');
                label.classList.add('btn-outline-primary');
            }
        }
    });
    
    // Add custom plate
    addCustomBtn.addEventListener('click', () => {
        const index = customPlatesContainer.children.length;
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 mb-2 custom-plate-row';
        row.setAttribute('data-index', index);
        row.innerHTML = `
            <input type="number" class="form-control custom-plate-input" value="15" min="0" step="0.5" style="flex: 1;">
            <button type="button" class="btn btn-sm btn-outline-danger remove-custom-plate" data-index="${index}">
                <i class="bx bx-trash"></i>
            </button>
        `;
        customPlatesContainer.appendChild(row);
    });
    
    // Remove custom plate
    customPlatesContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-custom-plate');
        if (removeBtn) {
            const row = removeBtn.closest('.custom-plate-row');
            row.remove();
        }
    });
    
    // Reset to defaults
    resetBtn.addEventListener('click', () => {
        if (confirm('Reset all plate settings to defaults?')) {
            window.plateCalculatorService?.resetToDefaults();
            offcanvas.hide();
            
            // Re-open with default values
            setTimeout(() => {
                createPlateSettings(onSave);
            }, 300);
            
            if (window.showAlert) {
                window.showAlert('Settings reset to defaults', 'info');
            }
        }
    });
    
    // Save settings
    saveBtn.addEventListener('click', () => {
        const barWeight = parseFloat(barWeightInput.value) || 45;
        const unit = unitSelect.value;
        
        // Get selected standard plates
        const availablePlates = [];
        document.querySelectorAll('.plate-checkbox:checked').forEach(checkbox => {
            availablePlates.push(parseFloat(checkbox.getAttribute('data-weight')));
        });
        
        // Get custom plates
        const customPlates = [];
        document.querySelectorAll('.custom-plate-input').forEach(input => {
            const value = parseFloat(input.value);
            if (value > 0) {
                customPlates.push(value);
            }
        });
        
        // Save to service
        const newConfig = {
            barWeight,
            unit,
            availablePlates,
            customPlates
        };
        
        window.plateCalculatorService?.saveConfig(newConfig);
        
        // Call callback
        if (onSave) {
            onSave(newConfig);
        }
        
        offcanvas.hide();
        
        if (window.showAlert) {
            window.showAlert('Plate settings saved successfully', 'success');
        }
        
        // Re-render workout to update plate calculations
        if (window.workoutModeController) {
            window.workoutModeController.renderWorkout();
        }
    });
}

console.log('📦 Offcanvas workout components loaded');
