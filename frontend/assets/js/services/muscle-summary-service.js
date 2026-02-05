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
     * Check if the exercise cache is ready (has exercises loaded)
     * @returns {boolean}
     */
    isCacheReady() {
        const cache = this.getExerciseCache();
        if (!cache) return false;

        // Cache is ready if we have exercises OR seed data is available
        return (cache.exercises?.length > 0) ||
               (window.EXERCISE_SEED_DATA?.length > 0);
    }

    /**
     * Ensure cache has exercises loaded (trigger load if needed)
     * Uses seed data for instant results
     */
    ensureCacheLoaded() {
        const cache = this.getExerciseCache();
        if (!cache) return;

        // If cache is empty but seed data exists, use it directly
        if ((!cache.exercises || cache.exercises.length === 0) && window.EXERCISE_SEED_DATA?.length > 0) {
            cache.exercises = window.EXERCISE_SEED_DATA;
            cache.seedDataUsed = true;
        }
    }

    /**
     * Look up muscle group for an exercise name
     * Uses tiered matching: exact > contains > partial words
     * @param {string} exerciseName - Name of the exercise
     * @returns {string|null} - Muscle group name or null if not found
     */
    getMuscleGroup(exerciseName) {
        const cache = this.getExerciseCache();
        if (!cache) return null;

        // Ensure cache is loaded before looking up
        this.ensureCacheLoaded();

        const lowerName = exerciseName.toLowerCase().trim();

        // Search both global and custom exercises
        const allExercises = [
            ...(cache.exercises || []),
            ...(cache.customExercises || [])
        ];

        // Tier 1: Exact match
        const exactMatch = allExercises.find(ex =>
            ex.name?.toLowerCase() === lowerName
        );
        if (exactMatch) {
            return exactMatch.targetMuscleGroup;
        }

        // Tier 2: User's exercise name is contained in database name
        // e.g., "Back Squat" matches "Barbell Back Squat"
        const containsMatch = allExercises.find(ex =>
            ex.name?.toLowerCase().includes(lowerName)
        );
        if (containsMatch) {
            return containsMatch.targetMuscleGroup;
        }

        // Tier 3: Database name is contained in user's exercise name
        // e.g., "Bench Press with pause" matches "Bench Press"
        const reverseMatch = allExercises.find(ex => {
            const dbName = ex.name?.toLowerCase();
            return dbName && lowerName.includes(dbName);
        });
        if (reverseMatch) {
            return reverseMatch.targetMuscleGroup;
        }

        // Tier 4: Key word matching (for compound names)
        // e.g., "DB Bench" matches "Dumbbell Bench Press"
        const searchWords = lowerName.split(/\s+/).filter(w => w.length > 2);
        if (searchWords.length >= 2) {
            const wordMatch = allExercises.find(ex => {
                const dbName = ex.name?.toLowerCase() || '';
                // Must match at least 2 significant words
                const matchCount = searchWords.filter(word => dbName.includes(word)).length;
                return matchCount >= 2;
            });
            if (wordMatch) {
                return wordMatch.targetMuscleGroup;
            }
        }

        return null;
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
