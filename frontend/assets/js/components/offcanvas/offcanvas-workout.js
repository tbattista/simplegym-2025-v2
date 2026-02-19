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
 * Notebook-style design: clean, calm, save-first hierarchy
 * @param {Object} data - Session and workout data
 * @param {boolean} data.isQuickLog - Whether this is a Quick Log session
 * @param {Function} onConfirm - Callback when user confirms completion (receives durationMinutes)
 * @returns {Object} Offcanvas instance
 */
export function createCompleteWorkout(data, onConfirm) {
    const { workoutName, minutes, totalExercises, isQuickLog = false } = data;

    // Format current date/time for display
    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    // Duration value: empty for Quick Log, actual minutes for timed workout
    const durationValue = isQuickLog ? '' : (minutes || '');
    const durationPlaceholder = isQuickLog ? '--' : '';

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="completeWorkoutOffcanvas" aria-labelledby="completeWorkoutOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="completeWorkoutOffcanvasLabel">
                    <i class="bx bx-check-circle me-2"></i>Session Complete
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <!-- Workout info - simple, left-aligned, notebook style -->
                <div class="session-complete-header mb-4">
                    <h5 class="mb-1">${escapeHtml(workoutName)}</h5>
                    <small class="text-muted">${formattedDateTime}</small>
                </div>

                <!-- Stats row - horizontal, neutral, inline editable duration -->
                <div class="session-stats-row mb-4">
                    <div class="session-stat editable" title="Click to edit duration">
                        <i class="bx bx-time-five"></i>
                        <input type="number"
                               id="sessionDurationInput"
                               value="${durationValue}"
                               placeholder="${durationPlaceholder}"
                               min="1"
                               max="600">
                        <span>min</span>
                        <i class="bx bx-pencil edit-hint"></i>
                    </div>
                    <div class="session-stat">
                        <i class="bx bx-list-check"></i>
                        <span class="stat-value">${totalExercises}</span>
                        <span>exercise${totalExercises !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                <!-- Primary action - Save Session (first and prominent) -->
                <button type="button" class="btn btn-primary w-100 mb-3" id="confirmCompleteBtn">
                    <i class="bx bx-save me-1"></i>Save Session
                </button>

                <!-- Secondary actions - subtle text links -->
                <div class="d-flex justify-content-center gap-4">
                    <button type="button" class="btn btn-link text-muted" data-bs-dismiss="offcanvas">
                        Resume
                    </button>
                    <button type="button" class="btn btn-link text-danger" id="cancelDiscardBtn">
                        Discard
                    </button>
                </div>

                <!-- Helper text - calm reassurance (replaces info banner) -->
                <small class="text-muted d-block text-center mt-3">
                    Session will be added to your training log.
                </small>
            </div>
        </div>
    `;

    return createOffcanvas('completeWorkoutOffcanvas', offcanvasHtml, (offcanvas) => {
        const confirmBtn = document.getElementById('confirmCompleteBtn');
        const cancelDiscardBtn = document.getElementById('cancelDiscardBtn');

        // Handle save session button
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            try {
                // Get the manual duration from input
                let durationMinutes = null;
                const durationInput = document.getElementById('sessionDurationInput');

                if (durationInput && durationInput.value) {
                    durationMinutes = parseInt(durationInput.value, 10);
                    if (isNaN(durationMinutes) || durationMinutes < 1) {
                        durationMinutes = null;
                    }
                }
                await onConfirm(durationMinutes);
                offcanvas.hide();
            } catch (error) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Session';
                throw error;
            }
        });

        // Handle discard button
        if (cancelDiscardBtn) {
            cancelDiscardBtn.addEventListener('click', () => {
                // Hide the complete workout offcanvas first
                offcanvas.hide();

                // Show confirmation offcanvas for discard
                setTimeout(() => {
                    if (window.UnifiedOffcanvasFactory?.createConfirmOffcanvas) {
                        window.UnifiedOffcanvasFactory.createConfirmOffcanvas({
                            id: 'cancelWorkoutConfirmOffcanvas',
                            title: 'Discard Session?',
                            icon: 'bx-error-circle',
                            iconColor: 'danger',
                            message: 'Are you sure you want to discard this session?',
                            subMessage: 'All progress will be permanently lost and cannot be recovered.',
                            confirmText: 'Yes, Discard',
                            confirmVariant: 'danger',
                            cancelText: 'Resume',
                            onConfirm: () => {
                                // Call the controller's reset method
                                if (window.workoutModeController?.resetToFreshState) {
                                    window.workoutModeController.resetToFreshState();
                                }
                            }
                        });
                    } else {
                        // Fallback: just call the reset directly with browser confirm
                        if (confirm('Are you sure you want to discard this session? All progress will be lost.')) {
                            if (window.workoutModeController?.resetToFreshState) {
                                window.workoutModeController.resetToFreshState();
                            }
                        }
                    }
                }, 300); // Small delay to let the first offcanvas hide
            });
        }
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
 * @param {Function} onCancel - Callback when user chooses to cancel workout (NEW)
 * @returns {Object} Offcanvas instance
 */
export function createResumeSession(data, onResume, onStartFresh, onCancel) {
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
                    <button type="button" class="btn btn-outline-danger" id="cancelWorkoutBtn">
                        <i class="bx bx-x me-1"></i>Cancel Workout
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return createOffcanvas('resumeSessionOffcanvas', offcanvasHtml, (offcanvas) => {
        const resumeBtn = document.getElementById('resumeSessionBtn');
        const startFreshBtn = document.getElementById('startFreshBtn');
        const cancelBtn = document.getElementById('cancelWorkoutBtn');
        
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
        
        // NEW: Cancel workout button handler
        if (cancelBtn && onCancel) {
            cancelBtn.addEventListener('click', () => {
                // Hide offcanvas first (will trigger cleanup via hidden.bs.offcanvas event)
                offcanvas.hide();
                // Call onCancel callback which will show confirmation modal
                onCancel();
            });
        }
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
        barUnit: 'lbs',
        availablePlates: {
            55: true,
            45: true,
            35: true,
            25: true,
            10: true,
            5: true,
            2.5: true
        },
        customPlates: []
    };
    
    const standardPlates = [55, 45, 35, 25, 10, 5, 2.5];
    
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
                            <option value="lbs" ${config.barUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${config.barUnit === 'kg' ? 'selected' : ''}>kg</option>
                        </select>
                    </div>
                    <small class="text-muted">Standard barbell is 45 lbs / 20 kg</small>
                </div>
                
                <div class="mb-4">
                    <h6 class="mb-3">Available Plates</h6>
                    <p class="small text-muted mb-2">Select which plates are available at your gym</p>
                    <div class="d-flex flex-wrap gap-2" id="standardPlatesContainer">
                        ${standardPlates.map(weight => {
                            const isEnabled = config.availablePlates[weight] === true;
                            return `
                                <label class="btn btn-sm ${isEnabled ? 'btn-primary' : 'btn-outline-primary'}" style="cursor: pointer;">
                                    <input type="checkbox" class="plate-checkbox" data-weight="${weight}"
                                           ${isEnabled ? 'checked' : ''} style="display: none;">
                                    ${weight}
                                </label>
                            `;
                        }).join('')}
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
        const label = e.target.closest('label');
        if (label) {
            const checkbox = label.querySelector('.plate-checkbox');
            if (checkbox) {
                // Toggle checkbox
                checkbox.checked = !checkbox.checked;
                
                // Update button styling
                if (checkbox.checked) {
                    label.classList.remove('btn-outline-primary');
                    label.classList.add('btn-primary');
                } else {
                    label.classList.remove('btn-primary');
                    label.classList.add('btn-outline-primary');
                }
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
        const barUnit = unitSelect.value;
        
        // Get selected standard plates as object
        const availablePlates = {};
        const standardPlates = [55, 45, 35, 25, 10, 5, 2.5];
        standardPlates.forEach(weight => {
            const checkbox = document.querySelector(`.plate-checkbox[data-weight="${weight}"]`);
            availablePlates[weight] = checkbox ? checkbox.checked : false;
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
            barUnit,
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

/* ============================================
   REORDER EXERCISES
   ============================================ */

/**
 * Create reorder exercises offcanvas with drag-and-drop functionality
 * Lazy-loads SortableJS library only when offcanvas opens
 * @param {Array} exercises - Array of exercise objects with at least { name, ... } properties
 * @param {Function} onSave - Callback function(reorderedExercises) when user saves new order
 * @returns {Object} Offcanvas instance
 */
export function createReorderOffcanvas(exercises, onSave) {
    // Validate inputs
    if (!Array.isArray(exercises)) {
        console.error('❌ createReorderOffcanvas requires exercises array');
        return null;
    }

    if (typeof onSave !== 'function') {
        console.error('❌ createReorderOffcanvas requires onSave callback function');
        return null;
    }

    const canReorder = exercises.length >= 2;
    const hasBlocks = exercises.some(ex => ex.blockId);

    // Build a single flat reorder-item row HTML
    const buildItemHtml = (item, globalIndex) => {
        const isNote = item.isNote === true;
        const displayName = item.displayName || item.name;
        const itemTypeAttr = isNote ? 'data-item-type="note"' : 'data-item-type="exercise"';
        const noteStyle = isNote ? 'border-left: 3px solid var(--workout-muted, #6c757d);' : '';
        const icon = isNote ? '<i class="bx bx-note-text me-1 text-muted"></i>' : '';
        const badgeClass = isNote ? 'bg-label-info' : (item.isBonus ? 'bg-label-primary' : 'bg-label-secondary');

        // Block data attributes for position-based inference
        const blockAttrs = item.blockId
            ? `data-block-id="${escapeHtml(item.blockId)}" data-block-name="${escapeHtml(item.blockName || 'Block')}"`
            : '';

        // Block name tag (visible on block members, hidden placeholder on standalone)
        const blockTag = !isNote && !item.isBonus
            ? (item.blockId
                ? `<span class="reorder-block-tag">${escapeHtml(item.blockName || 'Block')}</span>`
                : '<span class="reorder-block-tag" style="display:none;"></span>')
            : '';

        return `
            <div class="reorder-item" data-index="${globalIndex}" ${itemTypeAttr} ${blockAttrs}>
                <div class="d-flex align-items-center gap-3 p-3 border rounded mb-2 reorder-item-inner" style="cursor: ${canReorder ? 'move' : 'default'}; ${noteStyle}">
                    ${canReorder ? `
                    <div class="reorder-handle text-muted">
                        <i class="bx bx-menu" style="font-size: 1.5rem;"></i>
                    </div>
                    ` : ''}
                    <div class="flex-grow-1">
                        <div class="fw-medium">${icon}${escapeHtml(displayName)} ${blockTag}</div>
                        ${!isNote && (item.sets || item.reps) ? `
                            <small class="text-muted">
                                ${item.sets ? `${item.sets} sets` : ''}
                                ${item.sets && item.reps ? ' × ' : ''}
                                ${item.reps ? `${item.reps} reps` : ''}
                            </small>
                        ` : ''}
                        ${isNote ? '<small class="text-muted">Session note</small>' : ''}
                    </div>
                    <div class="badge reorder-badge ${badgeClass}">${globalIndex + 1}</div>
                </div>
            </div>
        `;
    };

    // Build flat list HTML — all items at same level, no nesting
    const buildListHtml = (items) => {
        return items.map((item, index) => buildItemHtml(item, index)).join('');
    };

    // Block styling for flat list with connected-card visual grouping
    const blockStyles = hasBlocks ? `
        <style>
            /* Block member — teal left border */
            .reorder-item.block-member .reorder-item-inner {
                border-left: 3px solid var(--workout-block, #2dd4bf);
            }
            /* First item in a consecutive block group */
            .reorder-item.block-first .reorder-item-inner {
                margin-bottom: 0;
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-bottom-color: rgba(45, 212, 191, 0.3);
            }
            /* Middle items */
            .reorder-item.block-middle .reorder-item-inner {
                margin-bottom: 0;
                border-radius: 0;
                border-bottom-color: rgba(45, 212, 191, 0.3);
            }
            /* Last item */
            .reorder-item.block-last .reorder-item-inner {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
            /* Single-item block — full rounded, just teal border */
            /* Item joining a block (position-inferred) */
            .reorder-item.block-joining .reorder-item-inner {
                border-left: 3px dashed var(--workout-block, #2dd4bf);
                background: rgba(45, 212, 191, 0.06);
            }
            /* Item leaving its block */
            .reorder-item.block-leaving .reorder-item-inner {
                border-left: 3px dashed var(--bs-danger, #dc3545);
                opacity: 0.75;
            }
            /* Block name tag inline with exercise name */
            .reorder-block-tag {
                font-size: 0.6rem;
                font-weight: 600;
                color: var(--workout-block, #2dd4bf);
                background: rgba(45, 212, 191, 0.1);
                padding: 1px 5px;
                border-radius: 3px;
                margin-left: 6px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                vertical-align: middle;
            }
            /* Ghost while dragging */
            .reorder-item.sortable-ghost .reorder-item-inner {
                opacity: 0.4;
                border-style: dashed;
            }
            /* Drop zone lines during drag */
            #reorderList.is-dragging .reorder-item {
                margin-bottom: 4px;
            }
            #reorderList.is-dragging .reorder-item::after {
                content: '';
                display: block;
                height: 3px;
                background: var(--bs-primary, #696cff);
                border-radius: 2px;
                margin: 2px 16px 0;
                opacity: 0.25;
            }
            #reorderList.is-dragging .reorder-item:last-child::after {
                display: none;
            }
            #reorderList.is-dragging .reorder-item.block-member::after {
                background: var(--workout-block, #2dd4bf);
                opacity: 0.4;
            }
        </style>
    ` : '';

    // Build body content based on exercise count
    let bodyContent;
    if (exercises.length === 0) {
        bodyContent = `
            <div class="text-center py-4">
                <i class="bx bx-list-ul" style="font-size: 4rem; color: var(--bs-secondary);"></i>
                <h6 class="mt-3">No exercises yet</h6>
                <p class="text-muted mb-0">Add some exercises to your workout, then come back to reorder them.</p>
            </div>
        `;
    } else if (exercises.length === 1) {
        bodyContent = `
            <div class="alert alert-info d-flex align-items-start mb-3">
                <i class="bx bx-info-circle me-2 mt-1"></i>
                <div>
                    <strong>Add more exercises</strong>
                    <p class="mb-0 small">You need at least 2 exercises to reorder them. Add another exercise and try again.</p>
                </div>
            </div>
            <div id="reorderList" class="mb-4">
                ${buildListHtml(exercises)}
            </div>
        `;
    } else {
        const helpText = hasBlocks
            ? 'Drag exercises to reorder. Drop between block members to join a block.'
            : 'Hold and drag exercises to change their order.';
        bodyContent = `
            ${blockStyles}
            <div class="alert alert-info d-flex align-items-start mb-3">
                <i class="bx bx-info-circle me-2 mt-1"></i>
                <div>
                    <strong>Drag to reorder</strong>
                    <p class="mb-0 small">${helpText} Changes are saved when you tap "Save Order".</p>
                </div>
            </div>
            <div id="reorderList" class="mb-4">
                ${buildListHtml(exercises)}
            </div>
            <div id="reorderLoadingIndicator" class="text-center mb-3" style="display: none;">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <small class="text-muted">Loading drag-and-drop...</small>
            </div>
        `;
    }

    const footerContent = canReorder ? `
        <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                <i class="bx bx-x me-1"></i>Cancel
            </button>
            <button type="button" class="btn btn-primary flex-fill" id="saveReorderBtn" disabled>
                <i class="bx bx-check me-1"></i>Save Order
            </button>
        </div>
    ` : `
        <button type="button" class="btn btn-secondary w-100" data-bs-dismiss="offcanvas">
            <i class="bx bx-x me-1"></i>Close
        </button>
    `;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1" id="reorderExercisesOffcanvas"
             aria-labelledby="reorderExercisesOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="reorderExercisesOffcanvasLabel">
                    <i class="bx bx-sort me-2"></i>Reorder Exercises
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                ${bodyContent}
                ${footerContent}
            </div>
        </div>
    `;

    let sortableLoaded = false;
    let sortableInstance = null;
    let draggedElement = null;

    return createOffcanvas('reorderExercisesOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        if (!canReorder) {
            console.log('ℹ️ Reorder offcanvas opened with < 2 exercises, skipping SortableJS');
            return;
        }

        const listElement = document.getElementById('reorderList');
        const saveBtn = document.getElementById('saveReorderBtn');
        const loadingIndicator = document.getElementById('reorderLoadingIndicator');

        if (!listElement || !saveBtn) {
            console.error('❌ Failed to find reorder list or save button');
            return;
        }

        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        // ── Block inference helpers ──

        // Get the block name for a given blockId by finding an original block member
        function getBlockName(blockId) {
            const items = listElement.querySelectorAll('.reorder-item');
            for (const item of items) {
                if (item.dataset.blockId === blockId && item.dataset.blockName) {
                    return item.dataset.blockName;
                }
            }
            return 'Block';
        }

        // Compute effective blockIds based on current DOM order.
        // Only the dragged item's blockId can change (position-based inference).
        // All other items keep their original blockId.
        function computeEffectiveBlockIds() {
            const items = Array.from(listElement.querySelectorAll('.reorder-item'));

            return items.map((item, i) => {
                const origBlockId = item.dataset.blockId || null;

                // Only the dragged item gets position-based inference
                if (item === draggedElement) {
                    const prevBlockId = i > 0 ? (items[i - 1].dataset.blockId || null) : null;
                    const nextBlockId = i < items.length - 1 ? (items[i + 1].dataset.blockId || null) : null;

                    // Between two items of same block → join that block
                    if (prevBlockId && prevBlockId === nextBlockId) return prevBlockId;
                    // Adjacent to own original block → stay in block (reorder within)
                    if (origBlockId && (prevBlockId === origBlockId || nextBlockId === origBlockId)) return origBlockId;
                    // Isolated → leave block / stay standalone
                    return null;
                }

                return origBlockId;
            });
        }

        // Update visual block grouping classes based on effective blockIds
        function updateVisualGrouping() {
            const items = Array.from(listElement.querySelectorAll('.reorder-item'));
            const effectiveBlockIds = computeEffectiveBlockIds();

            items.forEach((item, i) => {
                item.classList.remove('block-member', 'block-first', 'block-middle', 'block-last', 'block-single', 'block-joining', 'block-leaving');

                const blockId = effectiveBlockIds[i];
                const origBlockId = item.dataset.blockId || null;

                // Leaving indicator: was in block, now isolated
                if (origBlockId && !blockId) {
                    item.classList.add('block-leaving');
                    // Hide block tag
                    const tag = item.querySelector('.reorder-block-tag');
                    if (tag) tag.style.display = 'none';
                    return;
                }

                if (!blockId) {
                    // Standalone — ensure tag hidden
                    const tag = item.querySelector('.reorder-block-tag');
                    if (tag) tag.style.display = 'none';
                    return;
                }

                // Item is in a block (original or joining)
                const prevSame = i > 0 && effectiveBlockIds[i - 1] === blockId;
                const nextSame = i < items.length - 1 && effectiveBlockIds[i + 1] === blockId;

                item.classList.add('block-member');
                if (!origBlockId && blockId) item.classList.add('block-joining');

                if (prevSame && nextSame) item.classList.add('block-middle');
                else if (!prevSame && nextSame) item.classList.add('block-first');
                else if (prevSame && !nextSame) item.classList.add('block-last');
                else item.classList.add('block-single');

                // Update block tag text and visibility
                const tag = item.querySelector('.reorder-block-tag');
                if (tag) {
                    tag.textContent = getBlockName(blockId);
                    tag.style.display = '';
                }
            });
        }

        function updateAllBadges() {
            const allItems = listElement.querySelectorAll('.reorder-item');
            let counter = 1;
            allItems.forEach(item => {
                const badge = item.querySelector('.reorder-badge');
                if (badge && item.getAttribute('data-item-type') !== 'note') {
                    badge.textContent = counter;
                    counter++;
                }
            });
        }

        // ── SortableJS init ──

        loadSortableJS().then(() => {
            sortableLoaded = true;

            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }

            saveBtn.disabled = false;

            // Single flat SortableJS instance — no nesting issues
            sortableInstance = window.Sortable.create(listElement, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.reorder-handle',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                swapThreshold: 0.65,
                onStart: (evt) => {
                    draggedElement = evt.item;
                    listElement.classList.add('is-dragging');
                },
                onChange: () => {
                    if (hasBlocks) updateVisualGrouping();
                },
                onEnd: () => {
                    listElement.classList.remove('is-dragging');
                    if (hasBlocks) {
                        updateVisualGrouping();
                        // Persist inferred block IDs to data attributes so subsequent
                        // drags use the correct state (not stale original values)
                        const items = Array.from(listElement.querySelectorAll('.reorder-item'));
                        const effectiveBlockIds = computeEffectiveBlockIds();
                        items.forEach((item, i) => {
                            const newBlockId = effectiveBlockIds[i] || '';
                            item.dataset.blockId = newBlockId;
                            item.dataset.blockName = newBlockId ? getBlockName(newBlockId) : '';
                        });
                    }
                    draggedElement = null;
                    updateAllBadges();
                }
            });

            // Apply initial visual grouping for blocks
            if (hasBlocks) updateVisualGrouping();

            console.log('✅ SortableJS initialized (flat list' + (hasBlocks ? ' with block inference' : '') + ')');

        }).catch(error => {
            console.error('❌ Failed to load SortableJS:', error);

            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }

            if (listElement) {
                listElement.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bx bx-error-circle me-2"></i>
                        Failed to load drag-and-drop library. You can still reorder by closing and trying again.
                    </div>
                `;
            }

            saveBtn.disabled = true;
        });

        // ── Save handler ──
        // Reads flat DOM order + applies position-based block inference for dragged item

        saveBtn.addEventListener('click', () => {
            if (!sortableLoaded) {
                window.showAlert?.('Please wait, loading drag-and-drop...', 'info');
                return;
            }

            const items = Array.from(listElement.querySelectorAll('.reorder-item'));
            const effectiveBlockIds = computeEffectiveBlockIds();
            const reorderedExercises = [];

            items.forEach((item, i) => {
                const origIdx = parseInt(item.dataset.index);
                if (isNaN(origIdx) || !exercises[origIdx]) return;

                const blockId = effectiveBlockIds[i] || null;
                const blockName = blockId ? getBlockName(blockId) : null;

                reorderedExercises.push({
                    ...exercises[origIdx],
                    blockId: blockId,
                    blockName: blockName
                });
            });

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            try {
                onSave(reorderedExercises);
                offcanvas.hide();
            } catch (error) {
                console.error('❌ Error saving exercise order:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-check me-1"></i>Save Order';
                alert('Failed to save exercise order. Please try again.');
            }
        });

        // Cleanup when offcanvas closes
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            if (sortableInstance) {
                sortableInstance.destroy();
                sortableInstance = null;
            }
            draggedElement = null;
        }, { once: true });
    });
}

/* ============================================
   SECTIONS REORDER (Workout Builder - Mobile)
   Two-level SortableJS matching desktop drag-and-drop
   ============================================ */

/**
 * Create sections-aware reorder offcanvas with two-level drag-and-drop.
 * Mirrors the desktop builder's section drag behavior:
 * - Standard sections: drag by exercise handle → moves the whole section
 * - Named sections: drag by header handle → moves the whole section
 * - Exercises within named sections: drag by exercise handle → reorder within/between sections
 * - Exercises dragged out of named sections → become standalone standard sections
 *
 * @param {Array} sections - Array of { sectionId, sectionType, sectionName, exercises: [{ groupId, name, sets, reps }] }
 * @param {Function} onSave - Callback(reorderedSections) when user saves
 * @returns {Object} Offcanvas instance
 */
export function createSectionsReorderOffcanvas(sections, onSave) {
    if (!Array.isArray(sections) || typeof onSave !== 'function') return null;

    const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0);
    const canReorder = totalExercises >= 2 || sections.length >= 2;

    const buildItemHtml = (exercise) => `
        <div class="reorder-item" data-group-id="${escapeHtml(exercise.groupId)}">
            <div class="d-flex align-items-center gap-3 p-3 border rounded mb-1 reorder-item-inner" style="cursor: move;">
                ${canReorder ? `<div class="reorder-handle text-muted"><i class="bx bx-menu" style="font-size: 1.5rem;"></i></div>` : ''}
                <div class="flex-grow-1">
                    <div class="fw-medium">${escapeHtml(exercise.name)}</div>
                    ${exercise.sets || exercise.reps ? `<small class="text-muted">${exercise.sets ? `${exercise.sets} sets` : ''}${exercise.sets && exercise.reps ? ' × ' : ''}${exercise.reps ? `${exercise.reps} reps` : ''}</small>` : ''}
                </div>
                <div class="badge reorder-badge bg-label-secondary"></div>
            </div>
        </div>
    `;

    const buildSectionHtml = (section) => {
        const isNamed = section.sectionType !== 'standard';
        const exercisesHtml = section.exercises.map(ex => buildItemHtml(ex)).join('');

        const headerHtml = isNamed ? `
            <div class="reorder-section-header d-flex align-items-center gap-2 px-2 py-1 mb-1" style="cursor: grab;">
                <div class="reorder-section-drag text-muted">
                    <i class="bx bx-grid-vertical" style="font-size: 1.2rem;"></i>
                </div>
                <span style="font-size: 0.75rem; font-weight: 600; color: var(--workout-block, #2dd4bf);">${escapeHtml(section.sectionName || 'Block')}</span>
            </div>
        ` : '';

        return `
            <div class="reorder-section${isNamed ? ' section-named' : ''}"
                 data-section-id="${escapeHtml(section.sectionId)}"
                 data-section-type="${section.sectionType}"
                 data-section-name="${escapeHtml(section.sectionName || '')}">
                ${headerHtml}
                <div class="reorder-section-exercises">${exercisesHtml}</div>
            </div>
        `;
    };

    const sectionStyles = `
        <style>
            .reorder-section.section-named {
                border-left: 3px solid var(--workout-block, #2dd4bf);
                border-radius: 4px;
                margin-bottom: 8px;
                padding-bottom: 4px;
            }
            .reorder-section:not(.section-named) { margin-bottom: 4px; }
            .reorder-section.section-named .reorder-item-inner {
                border-left: none !important;
                border-top-left-radius: 0 !important;
                border-bottom-left-radius: 0 !important;
            }
            .reorder-section.section-named .reorder-section-exercises { padding-left: 4px; }
            .reorder-section-header { border-bottom: 1px solid rgba(45, 212, 191, 0.2); }
            .reorder-section.sortable-ghost { opacity: 0.4; }
            .reorder-section.sortable-ghost.section-named { border-style: dashed; }
        </style>
    `;

    let bodyContent;
    if (!canReorder) {
        bodyContent = `<div class="text-center py-4">
            <i class="bx bx-list-ul" style="font-size: 4rem; color: var(--bs-secondary);"></i>
            <h6 class="mt-3">Not enough items to reorder</h6>
            <p class="text-muted mb-0">Add more exercises to reorder them.</p>
        </div>`;
    } else {
        bodyContent = `
            ${sectionStyles}
            <div class="alert alert-info d-flex align-items-start mb-3">
                <i class="bx bx-info-circle me-2 mt-1"></i>
                <div>
                    <strong>Drag to reorder</strong>
                    <p class="mb-0 small">Drag exercises to reorder. Drag block headers to move entire blocks.</p>
                </div>
            </div>
            <div id="reorderSectionList" class="mb-4">
                ${sections.map(s => buildSectionHtml(s)).join('')}
            </div>
        `;
    }

    const footerContent = canReorder ? `
        <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                <i class="bx bx-x me-1"></i>Cancel
            </button>
            <button type="button" class="btn btn-primary flex-fill" id="saveSectionReorderBtn" disabled>
                <i class="bx bx-check me-1"></i>Save Order
            </button>
        </div>
    ` : `
        <button type="button" class="btn btn-secondary w-100" data-bs-dismiss="offcanvas">
            <i class="bx bx-x me-1"></i>Close
        </button>
    `;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1" id="reorderSectionsOffcanvas"
             aria-labelledby="reorderSectionsOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="reorderSectionsOffcanvasLabel">
                    <i class="bx bx-sort me-2"></i>Reorder Exercises
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                ${bodyContent}
                ${footerContent}
            </div>
        </div>
    `;

    return createOffcanvas('reorderSectionsOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        if (!canReorder) return;

        const listElement = document.getElementById('reorderSectionList');
        const saveBtn = document.getElementById('saveSectionReorderBtn');
        if (!listElement || !saveBtn) return;

        let sortableInstances = [];

        function updateAllBadges() {
            let counter = 1;
            listElement.querySelectorAll('.reorder-item').forEach(item => {
                const badge = item.querySelector('.reorder-badge');
                if (badge) badge.textContent = counter++;
            });
        }

        function cleanupEmptySection(sectionEl) {
            if (!sectionEl) return;
            if (sectionEl.querySelectorAll('.reorder-item').length === 0) {
                sectionEl.remove();
            }
        }

        function wrapInStandardSection(exerciseItem) {
            const sectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const wrapper = document.createElement('div');
            wrapper.className = 'reorder-section';
            wrapper.dataset.sectionId = sectionId;
            wrapper.dataset.sectionType = 'standard';
            wrapper.dataset.sectionName = '';

            const exercisesDiv = document.createElement('div');
            exercisesDiv.className = 'reorder-section-exercises';
            wrapper.appendChild(exercisesDiv);

            listElement.replaceChild(wrapper, exerciseItem);
            exercisesDiv.appendChild(exerciseItem);
        }

        loadSortableJS().then(() => {
            saveBtn.disabled = false;

            // Level 1: Section reorder
            // Standard sections: drag by exercise .reorder-handle (moves whole section)
            // Named sections: drag by header .reorder-section-drag (moves whole section)
            const sectionSortable = window.Sortable.create(listElement, {
                animation: 150,
                handle: '.reorder-section-drag, .reorder-section[data-section-type="standard"] .reorder-handle',
                draggable: '.reorder-section',
                ghostClass: 'sortable-ghost',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                group: { name: 'reorder-sections', put: ['reorder-exercises'] },
                onAdd: (evt) => {
                    // Exercise dropped between sections → wrap in new standard section
                    wrapInStandardSection(evt.item);
                    const fromSection = evt.from.closest('.reorder-section');
                    if (fromSection) cleanupEmptySection(fromSection);
                    updateAllBadges();
                },
                onEnd: () => { updateAllBadges(); }
            });
            sortableInstances.push(sectionSortable);

            // Level 2: Exercise reorder within named sections only
            // Exercises can move between named sections via shared group
            listElement.querySelectorAll('.reorder-section.section-named .reorder-section-exercises').forEach(el => {
                const inner = window.Sortable.create(el, {
                    animation: 150,
                    handle: '.reorder-handle',
                    group: 'reorder-exercises',
                    ghostClass: 'sortable-ghost',
                    forceFallback: true,
                    fallbackClass: 'sortable-fallback',
                    fallbackOnBody: true,
                    onAdd: (evt) => {
                        const fromSection = evt.from.closest('.reorder-section');
                        if (fromSection) cleanupEmptySection(fromSection);
                        updateAllBadges();
                    },
                    onEnd: () => { updateAllBadges(); }
                });
                sortableInstances.push(inner);
            });

            updateAllBadges();
            console.log('✅ Sections reorder SortableJS initialized (two-level)');

        }).catch(error => {
            console.error('❌ Failed to load SortableJS:', error);
            saveBtn.disabled = true;
        });

        // Save handler — collect section structure from DOM
        saveBtn.addEventListener('click', () => {
            const reorderedSections = [];
            listElement.querySelectorAll('.reorder-section').forEach(sectionEl => {
                const exerciseIds = [];
                sectionEl.querySelectorAll('.reorder-item').forEach(item => {
                    if (item.dataset.groupId) exerciseIds.push(item.dataset.groupId);
                });
                if (exerciseIds.length > 0) {
                    reorderedSections.push({
                        sectionId: sectionEl.dataset.sectionId,
                        sectionType: sectionEl.dataset.sectionType || 'standard',
                        sectionName: sectionEl.dataset.sectionName || null,
                        exerciseIds
                    });
                }
            });

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

            try {
                onSave(reorderedSections);
                offcanvas.hide();
            } catch (error) {
                console.error('❌ Error saving section order:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-check me-1"></i>Save Order';
            }
        });

        // Cleanup when offcanvas closes
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            sortableInstances.forEach(s => s.destroy());
            sortableInstances = [];
        }, { once: true });
    });
}

/**
 * Lazy-load SortableJS library from CDN
 * Only loads once, subsequent calls return immediately
 * @returns {Promise<void>}
 */
async function loadSortableJS() {
    // Check if already loaded
    if (window.Sortable) {
        return;
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.1/Sortable.min.js';
        script.onload = () => {
            console.log('✅ SortableJS library loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Failed to load SortableJS library');
            reject(new Error('Failed to load SortableJS'));
        };
        document.head.appendChild(script);
    });
}

/* ============================================
   NOTE POSITION PICKER
   Allows user to select where to insert a note
   ============================================ */

/**
 * Create note position picker offcanvas
 * Shows a list of current items (exercises + notes) with "Insert here" buttons
 * @param {Array} items - Array of { name, displayName, type: 'exercise'|'note' }
 * @param {Function} onPositionSelected - Callback(position) when user picks a position
 * @returns {Object} Offcanvas instance
 */
export function createNotePositionPicker(items, onPositionSelected) {
    // Build insert point list
    // Position 0 = before first item, Position n = after last item
    const insertPointsHtml = [];

    // Add "At the beginning" option
    insertPointsHtml.push(`
        <button class="position-picker-item btn btn-outline-primary w-100 mb-2"
                data-position="0">
            <i class="bx bx-plus-circle me-2"></i>
            At the beginning
        </button>
    `);

    // Add "After [item]" options for each item
    items.forEach((item, index) => {
        const displayName = item.displayName || item.name;
        const truncatedName = displayName.length > 30
            ? displayName.substring(0, 30) + '...'
            : displayName;
        const icon = item.type === 'note' ? 'bx-note-text' : 'bx-dumbbell';

        insertPointsHtml.push(`
            <button class="position-picker-item btn btn-outline-primary w-100 mb-2"
                    data-position="${index + 1}">
                <i class="bx bx-plus-circle me-2"></i>
                After <i class="bx ${icon} mx-1"></i> ${escapeHtml(truncatedName)}
            </button>
        `);
    });

    // Add "Quick add at end" as highlighted option
    if (items.length > 0) {
        // Replace last item with "At the end" styling
        insertPointsHtml[insertPointsHtml.length - 1] = `
            <button class="position-picker-item quick-add btn btn-outline-success w-100 mb-2"
                    data-position="${items.length}">
                <i class="bx bx-plus-circle me-2"></i>
                At the end (after all exercises)
            </button>
        `;
    }

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="notePositionOffcanvas"
             aria-labelledby="notePositionOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="notePositionOffcanvasLabel">
                    <i class="bx bx-note me-2"></i>Add Note
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <p class="text-muted mb-3">Choose where to insert your note:</p>
                <div class="position-picker-list">
                    ${insertPointsHtml.join('')}
                </div>
            </div>
        </div>
    `;

    return createOffcanvas('notePositionOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Add click handlers to position buttons
        element.querySelectorAll('.position-picker-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = parseInt(btn.dataset.position, 10);
                offcanvas.hide();
                // Call callback after offcanvas is hidden
                setTimeout(() => {
                    onPositionSelected(position);
                }, 150);
            });
        });
    });
}

console.log('📦 Offcanvas workout components loaded');
