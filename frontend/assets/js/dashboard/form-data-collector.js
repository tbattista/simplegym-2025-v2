/**
 * Form Data Collector Module
 * Pure data-extraction utilities for reading workout form state
 * Extracted from workouts.js
 */

const FormDataCollector = {

    /**
     * Collect exercise groups from card data storage
     * @returns {Array} Array of exercise group objects
     */
    collectExerciseGroups() {
        const groups = [];

        const cardElements = document.querySelectorAll('#exerciseGroups .exercise-group-card');

        cardElements.forEach(cardEl => {
            const groupId = cardEl.getAttribute('data-group-id');
            const groupData = window.exerciseGroupsData[groupId];

            if (!groupData) {
                console.warn('⚠️ Missing exercise group data for groupId:', groupId);
                console.warn('⚠️ Available groupIds:', Object.keys(window.exerciseGroupsData));
                return;
            }

            if (groupData && groupData.exercises) {
                const exercises = {};
                Object.keys(groupData.exercises).forEach(key => {
                    if (groupData.exercises[key]) {
                        exercises[key] = groupData.exercises[key];
                    }
                });

                // For standard groups, require exercise 'a'; for blocks, require at least one exercise
                const isBlock = groupData.group_type === 'block';
                const hasRequiredExercises = isBlock
                    ? Object.keys(exercises).length > 0
                    : !!exercises.a;

                if (hasRequiredExercises) {
                    const groupEntry = {
                        group_id: groupId,
                        group_type: groupData.group_type || 'standard',
                        exercises: exercises,
                        sets: groupData.sets || '3',
                        reps: groupData.reps || '8-12',
                        rest: groupData.rest || '60s',
                        default_weight: groupData.default_weight || null,
                        default_weight_unit: groupData.default_weight_unit || 'lbs'
                    };

                    // Include optional fields if present
                    if (groupData.block_id) {
                        groupEntry.block_id = groupData.block_id;
                    }
                    if (groupData.group_name) {
                        groupEntry.group_name = groupData.group_name;
                    }
                    if (groupData.cardio_config) {
                        groupEntry.cardio_config = groupData.cardio_config;
                    }
                    if (groupData.interval_config) {
                        groupEntry.interval_config = groupData.interval_config;
                    }

                    groups.push(groupEntry);
                }
            }
        });

        console.log('🔍 Collected', groups.length, 'exercise groups');
        return groups;
    },

    /**
     * Collect bonus exercises from card data storage
     * @returns {Array} Array of bonus exercise objects
     */
    collectBonusExercises() {
        const bonusExercises = [];

        const cardElements = document.querySelectorAll('#bonusExercises .bonus-exercise-card');

        cardElements.forEach(cardEl => {
            const bonusId = cardEl.getAttribute('data-bonus-id');
            const bonusData = window.bonusExercisesData[bonusId];

            if (bonusData && bonusData.name) {
                bonusExercises.push({
                    name: bonusData.name,
                    sets: bonusData.sets || '2',
                    reps: bonusData.reps || '15',
                    rest: bonusData.rest || '30s'
                });
            }
        });

        console.log('🔍 Collected', bonusExercises.length, 'bonus exercises');
        return bonusExercises;
    }
};

// Expose module
window.FormDataCollector = FormDataCollector;

// Backward-compat globals
window.collectExerciseGroups = FormDataCollector.collectExerciseGroups;
window.collectBonusExercises = FormDataCollector.collectBonusExercises;

console.log('📦 FormDataCollector module loaded');
