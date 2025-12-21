/**
 * Ghost Gym - Form Offcanvas Components
 * Creates form-based offcanvas: filters, skip exercise, exercise group editor
 * 
 * @module offcanvas-forms
 * @version 3.0.0
 * @date 2025-12-20
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

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
export function createFilterOffcanvas(config) {
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
                    <i class="bx ${icon} me-2"></i>${escapeHtml(title)}
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
    
    return createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
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
   SKIP EXERCISE
   ============================================ */

/**
 * Create skip exercise offcanvas with optional reason
 * @param {Object} data - Exercise data
 * @param {string} data.exerciseName - Name of exercise to skip
 * @param {Function} onConfirm - Callback when user confirms skip
 * @returns {Object} Offcanvas instance
 */
export function createSkipExercise(data, onConfirm) {
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
                    <h5 class="mb-2">${escapeHtml(exerciseName)}</h5>
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
    
    return createOffcanvas('skipExerciseOffcanvas', offcanvasHtml, (offcanvas) => {
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
   EXERCISE GROUP EDITOR (for Workout Builder)
   Button-based exercise selection with search integration
   ============================================ */

/**
 * Create exercise group editor offcanvas with button-based exercise selection
 * Uses search offcanvas for exercise selection instead of autocomplete inputs
 * @param {Object} config - Configuration options
 * @param {string} config.groupId - Unique group identifier
 * @param {string} config.title - Offcanvas title (default: 'Edit Exercise Group')
 * @param {Object} config.exercises - Exercise data {a: 'name', b: 'name', c: 'name'}
 * @param {string} config.sets - Default sets value
 * @param {string} config.reps - Default reps value
 * @param {string} config.rest - Default rest value
 * @param {string} config.weight - Default weight value
 * @param {string} config.weightUnit - Weight unit (lbs/kg/other)
 * @param {boolean} config.isNew - Whether this is a new group
 * @param {string} config.mode - 'single' or 'group' - controls alternate exercises visibility
 * @param {Function} onSave - Callback when group is saved: (groupData) => void
 * @param {Function} onDelete - Callback when group is deleted: () => void
 * @param {Function} onSearchClick - Callback when search is requested: (slotKey, populateCallback) => void
 * @returns {Object} Offcanvas instance
 */
export function createExerciseGroupEditor(config, onSave, onDelete, onSearchClick) {
    const {
        groupId = `group-${Date.now()}`,
        title = 'Edit Exercise Group',
        exercises = { a: '', b: '', c: '' },
        sets = '3',
        reps = '8-12',
        rest = '60s',
        weight = '',
        weightUnit = 'lbs',
        isNew = false,
        mode = 'group'  // 'single' or 'group' - controls alternate exercises visibility
    } = config;
    
    // Example placeholders for "other" weight unit
    const otherWeightExamples = [
        'Body Weight plus 10lbs vest',
        'six 45lbs plates',
        'resistance band - heavy',
        'BW + 25lbs dumbbell',
        'cable stack position 7',
        'kettlebell 35lbs'
    ];
    
    // Track selected exercises in state
    const state = {
        exercises: { ...exercises },
        sets,
        reps,
        rest,
        weight,
        weightUnit,
        alternateCount: (exercises.b ? 1 : 0) + (exercises.c ? 1 : 0)
    };
    
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
             id="exerciseGroupEditorOffcanvas"
             aria-labelledby="exerciseGroupEditorLabel"
             data-bs-scroll="false">
            
            <!-- Header -->
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="exerciseGroupEditorLabel">
                    <i class="bx bx-dumbbell me-2"></i>
                    <span id="exerciseGroupEditorTitle">${escapeHtml(title)}</span>
                </h5>
                <button type="button" class="btn-close"
                        data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            
            <!-- Body - Scrollable -->
            <div class="offcanvas-body" id="exerciseGroupEditorBody">
                <!-- Primary Exercise Slot -->
                <div class="mb-3">
                    <label class="form-label">Primary Exercise *</label>
                    <div class="exercise-slot ${exercises.a ? 'filled' : ''}" id="primaryExerciseSlot" data-slot="a">
                        <div class="input-group" style="gap: 0.375rem;">
                            <input type="text" class="form-control exercise-slot-input"
                                   id="primaryExerciseInput"
                                   value="${escapeHtml(exercises.a || '')}"
                                   placeholder="Enter exercise name"
                                   autocomplete="off"
                                   style="padding-right: 0.75rem;">
                            <button type="button" class="btn btn-outline-secondary" id="searchPrimaryBtn" title="Search library">
                                <i class="bx bx-search"></i>
                            </button>
                            <button type="button" class="btn btn-outline-secondary" id="clearPrimaryBtn" title="Clear">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Alternate Exercises Container (hidden in single mode) -->
                <div id="alternateExercisesContainer" style="${mode === 'single' ? 'display: none;' : ''}">
                    ${exercises.b ? renderAlternateSlot('b', exercises.b) : ''}
                    ${exercises.c ? renderAlternateSlot('c', exercises.c) : ''}
                </div>
                
                <!-- Add Alternate Button (max 2, hidden in single mode) -->
                <div class="mb-3" id="addAltButtonContainer" style="${mode === 'single' || state.alternateCount >= 2 ? 'display: none;' : ''}">
                    <button type="button" class="btn btn-outline-secondary btn-sm w-100" id="addAlternateSlotBtn">
                        <i class="bx bx-plus me-1"></i>Add Alternate
                    </button>
                </div>
                
                <!-- Sets, Reps, Rest -->
                <div class="row g-2 mb-3">
                    <div class="col-4">
                        <label class="form-label">Sets</label>
                        <input type="text" class="form-control sets-input text-center"
                               id="editorSets" value="${escapeHtml(sets)}" placeholder="3">
                    </div>
                    <div class="col-4">
                        <label class="form-label">Reps</label>
                        <input type="text" class="form-control reps-input text-center"
                               id="editorReps" value="${escapeHtml(reps)}" placeholder="8-12">
                    </div>
                    <div class="col-4">
                        <label class="form-label">Rest</label>
                        <input type="text" class="form-control rest-input text-center"
                               id="editorRest" value="${escapeHtml(rest)}" placeholder="60s">
                    </div>
                </div>
                
                <!-- Weight -->
                <div class="mb-3">
                    <label class="form-label">
                        <i class="bx bx-dumbbell me-1"></i>Default Weight
                    </label>
                    <div class="weight-input-container ${weightUnit === 'other' ? 'diy-mode' : ''}">
                        <input type="text" class="form-control weight-input text-center"
                               id="editorWeight" value="${escapeHtml(weight)}"
                               placeholder="${weightUnit === 'other' ? otherWeightExamples[Math.floor(Math.random() * otherWeightExamples.length)] : (weightUnit === 'kg' ? '60' : '135')}">
                        <div class="btn-group w-100" role="group">
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'lbs' ? 'active' : ''}"
                                    data-unit="lbs">lbs</button>
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'kg' ? 'active' : ''}"
                                    data-unit="kg">kg</button>
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'other' ? 'active' : ''}"
                                    data-unit="other">DIY</button>
                        </div>
                    </div>
                    <div class="form-text">
                        <i class="bx bx-info-circle me-1"></i>
                        This weight auto-syncs from your workout history
                    </div>
                </div>
            </div>
            
            <!-- Footer - Action Buttons -->
            <div class="offcanvas-footer border-top p-3">
                <div class="d-flex gap-2 workout-builder-buttons">
                    <button type="button" class="btn btn-primary flex-fill" id="saveExerciseGroupEditorBtn">
                        <i class="bx bx-save me-1"></i>Save
                    </button>
                    <button type="button" class="btn btn-label-secondary flex-fill"
                            data-bs-dismiss="offcanvas">Cancel</button>
                    <button type="button" class="btn btn-outline-danger flex-fill" id="deleteExerciseGroupEditorBtn"
                            ${isNew || mode === 'single' ? 'style="display: none;"' : ''}>
                        <i class="bx bx-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return createOffcanvas('exerciseGroupEditorOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Get DOM elements
        const primaryExerciseInput = element.querySelector('#primaryExerciseInput');
        const searchPrimaryBtn = element.querySelector('#searchPrimaryBtn');
        const clearPrimaryBtn = element.querySelector('#clearPrimaryBtn');
        const primarySlot = element.querySelector('#primaryExerciseSlot');
        const alternateContainer = element.querySelector('#alternateExercisesContainer');
        const addAltBtn = element.querySelector('#addAlternateSlotBtn');
        const addAltContainer = element.querySelector('#addAltButtonContainer');
        const setsInput = element.querySelector('#editorSets');
        const repsInput = element.querySelector('#editorReps');
        const restInput = element.querySelector('#editorRest');
        const weightInput = element.querySelector('#editorWeight');
        const weightUnitBtns = element.querySelectorAll('.weight-unit-btn');
        const saveBtn = element.querySelector('#saveExerciseGroupEditorBtn');
        const deleteBtn = element.querySelector('#deleteExerciseGroupEditorBtn');
        
        // Populate exercise slot helper
        const populateSlot = (slotKey, exerciseName) => {
            state.exercises[slotKey] = exerciseName;
            
            if (slotKey === 'a') {
                primaryExerciseInput.value = exerciseName;
                clearPrimaryBtn.classList.remove('d-none');
                primarySlot.classList.add('filled');
            } else {
                const slotInput = element.querySelector(`#alternateExercise${slotKey.toUpperCase()}Input`);
                const slotClearBtn = element.querySelector(`#clearAlternate${slotKey.toUpperCase()}Btn`);
                const slotContainer = element.querySelector(`[data-slot="${slotKey}"]`);
                
                if (slotInput) slotInput.value = exerciseName;
                if (slotClearBtn) slotClearBtn.classList.remove('d-none');
                if (slotContainer) slotContainer.classList.add('filled');
            }
        };
        
        // Clear slot helper
        const clearSlot = (slotKey) => {
            state.exercises[slotKey] = '';
            
            if (slotKey === 'a') {
                primaryExerciseInput.value = '';
                clearPrimaryBtn.classList.add('d-none');
                primarySlot.classList.remove('filled');
            } else {
                // Find the container with data-alt-key attribute
                const containerElement = element.querySelector(`[data-alt-key="${slotKey}"]`);
                if (containerElement) {
                    containerElement.remove();
                    state.alternateCount--;
                    
                    // Show add button if we're below max
                    if (addAltContainer) {
                        addAltContainer.style.display = state.alternateCount >= 2 ? 'none' : '';
                    }
                }
            }
        };
        
        // Open search with initial query helper
        const openSearchWithQuery = (slotKey, initialQuery = '') => {
            onSearchClick(slotKey, (selectedExercise) => {
                populateSlot(slotKey, selectedExercise.name);
            }, initialQuery);
        };
        
        // Setup input handlers for a slot
        // NOTE: Auto-search behavior REMOVED - user must click search button to browse library
        // Text field is now for entering custom exercise names directly
        const setupSlotInputHandlers = (slotKey, inputElement, searchBtn, clearBtn) => {
            if (!inputElement) return;
            
            // On input: just store value, NO auto-search
            inputElement.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                state.exercises[slotKey] = value;
                
                // Show/hide clear button
                if (clearBtn) {
                    clearBtn.classList.toggle('d-none', !value);
                }
                // NO auto-search - user controls when to search via button
            });
            
            // Search button: open search with current value as initial query
            searchBtn?.addEventListener('click', () => {
                const value = inputElement.value.trim();
                openSearchWithQuery(slotKey, value);
            });
            
            // Clear button
            clearBtn?.addEventListener('click', () => {
                clearSlot(slotKey);
                inputElement.focus();
            });
        };
        
        // Add alternate slot helper
        const addAlternateSlot = () => {
            if (state.alternateCount >= 2) return;
            
            const slotKey = state.exercises.b === undefined || state.exercises.b === '' ? 'b' : 'c';
            if (slotKey === 'b' && state.exercises.b !== '' && state.exercises.b !== undefined) return;
            if (slotKey === 'c' && state.exercises.c !== '' && state.exercises.c !== undefined) return;
            
            const nextKey = !state.exercises.b ? 'b' : 'c';
            state.exercises[nextKey] = '';
            state.alternateCount++;
            
            const slotHtml = renderAlternateSlot(nextKey, '');
            alternateContainer.insertAdjacentHTML('beforeend', slotHtml);
            
            // Hide add button if at max
            if (state.alternateCount >= 2) {
                addAltContainer.style.display = 'none';
            }
            
            // Get new slot elements and attach handlers
            const keyUpper = nextKey.toUpperCase();
            const newInput = element.querySelector(`#alternateExercise${keyUpper}Input`);
            const newSearchBtn = element.querySelector(`#searchAlternate${keyUpper}Btn`);
            const newClearBtn = element.querySelector(`#clearAlternate${keyUpper}Btn`);
            
            setupSlotInputHandlers(nextKey, newInput, newSearchBtn, newClearBtn);
            
            // Focus the new input
            newInput?.focus();
        };
        
        // Setup primary exercise slot handlers
        setupSlotInputHandlers('a', primaryExerciseInput, searchPrimaryBtn, clearPrimaryBtn);
        
        // Add alternate button
        addAltBtn?.addEventListener('click', () => {
            addAlternateSlot();
        });
        
        // Attach handlers to existing alternate slots
        ['b', 'c'].forEach(key => {
            const keyUpper = key.toUpperCase();
            const slotInput = element.querySelector(`#alternateExercise${keyUpper}Input`);
            const searchBtn = element.querySelector(`#searchAlternate${keyUpper}Btn`);
            const clearBtn = element.querySelector(`#clearAlternate${keyUpper}Btn`);
            
            setupSlotInputHandlers(key, slotInput, searchBtn, clearBtn);
        });
        
        // Weight unit buttons with layout transition
        weightUnitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update button states
                weightUnitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.weightUnit = btn.dataset.unit;
                
                // Toggle DIY mode layout - query fresh each time to ensure element is found
                const weightContainer = element.querySelector('.weight-input-container');
                if (weightContainer) {
                    if (state.weightUnit === 'other') {
                        weightContainer.classList.add('diy-mode');
                    } else {
                        weightContainer.classList.remove('diy-mode');
                    }
                    console.log(`💡 Weight unit changed to ${state.weightUnit}, DIY mode: ${weightContainer.classList.contains('diy-mode')}`);
                } else {
                    console.warn('⚠️ Weight container not found!');
                }
                
                // Update placeholder based on selected unit
                if (weightInput) {
                    if (state.weightUnit === 'other') {
                        // Pick a random example from the array
                        const randomExample = otherWeightExamples[Math.floor(Math.random() * otherWeightExamples.length)];
                        weightInput.placeholder = randomExample;
                    } else if (state.weightUnit === 'lbs') {
                        weightInput.placeholder = '135';
                    } else if (state.weightUnit === 'kg') {
                        weightInput.placeholder = '60';
                    }
                }
            });
        });
        
        // Save button
        saveBtn?.addEventListener('click', async () => {
            // Validate
            if (!state.exercises.a) {
                alert('Primary exercise is required');
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
            
            try {
                // Clean up exercises - only include non-empty
                const cleanExercises = {};
                if (state.exercises.a) cleanExercises.a = state.exercises.a;
                if (state.exercises.b) cleanExercises.b = state.exercises.b;
                if (state.exercises.c) cleanExercises.c = state.exercises.c;
                
                // Auto-create custom exercises if needed (checks for existing before creating)
                if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                    const currentUser = window.dataManager.getCurrentUser();
                    const userId = currentUser?.uid || null;
                    for (const exerciseName of Object.values(cleanExercises)) {
                        if (exerciseName) {
                            await window.exerciseCacheService.autoCreateIfNeeded(exerciseName, userId);
                        }
                    }
                }
                
                const groupData = {
                    groupId,
                    exercises: cleanExercises,
                    sets: setsInput.value || '3',
                    reps: repsInput.value || '8-12',
                    rest: restInput.value || '60s',
                    default_weight: weightInput.value || '',
                    default_weight_unit: state.weightUnit
                };
                
                await onSave(groupData);
                offcanvas.hide();
                
            } catch (error) {
                console.error('❌ Error saving exercise group:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save';
            }
        });
        
        // Delete button
        deleteBtn?.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this exercise group?')) return;
            
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting...';
            
            try {
                await onDelete();
                offcanvas.hide();
            } catch (error) {
                console.error('❌ Error deleting exercise group:', error);
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="bx bx-trash me-1"></i>Delete';
            }
        });
    });
}

/**
 * Render alternate exercise slot HTML
 * @param {string} slotKey - 'b' or 'c'
 * @param {string} exerciseName - Current exercise name (empty for new slot)
 * @returns {string} HTML string
 */
export function renderAlternateSlot(slotKey, exerciseName) {
    const keyUpper = slotKey.toUpperCase();
    const filled = exerciseName ? 'filled' : '';
    
    return `
        <div class="mb-3 alternate-exercise-slot-container" data-alt-key="${slotKey}">
            <label class="form-label">Alternate Exercise</label>
            <div class="exercise-slot ${filled}" data-slot="${slotKey}">
                <div class="input-group" style="gap: 0.375rem;">
                    <input type="text" class="form-control exercise-slot-input"
                           id="alternateExercise${keyUpper}Input"
                           value="${escapeHtml(exerciseName || '')}"
                           placeholder="Enter exercise name"
                           autocomplete="off"
                           style="padding-right: 0.75rem;">
                    <button type="button" class="btn btn-outline-secondary" id="searchAlternate${keyUpper}Btn" title="Search library">
                        <i class="bx bx-search"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" id="clearAlternate${keyUpper}Btn" title="Clear">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

console.log('📦 Offcanvas form components loaded');
