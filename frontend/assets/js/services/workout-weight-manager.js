/**
 * Ghost Gym - Workout Weight Manager
 * Manages weight editing, direction indicators, and related UI
 * @version 1.0.0
 * @date 2026-01-05
 * Phase 6: Weight Management
 */

class WorkoutWeightManager {
    constructor(options) {
        // Required services
        this.sessionService = options.sessionService;
        
        // Callbacks for controller coordination
        this.onWeightUpdated = options.onWeightUpdated || (() => {});
        this.onRenderWorkout = options.onRenderWorkout || (() => {});
        this.onAutoSave = options.onAutoSave || (() => {});
        
        console.log('⚖️ Workout Weight Manager initialized');
    }
    
    /**
     * Handle weight button click
     * Parses data attributes and opens weight modal
     * @param {HTMLElement} button - Weight button element
     */
    handleWeightButtonClick(button) {
        const exerciseName = button.getAttribute('data-exercise-name');
        const currentWeight = button.getAttribute('data-current-weight');
        const currentUnit = button.getAttribute('data-current-unit');
        const lastWeight = button.getAttribute('data-last-weight');
        const lastWeightUnit = button.getAttribute('data-last-weight-unit');
        const lastSessionDate = button.getAttribute('data-last-session-date');
        const isSessionActive = button.getAttribute('data-is-session-active') === 'true';
        
        this.showWeightModal(exerciseName, {
            currentWeight,
            currentUnit,
            lastWeight,
            lastWeightUnit,
            lastSessionDate,
            isSessionActive
        });
    }
    
    /**
     * Show weight edit offcanvas
     * @param {string} exerciseName - Exercise name
     * @param {Object} weightData - Current weight data
     */
    showWeightModal(exerciseName, weightData) {
        // Use the unified factory to create the offcanvas
        window.UnifiedOffcanvasFactory.createWeightEdit(exerciseName, weightData);
    }
    
    /**
     * Handle weight direction indicator toggle
     * Two-button layout: decrease, increase (with toggle behavior)
     * @param {HTMLElement} button - The direction button that was clicked
     */
    handleWeightDirection(button) {
        const exerciseName = button.getAttribute('data-exercise-name');
        const direction = button.getAttribute('data-direction');
        
        if (!this.sessionService.isSessionActive()) {
            if (window.showAlert) {
                window.showAlert('Start your workout to set weight direction', 'warning');
            }
            return;
        }
        
        // Get current direction to check if toggling off
        const currentDirection = this.sessionService.getWeightDirection(exerciseName);
        const newDirection = (currentDirection === direction) ? null : direction;
        
        console.log(`🎯 Weight direction for ${exerciseName}: ${newDirection || 'cleared'}`);
        
        // Update session service
        this.sessionService.setWeightDirection(exerciseName, newDirection);
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(15);
        }
        
        // Auto-save (fire and forget)
        this.onAutoSave().catch(error => {
            console.error('❌ Failed to auto-save after direction change:', error);
        });
        
        // UPDATE UI DIRECTLY - Don't re-render entire workout (prevents card from closing)
        this.updateWeightDirectionButtons(exerciseName, newDirection);
        
        // Show toast notification (only when setting a direction, not when clearing)
        if (window.showAlert && newDirection) {
            const messages = {
                'up': 'Increase weight next session ⬆️',
                'down': 'Decrease weight next session ⬇️'
            };
            window.showAlert(messages[newDirection], 'success');
        }
    }
    
    /**
     * Update weight direction button states in DOM without re-rendering
     * This prevents the card from collapsing when direction buttons are clicked
     * @param {string} exerciseName - Name of exercise
     * @param {string|null} direction - 'up', 'down', or null
     */
    updateWeightDirectionButtons(exerciseName, direction) {
        // Find the card for this exercise
        const card = document.querySelector(`.exercise-card[data-exercise-name="${exerciseName}"]`);
        if (!card) return;
        
        // Find all direction buttons in this card
        const buttons = card.querySelectorAll('.weight-direction-btn');
        const dot = card.querySelector('.weight-direction-dot');
        
        // Update button states
        buttons.forEach(btn => {
            const btnDirection = btn.getAttribute('data-direction');
            btn.classList.remove('active', 'btn-direction-up', 'btn-direction-down', 'btn-outline-secondary');
            
            if (btnDirection === direction) {
                // This button is active
                btn.classList.add('active', `btn-direction-${direction}`);
            } else {
                // This button is inactive
                btn.classList.add('btn-outline-secondary');
            }
        });
        
        // Toggle dot visibility
        if (dot) {
            if (direction) {
                // A direction is selected, hide the dot
                dot.classList.add('hidden');
            } else {
                // No direction selected, show the dot
                dot.classList.remove('hidden');
            }
        }
    }
    
    /**
     * Show quick notes popover for weight direction
     * @param {HTMLElement} trigger - The trigger button element
     */
    showQuickNotes(trigger) {
        const exerciseName = trigger.getAttribute('data-exercise-name');
        const noteType = trigger.getAttribute('data-note-type');
        const currentValue = trigger.getAttribute('data-current-value');
        
        // Create and show the popover
        const popover = new QuickNotesPopover(trigger, {
            type: noteType,
            entityId: exerciseName,
            currentValue: currentValue || null,
            onAction: (action, data) => {
                this.handleQuickNoteAction(exerciseName, action, data);
            }
        });
        
        popover.show();
    }
    
    /**
     * Handle quick note action
     * @param {string} exerciseName - Exercise name
     * @param {string} action - Action taken (e.g., 'up', 'down')
     * @param {Object} data - Additional data
     */
    handleQuickNoteAction(exerciseName, action, data) {
        if (data.noteType === 'weight-direction') {
            // Get current direction to check if toggling off
            const currentDirection = this.sessionService.getWeightDirection(exerciseName);
            const newDirection = (currentDirection === action) ? null : action;
            
            // Update session service
            this.sessionService.setWeightDirection(exerciseName, newDirection);
            
            // Update trigger button state
            this.updateQuickNoteTrigger(exerciseName, newDirection);
            
            // Show toast
            if (window.showAlert && newDirection) {
                const messages = {
                    'up': 'Increase weight next session ⬆️',
                    'down': 'Decrease weight next session ⬇️'
                };
                window.showAlert(messages[newDirection], 'success');
            }
            
            // Auto-save
            this.onAutoSave();
        }
    }
    
    /**
     * Update quick note trigger button state and label display
     * @param {string} exerciseName - Exercise name
     * @param {*} value - Current value ('up', 'down', 'same', or null)
     */
    updateQuickNoteTrigger(exerciseName, value) {
        // Find the card for this exercise
        const card = document.querySelector(`.exercise-card[data-exercise-name="${exerciseName}"]`);
        if (!card) return;
        
        // Find trigger button
        const trigger = card.querySelector('.quick-notes-trigger');
        if (!trigger) return;
        
        // Find label display on the right
        const labelDisplay = card.querySelector('.quick-notes-label-display');
        
        const icon = trigger.querySelector('i');
        
        // Always use 'same' as default if no value
        const effectiveValue = value || 'same';
        
        // Update trigger button state
        if (value) {
            trigger.classList.add('has-note');
            trigger.setAttribute('data-current-value', value);
        } else {
            trigger.classList.remove('has-note');
            trigger.setAttribute('data-current-value', 'same');
        }
        
        // Update icon (filled when has a note that's not 'same')
        if (icon) {
            if (value && value !== 'same') {
                icon.classList.remove('bx-pencil');
                icon.classList.add('bxs-pencil');
            } else {
                icon.classList.remove('bxs-pencil');
                icon.classList.add('bx-pencil');
            }
        }
        
        // Update label display text
        if (labelDisplay) {
            labelDisplay.textContent = this.getDirectionLabel(effectiveValue);
        }
        
        // Also update the collapsed card badge
        this._updateCollapsedBadge(exerciseName, value);
    }
    
    /**
     * Update the weight badge on collapsed card to show current direction
     * @param {string} exerciseName - Exercise name
     * @param {string|null} direction - Direction value ('up', 'down', 'same', or null)
     * @private
     */
    _updateCollapsedBadge(exerciseName, direction) {
        const card = document.querySelector(`.exercise-card[data-exercise-name="${exerciseName}"]`);
        if (!card) return;
        
        const badge = card.querySelector('.weight-badge');
        if (!badge) return;
        
        // Update data attribute
        badge.setAttribute('data-direction', direction || 'none');
        
        // Remove existing direction classes
        badge.classList.remove('direction-up', 'direction-down', 'direction-reminder');
        
        // Add new direction class if applicable (and not 'same')
        if (direction && direction !== 'same') {
            badge.classList.add(`direction-${direction}`);
        }
        
        // Update badge icon and text
        const badgeText = badge.textContent.trim();
        
        // Extract just the weight value (strip any existing icons/arrows)
        // Match pattern: optional icon/emoji/arrow, then number with optional decimal, then optional unit
        const weightMatch = badgeText.match(/([\d.]+)\s*(\w+)?$/);
        
        if (weightMatch) {
            const weightValue = weightMatch[1];
            const weightUnit = weightMatch[2] || '';
            const weightPart = weightUnit ? `${weightValue} ${weightUnit}` : weightValue;
            
            let icon = '';
            let tooltipText = '';
            
            if (direction === 'up') {
                icon = '✓↑';
                tooltipText = `${weightPart} - Next: Increase weight`;
            } else if (direction === 'down') {
                icon = '✓↓';
                tooltipText = `${weightPart} - Next: Decrease weight`;
            } else {
                // No direction or 'same' - use default arrow
                icon = '→';
                tooltipText = weightPart;
            }
            
            // Update badge content with icon prefix
            badge.textContent = `${icon} ${weightPart}`;
            
            // Update tooltip
            badge.setAttribute('title', tooltipText);
            badge.setAttribute('data-bs-original-title', tooltipText);
        }
    }
    
    /**
     * Get direction label text
     * @param {string} direction - 'up', 'down', or 'same'
     * @returns {string} Label text
     */
    getDirectionLabel(direction) {
        const labelMap = {
            'up': 'Increase',
            'down': 'Decrease',
            'same': 'No change'
        };
        return labelMap[direction] || 'No change';
    }
    
    /**
     * Show plate calculator settings
     * Opens offcanvas for configuring gym plate availability
     */
    showPlateSettings() {
        console.log('⚙️ Opening plate calculator settings...');
        
        // Use the unified factory to create the offcanvas
        window.UnifiedOffcanvasFactory.createPlateSettings((newConfig) => {
            console.log('✅ Plate settings saved:', newConfig);
            
            // Re-render workout to update plate calculations with new settings
            this.onRenderWorkout();
        });
    }
    
    /**
     * Show plate calculator settings (alias for backward compatibility)
     * Opens offcanvas for configuring gym plate availability
     */
    showPlateCalculator() {
        return this.showPlateSettings();
    }
    
    /**
     * Toggle weight direction with inline buttons (NEW UX 2026-01-05)
     * Direct one-tap toggle system replacing popover
     * @param {HTMLElement} button - The clicked button element
     * @param {string} exerciseName - Exercise name
     * @param {string} direction - Direction ('up' or 'down')
     */
    toggleWeightDirection(button, exerciseName, direction) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot set weight direction - no active session');
            if (window.showAlert) {
                window.showAlert('Please start your workout first', 'warning');
            }
            return;
        }
        
        // Get current direction for this exercise
        const currentDirection = this.sessionService.getWeightDirection(exerciseName);
        
        // Toggle logic: if clicking the same button, deselect it (set to null)
        // Otherwise, set to the clicked direction
        const newDirection = (currentDirection === direction) ? null : direction;
        
        console.log(`🎯 Toggle weight direction for ${exerciseName}: ${currentDirection} → ${newDirection}`);
        
        // Update session service
        this.sessionService.setWeightDirection(exerciseName, newDirection);
        
        // Update UI directly without re-rendering (keeps card expanded)
        this._updateWeightDirectionButtonsUI(exerciseName, newDirection);
        
        // Show feedback toast
        if (window.showAlert && newDirection) {
            const messages = {
                'up': 'Increase weight next session ↑',
                'down': 'Decrease weight next session ↓'
            };
            window.showAlert(messages[newDirection], 'success');
        }
        
        // Auto-save
        this.onAutoSave().catch(error => {
            console.error('❌ Failed to auto-save weight direction:', error);
        });
    }
    
    /**
     * Update weight direction button states in the DOM without re-rendering
     * @param {string} exerciseName - Exercise name
     * @param {string|null} direction - New direction ('up', 'down', 'same', or null)
     * @private
     */
    _updateWeightDirectionButtonsUI(exerciseName, direction) {
        // Find the exercise card
        const card = document.querySelector(`.exercise-card[data-exercise-name="${exerciseName}"]`);
        if (!card) return;
        
        // Find all three direction buttons
        const decreaseBtn = card.querySelector('.weight-direction-btn.decrease');
        const sameBtn = card.querySelector('.weight-direction-btn.same');
        const increaseBtn = card.querySelector('.weight-direction-btn.increase');
        
        // Update button states for all three buttons
        if (direction === 'down') {
            if (decreaseBtn) decreaseBtn.classList.add('active');
            if (sameBtn) sameBtn.classList.remove('active');
            if (increaseBtn) increaseBtn.classList.remove('active');
        } else if (direction === 'up') {
            if (decreaseBtn) decreaseBtn.classList.remove('active');
            if (sameBtn) sameBtn.classList.remove('active');
            if (increaseBtn) increaseBtn.classList.add('active');
        } else if (direction === 'same') {
            if (decreaseBtn) decreaseBtn.classList.remove('active');
            if (sameBtn) sameBtn.classList.add('active');
            if (increaseBtn) increaseBtn.classList.remove('active');
        } else {
            // No direction selected (null) - "No Change" should be active by default
            if (decreaseBtn) decreaseBtn.classList.remove('active');
            if (sameBtn) sameBtn.classList.add('active');
            if (increaseBtn) increaseBtn.classList.remove('active');
        }
        
        // Update weight badge if it exists (shows direction indicator)
        const weightBadge = card.querySelector('.weight-badge');
        if (weightBadge) {
            // Update data attribute
            weightBadge.setAttribute('data-direction', direction || 'none');
            
            // Update classes for styling
            weightBadge.classList.remove('direction-up', 'direction-down', 'direction-same');
            if (direction === 'up') {
                weightBadge.classList.add('direction-up');
            } else if (direction === 'down') {
                weightBadge.classList.add('direction-down');
            }
        }
    }
    
    /**
     * Get weight history for exercise
     * @param {string} exerciseName - Exercise name
     * @returns {Object|null} Weight history data
     */
    getWeightHistory(exerciseName) {
        return this.sessionService.getExerciseHistory(exerciseName);
    }
    
    /**
     * Get current weight direction for exercise
     * @param {string} exerciseName - Exercise name
     * @returns {string|null} Direction or null
     */
    getCurrentDirection(exerciseName) {
        return this.sessionService.getWeightDirection(exerciseName);
    }
    
    /**
     * Get last weight direction from history
     * @param {string} exerciseName - Exercise name
     * @returns {string|null} Last direction or null
     */
    getLastDirection(exerciseName) {
        return this.sessionService.getLastWeightDirection(exerciseName);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutWeightManager;
}

console.log('📦 Workout Weight Manager loaded');
