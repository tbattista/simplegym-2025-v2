/**
 * Ghost Gym - Workout Reorder Manager
 * Manages exercise reordering functionality (drag-and-drop, move up/down)
 * @version 1.0.0
 * @date 2026-02-06
 * Phase 10: Exercise Reordering Management
 */

class WorkoutReorderManager {
    constructor(options = {}) {
        // Required services
        this.sessionService = options.sessionService;

        // Callbacks for controller coordination
        this.onRenderWorkout = options.onRenderWorkout || (() => {});
        this.onAutoSave = options.onAutoSave || (() => {});
        this.onGetCurrentWorkout = options.onGetCurrentWorkout || (() => null);
        this.onToggleExerciseMenu = options.onToggleExerciseMenu || (() => {});

        console.log('🔀 Workout Reorder Manager initialized');
    }

    /**
     * Show reorder exercise offcanvas
     * Allows user to reorder exercises (regular + bonus) via drag-and-drop
     */
    showReorderOffcanvas() {
        try {
            console.log('📋 Building exercise list for reorder...');

            // Build exercise list with current order
            const exerciseList = this.buildExerciseList();

            if (exerciseList.length === 0) {
                window.showAlert('No exercises to reorder', 'warning');
                return;
            }

            console.log('📋 Exercise list built:', exerciseList);

            // Create reorder offcanvas using UnifiedOffcanvasFactory
            if (!window.UnifiedOffcanvasFactory) {
                console.error('UnifiedOffcanvasFactory not available');
                window.showAlert('Reorder feature not available', 'error');
                return;
            }

            // Create offcanvas with correct argument format
            const result = window.UnifiedOffcanvasFactory.createReorderOffcanvas(
                exerciseList,
                (reorderedExercises) => {
                    console.log('Saving new exercise order:', reorderedExercises);
                    // Extract exercise names from reordered exercise objects
                    const newOrder = reorderedExercises.map(ex => ex.name);
                    this.applyExerciseOrder(newOrder);
                }
            );

            // Verify offcanvas was created successfully
            if (!result) {
                console.error('Failed to create reorder offcanvas');
                window.showAlert('Failed to open reorder panel', 'error');
            }

        } catch (error) {
            console.error('Error showing reorder offcanvas:', error);
            window.showAlert('Failed to open reorder panel', 'error');
        }
    }

    /**
     * Build item list for reorder offcanvas
     * Combines regular exercises, bonus exercises, and session notes with current custom order applied
     * @returns {Array} Array of item objects with name, isBonus, isNote, displayName properties
     */
    buildExerciseList() {
        const itemList = [];
        const currentWorkout = this.onGetCurrentWorkout();

        // Gather regular exercises from workout template
        if (currentWorkout?.exercise_groups && currentWorkout.exercise_groups.length > 0) {
            currentWorkout.exercise_groups.forEach((group) => {
                const exerciseName = group.exercises?.a;
                if (exerciseName) {
                    itemList.push({
                        name: exerciseName,
                        displayName: exerciseName,
                        isBonus: false,
                        isNote: false
                    });
                }
            });
        }

        // Gather bonus exercises from session
        const bonusExercises = this.sessionService.getBonusExercises();
        if (bonusExercises && bonusExercises.length > 0) {
            bonusExercises.forEach((bonus) => {
                itemList.push({
                    name: bonus.name,
                    displayName: bonus.name,
                    isBonus: true,
                    isNote: false
                });
            });
        }

        // Gather session notes
        const sessionNotes = this.sessionService.getSessionNotes();
        if (sessionNotes && sessionNotes.length > 0) {
            sessionNotes.forEach((note) => {
                const truncatedContent = note.content?.substring(0, 30) || 'Empty note';
                itemList.push({
                    name: `note-${note.id}`,
                    displayName: truncatedContent + (note.content?.length > 30 ? '...' : ''),
                    isBonus: false,
                    isNote: true,
                    noteId: note.id
                });
            });
        }

        // Apply current custom order if exists
        const customOrder = this.sessionService.getExerciseOrder();
        if (customOrder.length > 0) {
            console.log('📋 Applying current custom order:', customOrder);

            // Reorder based on current custom order
            const orderedList = [];
            customOrder.forEach(name => {
                const item = itemList.find(ex => ex.name === name);
                if (item) {
                    orderedList.push(item);
                }
            });

            // Add any items not in custom order (safety check)
            itemList.forEach(ex => {
                if (!customOrder.includes(ex.name)) {
                    orderedList.push(ex);
                }
            });

            return orderedList;
        }

        return itemList;
    }

    /**
     * Apply new exercise order
     * Saves order to session and re-renders workout
     * @param {Array} newOrder - Array of exercise names in new order
     */
    applyExerciseOrder(newOrder) {
        try {
            // Validate input
            if (!Array.isArray(newOrder) || newOrder.length === 0) {
                console.error('Invalid order array:', newOrder);
                window.showAlert('Invalid exercise order', 'error');
                return;
            }

            console.log('Applying new exercise order:', newOrder);

            // Preserve timer state before re-render
            const timerDisplay = document.getElementById('floatingTimer');
            const preservedTime = timerDisplay ? timerDisplay.textContent : null;
            const isSessionActive = this.sessionService.isSessionActive();

            if (isSessionActive && preservedTime) {
                console.log('Preserving timer state before reorder:', preservedTime);
            }

            // Save to session service
            this.sessionService.setExerciseOrder(newOrder);

            // Re-render workout with new order
            this.onRenderWorkout();

            // Restore timer state if it was inadvertently cleared
            if (isSessionActive && preservedTime && timerDisplay) {
                const currentTime = timerDisplay.textContent;
                if (currentTime === '00:00' && preservedTime !== '00:00') {
                    timerDisplay.textContent = preservedTime;
                    console.log('Timer restored after reorder:', preservedTime);
                }
            }

            // Show success feedback
            window.showAlert('Exercise order updated successfully', 'success');

            // Auto-save if session is active
            if (this.sessionService.isSessionActive()) {
                console.log('Auto-saving session with new order...');
                this.onAutoSave();
            }

            console.log('Exercise order applied successfully');

        } catch (error) {
            console.error('Error applying exercise order:', error);
            window.showAlert('Failed to update exercise order', 'error');
        }
    }

    /**
     * Apply exercise order without showing success toast
     * Used for quick repeated moves where toast would be annoying
     * @param {string[]} newOrder - Array of exercise names in new order
     */
    applyExerciseOrderSilent(newOrder) {
        try {
            if (!Array.isArray(newOrder) || newOrder.length === 0) {
                console.error('Invalid order array:', newOrder);
                return;
            }

            // Preserve timer state before re-render
            const timerDisplay = document.getElementById('floatingTimer');
            const preservedTime = timerDisplay ? timerDisplay.textContent : null;
            const isSessionActive = this.sessionService.isSessionActive();

            // Save to session service
            this.sessionService.setExerciseOrder(newOrder);

            // Re-render workout with new order
            this.onRenderWorkout();

            // Restore timer state if needed
            if (isSessionActive && preservedTime && timerDisplay) {
                const currentTime = timerDisplay.textContent;
                if (currentTime === '00:00' && preservedTime !== '00:00') {
                    timerDisplay.textContent = preservedTime;
                }
            }

            // Auto-save if session is active
            if (this.sessionService.isSessionActive()) {
                this.onAutoSave();
            }

        } catch (error) {
            console.error('Error applying exercise order silently:', error);
        }
    }

    /**
     * Move exercise up one position
     * @param {number} index - Current exercise index
     */
    handleMoveUp(index) {
        if (index <= 0) return;
        this.moveExercise(index, index - 1);
    }

    /**
     * Move exercise down one position
     * @param {number} index - Current exercise index
     */
    handleMoveDown(index) {
        const currentOrder = this.getCurrentExerciseOrder();
        if (index >= currentOrder.length - 1) return;
        this.moveExercise(index, index + 1);
    }

    /**
     * Move exercise from one position to another
     * Keeps menu open on the moved card for quick repeated moves
     * @param {number} fromIndex - Original position
     * @param {number} toIndex - Target position
     */
    moveExercise(fromIndex, toIndex) {
        try {
            // Get current exercise order
            const currentOrder = this.getCurrentExerciseOrder();

            // Swap positions
            const [movedItem] = currentOrder.splice(fromIndex, 1);
            currentOrder.splice(toIndex, 0, movedItem);

            // Apply new order without showing toast (for quick repeated moves)
            this.applyExerciseOrderSilent(currentOrder);

            // Reopen menu at the new position
            setTimeout(() => {
                this.reopenMenuAtIndex(toIndex);
            }, 50);

        } catch (error) {
            console.error('Error moving exercise:', error);
        }
    }

    /**
     * Get current exercise order as array of names
     * @returns {string[]} Exercise names in current order
     */
    getCurrentExerciseOrder() {
        const exerciseList = this.buildExerciseList();
        return exerciseList.map(ex => ex.name);
    }

    /**
     * Reopen the exercise menu at a specific index
     * Used after moving an exercise to keep the menu open for quick repeated moves
     * @param {number} index - Exercise index to open menu for
     */
    reopenMenuAtIndex(index) {
        const container = document.getElementById('exerciseCardsContainer');
        const card = container?.querySelector(`[data-exercise-index="${index}"]`);
        if (!card) return;

        const moreBtn = card.querySelector('.workout-more-btn');
        if (moreBtn) {
            // Get exercise name from card
            const exerciseName = card.dataset.exerciseName || '';
            this.onToggleExerciseMenu(moreBtn, exerciseName, index);
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutReorderManager;
}

console.log('📦 Workout Reorder Manager loaded');
