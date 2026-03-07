/**
 * Exercise Data Utility
 * Normalizes exercise data across legacy (exercise_groups) and modern (sections) formats.
 * Single source of truth — all display consumers should use these methods
 * instead of reading exercise_groups/sections directly.
 * @version 1.0.0
 */
const ExerciseDataUtils = {

    /**
     * Convert sections → exercise_groups format.
     * Canonical implementation used by both save pipeline and display consumers.
     */
    sectionsToExerciseGroups(sections) {
        const groups = [];

        (sections || []).forEach(section => {
            const isNamed = section.type !== 'standard';
            const blockId = isNamed ? section.section_id : null;

            (section.exercises || []).forEach(exercise => {
                const exercises = {};
                if (exercise.name) exercises.a = exercise.name;
                (exercise.alternates || []).forEach((alt, i) => {
                    if (alt) exercises[String.fromCharCode(98 + i)] = alt;
                });

                const group = {
                    group_id: exercise.exercise_id,
                    group_type: exercise.group_type || (isNamed ? 'block' : 'standard'),
                    exercises: exercises,
                    sets: (exercise.group_type === 'cardio') ? '' : (exercise.sets || '3'),
                    reps: (exercise.group_type === 'cardio') ? '' : (exercise.reps || '8-12'),
                    rest: (exercise.group_type === 'cardio') ? '' : (exercise.rest || '60s'),
                    default_weight: exercise.default_weight || null,
                    default_weight_unit: exercise.default_weight_unit || 'lbs'
                };

                if (blockId) {
                    group.block_id = blockId;
                    group.group_name = section.name || null;
                }
                if (exercise.cardio_config) group.cardio_config = exercise.cardio_config;
                if (exercise.interval_config) group.interval_config = exercise.interval_config;

                groups.push(group);
            });
        });

        return groups;
    },

    /**
     * Get exercise_groups from workout data, normalizing from sections if needed.
     * @param {Object} workoutData - Workout object (may have exercise_groups, sections, or both)
     * @returns {Array} exercise_groups array
     */
    getExerciseGroups(workoutData) {
        if (!workoutData) return [];
        if (workoutData.exercise_groups && workoutData.exercise_groups.length > 0) {
            return workoutData.exercise_groups;
        }
        if (workoutData.sections && workoutData.sections.length > 0) {
            return this.sectionsToExerciseGroups(workoutData.sections);
        }
        return [];
    },

    /**
     * Get flat list of exercise names from either format.
     * @param {Object} workoutData
     * @returns {string[]}
     */
    getExerciseNames(workoutData) {
        const groups = this.getExerciseGroups(workoutData);
        const names = [];
        groups.forEach(group => {
            if (group.exercises) {
                Object.values(group.exercises).forEach(name => {
                    if (name) names.push(name);
                });
            }
        });
        return names;
    },

    /**
     * Count total individual exercises (including alternates) from either format.
     * @param {Object} workoutData
     * @returns {number}
     */
    getExerciseCount(workoutData) {
        const groups = this.getExerciseGroups(workoutData);
        let count = 0;
        groups.forEach(group => {
            count += Object.keys(group.exercises || {}).length;
        });
        return count;
    },

    /**
     * Count exercise groups (one per exercise entry, not counting alternates separately).
     * @param {Object} workoutData
     * @returns {number}
     */
    getGroupCount(workoutData) {
        return this.getExerciseGroups(workoutData).length;
    }
};

// Expose globally
window.ExerciseDataUtils = ExerciseDataUtils;

// Backward-compat alias for save pipeline and other callers
window.sectionsToExerciseGroups = ExerciseDataUtils.sectionsToExerciseGroups.bind(ExerciseDataUtils);

console.log('📦 Exercise Data Utils loaded');
