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
    createWorkoutSelectionPrompt,
    createBuilderResumePrompt
} from './offcanvas-menu.js';

// Import exercise components
import { createExerciseSearchOffcanvas } from './offcanvas-exercise-search.js';
import { createExerciseFilterOffcanvas } from './offcanvas-exercise-filter.js';
import { createExerciseDetailView } from './offcanvas-exercise-detail-view.js';

// Import workout session components
import {
    createWeightEdit,
    setupWeightEditListeners,
    createCompleteWorkout,
    createCompletionSummary,
    createResumeSession
} from './offcanvas-workout-session.js';

// Import plate calculator settings
import {
    createPlateSettings
} from './offcanvas-plate-settings.js';

// Import reorder components (exercise + sections)
import {
    createReorderOffcanvas,
    createSectionsReorderOffcanvas
} from './offcanvas-reorder.js';

// Import form components
import {
    createConfirmOffcanvas,
    createFilterOffcanvas,
    createSkipExercise,
    createExerciseGroupEditor,
    renderAlternateSlot,
    createExerciseDetailsEditor
} from './offcanvas-forms.js?v=20260217-02';

// Import note components
import {
    createTemplateNoteEditor,
    createNotePositionPicker
} from './offcanvas-notes.js';

// Import cardio editor
import {
    createCardioEditor
} from './offcanvas-cardio-editor.js';

// Import activity display settings
import {
    createActivityDisplaySettings
} from './offcanvas-activity-display-settings.js?v=20260226-02';

// Import feedback components
import {
    createFeedbackOffcanvas
} from './offcanvas-feedback.js';

// Import import components
import {
    createImportWizard
} from './offcanvas-import.js';

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

    static createBuilderResumePrompt(workoutData, onContinue, onCreate) {
        return createBuilderResumePrompt(workoutData, onContinue, onCreate);
    }
    
    /* ============================================
       EXERCISE OFFCANVAS
       ============================================ */
    
    static createExerciseSearchOffcanvas(config = {}, onSelectExercise) {
        return createExerciseSearchOffcanvas(config, onSelectExercise);
    }
    
    static createExerciseFilterOffcanvas(config, onApply) {
        return createExerciseFilterOffcanvas(config, onApply);
    }

    static createExerciseDetailView(exercise, options) {
        return createExerciseDetailView(exercise, options);
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
    
    static createResumeSession(data, onResume, onStartFresh, onCancel, onEnd) {
        return createResumeSession(data, onResume, onStartFresh, onCancel, onEnd);
    }
    
    static createPlateSettings(onSave) {
        return createPlateSettings(onSave);
    }
    
    static createReorderOffcanvas(exercises, onSave) {
        return createReorderOffcanvas(exercises, onSave);
    }

    static createSectionsReorderOffcanvas(sections, onSave) {
        return createSectionsReorderOffcanvas(sections, onSave);
    }
    
    /* ============================================
       FORM OFFCANVAS
       ============================================ */

    static createConfirmOffcanvas(config) {
        return createConfirmOffcanvas(config);
    }

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
    
    static createExerciseDetailsEditor(data, onSave) {
        return createExerciseDetailsEditor(data, onSave);
    }

    /* ============================================
       NOTE OFFCANVAS
       ============================================ */

    static createTemplateNoteEditor(config) {
        return createTemplateNoteEditor(config);
    }

    static createNotePositionPicker(config) {
        return createNotePositionPicker(config);
    }

    /* ============================================
       CARDIO OFFCANVAS
       ============================================ */

    static createCardioEditor(config) {
        return createCardioEditor(config);
    }

    static createActivityDisplaySettings(config) {
        return createActivityDisplaySettings(config);
    }

    /* ============================================
       FEEDBACK OFFCANVAS
       ============================================ */

    static createFeedbackOffcanvas(config) {
        return createFeedbackOffcanvas(config);
    }

    /* ============================================
       IMPORT OFFCANVAS
       ============================================ */

    static createImportWizard(onImportComplete) {
        return createImportWizard(onImportComplete);
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
    createBuilderResumePrompt,
    
    // Exercise
    createExerciseSearchOffcanvas,
    createExerciseFilterOffcanvas,
    createExerciseDetailView,
    
    // Workout
    createWeightEdit,
    setupWeightEditListeners,
    createCompleteWorkout,
    createCompletionSummary,
    createResumeSession,
    createPlateSettings,
    createReorderOffcanvas,
    createSectionsReorderOffcanvas,

    // Forms
    createConfirmOffcanvas,
    createFilterOffcanvas,
    createSkipExercise,
    createExerciseGroupEditor,
    renderAlternateSlot,
    createExerciseDetailsEditor,

    // Feedback
    createFeedbackOffcanvas,

    // Import
    createImportWizard,

    // Cardio
    createCardioEditor,
    createActivityDisplaySettings
};

console.log('📦 UnifiedOffcanvasFactory v3.0.0 (modular) loaded');
