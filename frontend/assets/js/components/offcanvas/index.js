/**
 * Ghost Gym - Unified Offcanvas Factory (Facade)
 * Maintains backward compatibility with the original UnifiedOffcanvasFactory class
 * while using the new modular architecture under the hood
 * 
 * @module offcanvas
 * @version 3.0.0
 * @date 2025-12-20
 */

// Import all helper functions
import {
    createOffcanvas,
    escapeHtml,
    forceCleanupBackdrops
} from './offcanvas-helpers.js';

// Import menu components
import {
    createMenuOffcanvas,
    createWorkoutSelectionPrompt
} from './offcanvas-menu.js';

// Import exercise components
import {
    createBonusExercise,
    createExerciseSearchOffcanvas,
    createExerciseFilterOffcanvas
} from './offcanvas-exercise.js';

// Import workout components
import {
    createWeightEdit,
    setupWeightEditListeners,
    createCompleteWorkout,
    createCompletionSummary,
    createResumeSession
} from './offcanvas-workout.js';

// Import form components
import {
    createFilterOffcanvas,
    createSkipExercise,
    createExerciseGroupEditor,
    renderAlternateSlot
} from './offcanvas-forms.js';

/**
 * UnifiedOffcanvasFactory - Facade class maintaining backward compatibility
 * All methods are static to match the original API
 */
class UnifiedOffcanvasFactory {
    
    /* ============================================
       HELPER METHODS
       ============================================ */
    
    static escapeHtml(text) {
        return escapeHtml(text);
    }
    
    static createOffcanvas(id, html, setupCallback = null) {
        return createOffcanvas(id, html, setupCallback);
    }
    
    static forceCleanupBackdrops() {
        return forceCleanupBackdrops();
    }
    
    /* ============================================
       MENU OFFCANVAS
       ============================================ */
    
    static createMenuOffcanvas(config) {
        return createMenuOffcanvas(config);
    }
    
    static createWorkoutSelectionPrompt() {
        return createWorkoutSelectionPrompt();
    }
    
    /* ============================================
       EXERCISE OFFCANVAS
       ============================================ */
    
    static createBonusExercise(data, onAddExercise) {
        return createBonusExercise(data, onAddExercise);
    }
    
    static createExerciseSearchOffcanvas(config = {}, onSelectExercise) {
        return createExerciseSearchOffcanvas(config, onSelectExercise);
    }
    
    static createExerciseFilterOffcanvas(config, onApply) {
        return createExerciseFilterOffcanvas(config, onApply);
    }
    
    /* ============================================
       WORKOUT OFFCANVAS
       ============================================ */
    
    static createWeightEdit(exerciseName, data) {
        return createWeightEdit(exerciseName, data);
    }
    
    static setupWeightEditListeners(offcanvasElement, offcanvas, exerciseName) {
        return setupWeightEditListeners(offcanvasElement, offcanvas, exerciseName);
    }
    
    static createCompleteWorkout(data, onConfirm) {
        return createCompleteWorkout(data, onConfirm);
    }
    
    static createCompletionSummary(data) {
        return createCompletionSummary(data);
    }
    
    static createResumeSession(data, onResume, onStartFresh) {
        return createResumeSession(data, onResume, onStartFresh);
    }
    
    /* ============================================
       FORM OFFCANVAS
       ============================================ */
    
    static createFilterOffcanvas(config) {
        return createFilterOffcanvas(config);
    }
    
    static createSkipExercise(data, onConfirm) {
        return createSkipExercise(data, onConfirm);
    }
    
    static createExerciseGroupEditor(config, onSave, onDelete, onSearchClick) {
        return createExerciseGroupEditor(config, onSave, onDelete, onSearchClick);
    }
    
    static renderAlternateSlot(slotKey, exerciseName) {
        return renderAlternateSlot(slotKey, exerciseName);
    }
    
    /* ============================================
       DEPRECATED METHODS (Backward Compatibility)
       ============================================ */
    
    /**
     * Create standalone add exercise form offcanvas
     * @deprecated Use createExerciseGroupEditor({ mode: 'single', ... }) instead
     * This method is now a thin wrapper for backward compatibility
     * @param {Object} config - Configuration options
     * @param {string} config.title - Offcanvas title (default: 'Add Exercise')
     * @param {string} config.exerciseName - Pre-fill exercise name
     * @param {string} config.sets - Default sets value
     * @param {string} config.reps - Default reps value
     * @param {string} config.rest - Default rest value
     * @param {string} config.weight - Default weight value
     * @param {string} config.weightUnit - Weight unit (lbs/kg/other)
     * @param {string} config.buttonText - Submit button text (default: 'Add Exercise')
     * @param {string} config.buttonIcon - Submit button icon (default: 'bx-plus-circle')
     * @param {Function} onAddExercise - Callback when exercise is added
     * @param {Function} onSearchClick - Optional callback when search button is clicked
     * @returns {Object} Offcanvas instance
     */
    static createAddExerciseForm(config = {}, onAddExercise, onSearchClick = null) {
        console.warn('⚠️ createAddExerciseForm is deprecated. Use createExerciseGroupEditor({ mode: "single", ... }) instead.');
        
        // Extract config options
        const {
            title = 'Add Exercise',
            exerciseName = '',
            sets = '3',
            reps = '12',
            rest = '60s',
            weight = '',
            weightUnit = 'lbs',
            buttonText = 'Add Exercise',
            buttonIcon = 'bx-plus-circle'
        } = config;
        
        // Delegate to createExerciseGroupEditor with mode='single'
        return createExerciseGroupEditor(
            {
                mode: 'single',
                title,
                exercises: { a: exerciseName, b: '', c: '' },
                sets,
                reps,
                rest,
                weight,
                weightUnit,
                isNew: true
            },
            // onSave callback - transform groupData to match old exerciseData format
            async (groupData) => {
                const exerciseData = {
                    name: groupData.exercises.a,
                    sets: groupData.sets,
                    reps: groupData.reps,
                    rest: groupData.rest,
                    weight: groupData.default_weight,
                    weight_unit: groupData.default_weight_unit
                };
                await onAddExercise(exerciseData);
            },
            // onDelete callback (not used)
            async () => {
                console.warn('⚠️ Delete not applicable in deprecated createAddExerciseForm');
            },
            // onSearchClick callback
            onSearchClick ? (slotKey, populateCallback) => {
                // Old API expects just populateCallback
                onSearchClick(populateCallback);
            } : null
        );
    }
}

// Export globally for backward compatibility
window.UnifiedOffcanvasFactory = UnifiedOffcanvasFactory;

// Expose cleanup utility globally for debugging
window.cleanupOffcanvasBackdrops = UnifiedOffcanvasFactory.forceCleanupBackdrops;

// Export for module use
export default UnifiedOffcanvasFactory;

// Also export individual functions for direct import if needed
export {
    // Helpers
    createOffcanvas,
    escapeHtml,
    forceCleanupBackdrops,
    
    // Menu
    createMenuOffcanvas,
    createWorkoutSelectionPrompt,
    
    // Exercise
    createBonusExercise,
    createExerciseSearchOffcanvas,
    createExerciseFilterOffcanvas,
    
    // Workout
    createWeightEdit,
    setupWeightEditListeners,
    createCompleteWorkout,
    createCompletionSummary,
    createResumeSession,
    
    // Forms
    createFilterOffcanvas,
    createSkipExercise,
    createExerciseGroupEditor,
    renderAlternateSlot
};

console.log('📦 UnifiedOffcanvasFactory v3.0.0 (modular) loaded');
