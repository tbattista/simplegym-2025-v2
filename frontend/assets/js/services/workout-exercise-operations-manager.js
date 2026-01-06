/**
 * Ghost Gym - Workout Exercise Operations Manager
 * Manages exercise operations: skip, edit, complete, bonus exercises
 * @version 1.0.0
 * @date 2026-01-05
 * Phase 7: Exercise Operations Management
 */

class WorkoutExerciseOperationsManager {
    constructor(options) {
        // Required services
        this.sessionService = options.sessionService;
        this.dataManager = options.dataManager;
        this.authService = options.authService;
        
        // Callbacks for controller coordination
        this.onRenderWorkout = options.onRenderWorkout || (() => {});
        this.onAutoSave = options.onAutoSave || (() => {});
        this.onGoToNext = options.onGoToNext || (() => {});
        this.onGetCurrentExerciseData = options.onGetCurrentExerciseData || (() => ({}));
        
        console.log('🏋️ Workout Exercise Operations Manager initialized');
    }
    
    /**
     * Handle skipping an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleSkipExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot skip exercise - no active session');
            return;
        }
        
        // Show skip reason offcanvas
        window.UnifiedOffcanvasFactory.createSkipExercise(
            { exerciseName },
            async (reason) => {
                // Mark as skipped in session
                this.sessionService.skipExercise(exerciseName, reason);
                
                // Update UI - re-render to show skipped state
                this.onRenderWorkout();
                
                // Auto-advance to next exercise
                setTimeout(() => {
                    this.onGoToNext(index);
                }, 300);
                
                // Show success message
                if (window.showAlert) {
                    const message = reason
                        ? `${exerciseName} skipped: ${reason}`
                        : `${exerciseName} skipped`;
                    window.showAlert(message, 'warning');
                }
                
                // Auto-save session
                try {
                    await this.onAutoSave();
                } catch (error) {
                    console.error('❌ Failed to auto-save after skip:', error);
                }
            }
        );
    }
    
    /**
     * Handle unskipping an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleUnskipExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot unskip exercise - no active session');
            return;
        }
        
        const modalManager = this.getModalManager();
        modalManager.confirm(
            'Unskip Exercise',
            `Resume <strong>${WorkoutUtils.escapeHtml(exerciseName)}</strong>?`,
            async () => {
                // Mark as not skipped in session
                this.sessionService.unskipExercise(exerciseName);
                
                // Update UI - re-render to remove skipped state
                this.onRenderWorkout();
                
                // Show success message
                if (window.showAlert) {
                    window.showAlert(`${exerciseName} resumed`, 'success');
                }
                
                // Auto-save session
                try {
                    await this.onAutoSave();
                } catch (error) {
                    console.error('❌ Failed to auto-save after unskip:', error);
                }
            }
        );
    }
    
    /**
     * Skip current exercise (called from action bar)
     * Skips the currently expanded exercise card
     */
    skipExercise() {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot skip exercise - no active session');
            if (window.showAlert) {
                window.showAlert('Please start your workout session first', 'warning');
            }
            return;
        }
        
        // Find currently expanded card
        const expandedCard = document.querySelector('.exercise-card.expanded');
        
        if (!expandedCard) {
            console.warn('⚠️ No exercise card is expanded');
            if (window.showAlert) {
                window.showAlert('Please expand an exercise to skip it', 'warning');
            }
            return;
        }
        
        const exerciseIndex = parseInt(expandedCard.getAttribute('data-exercise-index'));
        const exerciseName = expandedCard.getAttribute('data-exercise-name');
        
        console.log(`⏭️ Skip button clicked for: ${exerciseName} (index: ${exerciseIndex})`);
        
        // Call existing skip handler
        this.handleSkipExercise(exerciseName, exerciseIndex);
    }
    
    /**
     * Handle replacing an exercise (skip + add new)
     * This chains skip and add exercise functionality for a seamless replacement flow
     * @param {string} exerciseName - Exercise name to replace
     * @param {number} index - Exercise index
     */
    async handleReplaceExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot replace exercise - no active session');
            if (window.showAlert) {
                window.showAlert('Please start your workout session first', 'warning');
            }
            return;
        }
        
        console.log(`🔄 Replace button clicked for: ${exerciseName} (index: ${index})`);
        
        // Step 1: Skip the current exercise with "Replaced" reason
        this.sessionService.skipExercise(exerciseName, 'Replaced with alternative exercise');
        
        // Step 2: Update UI to show skipped state
        this.onRenderWorkout();
        
        // Step 3: Show success message for skip
        if (window.showAlert) {
            window.showAlert(`${exerciseName} marked as skipped`, 'info');
        }
        
        // Step 4: Auto-save the skip
        try {
            await this.onAutoSave();
        } catch (error) {
            console.error('❌ Failed to auto-save after skip:', error);
        }
        
        // Step 5: Open Add Exercise form for replacement (with slight delay for UX)
        setTimeout(() => {
            this.showAddExerciseForm();
        }, 300);
        
        // Step 6: Auto-advance to next exercise after adding (handled by showAddExerciseForm callback)
        setTimeout(() => {
            this.onGoToNext(index);
        }, 600);
    }
    
    /**
     * Handle editing an exercise's details (sets, reps, rest, weight)
     * Works BEFORE and DURING workout session
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleEditExercise(exerciseName, index) {
        // Get current exercise data from appropriate source
        const currentData = this.onGetCurrentExerciseData(exerciseName, index);
        
        console.log('✏️ Opening exercise editor for:', exerciseName, currentData);
        
        const isSessionActive = this.sessionService.isSessionActive();
        
        // Show edit offcanvas
        window.UnifiedOffcanvasFactory.createExerciseDetailsEditor(
            currentData,
            async (updatedData) => {
                console.log('💾 Saving updated exercise details:', updatedData);
                
                if (isSessionActive) {
                    // ACTIVE SESSION: Save to session (existing behavior)
                    this.sessionService.updateExerciseDetails(exerciseName, updatedData);
                    
                    // Auto-save to server
                    try {
                        await this.onAutoSave();
                        if (window.showAlert) {
                            window.showAlert(`${exerciseName} updated`, 'success');
                        }
                    } catch (error) {
                        console.error('❌ Failed to save exercise updates:', error);
                        if (window.showAlert) {
                            window.showAlert('Failed to save changes. Please try again.', 'danger');
                        }
                    }
                } else {
                    // PRE-SESSION: Save to pre-session edits (new behavior)
                    this.sessionService.updatePreSessionExercise(exerciseName, updatedData);
                    
                    if (window.showAlert) {
                        window.showAlert(`${exerciseName} updated - changes will apply when you start the workout`, 'success');
                    }
                }
                
                // Re-render to show updated values
                this.onRenderWorkout();
            }
        );
    }
    
    /**
     * Handle completing an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleCompleteExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot complete exercise - no active session');
            return;
        }
        
        // Clear auto-complete timer since user manually completed
        this.sessionService.clearAutoCompleteTimer(exerciseName);
        
        // Mark as completed
        this.sessionService.completeExercise(exerciseName);
        
        // Re-render to show completed state
        this.onRenderWorkout();
        
        // Show success message
        if (window.showAlert) {
            window.showAlert(`${exerciseName} completed! 💪`, 'success');
        }
        
        // Auto-save session
        this.onAutoSave().catch(error => {
            console.error('❌ Failed to auto-save after completion:', error);
        });
        
        // Auto-advance to next exercise after short delay
        setTimeout(() => {
            this.onGoToNext(index);
        }, 500);
    }
    
    /**
     * Handle uncompleting an exercise
     * @param {string} exerciseName - Exercise name
     * @param {number} index - Exercise index
     */
    handleUncompleteExercise(exerciseName, index) {
        if (!this.sessionService.isSessionActive()) {
            console.warn('⚠️ Cannot uncomplete exercise - no active session');
            return;
        }
        
        const modalManager = this.getModalManager();
        modalManager.confirm(
            'Uncomplete Exercise',
            `Mark <strong>${WorkoutUtils.escapeHtml(exerciseName)}</strong> as not completed?`,
            async () => {
                // Mark as not completed
                this.sessionService.uncompleteExercise(exerciseName);
                
                // Re-render to remove completed state
                this.onRenderWorkout();
                
                // Show message
                if (window.showAlert) {
                    window.showAlert(`${exerciseName} marked as not completed`, 'info');
                }
                
                // Auto-save session
                try {
                    await this.onAutoSave();
                } catch (error) {
                    console.error('❌ Failed to auto-save after uncomplete:', error);
                }
            }
        );
    }
    
    /**
     * Handle bonus exercises button click
     * Now works BEFORE and DURING workout session
     */
    async handleBonusExercises() {
        await this.showAddExerciseForm();
    }
    
    /**
     * Show add exercise form (two-offcanvas approach)
     * Opens the Add Exercise form with search button integration
     */
    async showAddExerciseForm() {
        try {
            window.UnifiedOffcanvasFactory.createExerciseGroupEditor(
                {
                    mode: 'single',
                    title: 'Add Exercise',
                    exercises: { a: '', b: '', c: '' },
                    sets: '3',
                    reps: '12',
                    rest: '60s',
                    weight: '',
                    weightUnit: 'lbs',
                    isNew: true
                },
                // onSave callback
                async (groupData) => {
                    // Handle adding exercise with weight data
                    this.sessionService.addBonusExercise({
                        name: groupData.exercises.a,
                        sets: groupData.sets || '3',
                        reps: groupData.reps || '12',
                        rest: groupData.rest || '60s',
                        weight: groupData.default_weight || '',
                        weight_unit: groupData.default_weight_unit || 'lbs'
                    });
                    this.onRenderWorkout();
                    
                    const message = !this.sessionService.isSessionActive()
                        ? `${groupData.exercises.a} added! It will be included when you start the workout. 💪`
                        : `${groupData.exercises.a} added to your workout! 💪`;
                    if (window.showAlert) window.showAlert(message, 'success');
                },
                // onDelete callback (not used in single mode)
                async () => {
                    console.warn('⚠️ Delete not applicable in single mode');
                },
                // onSearchClick callback
                (slotKey, populateCallback) => {
                    // Open Exercise Search offcanvas
                    this.showExerciseSearchOffcanvas(populateCallback);
                }
            );
        } catch (error) {
            console.error('❌ Error showing add exercise form:', error);
            const modalManager = this.getModalManager();
            modalManager.alert('Error', 'Failed to load add exercise form. Please try again.', 'danger');
        }
    }
    
    /**
     * Show exercise search offcanvas
     * Opens the standalone exercise search interface
     * @param {Function} populateCallback - Callback to populate the Add Exercise form with selected exercise
     */
    showExerciseSearchOffcanvas(populateCallback) {
        try {
            window.UnifiedOffcanvasFactory.createExerciseSearchOffcanvas(
                {
                    title: 'Search Exercise Library',
                    showFilters: true,
                    buttonText: 'Select',
                    buttonIcon: 'bx-check'
                },
                (selectedExercise) => {
                    // Exercise selected from search
                    // Populate the Add Exercise form via callback
                    populateCallback(selectedExercise);
                    
                    console.log('✅ Exercise selected:', selectedExercise.name);
                }
            );
        } catch (error) {
            console.error('❌ Error showing exercise search:', error);
            const modalManager = this.getModalManager();
            modalManager.alert('Error', 'Failed to load exercise search. Please try again.', 'danger');
        }
    }
    
    /**
     * Show bonus exercise modal (DEPRECATED - kept for backward compatibility)
     * Use showAddExerciseForm() instead
     */
    async showBonusExerciseModal() {
        console.warn('⚠️ showBonusExerciseModal() is deprecated, use showAddExerciseForm() instead');
        await this.showAddExerciseForm();
    }
    
    /**
     * Get modal manager (lazy load to ensure it's available)
     * @returns {Object} Modal manager or fallback
     */
    getModalManager() {
        if (!window.ghostGymModalManager) {
            console.warn('⚠️ Modal manager not available, using fallback');
            return {
                confirm: (title, message, onConfirm, onCancel) => {
                    // Strip HTML tags for plain text
                    const plainMessage = this.stripHtml(message);
                    if (confirm(`${title}\n\n${plainMessage}`)) {
                        onConfirm();
                    } else if (onCancel) {
                        onCancel();
                    }
                },
                alert: (title, message, type) => {
                    // Strip HTML tags for plain text
                    const plainMessage = this.stripHtml(message);
                    alert(`${title}\n\n${plainMessage}`);
                }
            };
        }
        return window.ghostGymModalManager;
    }
    
    /**
     * Strip HTML tags from string
     * @param {string} html - HTML string
     * @returns {string} Plain text
     */
    stripHtml(html) {
        return WorkoutUtils.stripHtml(html);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutExerciseOperationsManager;
}

console.log('📦 Workout Exercise Operations Manager loaded');
