/**
 * Ghost Gym - Reps/Sets Field Controller (Logbook V2)
 * Handles the morph pattern for protocol editing: Display → Edit → Save Animation
 * v3.0.0 - Single text field for protocol (e.g., "2x5", "3 sets to failure", "AMRAP")
 *
 * @version 3.0.0
 * @date 2026-01-14
 */

class RepsSetsFieldController {
    /**
     * @param {HTMLElement} container - The .logbook-repssets-field container element
     * @param {Object} options - Configuration options
     * @param {Object} options.sessionService - Reference to WorkoutSessionService
     * @param {string} options.exerciseName - Name of the exercise this field controls
     */
    constructor(container, options = {}) {
        this.container = container;
        this.sessionService = options.sessionService || window.workoutSessionService;
        this.exerciseName = options.exerciseName || container.closest('.logbook-card')?.dataset?.exerciseName;
        
        // DOM elements (v3.0.0 - Single text field)
        this.displayEl = container.querySelector('.repssets-display');
        this.editorEl = container.querySelector('.repssets-editor');
        this.valueTextDisplay = container.querySelector('.repssets-display .repssets-value-text');
        this.textInput = container.querySelector('.repssets-text-input');
        this.editBtn = container.querySelector('.repssets-edit-btn');
        this.saveBtn = container.querySelector('.repssets-save-btn');
        this.cancelBtn = container.querySelector('.repssets-cancel-btn');
        
        // Backward compatibility - fallback to old elements if new ones don't exist
        if (!this.valueTextDisplay) {
            this.valueTextDisplay = container.querySelector('.repssets-display .sets-value');
        }
        if (!this.textInput) {
            this.textInput = container.querySelector('.sets-input');
        }
        
        // DOM elements - Notes
        this.noteToggleBtn = container.querySelector('.note-toggle-btn');
        this.notesRow = container.querySelector('.logbook-notes-row');
        this.notesInput = container.querySelector('.logbook-notes-input');
        
        // State (v3.0.0 - Single text value)
        this.originalValue = this.textInput?.value || '3×10';
        this.notesSaveTimeout = null; // For debounced auto-save
        this.isUnifiedEditMode = false; // Track if in unified edit mode
        
        // Validate required elements
        if (!this.displayEl || !this.editorEl || !this.textInput || !this.valueTextDisplay) {
            console.error('❌ RepsSetsFieldController: Missing required DOM elements', {
                exerciseName: this.exerciseName,
                hasDisplay: !!this.displayEl,
                hasEditor: !!this.editorEl,
                hasTextInput: !!this.textInput,
                hasValueDisplay: !!this.valueTextDisplay
            });
            return;
        }
        
        this.bindEvents();
        console.log('✅ RepsSetsFieldController v3.0.0 initialized for:', this.exerciseName);
    }
    
    /**
     * Bind all event listeners
     * @private
     */
    bindEvents() {
        // DEPRECATED v2.3.0: Edit button removed in unified edit mode
        // Edit mode is now triggered externally by WeightFieldController
        // Keeping handler for backward compatibility
        if (this.editBtn) {
            this.editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode();
            });
        }
        
        // Save button → save and exit
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.exitEditMode(true);
            });
        }
        
        // Cancel button → exit without saving
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.exitEditMode(false);
            });
        }
        
        // Enter key → save and exit
        // Escape key → cancel without saving
        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.exitEditMode(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.exitEditMode(false);
            }
        };
        
        this.textInput.addEventListener('keydown', handleKeydown);
        
        // Blur → cancel without saving (with delay for button clicks)
        // DISABLED in unified edit mode to prevent auto-close
        const handleBlur = () => {
            if (this.isUnifiedEditMode) return; // Skip blur in unified mode
            
            setTimeout(() => {
                if (this.editorEl.style.display !== 'none' &&
                    !this.editorEl.contains(document.activeElement)) {
                    this.exitEditMode(false);
                }
            }, 150);
        };
        
        this.textInput.addEventListener('blur', handleBlur);
        
        // DEPRECATED v2.3.0: Note toggle functionality removed
        // Notes are now handled by UnifiedNotesController
    }
    
    /**
     * Enter edit mode - show editor, hide display
     */
    enterEditMode() {
        this.originalValue = this.textInput.value || '3×10';
        this.displayEl.style.display = 'none';
        this.editorEl.style.display = 'flex';
        this.textInput.focus();
        this.textInput.select();
        
        console.log('📝 Edit mode entered for:', this.exerciseName, 'Original:', this.originalValue);
    }
    
    /**
     * Exit edit mode - hide editor, show display
     * @param {boolean} save - Whether to save the values or restore original
     */
    exitEditMode(save = true) {
        if (save) {
            const newValue = this.textInput.value || '3×10';
            this.updateValue(newValue);
        } else {
            // Restore original value
            this.textInput.value = this.originalValue;
        }
        
        this.editorEl.style.display = 'none';
        this.displayEl.style.display = 'flex';
        
        console.log('💾 Edit mode exited for:', this.exerciseName, save ? '(saved)' : '(cancelled)');
    }
    
    /**
     * Update the displayed value and save to session service (v3.0.0 - Single text field)
     * @param {string} newValue - New protocol value (e.g., "2x5", "3 sets to failure", "AMRAP")
     */
    updateValue(newValue) {
        // Accept any text input - no validation
        const protocolValue = String(newValue || '3×10').trim();
        
        // Update DOM
        this.valueTextDisplay.textContent = protocolValue;
        this.textInput.value = protocolValue;
        this.container.dataset.protocol = protocolValue;
        
        // Extract sets/reps for backward compatibility (best effort)
        const extracted = this._extractSetsReps(protocolValue);
        
        // Save to session service
        if (this.sessionService) {
            if (this.sessionService.isSessionActive()) {
                // Active session: Use updateExerciseDetails
                this.sessionService.updateExerciseDetails(this.exerciseName, {
                    target_sets_reps: protocolValue, // New field
                    sets: extracted.sets, // Backward compatibility
                    reps: extracted.reps  // Backward compatibility
                });
                console.log('💾 Protocol saved to active session:', this.exerciseName, protocolValue);
            } else {
                // Pre-session: Use updatePreSessionExercise
                this.sessionService.updatePreSessionExercise(this.exerciseName, {
                    target_sets_reps: protocolValue, // New field
                    sets: extracted.sets, // Backward compatibility
                    reps: extracted.reps  // Backward compatibility
                });
                console.log('📝 Protocol saved to pre-session edits:', this.exerciseName, protocolValue);
            }
        }
        
        // Trigger save animation (green flash)
        this.displayEl.classList.add('saved');
        setTimeout(() => {
            this.displayEl.classList.remove('saved');
        }, 600);
        
        // Dispatch custom event for external listeners
        this.container.dispatchEvent(new CustomEvent('repsSetsChanged', {
            bubbles: true,
            detail: {
                exerciseName: this.exerciseName,
                protocol: protocolValue,
                sets: extracted.sets,
                reps: extracted.reps
            }
        }));
        
        console.log('✅ Protocol updated:', this.exerciseName, '→', protocolValue);
    }
    
    /**
     * Extract sets and reps from protocol string for backward compatibility
     * @param {string} protocol - Protocol string (e.g., "2x5", "3 sets to failure")
     * @returns {{sets: string, reps: string}} Extracted sets and reps
     * @private
     */
    _extractSetsReps(protocol) {
        // Try to match common patterns
        const xPattern = /(\d+)\s*[x×]\s*(.+)/i; // e.g., "2x5", "3×8-12"
        const setsPattern = /(\d+)\s*set/i; // e.g., "3 sets"
        
        const xMatch = protocol.match(xPattern);
        if (xMatch) {
            return {
                sets: xMatch[1],
                reps: xMatch[2]
            };
        }
        
        const setsMatch = protocol.match(setsPattern);
        if (setsMatch) {
            return {
                sets: setsMatch[1],
                reps: 'varies'
            };
        }
        
        // Default fallback
        return {
            sets: '1',
            reps: protocol
        };
    }
    
    /**
     * Programmatically set protocol value (for external updates)
     * @param {string} protocol - Protocol value to set (e.g., "2x5", "AMRAP")
     * @param {boolean} animate - Whether to show save animation
     */
    setValue(protocol, animate = false) {
        const protocolValue = String(protocol || '3×10');
        
        this.textInput.value = protocolValue;
        this.valueTextDisplay.textContent = protocolValue;
        this.container.dataset.protocol = protocolValue;
        
        if (animate) {
            this.displayEl.classList.add('saved');
            setTimeout(() => {
                this.displayEl.classList.remove('saved');
            }, 600);
        }
    }
    
    /**
     * Get current protocol value
     * @returns {string} Current protocol value
     */
    getValue() {
        return this.textInput.value || '3×10';
    }
    
    /**
     * DEPRECATED: Backward compatibility method
     * @deprecated Use setValue() instead
     */
    setValues(sets, reps, animate = false) {
        const protocol = `${sets}×${reps}`;
        this.setValue(protocol, animate);
    }
    
    /**
     * DEPRECATED: Backward compatibility method
     * @deprecated Use getValue() instead
     */
    getValues() {
        const protocol = this.getValue();
        const extracted = this._extractSetsReps(protocol);
        return {
            sets: parseInt(extracted.sets) || 1,
            reps: parseInt(extracted.reps) || 1
        };
    }
    
    /**
     * Set unified edit mode state (v2.4.0)
     * When true, disables blur-to-close behavior
     * @param {boolean} enabled - Whether unified edit mode is active
     */
    setUnifiedEditMode(enabled) {
        this.isUnifiedEditMode = enabled;
        console.log('🔗 Reps/Sets field unified edit mode:', enabled ? 'ENABLED' : 'DISABLED');
    }
    
    /**
     * Save changes (called by UnifiedEditController)
     * @returns {Promise<boolean>} Whether save was successful
     */
    async saveChanges() {
        try {
            const newValue = this.textInput.value || '3×10';
            this.updateValue(newValue);
            
            // Close editor
            this.editorEl.style.display = 'none';
            this.displayEl.style.display = 'flex';
            
            return true;
        } catch (error) {
            console.error('❌ Error saving protocol changes:', error);
            return false;
        }
    }
    
    /**
     * Cancel changes (called by UnifiedEditController)
     */
    cancelChanges() {
        // Restore original value
        this.textInput.value = this.originalValue;
        
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
 * Initialize all reps/sets field controllers on the page
 * @param {Object} sessionService - WorkoutSessionService instance
 * @returns {Array<RepsSetsFieldController>} Array of initialized controllers
 */
function initializeRepsSetsFields(sessionService) {
    const controllers = [];
    
    document.querySelectorAll('.logbook-repssets-field').forEach(container => {
        if (!container.repsSetsController) {
            const exerciseName = container.closest('.logbook-card')?.dataset?.exerciseName;
            container.repsSetsController = new RepsSetsFieldController(container, {
                sessionService: sessionService,
                exerciseName: exerciseName
            });
            controllers.push(container.repsSetsController);
        }
    });
    
    console.log('✅ Initialized', controllers.length, 'reps/sets field controllers');
    return controllers;
}

// Export globally
window.RepsSetsFieldController = RepsSetsFieldController;
window.initializeRepsSetsFields = initializeRepsSetsFields;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RepsSetsFieldController;
}

console.log('📦 RepsSetsFieldController loaded');