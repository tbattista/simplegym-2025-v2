/**
 * MuscleGroupSummaryService - Aggregates and formats muscle group information from workout exercises
 *
 * Provides dynamic muscle group summaries like "Chest x3 • Shoulders x2 • Triceps"
 * computed from exercise data. Does not modify stored tags - purely for display.
 */

class MuscleGroupSummaryService {
    constructor() {
        this.exerciseCache = null;
    }

    /**
     * Get exercise cache service (lazy initialization)
     */
    getExerciseCache() {
        if (!this.exerciseCache && window.exerciseCacheService) {
            this.exerciseCache = window.exerciseCacheService;
        }
        return this.exerciseCache;
    }

    /**
     * Aggregate muscle groups from exercise groups
     * @param {Array} exerciseGroups - From workout.exercise_groups
     * @param {Object} options
     * @param {number} options.maxDisplay - Max muscles to show (default: Infinity)
     * @param {boolean} options.showUnknown - Show "+ N other" suffix (default: false)
     * @returns {MuscleGroupSummary}
     */
    aggregate(exerciseGroups, options = {}) {
        const { maxDisplay = Infinity, showUnknown = false } = options;

        const muscleGroups = new Map();
        let totalExercises = 0;
        let unknownCount = 0;

        // Iterate all exercise groups
        for (const group of exerciseGroups || []) {
            if (!group.exercises) continue;

            // Each group can have exercises in slots a, b, c (for supersets)
            for (const [slot, exerciseName] of Object.entries(group.exercises)) {
                if (!exerciseName?.trim()) continue;

                totalExercises++;
                const muscleGroup = this.getMuscleGroup(exerciseName.trim());

                if (muscleGroup) {
                    const current = muscleGroups.get(muscleGroup) || 0;
                    muscleGroups.set(muscleGroup, current + 1);
                } else {
                    unknownCount++;
                }
            }
        }

        // Sort by count descending, then alphabetically
        const sorted = Array.from(muscleGroups.entries())
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1]; // count desc
                return a[0].localeCompare(b[0]);        // alpha for ties
            });

        // Apply display limit
        const limited = sorted.slice(0, maxDisplay);

        // Format strings: "Chest x3" or "Triceps" (no count if 1)
        const formatted = limited.map(([name, count]) =>
            count > 1 ? `${name} x${count}` : name
        );

        // Build display text with bullet separator
        let displayText = formatted.join(' • ');

        // Optionally append unknown count
        if (showUnknown && unknownCount > 0) {
            const suffix = unknownCount === 1 ? '+ 1 other' : `+ ${unknownCount} other`;
            displayText = displayText ? `${displayText} ${suffix}` : suffix;
        }

        return {
            muscleGroups,
            totalExercises,
            unknownCount,
            formatted,
            displayText
        };
    }

    /**
     * Look up muscle group for an exercise name
     * @param {string} exerciseName - Name of the exercise
     * @returns {string|null} - Muscle group name or null if not found
     */
    getMuscleGroup(exerciseName) {
        const cache = this.getExerciseCache();
        if (!cache) return null;

        const lowerName = exerciseName.toLowerCase();

        // Search both global and custom exercises
        const allExercises = [
            ...(cache.exercises || []),
            ...(cache.customExercises || [])
        ];

        const match = allExercises.find(ex =>
            ex.name?.toLowerCase() === lowerName
        );

        return match?.targetMuscleGroup || null;
    }

    // ==========================================
    // Convenience methods for different contexts
    // ==========================================

    /**
     * For workout cards in database list (compact)
     * @param {Array} exerciseGroups
     * @returns {MuscleGroupSummary}
     */
    forCard(exerciseGroups) {
        return this.aggregate(exerciseGroups, {
            maxDisplay: 3,
            showUnknown: false
        });
    }

    /**
     * For workout builder/editor (full detail)
     * @param {Array} exerciseGroups
     * @returns {MuscleGroupSummary}
     */
    forEditor(exerciseGroups) {
        return this.aggregate(exerciseGroups, {
            maxDisplay: Infinity,
            showUnknown: true
        });
    }

    /**
     * For workout detail modal (balanced)
     * @param {Array} exerciseGroups
     * @returns {MuscleGroupSummary}
     */
    forDetail(exerciseGroups) {
        return this.aggregate(exerciseGroups, {
            maxDisplay: 5,
            showUnknown: true
        });
    }
}

// Create singleton instance
window.muscleGroupSummaryService = new MuscleGroupSummaryService();

console.log('💪 Muscle Group Summary Service loaded');
