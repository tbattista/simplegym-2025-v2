/**
 * Fitness Field Notes - Workout Landing Manager
 * Manages the landing page shown when no workout is in progress
 * Provides workout suggestions based on rest days
 * @version 1.0.0
 * @date 2026-02-13
 */

class WorkoutLandingManager {
    constructor(options) {
        this.dataManager = options.dataManager;
        this.uiStateManager = options.uiStateManager;
        this.authService = options.authService;

        console.log('🏠 Workout Landing Manager initialized');
    }

    /**
     * Show landing page when no workout is in progress
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    async show(isAuthenticated) {
        console.log('📄 Showing landing page, authenticated:', isAuthenticated);

        let suggestion = null;
        if (isAuthenticated) {
            try {
                suggestion = await this.getSuggestion();
            } catch (error) {
                console.warn('⚠️ Failed to get landing suggestion:', error);
            }
        }

        this.uiStateManager.showLanding({
            isAuthenticated,
            suggestion
        });
    }

    /**
     * Get workout suggestion for landing page
     * Suggests the workout with the longest rest period
     * @returns {Promise<Object|null>} Suggestion object or null
     */
    async getSuggestion() {
        try {
            const user = window.firebaseAuth?.currentUser;
            if (!user) return null;

            const idToken = await user.getIdToken();

            // Fetch recent completed sessions
            const response = await fetch('/api/v3/workout-sessions?status=completed&page_size=50', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            const sessions = data.sessions || [];

            // Build map of workout_id -> most recent completion date
            const lastDoneMap = new Map();
            for (const session of sessions) {
                if (session.workout_id && session.completed_at && !lastDoneMap.has(session.workout_id)) {
                    lastDoneMap.set(session.workout_id, session.completed_at);
                }
            }

            // Get all user workouts
            const workouts = await this.dataManager.getWorkouts();
            if (!workouts || workouts.length === 0) return null;

            // Calculate days since last done for each workout
            const workoutsWithRest = workouts.map(workout => {
                const lastDone = lastDoneMap.get(workout.id);
                const daysAgo = lastDone ? this._getDaysAgo(lastDone) : Infinity;
                return { workout, lastDone, daysAgo };
            });

            // Filter to workouts not done in 2+ days, sort by oldest first
            const rested = workoutsWithRest
                .filter(w => w.daysAgo >= 2)
                .sort((a, b) => b.daysAgo - a.daysAgo);

            if (rested.length > 0) {
                const suggestion = rested[0];
                const message = suggestion.daysAgo === Infinity
                    ? 'Never done - give it a try!'
                    : suggestion.daysAgo === 2
                        ? 'Last done 2 days ago'
                        : `Last done ${suggestion.daysAgo} days ago`;

                return { type: 'suggest', workout: suggestion.workout, lastDone: suggestion.lastDone, message };
            }

            // All workouts done recently - suggest the oldest one anyway
            if (workoutsWithRest.length > 0) {
                const oldest = workoutsWithRest.sort((a, b) => b.daysAgo - a.daysAgo)[0];
                if (oldest.daysAgo < Infinity) {
                    return {
                        type: 'suggest',
                        workout: oldest.workout,
                        lastDone: oldest.lastDone,
                        message: oldest.daysAgo === 0 ? 'Done today - rest up!' :
                                 oldest.daysAgo === 1 ? 'Done yesterday' :
                                 `Last done ${oldest.daysAgo} days ago`
                    };
                }
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Error getting landing suggestion:', error);
            return null;
        }
    }

    /**
     * Calculate days since a date
     * @param {string} dateString - ISO date string
     * @returns {number} Days ago (0 = today)
     */
    _getDaysAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        date.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = now - date;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutLandingManager;
}

console.log('📦 Workout Landing Manager loaded');
