/**
 * Ghost Gym - Weight History Service
 * Manages exercise weight history fetching and caching
 * Extracted from WorkoutSessionService for single responsibility
 * @version 1.0.0
 * @date 2026-02-06
 */

class WeightHistoryService {
    constructor(options = {}) {
        // State
        this.exerciseHistory = {};

        // Callbacks for session service coordination
        this.onHistoryLoaded = options.onHistoryLoaded || (() => {});
        this.onExerciseOrderFromHistory = options.onExerciseOrderFromHistory || (() => {});

        console.log('📊 Weight History Service initialized');
    }

    /**
     * Fetch exercise history for a workout
     * @param {string} workoutId - Workout ID
     * @returns {Promise<Object>} Exercise history object
     */
    async fetchExerciseHistory(workoutId) {
        try {
            console.log('📊 Fetching exercise history for workout:', workoutId);

            // Get auth token
            const token = await window.authService.getIdToken();
            if (!token) {
                console.warn('No auth token, skipping history fetch');
                this.exerciseHistory = {};
                return this.exerciseHistory;
            }

            // Use centralized API config - CORRECT endpoint path
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/history/workout/${workoutId}`);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch history: ${response.statusText}`);
            }

            const historyData = await response.json();

            // Cache exercise history
            this.exerciseHistory = historyData.exercises || {};

            console.log('✅ Exercise history loaded:', Object.keys(this.exerciseHistory).length, 'exercises');

            // DEBUG: Log each exercise history with direction data
            console.group('🔍 DEBUG: Exercise History Details');
            Object.entries(this.exerciseHistory).forEach(([exerciseName, history]) => {
                console.log(`📋 ${exerciseName}:`, {
                    last_weight: history.last_weight,
                    last_weight_unit: history.last_weight_unit,
                    last_weight_direction: history.last_weight_direction,
                    last_session_date: history.last_session_date
                });
            });
            console.groupEnd();

            // Check for last session's custom exercise order
            if (historyData.last_exercise_order && Array.isArray(historyData.last_exercise_order)) {
                console.log('📋 Last session had custom order:', historyData.last_exercise_order.length, 'exercises');
                this.onExerciseOrderFromHistory(historyData.last_exercise_order);
                console.log('✅ Custom order from last session applied');
            }

            // Notify listeners
            this.onHistoryLoaded(this.exerciseHistory);

            return this.exerciseHistory;

        } catch (error) {
            console.error('❌ Error fetching exercise history:', error);
            // Non-fatal error - continue without history
            this.exerciseHistory = {};
            return this.exerciseHistory;
        }
    }

    /**
     * Get last weight direction from history (for display on load)
     * @param {string} exerciseName - Exercise name
     * @returns {string|null} 'up', 'down', or null
     */
    getLastWeightDirection(exerciseName) {
        return this.exerciseHistory?.[exerciseName]?.last_weight_direction || null;
    }

    /**
     * Get exercise history for a specific exercise
     * @param {string} exerciseName - Exercise name
     * @returns {Object|null} Exercise history or null
     */
    getExerciseHistory(exerciseName) {
        return this.exerciseHistory[exerciseName] || null;
    }

    /**
     * Get all exercise history
     * @returns {Object} All exercise history
     */
    getAllHistory() {
        return this.exerciseHistory;
    }

    /**
     * Clear cached history
     */
    clearHistory() {
        this.exerciseHistory = {};
        console.log('🧹 Exercise history cleared');
    }

    /**
     * Check if history has been loaded for an exercise
     * @param {string} exerciseName - Exercise name
     * @returns {boolean} True if history exists
     */
    hasHistory(exerciseName) {
        return !!this.exerciseHistory[exerciseName];
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeightHistoryService;
}

console.log('📦 Weight History Service loaded');
