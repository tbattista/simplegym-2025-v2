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
   GENERIC CONFIRM OFFCANVAS
   ============================================ */

/**
 * Create a generic confirmation offcanvas
 * @param {Object} config - Configuration options
 * @param {string} config.id - Unique offcanvas ID (default: 'confirmOffcanvas')
 * @param {string} config.title - Header title
 * @param {string} config.icon - Boxicon class (default: 'bx-question-mark')
 * @param {string} config.iconColor - Bootstrap color class (default: 'warning')
 * @param {string} config.message - Main message text
 * @param {string} config.subMessage - Optional sub-message text
 * @param {string} config.confirmText - Confirm button text (default: 'Confirm')
 * @param {string} config.confirmVariant - Bootstrap button variant (default: 'primary')
 * @param {string} config.cancelText - Cancel button text (default: 'Cancel')
 * @param {Function} config.onConfirm - Callback when confirmed
 * @param {Function} config.onCancel - Optional callback when cancelled
 * @returns {Object} Offcanvas instance
 */
export function createConfirmOffcanvas(config) {
    const {
        id = 'confirmOffcanvas',
        title = 'Confirm',
        icon = 'bx-question-mark',
        iconColor = 'warning',
        message = 'Are you sure?',
        subMessage = '',
        confirmText = 'Confirm',
        confirmVariant = 'primary',
        cancelText = 'Cancel',
        onConfirm,
        onCancel
    } = config;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
             id="${id}" aria-labelledby="${id}Label" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    <i class="bx ${icon} me-2 text-${iconColor}"></i>${escapeHtml(title)}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div class="text-center mb-4">
                    <div class="mb-3">
                        <i class="bx ${icon}" style="font-size: 3rem; color: var(--bs-${iconColor});"></i>
                    </div>
                    <h5 class="mb-2">${escapeHtml(message)}</h5>
                    ${subMessage ? `<p class="text-muted mb-0">${escapeHtml(subMessage)}</p>` : ''}
                </div>

                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas" id="${id}CancelBtn">
                        <i class="bx bx-x me-1"></i>${escapeHtml(cancelText)}
                    </button>
                    <button type="button" class="btn btn-${confirmVariant} flex-fill" id="${id}ConfirmBtn">
                        <i class="bx bx-check me-1"></i>${escapeHtml(confirmText)}
                    </button>
                </div>
            </div>
        </div>
    `;

    return createOffcanvas(id, offcanvasHtml, (offcanvas) => {
        const confirmBtn = document.getElementById(`${id}ConfirmBtn`);
        const cancelBtn = document.getElementById(`${id}CancelBtn`);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                offcanvas.hide();
                if (onConfirm) {
                    onConfirm();
                }
            });
        }

        if (cancelBtn && onCancel) {
            cancelBtn.addEventListener('click', () => {
                onCancel();
            });
        }
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
   PROTOCOL PARSER (shared by both editors)
   ============================================ */

/**
 * Parse protocol string into sets and reps for backward compatibility
 * @param {string} protocol - e.g., "3×10", "AMRAP", "3 sets to failure"
 * @returns {{sets: string, reps: string}}
 */
function parseProtocol(protocol) {
    const xPattern = /(\d+)\s*[x×]\s*(.+)/i;
    const setsPattern = /(\d+)\s*set/i;
    const xMatch = protocol.match(xPattern);
    if (xMatch) return { sets: xMatch[1], reps: xMatch[2] };
    const setsMatch = protocol.match(setsPattern);
    if (setsMatch) return { sets: setsMatch[1], reps: 'varies' };
    return { sets: '1', reps: protocol };
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
    
    // Combine sets+reps into protocol for display
    const protocol = sets && reps ? `${sets}×${reps}` : (sets || reps || '3×10');

    // Track selected exercises in state
    const state = {
        exercises: { ...exercises },
        protocol,
        rest,
        weight,
        weightUnit,
        alternateCount: (exercises.b ? 1 : 0) + (exercises.c ? 1 : 0)
    };
    
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1"
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
                
                <!-- Protocol, Rest -->
                <div class="row g-2 mb-3">
                    <div class="col-7">
                        <label class="form-label"><i class="bx bx-list-ol me-1"></i>Protocol</label>
                        <input type="text" class="form-control text-center"
                               id="editorProtocol" value="${escapeHtml(protocol)}"
                               placeholder="e.g., 3×10, AMRAP, 3 sets to failure">
                        <small class="text-muted">Sets and reps in any format</small>
                    </div>
                    <div class="col-5">
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
                        <div class="diy-hint text-muted small mt-2" style="display: ${weightUnit === 'other' ? 'block' : 'none'};">
                            <i class="bx bx-info-circle me-1"></i>
                            e.g., "Body weight", "20lb Medball", "Cable #7"
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
        const protocolInput = element.querySelector('#editorProtocol');
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

                    // Show/hide DIY hint
                    const diyHint = weightContainer.querySelector('.diy-hint');
                    if (diyHint) {
                        diyHint.style.display = state.weightUnit === 'other' ? 'block' : 'none';
                    }
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
                
                const protocolValue = protocolInput.value.trim() || '3×10';
                const { sets: parsedSets, reps: parsedReps } = parseProtocol(protocolValue);

                const groupData = {
                    groupId,
                    exercises: cleanExercises,
                    sets: parsedSets,
                    reps: parsedReps,
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

/* ============================================
   EXERCISE DETAILS EDITOR (for Workout Mode)
   ============================================ */

/**
 * Create exercise details editor offcanvas
 * For editing sets, reps, rest, and weight during a workout
 * @param {Object} data - Current exercise data
 * @param {string} data.exerciseName - Exercise name
 * @param {string} data.sets - Current sets
 * @param {string} data.reps - Current reps
 * @param {string} data.rest - Current rest
 * @param {string} data.weight - Current weight
 * @param {string} data.weightUnit - Current weight unit
 * @param {Function} onSave - Callback when user saves changes
 * @returns {Object} Offcanvas instance
 */
export function createExerciseDetailsEditor(data, onSave) {
    const { exerciseName, sets, reps, rest, weight, weightUnit, updateTemplateDefault = false } = data;
    
    // Combine sets and reps into protocol format
    const protocol = sets && reps ? `${sets}×${reps}` : (sets || reps || '3×10');
    
    // Example placeholders for DIY mode
    const diyPlaceholders = [
        'body weight + 10lbs',
        'six 45lbs plates',
        'resistance band - heavy',
        'BW + 25lbs dumbbell',
        'cable stack position 7',
        'kettlebell 35lbs'
    ];
    const randomDiyPlaceholder = diyPlaceholders[Math.floor(Math.random() * diyPlaceholders.length)];
    
    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1"
             id="exerciseDetailsEditorOffcanvas" aria-labelledby="exerciseDetailsEditorLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="exerciseDetailsEditorLabel">
                    <i class="bx bx-edit me-2"></i>Edit Exercise
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <h6 class="mb-4">${escapeHtml(exerciseName)}</h6>
                
                <!-- Protocol Section (Sets × Reps) -->
                <div class="mb-3">
                    <label class="form-label"><i class="bx bx-list-ol me-1"></i>Protocol</label>
                    <input type="text" class="form-control" id="editProtocolInput"
                           value="${escapeHtml(protocol)}"
                           placeholder="e.g., 3×10, AMRAP, 3 sets to failure">
                    <small class="text-muted">Enter sets and reps in any format</small>
                </div>
                
                <!-- Weight Section -->
                <div class="mb-3">
                    <label class="form-label"><i class="bx bx-dumbbell me-1"></i>Weight</label>
                    <div class="weight-input-container ${weightUnit === 'other' ? 'diy-mode' : ''}" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <input type="text" class="form-control weight-input text-center"
                               id="editWeightInput" value="${escapeHtml(weight)}"
                               placeholder="${weightUnit === 'other' ? randomDiyPlaceholder : (weightUnit === 'kg' ? '60' : '135')}"
                               style="width: 100%;">
                        <div class="btn-group w-100" role="group">
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'lbs' ? 'active' : ''}"
                                    data-unit="lbs">lbs</button>
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'kg' ? 'active' : ''}"
                                    data-unit="kg">kg</button>
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'other' ? 'active' : ''}"
                                    data-unit="other">DIY</button>
                        </div>
                        <div class="diy-hint text-muted small mt-2" style="display: ${weightUnit === 'other' ? 'block' : 'none'};">
                            <i class="bx bx-info-circle me-1"></i>
                            e.g., "Body weight", "20lb Medball", "Cable #7"
                        </div>
                    </div>
                </div>

                <!-- Rest Time Section -->
                <div class="mb-3">
                    <label class="form-label"><i class="bx bx-timer me-1"></i>Rest Time</label>
                    <input type="text" class="form-control" id="editRestInput"
                           value="${escapeHtml(rest)}" placeholder="60s">
                    <small class="text-muted">e.g., 60s, 2min, 90s</small>
                </div>
                
                <!-- Update Template Toggle -->
                <div class="more-menu-item toggle-item" id="updateTemplateItem">
                    <i class="bx bx-sync"></i>
                    <div class="more-menu-item-content">
                        <div class="more-menu-item-title">Update Workout Template</div>
                        <small class="more-menu-item-description">Save as new defaults for future workouts</small>
                    </div>
                    <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="updateTemplateToggle"
                               ${updateTemplateDefault ? 'checked' : ''}
                               style="cursor: pointer;">
                    </div>
                </div>
                
                <div class="alert alert-info mb-4" id="updateInfoAlert">
                    <i class="bx bx-info-circle me-2"></i>
                    <small id="updateInfoText">${updateTemplateDefault
                        ? 'Changes will update your workout template AND session history.'
                        : 'Changes will be saved to your workout session history.'}</small>
                </div>
                
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary flex-fill" id="saveExerciseDetailsBtn">
                        <i class="bx bx-save me-1"></i>Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return createOffcanvas('exerciseDetailsEditorOffcanvas', offcanvasHtml, (offcanvas, offcanvasElement) => {
        const saveBtn = offcanvasElement.querySelector('#saveExerciseDetailsBtn');
        const protocolInput = offcanvasElement.querySelector('#editProtocolInput');
        const restInput = offcanvasElement.querySelector('#editRestInput');
        const weightInput = offcanvasElement.querySelector('#editWeightInput');
        const weightUnitBtns = offcanvasElement.querySelectorAll('.weight-unit-btn');
        const updateTemplateToggle = offcanvasElement.querySelector('#updateTemplateToggle');
        const updateInfoText = offcanvasElement.querySelector('#updateInfoText');
        const updateInfoAlert = offcanvasElement.querySelector('#updateInfoAlert');
        const weightContainer = offcanvasElement.querySelector('.weight-input-container');
        
        // Track current weight unit
        let currentWeightUnit = weightUnit;
        
        // Weight unit button handlers
        weightUnitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update button states
                weightUnitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentWeightUnit = btn.dataset.unit;

                // Toggle DIY mode layout
                if (weightContainer) {
                    if (currentWeightUnit === 'other') {
                        weightContainer.classList.add('diy-mode');
                        weightInput.placeholder = randomDiyPlaceholder;
                    } else {
                        weightContainer.classList.remove('diy-mode');
                        weightInput.placeholder = currentWeightUnit === 'kg' ? '60' : '135';
                    }

                    // Show/hide DIY hint
                    const diyHint = weightContainer.querySelector('.diy-hint');
                    if (diyHint) {
                        diyHint.style.display = currentWeightUnit === 'other' ? 'block' : 'none';
                    }
                }
            });
        });
        
        // Dynamic info text based on toggle state
        const updateInfoMessage = () => {
            if (updateInfoText && updateInfoAlert) {
                if (updateTemplateToggle?.checked) {
                    updateInfoText.textContent = 'Changes will update your workout template AND session history.';
                    updateInfoAlert.classList.remove('alert-info');
                    updateInfoAlert.classList.add('alert-success');
                } else {
                    updateInfoText.textContent = 'Changes will be saved to your workout session history.';
                    updateInfoAlert.classList.remove('alert-success');
                    updateInfoAlert.classList.add('alert-info');
                }
            }
        };
        
        // Listen for toggle changes
        if (updateTemplateToggle) {
            updateTemplateToggle.addEventListener('change', updateInfoMessage);
        }
        
        // parseProtocol is now a module-level function (shared with createExerciseGroupEditor)

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                // Validate rest time input
                const restValue = restInput.value.trim();
                if (restValue) {
                    const restValidation = window.WorkoutUtils?.validateRestTime(restValue);
                    if (restValidation && !restValidation.valid) {
                        // Show validation error
                        restInput.classList.add('is-invalid');
                        
                        // Add error message if not already present
                        let errorDiv = restInput.parentElement.querySelector('.invalid-feedback');
                        if (!errorDiv) {
                            errorDiv = document.createElement('div');
                            errorDiv.className = 'invalid-feedback';
                            restInput.parentElement.appendChild(errorDiv);
                        }
                        errorDiv.textContent = restValidation.error;
                        
                        // Show alert with the error
                        if (window.showAlert) {
                            window.showAlert(restValidation.error, 'warning');
                        }
                        return;
                    }
                    
                    // Remove invalid state if validation passes
                    restInput.classList.remove('is-invalid');
                }
                
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
                
                try {
                    // Parse protocol input
                    const protocolValue = protocolInput.value.trim() || '3×10';
                    const { sets, reps } = parseProtocol(protocolValue);
                    
                    // Use validated rest time if available, otherwise use input or default
                    const restValidation = window.WorkoutUtils?.validateRestTime(restInput.value.trim());
                    const validatedRest = restValidation?.valid ? restValidation.value : (restInput.value.trim() || '60s');
                    
                    const updatedData = {
                        protocol: protocolValue,  // NEW: Store raw protocol string
                        sets: sets,               // Extracted for backward compatibility
                        reps: reps,               // Extracted for backward compatibility
                        rest: validatedRest,
                        weight: weightInput.value.trim(),
                        weightUnit: currentWeightUnit,
                        updateTemplate: updateTemplateToggle?.checked || false
                    };
                    
                    await onSave(updatedData);
                    offcanvas.hide();
                } catch (error) {
                    console.error('❌ Error saving exercise details:', error);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Changes';
                    alert('Failed to save changes. Please try again.');
                }
            });
        }
        
        // Add real-time validation feedback for rest input
        if (restInput) {
            restInput.addEventListener('blur', () => {
                const value = restInput.value.trim();
                if (value) {
                    const validation = window.WorkoutUtils?.validateRestTime(value);
                    if (validation && !validation.valid) {
                        restInput.classList.add('is-invalid');
                        
                        let errorDiv = restInput.parentElement.querySelector('.invalid-feedback');
                        if (!errorDiv) {
                            errorDiv = document.createElement('div');
                            errorDiv.className = 'invalid-feedback';
                            restInput.parentElement.appendChild(errorDiv);
                        }
                        errorDiv.textContent = validation.error;
                    } else {
                        restInput.classList.remove('is-invalid');
                        // Optionally update the input to show the normalized value
                        if (validation?.valid && validation.value !== value) {
                            restInput.value = validation.value;
                        }
                    }
                } else {
                    restInput.classList.remove('is-invalid');
                }
            });
        }
    });
}

/* ============================================
   BLOCK EDITOR (for Workout Builder)
   Groups 2-5 exercises performed together in sequence
   ============================================ */

/**
 * Create block editor offcanvas for editing exercise blocks
 * A block groups 2-5 exercises together with a user-defined name
 * @param {Object} config - Configuration options
 * @param {string} config.groupId - Unique group identifier
 * @param {Object} config.exercises - Exercise data {a: 'name', b: 'name', ...} (up to e)
 * @param {string} config.group_name - Block name (optional, defaults to "Block N")
 * @param {string} config.sets - Default sets value
 * @param {string} config.reps - Default reps value
 * @param {string} config.rest - Default rest value
 * @param {string} config.weight - Default weight value
 * @param {string} config.weightUnit - Weight unit (lbs/kg/other)
 * @param {boolean} config.isNew - Whether this is a new block
 * @param {Function} onSave - Callback when block is saved: (blockData) => void
 * @param {Function} onDelete - Callback when block is deleted: () => void
 * @param {Function} onSearchClick - Callback when search is requested: (slotKey, populateCallback, initialQuery) => void
 * @returns {Object} Offcanvas instance
 */
export function createBlockEditor(config, onSave, onDelete, onSearchClick) {
    const {
        groupId = `group-${Date.now()}`,
        exercises = { a: '', b: '' },
        group_name = '',
        sets = '3',
        reps = '10',
        rest = '60s',
        weight = '',
        weightUnit = 'lbs',
        isNew = false
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

    // Combine sets+reps into protocol for display
    const protocol = sets && reps ? `${sets}×${reps}` : (sets || reps || '3×10');

    // Slot letters (a through z, no practical limit)
    const SLOT_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const MIN_SLOTS = 2;
    const MAX_SLOTS = 26;

    // Determine initial slot count (at least MIN_SLOTS, based on existing exercises)
    const existingSlotCount = SLOT_LETTERS.filter(k => exercises[k]).length;
    const initialSlotCount = Math.max(MIN_SLOTS, existingSlotCount);

    // Track state
    const state = {
        exercises: { ...exercises },
        slotCount: initialSlotCount,
        protocol,
        rest,
        weight,
        weightUnit,
        group_name
    };

    // Render a single exercise slot
    const renderBlockExerciseSlot = (letter, index, exerciseName, canRemove) => {
        return `
            <div class="exercise-slot mb-2 d-flex gap-2 align-items-center" data-slot="${letter}">
                <span class="block-exercise-number fw-bold" style="color: var(--workout-block, #2dd4bf); min-width: 20px;">${index + 1}.</span>
                <input type="text" class="form-control form-control-sm block-exercise-input"
                       id="blockExercise_${letter}"
                       placeholder="Exercise name"
                       value="${escapeHtml(exerciseName || '')}"
                       autocomplete="off">
                <button type="button" class="btn btn-sm btn-outline-secondary exercise-search-btn"
                        data-slot="${letter}" title="Search exercises">
                    <i class="bx bx-search"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger remove-block-exercise-btn"
                        data-slot="${letter}" title="Remove"
                        style="${canRemove ? '' : 'display: none;'}">
                    <i class="bx bx-x"></i>
                </button>
            </div>
        `;
    };

    // Build initial exercise slots HTML
    let exerciseSlotsHtml = '';
    for (let i = 0; i < initialSlotCount; i++) {
        const letter = SLOT_LETTERS[i];
        const canRemove = initialSlotCount > MIN_SLOTS;
        exerciseSlotsHtml += renderBlockExerciseSlot(letter, i, exercises[letter] || '', canRemove);
    }

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1"
             id="blockEditorOffcanvas"
             aria-labelledby="blockEditorLabel"
             data-bs-scroll="false">

            <!-- Header -->
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="blockEditorLabel">
                    <i class="bx bx-collection me-2"></i>Edit Exercise Block
                </h5>
                <button type="button" class="btn-close"
                        data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>

            <!-- Body - Scrollable -->
            <div class="offcanvas-body" id="blockEditorBody">
                <!-- Block Name -->
                <div class="mb-3">
                    <label class="form-label">Block Name</label>
                    <input type="text" class="form-control" id="blockNameInput"
                           placeholder="e.g., Superset A, Chest Circuit, Warmup Block"
                           value="${escapeHtml(group_name || '')}">
                    <div class="form-text">Optional - defaults to "Block 1", "Block 2", etc.</div>
                </div>

                <!-- Exercise Inputs -->
                <div class="mb-3">
                    <label class="form-label">Exercises (performed in order)</label>
                    <div id="blockExerciseSlots">
                        ${exerciseSlotsHtml}
                    </div>
                    <!-- Add exercise button -->
                    <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="addBlockExerciseBtn"
                            ${initialSlotCount >= MAX_SLOTS ? 'style="display: none;"' : ''}>
                        <i class="bx bx-plus me-1"></i>Add Exercise
                    </button>
                </div>

                <!-- Protocol, Rest -->
                <div class="row g-2 mb-3">
                    <div class="col-7">
                        <label class="form-label"><i class="bx bx-list-ol me-1"></i>Protocol</label>
                        <input type="text" class="form-control text-center"
                               id="blockEditorProtocol" value="${escapeHtml(protocol)}"
                               placeholder="e.g., 3×10, AMRAP, 3 sets to failure">
                        <small class="text-muted">Sets and reps in any format</small>
                    </div>
                    <div class="col-5">
                        <label class="form-label">Rest</label>
                        <input type="text" class="form-control rest-input text-center"
                               id="blockEditorRest" value="${escapeHtml(rest)}" placeholder="60s">
                    </div>
                </div>

                <!-- Weight -->
                <div class="mb-3">
                    <label class="form-label">
                        <i class="bx bx-dumbbell me-1"></i>Default Weight
                    </label>
                    <div class="weight-input-container ${weightUnit === 'other' ? 'diy-mode' : ''}">
                        <input type="text" class="form-control weight-input text-center"
                               id="blockEditorWeight" value="${escapeHtml(weight)}"
                               placeholder="${weightUnit === 'other' ? otherWeightExamples[Math.floor(Math.random() * otherWeightExamples.length)] : (weightUnit === 'kg' ? '60' : '135')}">
                        <div class="btn-group w-100" role="group">
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'lbs' ? 'active' : ''}"
                                    data-unit="lbs">lbs</button>
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'kg' ? 'active' : ''}"
                                    data-unit="kg">kg</button>
                            <button type="button" class="btn btn-outline-secondary weight-unit-btn ${weightUnit === 'other' ? 'active' : ''}"
                                    data-unit="other">DIY</button>
                        </div>
                        <div class="diy-hint text-muted small mt-2" style="display: ${weightUnit === 'other' ? 'block' : 'none'};">
                            <i class="bx bx-info-circle me-1"></i>
                            e.g., "Body weight", "20lb Medball", "Cable #7"
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
                    <button type="button" class="btn btn-primary flex-fill" id="saveBlockEditorBtn">
                        <i class="bx bx-save me-1"></i>Save
                    </button>
                    <button type="button" class="btn btn-label-secondary flex-fill"
                            data-bs-dismiss="offcanvas">Cancel</button>
                    <button type="button" class="btn btn-outline-danger flex-fill" id="deleteBlockEditorBtn"
                            ${isNew ? 'style="display: none;"' : ''}>
                        <i class="bx bx-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    return createOffcanvas('blockEditorOffcanvas', offcanvasHtml, (offcanvas, element) => {
        // Get DOM elements
        const blockNameInput = element.querySelector('#blockNameInput');
        const slotsContainer = element.querySelector('#blockExerciseSlots');
        const addExerciseBtn = element.querySelector('#addBlockExerciseBtn');
        const protocolInput = element.querySelector('#blockEditorProtocol');
        const restInput = element.querySelector('#blockEditorRest');
        const weightInput = element.querySelector('#blockEditorWeight');
        const weightUnitBtns = element.querySelectorAll('.weight-unit-btn');
        const saveBtn = element.querySelector('#saveBlockEditorBtn');
        const deleteBtn = element.querySelector('#deleteBlockEditorBtn');

        // --- Helper: update exercise numbers after add/remove ---
        const updateBlockExerciseNumbers = () => {
            const slots = slotsContainer.querySelectorAll('.exercise-slot');
            slots.forEach((slot, idx) => {
                const numberEl = slot.querySelector('.block-exercise-number');
                if (numberEl) numberEl.textContent = `${idx + 1}.`;
            });

            // Update remove button visibility (hide if at minimum)
            const canRemove = slots.length > MIN_SLOTS;
            slots.forEach(slot => {
                const removeBtn = slot.querySelector('.remove-block-exercise-btn');
                if (removeBtn) removeBtn.style.display = canRemove ? '' : 'none';
            });

            // Update add button visibility
            if (addExerciseBtn) {
                addExerciseBtn.style.display = slots.length >= MAX_SLOTS ? 'none' : '';
            }

            // Recalculate state.slotCount
            state.slotCount = slots.length;
        };

        // --- Helper: get next available slot letter ---
        const getNextSlotLetter = () => {
            const usedLetters = new Set();
            slotsContainer.querySelectorAll('.exercise-slot').forEach(slot => {
                usedLetters.add(slot.getAttribute('data-slot'));
            });
            return SLOT_LETTERS.find(l => !usedLetters.has(l));
        };

        // --- Helper: add a new exercise slot ---
        const addBlockExerciseSlot = () => {
            if (state.slotCount >= MAX_SLOTS) return;

            const nextLetter = getNextSlotLetter();
            if (!nextLetter) return;

            const newIndex = state.slotCount;
            state.exercises[nextLetter] = '';
            state.slotCount++;

            const slotHtml = renderBlockExerciseSlot(nextLetter, newIndex, '', true);
            slotsContainer.insertAdjacentHTML('beforeend', slotHtml);

            // Attach handlers to new slot
            const newSlot = slotsContainer.querySelector(`[data-slot="${nextLetter}"]`);
            attachSlotHandlers(newSlot, nextLetter);

            updateBlockExerciseNumbers();

            // Focus the new input
            const newInput = element.querySelector(`#blockExercise_${nextLetter}`);
            newInput?.focus();
        };

        // --- Helper: remove a slot ---
        const removeBlockExerciseSlot = (slotElement, slotKey) => {
            if (state.slotCount <= MIN_SLOTS) return;

            delete state.exercises[slotKey];
            slotElement.remove();
            updateBlockExerciseNumbers();

            // Re-map state.exercises to remaining slots
            const remaining = {};
            slotsContainer.querySelectorAll('.exercise-slot').forEach(slot => {
                const key = slot.getAttribute('data-slot');
                const input = slot.querySelector('.block-exercise-input');
                remaining[key] = input?.value?.trim() || '';
            });
            state.exercises = remaining;
        };

        // --- Helper: attach handlers to a single slot ---
        const attachSlotHandlers = (slotElement, slotKey) => {
            if (!slotElement) return;

            const input = slotElement.querySelector('.block-exercise-input');
            const searchBtn = slotElement.querySelector('.exercise-search-btn');
            const removeBtn = slotElement.querySelector('.remove-block-exercise-btn');

            // Track value in state on input
            if (input) {
                input.addEventListener('input', () => {
                    state.exercises[slotKey] = input.value.trim();
                });
            }

            // Search button: open exercise search with current input as initial query
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    const currentValue = input?.value?.trim() || '';
                    onSearchClick(slotKey, (selectedExercise) => {
                        if (input) {
                            input.value = selectedExercise.name;
                            state.exercises[slotKey] = selectedExercise.name;
                        }
                    }, currentValue);
                });
            }

            // Remove button
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    removeBlockExerciseSlot(slotElement, slotKey);
                });
            }
        };

        // --- Attach handlers to all initial slots ---
        slotsContainer.querySelectorAll('.exercise-slot').forEach(slot => {
            const slotKey = slot.getAttribute('data-slot');
            attachSlotHandlers(slot, slotKey);
        });

        // --- Add exercise button ---
        addExerciseBtn?.addEventListener('click', () => {
            addBlockExerciseSlot();
        });

        // --- Weight unit buttons ---
        weightUnitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                weightUnitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.weightUnit = btn.dataset.unit;

                const weightContainer = element.querySelector('.weight-input-container');
                if (weightContainer) {
                    if (state.weightUnit === 'other') {
                        weightContainer.classList.add('diy-mode');
                    } else {
                        weightContainer.classList.remove('diy-mode');
                    }

                    const diyHint = weightContainer.querySelector('.diy-hint');
                    if (diyHint) {
                        diyHint.style.display = state.weightUnit === 'other' ? 'block' : 'none';
                    }
                }

                if (weightInput) {
                    if (state.weightUnit === 'other') {
                        weightInput.placeholder = otherWeightExamples[Math.floor(Math.random() * otherWeightExamples.length)];
                    } else if (state.weightUnit === 'lbs') {
                        weightInput.placeholder = '135';
                    } else if (state.weightUnit === 'kg') {
                        weightInput.placeholder = '60';
                    }
                }
            });
        });

        // --- Save button ---
        saveBtn?.addEventListener('click', async () => {
            // Collect current exercise values from DOM
            const cleanExercises = {};
            slotsContainer.querySelectorAll('.exercise-slot').forEach(slot => {
                const key = slot.getAttribute('data-slot');
                const input = slot.querySelector('.block-exercise-input');
                const value = input?.value?.trim();
                if (value) cleanExercises[key] = value;
            });

            // Validate at least 2 exercises
            const filledCount = Object.keys(cleanExercises).length;
            if (filledCount < MIN_SLOTS) {
                alert(`A block requires at least ${MIN_SLOTS} exercises.`);
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

            try {
                // Auto-create custom exercises if needed
                if (window.exerciseCacheService && window.dataManager?.isUserAuthenticated()) {
                    const currentUser = window.dataManager.getCurrentUser();
                    const userId = currentUser?.uid || null;
                    for (const exerciseName of Object.values(cleanExercises)) {
                        if (exerciseName) {
                            await window.exerciseCacheService.autoCreateIfNeeded(exerciseName, userId);
                        }
                    }
                }

                const protocolValue = protocolInput.value.trim() || '3×10';
                const { sets: parsedSets, reps: parsedReps } = parseProtocol(protocolValue);

                const blockData = {
                    groupId,
                    group_type: 'block',
                    group_name: blockNameInput.value.trim() || '',
                    exercises: cleanExercises,
                    sets: parsedSets,
                    reps: parsedReps,
                    rest: restInput.value || '60s',
                    default_weight: weightInput.value || '',
                    default_weight_unit: state.weightUnit
                };

                await onSave(blockData);
                offcanvas.hide();

            } catch (error) {
                console.error('Error saving block:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save';
            }
        });

        // --- Delete button ---
        deleteBtn?.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this exercise block?')) return;

            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting...';

            try {
                await onDelete();
                offcanvas.hide();
            } catch (error) {
                console.error('Error deleting block:', error);
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="bx bx-trash me-1"></i>Delete';
            }
        });
    });
}

console.log('📦 Offcanvas form components loaded');
