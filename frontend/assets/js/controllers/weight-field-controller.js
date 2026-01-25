/**
 * Ghost Gym - Weight Field Controller (Logbook V2)
 * Handles the morph pattern for weight editing: Display → Edit → Save Animation
 * v2.4.0 - Unified Editor V2 with shared save/cancel buttons
 *
 * @version 2.4.0
 * @date 2026-01-14
 */

class WeightFieldController {
    /**
     * @param {HTMLElement} container - The .workout-weight-field container element
     * @param {Object} options - Configuration options
     * @param {Object} options.sessionService - Reference to WorkoutSessionService
     * @param {string} options.exerciseName - Name of the exercise this field controls
     */
    constructor(container, options = {}) {
        this.container = container;
        this.sessionService = options.sessionService || window.workoutSessionService;
        this.exerciseName = options.exerciseName || container.closest('.workout-card')?.dataset?.exerciseName;
        
        // DOM elements - Display Mode
        this.displayEl = container.querySelector('.weight-display');
        this.valueDisplay = container.querySelector('.weight-display .weight-value');
        // Support both old (.weight-edit-btn) and new (.workout-edit-btn) button classes
        this.editBtn = container.querySelector('.weight-edit-btn') ||
                       container.closest('.workout-card')?.querySelector('.workout-edit-btn');
        
        // DOM elements - Editor
        this.editorEl = container.querySelector('.weight-editor');
        this.unitSelector = container.querySelector('.weight-unit-selector');
        this.unitButtons = container.querySelectorAll('.weight-unit-selector .unit-btn');
        
        // DOM elements - Numeric Mode
        this.numericRow = container.querySelector('.weight-input-row.numeric-mode');
        this.input = container.querySelector('.weight-input');
        this.minusBtn = container.querySelector('.weight-stepper-btn.minus');
        this.plusBtn = container.querySelector('.weight-stepper-btn.plus');
        
        // DOM elements - DIY Mode
        this.diyRow = container.querySelector('.weight-input-row.diy-mode');
        this.textInput = container.querySelector('.weight-text-input');
        
        // DOM elements - Actions
        this.saveBtn = container.querySelector('.weight-save-btn');
        this.cancelBtn = container.querySelector('.weight-cancel-btn');
        
        // DOM elements - Notes
        this.noteToggleBtn = container.querySelector('.note-toggle-btn');
        this.notesRow = container.querySelector('.workout-notes-row');
        this.notesInput = container.querySelector('.workout-notes-input');
        
        // State
        this.currentUnit = this.container.dataset.unit || 'lbs';
        this.originalValue = parseFloat(this.input?.value) || 0;
        this.originalTextValue = this.textInput?.value || '';
        this.increment = this.currentUnit === 'kg' ? 2.5 : 5;
        this.notesSaveTimeout = null; // For debounced auto-save
        this.isUnifiedEditMode = false; // Track if in unified edit mode
        
        // Validate required elements
        if (!this.displayEl || !this.editorEl || !this.input || !this.textInput) {
            console.error('❌ WeightFieldController: Missing required DOM elements', {
                exerciseName: this.exerciseName,
                hasDisplay: !!this.displayEl,
                hasEditor: !!this.editorEl,
                hasInput: !!this.input,
                hasTextInput: !!this.textInput
            });
            return;
        }
        
        this.bindEvents();
        console.log('✅ WeightFieldController v2.3.0 initialized for:', this.exerciseName, 'Unit:', this.currentUnit);
    }
    
    /**
     * Bind all event listeners (v2.1 - Unit Switching)
     * @private
     */
    bindEvents() {
        // Pencil icon → toggle edit mode (v2.4.1 - Toggle support)
        if (this.editBtn) {
            this.editBtn.addEventListener('click', (e) => {
                // Allow card expansion by NOT stopping propagation

                // Check if unified edit mode is enabled
                const isUnifiedEdit = this.editBtn.dataset.unifiedEdit === 'true';

                if (isUnifiedEdit) {
                    const card = this.container.closest('.workout-card');
                    if (card) {
                        // Check if already in unified edit mode - if so, cancel/close it
                        if (card.classList.contains('unified-edit-active')) {
                            // Dispatch cancel event to close edit mode
                            const cancelEvent = new CustomEvent('cancelUnifiedEditMode', {
                                bubbles: false
                            });
                            card.dispatchEvent(cancelEvent);
                            return;
                        }

                        // First expand the card if it's collapsed
                        if (!card.classList.contains('expanded')) {
                            card.classList.add('expanded');
                        }

                        // Then enter unified edit mode
                        const event = new CustomEvent('enterUnifiedEditMode', {
                            bubbles: false,
                            detail: { exerciseIndex: card.dataset.exerciseIndex }
                        });
                        card.dispatchEvent(event);
                    }
                } else {
                    // Non-unified mode: toggle edit
                    if (this.editorEl.style.display !== 'none') {
                        this.exitEditMode(false); // Cancel/close
                    } else {
                        this.enterEditMode();
                    }
                }
            });
        }
        
        // Unit selector buttons → switch between lbs/kg/DIY
        this.unitButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newUnit = btn.dataset.unit;
                this.switchUnit(newUnit);
            });
        });
        
        // Save button → save and exit
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Clear any pending blur timeout to prevent cancel
                if (this.blurTimeout) {
                    clearTimeout(this.blurTimeout);
                    this.blurTimeout = null;
                }
                this.exitEditMode(true);
            });
        }
        
        // Cancel button → exit without saving
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Clear any pending blur timeout
                if (this.blurTimeout) {
                    clearTimeout(this.blurTimeout);
                    this.blurTimeout = null;
                }
                this.exitEditMode(false);
            });
        }
        
        // Minus button → decrement and auto-save
        if (this.minusBtn) {
            this.minusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.adjustWeight(-this.increment);
            });
        }
        
        // Plus button → increment and auto-save
        if (this.plusBtn) {
            this.plusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.adjustWeight(this.increment);
            });
        }
        
        // Enter key → save and exit (numeric input)
        // Escape key → cancel without saving
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.exitEditMode(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.exitEditMode(false);
            }
        });
        
        // Enter key → save and exit (DIY text input)
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.exitEditMode(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.exitEditMode(false);
            }
        });
        
        // Blur → cancel without saving (with delay for button clicks)
        // DISABLED in unified edit mode to prevent auto-close
        this.input.addEventListener('blur', (e) => {
            if (this.isUnifiedEditMode) return; // Skip blur in unified mode
            
            this.blurTimeout = setTimeout(() => {
                if (this.editorEl.style.display !== 'none' &&
                    !this.editorEl.contains(document.activeElement)) {
                    this.exitEditMode(false);
                }
            }, 200);
        });
        
        this.textInput.addEventListener('blur', (e) => {
            if (this.isUnifiedEditMode) return; // Skip blur in unified mode
            
            this.blurTimeout = setTimeout(() => {
                if (this.editorEl.style.display !== 'none' &&
                    !this.editorEl.contains(document.activeElement)) {
                    this.exitEditMode(false);
                }
            }, 200);
        });
        
        // DEPRECATED v2.3.0: Note toggle functionality removed
        // Notes are now handled by UnifiedNotesController
    }
    
    /**
     * Switch between lbs/kg/DIY modes (NO auto-conversion)
     * @param {string} newUnit - 'lbs', 'kg', or 'diy'
     */
    switchUnit(newUnit) {
        // Update active button state
        this.unitButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === newUnit);
        });
        
        // Update current unit and increment
        this.currentUnit = newUnit;
        this.increment = newUnit === 'kg' ? 2.5 : 5;
        
        // Update button labels based on unit
        if (this.minusBtn && this.plusBtn) {
            if (newUnit === 'lbs') {
                this.minusBtn.textContent = '−5';
                this.plusBtn.textContent = '+5';
            } else if (newUnit === 'kg') {
                this.minusBtn.textContent = '−2.5';
                this.plusBtn.textContent = '+2.5';
            }
        }
        
        // Toggle between numeric and DIY modes using CSS class
        const isDIY = newUnit === 'diy';
        this.editorEl.classList.toggle('diy-active', isDIY);
        
        // Focus appropriate input after mode switch
        if (isDIY && this.textInput) {
            this.textInput.focus();
            this.textInput.select();
        } else if (this.input) {
            this.input.focus();
            this.input.select();
        }
        
        console.log('🔄 Unit switched to:', newUnit, 'Increment:', this.increment);
    }
    
    /**
     * Enter edit mode - show editor, hide display
     * Syncs input values from current display/data attributes
     */
    enterEditMode() {
        // Sync input values from container data attributes (source of truth)
        const currentWeight = this.container.dataset.weight || '';
        const currentUnit = this.container.dataset.unit || 'lbs';
        const isDIY = currentUnit === 'diy';

        // Always sync the unit selector buttons to match current unit
        this.currentUnit = currentUnit;
        this.unitButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === currentUnit);
        });

        // Toggle DIY mode class on editor
        this.editorEl.classList.toggle('diy-active', isDIY);

        // Update increment based on unit
        this.increment = currentUnit === 'kg' ? 2.5 : 5;

        // Populate the appropriate input field with current value
        if (isDIY) {
            this.textInput.value = currentWeight;
            this.originalTextValue = currentWeight;
            this.originalValue = 0;
        } else {
            const numericValue = parseFloat(currentWeight) || 0;
            this.input.value = numericValue || '';
            this.originalValue = numericValue;
            this.originalTextValue = '';
        }

        this.displayEl.style.display = 'none';
        this.editorEl.style.display = 'flex';

        // Focus appropriate input
        if (isDIY && this.textInput) {
            this.textInput.focus();
            this.textInput.select();
        } else {
            this.input.focus();
            this.input.select();
        }

        console.log('📝 Edit mode entered for:', this.exerciseName, 'Value:', currentWeight, 'Unit:', currentUnit);
    }
    
    /**
     * Exit edit mode - hide editor, show display (v2.1 - DIY Support)
     * @param {boolean} save - Whether to save the value or restore original
     */
    exitEditMode(save = true) {
        if (save) {
            const isDIY = this.currentUnit === 'diy';
            const newValue = isDIY ? this.textInput.value : (parseFloat(this.input.value) || 0);
            this.updateValue(newValue);
        } else {
            // Restore original values
            this.input.value = this.originalValue;
            this.textInput.value = this.originalTextValue;
        }
        
        this.editorEl.style.display = 'none';
        this.displayEl.style.display = 'flex';
        
        console.log('💾 Edit mode exited for:', this.exerciseName, save ? '(saved)' : '(cancelled)');
    }
    
    /**
     * Adjust weight by delta using stepper buttons
     * @param {number} delta - Amount to adjust (positive or negative)
     */
    adjustWeight(delta) {
        const currentValue = parseFloat(this.input.value) || 0;
        const newValue = Math.max(0, currentValue + delta);
        this.input.value = newValue;
        this.exitEditMode(true);
        
        console.log('⚖️ Weight adjusted:', this.exerciseName, `${currentValue} → ${newValue}`);
    }
    
    /**
     * Update the displayed value and save to session service (v2.1 - Unit Support)
     * @param {number|string} newValue - New weight value (number for numeric, string for DIY)
     */
    updateValue(newValue) {
        const isDIY = this.currentUnit === 'diy';
        
        if (isDIY) {
            // DIY mode - save text value
            const textValue = newValue || '';
            const displayValue = textValue || '—';
            
            // Update DOM (no unit display for DIY)
            this.valueDisplay.textContent = displayValue;
            // Clear or hide unit display
            const unitSpan = this.container.querySelector('.weight-unit');
            if (unitSpan) {
                unitSpan.style.display = 'none';
            }
            this.textInput.value = textValue;
            this.container.dataset.weight = textValue;
            this.container.dataset.unit = 'diy';
            this.container.dataset.weightMode = 'text';
            
            // Save to session service
            if (this.sessionService) {
                const saveData = {
                    weight: textValue,
                    weight_unit: 'diy',
                    weight_mode: 'text',
                    weight_text: textValue
                };
                
                if (this.sessionService.isSessionActive()) {
                    this.sessionService.updateExerciseWeight(
                        this.exerciseName,
                        textValue,
                        'diy'
                    );
                    console.log('💾 DIY weight saved to active session:', this.exerciseName, textValue);
                } else {
                    this.sessionService.updatePreSessionExercise(this.exerciseName, saveData);
                    console.log('📝 DIY weight saved to pre-session edits:', this.exerciseName, textValue);
                }
            }
        } else {
            // Numeric mode (lbs/kg) - save number value with unit display
            const clampedValue = Math.max(0, Math.min(9999, parseFloat(newValue) || 0));
            const displayValue = clampedValue === 0 ? '—' : clampedValue;
            const displayUnit = this.currentUnit !== 'other' ? this.currentUnit : '';
            
            // Update DOM (show unit for lbs/kg)
            this.valueDisplay.textContent = displayValue;
            // Show or update unit display
            const unitSpan = this.container.querySelector('.weight-unit');
            if (unitSpan && displayUnit) {
                unitSpan.textContent = displayUnit;
                unitSpan.style.display = '';
            }
            this.input.value = clampedValue || '';
            this.container.dataset.weight = clampedValue;
            this.container.dataset.unit = this.currentUnit;
            this.container.dataset.weightMode = 'numeric';
            
            // Save to session service
            if (this.sessionService) {
                if (this.sessionService.isSessionActive()) {
                    this.sessionService.updateExerciseWeight(
                        this.exerciseName,
                        clampedValue,
                        this.currentUnit
                    );
                    console.log('💾 Weight saved to active session:', this.exerciseName, clampedValue, this.currentUnit);
                } else {
                    this.sessionService.updatePreSessionExercise(this.exerciseName, {
                        weight: clampedValue,
                        weight_unit: this.currentUnit,
                        weight_mode: 'numeric'
                    });
                    console.log('📝 Weight saved to pre-session edits:', this.exerciseName, clampedValue, this.currentUnit);
                }
            }
        }
        
        // Trigger save animation (green flash)
        this.displayEl.classList.add('saved');
        setTimeout(() => {
            this.displayEl.classList.remove('saved');
        }, 600);
        
        // Dispatch custom event for external listeners
        this.container.dispatchEvent(new CustomEvent('weightChanged', {
            bubbles: true,
            detail: {
                exerciseName: this.exerciseName,
                weight: newValue,
                unit: this.currentUnit,
                mode: isDIY ? 'text' : 'numeric'
            }
        }));
        
        console.log('✅ Weight updated:', this.exerciseName, '→', newValue, `(${this.currentUnit})`);
    }
    
    /**
     * Programmatically set weight value (for external updates)
     * @param {number} value - Weight value to set
     * @param {boolean} animate - Whether to show save animation
     */
    setValue(value, animate = false) {
        const clampedValue = Math.max(0, Math.min(9999, value));
        this.input.value = clampedValue || '';
        this.valueDisplay.textContent = clampedValue === 0 ? '—' : clampedValue;
        this.container.dataset.weight = clampedValue;
        
        if (animate) {
            this.displayEl.classList.add('saved');
            setTimeout(() => {
                this.displayEl.classList.remove('saved');
            }, 600);
        }
    }
    
    /**
     * Get current weight value
     * @returns {number} Current weight value
     */
    getValue() {
        return parseFloat(this.input.value) || 0;
    }
    
    /**
     * Set unified edit mode state (v2.4.0)
     * When true, disables blur-to-close behavior
     * @param {boolean} enabled - Whether unified edit mode is active
     */
    setUnifiedEditMode(enabled) {
        this.isUnifiedEditMode = enabled;
        console.log('🔗 Weight field unified edit mode:', enabled ? 'ENABLED' : 'DISABLED');
    }
    
    /**
     * Save changes (called by UnifiedEditController)
     * @returns {Promise<boolean>} Whether save was successful
     */
    async saveChanges() {
        try {
            const isDIY = this.currentUnit === 'diy';
            const newValue = isDIY ? this.textInput.value : (parseFloat(this.input.value) || 0);
            this.updateValue(newValue);
            
            // Close editor
            this.editorEl.style.display = 'none';
            this.displayEl.style.display = 'flex';
            
            return true;
        } catch (error) {
            console.error('❌ Error saving weight changes:', error);
            return false;
        }
    }
    
    /**
     * Cancel changes (called by UnifiedEditController)
     */
    cancelChanges() {
        // Restore original values
        this.input.value = this.originalValue;
        this.textInput.value = this.originalTextValue;
        
        // Close editor
        this.editorEl.style.display = 'none';
        this.displayEl.style.display = 'flex';
    }
    
    // DEPRECATED v2.3.0: Notes functionality moved to UnifiedNotesController
    // Methods kept for backward compatibility but will not be called
    
    /**
     * Destroy controller and remove event listeners
     */
    destroy() {
        // Clear any pending save timeout
        if (this.notesSaveTimeout) {
            clearTimeout(this.notesSaveTimeout);
            this.notesSaveTimeout = null;
        }
        
        // Event listeners are automatically removed when elements are removed from DOM
        // This method is here for completeness
        this.container = null;
        this.sessionService = null;
    }
}

/**
 * Initialize all weight field controllers on the page
 * @param {Object} sessionService - WorkoutSessionService instance
 * @returns {Array<WeightFieldController>} Array of initialized controllers
 */
function initializeWeightFields(sessionService) {
    const controllers = [];
    
    document.querySelectorAll('.workout-weight-field').forEach(container => {
        if (!container.weightController) {
            const exerciseName = container.closest('.workout-card')?.dataset?.exerciseName;
            container.weightController = new WeightFieldController(container, {
                sessionService: sessionService,
                exerciseName: exerciseName
            });
            controllers.push(container.weightController);
        }
    });
    
    console.log('✅ Initialized', controllers.length, 'weight field controllers');
    return controllers;
}

// Export globally
window.WeightFieldController = WeightFieldController;
window.initializeWeightFields = initializeWeightFields;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeightFieldController;
}

console.log('📦 WeightFieldController loaded');