/**
 * Ghost Gym - Session Bonus Exercise Service
 * Manages bonus exercise CRUD, pre-workout bonuses, and bonus history API
 * Extracted from WorkoutSessionService for single responsibility
 * @version 1.0.0
 * @date 2026-02-14
 */

class SessionBonusExerciseService {
    constructor(options = {}) {
        // State
        this.preWorkoutBonusExercises = [];

        // Callbacks for session service coordination
        this.onGetCurrentSession = options.onGetCurrentSession || (() => null);
        this.onGetExerciseOrder = options.onGetExerciseOrder || (() => []);
        this.onSetExerciseOrder = options.onSetExerciseOrder || (() => {});
        this.onNotify = options.onNotify || (() => {});
        this.onPersist = options.onPersist || (() => {});

        console.log('\ud83c\udfb0 Session Bonus Exercise Service initialized');
    }

    /**
     * Add bonus exercise to current session OR pre-workout list
     * @param {Object} exerciseData - Exercise data object with name, sets, reps, etc.
     * @param {number|null} insertAtIndex - Optional index to insert at
     */
    addBonusExercise(exerciseData, insertAtIndex = null) {
        const { name, sets, reps, rest, weight = '', weight_unit = 'lbs', notes = '' } = exerciseData;
        const currentSession = this.onGetCurrentSession();

        // If no active session, add to pre-workout list
        if (!currentSession) {
            console.log('\ud83d\udcdd Adding bonus exercise to pre-workout list:', name);

            const exerciseToAdd = {
                name,
                sets: sets || '3',
                reps: reps || '12',
                rest: rest || '60s',
                weight: weight || '',
                weight_unit: weight_unit,
                notes: notes || ''
            };

            if (insertAtIndex !== null && insertAtIndex >= 0 && insertAtIndex < this.preWorkoutBonusExercises.length) {
                this.preWorkoutBonusExercises.splice(insertAtIndex, 0, exerciseToAdd);
                console.log(`\u2705 Pre-workout bonus inserted at index ${insertAtIndex}`);
            } else {
                this.preWorkoutBonusExercises.push(exerciseToAdd);
                console.log(`\u2705 Pre-workout bonus added at end`);
            }

            this.onNotify('preWorkoutBonusExerciseAdded', { name });
            console.log(`\u2705 Pre-workout bonus added. Total pre-workout bonuses: ${this.preWorkoutBonusExercises.length}`);
            return;
        }

        // Active session - add to session exercises
        if (!currentSession.exercises) {
            currentSession.exercises = {};
        }

        const existingExerciseCount = Object.keys(currentSession.exercises).length;
        const order_index = insertAtIndex !== null ? insertAtIndex : existingExerciseCount;

        const bonusExercise = {
            weight: weight || '',
            weight_unit: weight_unit,
            previous_weight: null,
            weight_change: 0,
            target_sets: sets || '3',
            target_reps: reps || '12',
            rest: rest || '60s',
            notes: notes || '',
            is_bonus: true,
            order_index: order_index,
            is_modified: false,
            is_skipped: false
        };

        currentSession.exercises[name] = bonusExercise;
        console.log('\u2705 Bonus exercise added to session:', name, 'at order_index:', order_index);

        // If inserting at a specific index, update the exercise order
        if (insertAtIndex !== null) {
            let currentOrder = this.onGetExerciseOrder();

            if (currentOrder.length === 0) {
                currentOrder = Object.entries(currentSession.exercises)
                    .sort(([, a], [, b]) => (a.order_index || 0) - (b.order_index || 0))
                    .map(([exerciseName]) => exerciseName);
            }

            const existingIndex = currentOrder.indexOf(name);
            if (existingIndex !== -1) {
                currentOrder.splice(existingIndex, 1);
            }

            const validIndex = Math.min(Math.max(0, insertAtIndex), currentOrder.length);
            currentOrder.splice(validIndex, 0, name);

            this.onSetExerciseOrder(currentOrder);
            console.log('\u2705 Exercise order updated with inserted exercise at position', validIndex);
        }

        console.log('\ud83d\udcca Session now has', Object.keys(currentSession.exercises).length, 'total exercises');
        this.onNotify('bonusExerciseAdded', { exerciseName: name, ...bonusExercise });
        this.onPersist();
    }

    /**
     * Remove bonus exercise from current session OR pre-workout list
     * @param {number|string} indexOrName - Index for pre-workout list, name for session
     */
    removeBonusExercise(indexOrName) {
        const currentSession = this.onGetCurrentSession();

        // If no active session, remove from pre-workout list by index
        if (!currentSession) {
            if (typeof indexOrName === 'number' && indexOrName >= 0 && indexOrName < this.preWorkoutBonusExercises.length) {
                const removed = this.preWorkoutBonusExercises.splice(indexOrName, 1)[0];
                console.log('\ud83d\uddd1\ufe0f Pre-workout bonus exercise removed:', removed.name);
                this.onNotify('preWorkoutBonusExerciseRemoved', { name: removed.name });
            }
            return;
        }

        // Active session - remove by name
        if (currentSession.exercises && currentSession.exercises[indexOrName]?.is_bonus) {
            delete currentSession.exercises[indexOrName];
            console.log('\ud83d\uddd1\ufe0f Bonus exercise removed from session:', indexOrName);
            this.onNotify('bonusExerciseRemoved', { exerciseName: indexOrName });
            this.onPersist();
        }
    }

    /**
     * Get all bonus exercises from current session OR pre-workout list
     * Normalizes property names for consistent rendering
     * @returns {Array} Array of bonus exercise objects
     */
    getBonusExercises() {
        const currentSession = this.onGetCurrentSession();

        // If no active session, return pre-workout list
        if (!currentSession) {
            console.log('\ud83d\udccb getBonusExercises(): Returning pre-workout list (' + this.preWorkoutBonusExercises.length + ' exercises)');
            return this.preWorkoutBonusExercises;
        }

        // Active session - return from session exercises
        if (!currentSession.exercises) {
            console.log('\ud83d\udccb getBonusExercises(): No session exercises, returning empty array');
            return [];
        }

        // Normalize property names to match what renderWorkout() expects
        const bonusExercises = Object.entries(currentSession.exercises)
            .filter(([name, data]) => data.is_bonus)
            .map(([name, data]) => ({
                name: name,
                sets: data.target_sets || data.sets || '3',
                reps: data.target_reps || data.reps || '12',
                rest: data.rest || '60s',
                weight: data.weight || '',
                weight_unit: data.weight_unit || 'lbs',
                notes: data.notes || '',
                target_sets: data.target_sets,
                target_reps: data.target_reps,
                is_bonus: true,
                order_index: data.order_index
            }));

        console.log(`\ud83d\udccb getBonusExercises(): Returning ${bonusExercises.length} bonus exercises from session`);
        return bonusExercises;
    }

    /**
     * Get pre-workout bonus exercises
     * @returns {Array} Array of pre-workout bonus exercises
     */
    getPreWorkoutBonusExercises() {
        return this.preWorkoutBonusExercises;
    }

    /**
     * Clear pre-workout bonus exercises
     */
    clearPreWorkoutBonusExercises() {
        this.preWorkoutBonusExercises = [];
        console.log('\ud83e\uddf9 Pre-workout bonus exercises cleared');
    }

    /**
     * Transfer pre-workout bonus exercises to active session (immediate, no API calls)
     * Called during session creation
     */
    transferPreWorkoutBonusesImmediate() {
        const currentSession = this.onGetCurrentSession();
        if (!currentSession || this.preWorkoutBonusExercises.length === 0) {
            return;
        }

        const exerciseCountBefore = Object.keys(currentSession.exercises || {}).length;
        console.log('\ud83d\udcca Session exercises before transfer:', exerciseCountBefore);

        this.preWorkoutBonusExercises.forEach((bonus, index) => {
            console.log(`  ${index + 1}. Adding: ${bonus.name}`);

            const order_index = Object.keys(currentSession.exercises).length;

            currentSession.exercises[bonus.name] = {
                weight: bonus.weight || '',
                weight_unit: bonus.weight_unit || 'lbs',
                previous_weight: null,
                weight_change: 0,
                target_sets: bonus.sets || '3',
                target_reps: bonus.reps || '12',
                rest: bonus.rest || '60s',
                notes: bonus.notes || '',
                is_bonus: true,
                order_index: order_index,
                is_modified: false,
                is_skipped: false
            };
        });

        const exerciseCountAfter = Object.keys(currentSession.exercises || {}).length;
        console.log('\u2705 Transferred', this.preWorkoutBonusExercises.length, 'bonuses');
        console.log('\ud83d\udcca Session exercises after transfer:', exerciseCountAfter);

        this.preWorkoutBonusExercises = [];
        console.log('\ud83e\uddf9 Pre-workout bonus list cleared');
    }

    /**
     * Fetch bonus exercises from last session for this workout
     * @param {string} workoutId - Workout template ID
     * @returns {Promise<Array>} Array of bonus exercises from last session
     */
    async getLastSessionBonusExercises(workoutId) {
        try {
            console.log('\ud83d\udcca Fetching last session bonus exercises for workout:', workoutId);

            const token = await window.authService.getIdToken();
            if (!token) {
                console.warn('No auth token, skipping bonus history fetch');
                return [];
            }

            const url = window.config.api.getUrl(
                `/api/v3/workout-sessions/history/workout/${workoutId}/bonus`
            );

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch bonus history: ${response.statusText}`);
            }

            const data = await response.json();

            console.log('\u2705 Bonus exercise history loaded:', data.bonus_exercises?.length || 0, 'exercises');

            return data.bonus_exercises || [];

        } catch (error) {
            console.error('\u274c Error fetching bonus exercise history:', error);
            return [];
        }
    }

    /**
     * Debug helper: Get comprehensive bonus exercise state
     * Call from console: window.workoutSessionService.debugBonusExercises()
     * @returns {Object} Complete bonus exercise state information
     */
    debugBonusExercises() {
        const currentSession = this.onGetCurrentSession();
        const state = {
            hasActiveSession: !!currentSession,
            sessionId: currentSession?.id || null,
            preWorkoutBonuses: {
                count: this.preWorkoutBonusExercises.length,
                exercises: this.preWorkoutBonusExercises.map(b => ({
                    name: b.name,
                    sets: b.sets,
                    reps: b.reps,
                    weight: b.weight
                }))
            },
            sessionBonuses: {
                count: 0,
                exercises: []
            },
            allSessionExercises: {
                count: 0,
                regular: [],
                bonus: []
            }
        };

        if (currentSession?.exercises) {
            const allExercises = Object.entries(currentSession.exercises);
            state.allSessionExercises.count = allExercises.length;

            allExercises.forEach(([name, data]) => {
                const exerciseInfo = {
                    name,
                    is_bonus: data.is_bonus,
                    order_index: data.order_index,
                    sets: data.target_sets,
                    reps: data.target_reps,
                    weight: data.weight,
                    weight_unit: data.weight_unit
                };

                if (data.is_bonus) {
                    state.sessionBonuses.exercises.push(exerciseInfo);
                    state.allSessionExercises.bonus.push(exerciseInfo);
                } else {
                    state.allSessionExercises.regular.push(exerciseInfo);
                }
            });

            state.sessionBonuses.count = state.sessionBonuses.exercises.length;
        }

        console.group('\ud83d\udd0d Bonus Exercise Debug State');
        console.log('Session Active:', state.hasActiveSession);
        console.log('Session ID:', state.sessionId);
        console.log('---');
        console.log('Pre-Workout Bonuses:', state.preWorkoutBonuses.count);
        if (state.preWorkoutBonuses.count > 0) {
            console.table(state.preWorkoutBonuses.exercises);
        }
        console.log('---');
        console.log('Session Bonuses:', state.sessionBonuses.count);
        if (state.sessionBonuses.count > 0) {
            console.table(state.sessionBonuses.exercises);
        }
        console.log('---');
        console.log('All Session Exercises:', state.allSessionExercises.count);
        console.log('  Regular:', state.allSessionExercises.regular.length);
        console.log('  Bonus:', state.allSessionExercises.bonus.length);
        console.groupEnd();

        return state;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionBonusExerciseService;
}

console.log('\ud83d\udce6 Session Bonus Exercise Service loaded');
