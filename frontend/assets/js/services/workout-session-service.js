/**
 * Ghost Gym - Workout Session Service
 * Handles workout session lifecycle and weight logging
 * @version 1.0.0
 * @date 2025-11-07
 */

class WorkoutSessionService {
    constructor() {
        this.currentSession = null;
        this.exerciseHistory = {};
        this.autoSaveTimer = null;
        this.listeners = new Set();
        this.preWorkoutBonusExercises = []; // Store bonus exercises before session starts
        
        console.log('📦 Workout Session Service initialized');
    }
    
    /**
     * Start a new workout session
     * @param {string} workoutId - Workout ID
     * @param {string} workoutName - Workout name
     * @returns {Promise<Object>} Session object
     */
    async startSession(workoutId, workoutName) {
        try {
            console.log('🏋️ Starting workout session:', workoutName);
            
            // Get auth token from existing service
            const token = await window.authService.getIdToken();
            if (!token) {
                throw new Error('Authentication required. Please log in to track your workout.');
            }
            
            // Use centralized API config
            const url = window.config.api.getUrl('/api/v3/workout-sessions');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workout_id: workoutId,
                    workout_name: workoutName,
                    started_at: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to create session: ${response.statusText}`);
            }
            
            const session = await response.json();
            
            // Store current session
            this.currentSession = {
                id: session.id,
                workoutId: workoutId,
                workoutName: workoutName,
                startedAt: new Date(session.started_at),
                status: 'in_progress',
                exercises: {}
            };
            
            console.log('✅ Workout session started:', session.id);
            this.notifyListeners('sessionStarted', this.currentSession);
            
            // Persist session immediately after start
            this.persistSession();
            
            return this.currentSession;
            
        } catch (error) {
            console.error('❌ Error starting workout session:', error);
            throw error;
        }
    }
    
    /**
     * Complete the current workout session
     * @param {Array} exercisesPerformed - Array of exercise data
     * @returns {Promise<Object>} Completed session object
     */
    async completeSession(exercisesPerformed) {
        try {
            if (!this.currentSession || !this.currentSession.id) {
                throw new Error('No active session to complete');
            }
            
            console.log('🏁 Completing workout session:', this.currentSession.id);
            
            // Get auth token
            const token = await window.authService.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            
            // Use centralized API config
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/${this.currentSession.id}/complete`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    completed_at: new Date().toISOString(),
                    exercises_performed: exercisesPerformed,
                    notes: ''
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to complete session: ${response.statusText}`);
            }
            
            const completedSession = await response.json();
            
            // Update session status
            this.currentSession.status = 'completed';
            this.currentSession.completedAt = new Date(completedSession.completed_at);
            
            console.log('✅ Workout session completed:', this.currentSession.id);
            this.notifyListeners('sessionCompleted', completedSession);
            
            // Clear persisted session after completion
            this.clearPersistedSession();
            
            return completedSession;
            
        } catch (error) {
            console.error('❌ Error completing workout session:', error);
            throw error;
        }
    }
    
    /**
     * Auto-save session progress
     * @param {Array} exercisesPerformed - Array of exercise data
     * @returns {Promise<void>}
     */
    async autoSaveSession(exercisesPerformed) {
        try {
            if (!this.currentSession || !this.currentSession.id || this.currentSession.status !== 'in_progress') {
                console.warn('No active session to save');
                return;
            }
            
            console.log('💾 Auto-saving session...');
            
            // Get auth token
            const token = await window.authService.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }
            
            // Use centralized API config
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/${this.currentSession.id}`);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    exercises_performed: exercisesPerformed
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save: ${response.statusText}`);
            }
            
            console.log('✅ Session auto-saved');
            this.notifyListeners('sessionSaved', { sessionId: this.currentSession.id });
            
            // Persist after auto-save
            this.persistSession();
            
        } catch (error) {
            console.error('❌ Error auto-saving session:', error);
            this.notifyListeners('sessionSaveError', { error: error.message });
            throw error;
        }
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
            this.notifyListeners('historyLoaded', this.exerciseHistory);
            
            return this.exerciseHistory;
            
        } catch (error) {
            console.error('❌ Error fetching exercise history:', error);
            // Non-fatal error - continue without history
            this.exerciseHistory = {};
            return this.exerciseHistory;
        }
    }
    
    /**
     * Update exercise weight in current session
     * @param {string} exerciseName - Exercise name
     * @param {number} weight - Weight value
     * @param {string} unit - Weight unit (lbs/kg)
     */
    updateExerciseWeight(exerciseName, weight, unit) {
        if (!this.currentSession) {
            console.warn('No active session to update');
            return;
        }
        
        // Initialize exercises object if needed
        if (!this.currentSession.exercises) {
            this.currentSession.exercises = {};
        }
        
        // Get previous weight for change calculation
        const history = this.exerciseHistory[exerciseName];
        const previousWeight = history?.last_weight || 0;
        const weightChange = weight - previousWeight;
        
        // FIXED: Merge with existing exercise data instead of replacing
        // This preserves is_bonus flag and other metadata
        const existingData = this.currentSession.exercises[exerciseName] || {};
        this.currentSession.exercises[exerciseName] = {
            ...existingData,  // Preserve existing data (is_bonus, target_sets, etc.)
            weight: weight,
            weight_unit: unit,
            previous_weight: previousWeight,
            weight_change: weightChange
        };
        
        console.log('💪 Updated weight:', exerciseName, weight, unit);
        this.notifyListeners('weightUpdated', { exerciseName, weight, unit });
        
        // Persist after weight update
        this.persistSession();
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
     * Get current session
     * @returns {Object|null} Current session or null
     */
    getCurrentSession() {
        return this.currentSession;
    }
    
    /**
     * Check if session is active
     * @returns {boolean} True if session is active
     */
    isSessionActive() {
        return this.currentSession && this.currentSession.status === 'in_progress';
    }
    
    /**
     * Get exercise weight from current session
     * @param {string} exerciseName - Exercise name
     * @returns {Object|null} Weight data or null
     */
    getExerciseWeight(exerciseName) {
        if (!this.currentSession || !this.currentSession.exercises) {
            return null;
        }
        return this.currentSession.exercises[exerciseName] || null;
    }
    
    /**
     * Clear current session
     */
    clearSession() {
        this.currentSession = null;
        this.exerciseHistory = {};
        
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        console.log('🧹 Session cleared');
        this.notifyListeners('sessionCleared', {});
        
        // Clear persisted session
        this.clearPersistedSession();
    }
    
    /**
     * Add event listener
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    /**
     * Notify all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in session listener:', error);
            }
        });
    }
    
    /**
     * Get service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            hasActiveSession: this.isSessionActive(),
            sessionId: this.currentSession?.id || null,
            workoutName: this.currentSession?.workoutName || null,
            exerciseCount: Object.keys(this.exerciseHistory).length,
            startedAt: this.currentSession?.startedAt || null
        };
    }
    
    /**
     * BONUS EXERCISE METHODS
     * Methods for managing bonus exercises in the current session
     */
    
    /**
     * Add bonus exercise to current session OR pre-workout list
     * @param {Object} exerciseData - Exercise data object with name, sets, reps, etc.
     */
    addBonusExercise(exerciseData) {
        const { name, sets, reps, rest, weight = '', weight_unit = 'lbs', notes = '' } = exerciseData;
        
        // If no active session, add to pre-workout list
        if (!this.currentSession) {
            console.log('📝 Adding bonus exercise to pre-workout list:', name);
            this.preWorkoutBonusExercises.push({
                name,
                sets: sets || '3',
                reps: reps || '12',
                rest: rest || '60s',
                weight: weight || '',
                weight_unit: weight_unit,
                notes: notes || ''
            });
            this.notifyListeners('preWorkoutBonusExerciseAdded', { name });
            return;
        }
        
        // Active session - add to session exercises
        if (!this.currentSession.exercises) {
            this.currentSession.exercises = {};
        }
        
        const bonusExercise = {
            weight: weight || '',
            weight_unit: weight_unit,
            previous_weight: null,
            weight_change: 0,
            target_sets: sets,
            target_reps: reps,
            rest: rest,
            notes: notes,
            is_bonus: true
        };
        
        this.currentSession.exercises[name] = bonusExercise;
        console.log('✅ Bonus exercise added to session:', name);
        this.notifyListeners('bonusExerciseAdded', { exerciseName: name, ...bonusExercise });
        this.persistSession();
    }
    
    /**
     * Remove bonus exercise from current session OR pre-workout list
     * @param {number|string} indexOrName - Index for pre-workout list, name for session
     */
    removeBonusExercise(indexOrName) {
        // If no active session, remove from pre-workout list by index
        if (!this.currentSession) {
            if (typeof indexOrName === 'number' && indexOrName >= 0 && indexOrName < this.preWorkoutBonusExercises.length) {
                const removed = this.preWorkoutBonusExercises.splice(indexOrName, 1)[0];
                console.log('🗑️ Pre-workout bonus exercise removed:', removed.name);
                this.notifyListeners('preWorkoutBonusExerciseRemoved', { name: removed.name });
            }
            return;
        }
        
        // Active session - remove by name
        if (this.currentSession.exercises && this.currentSession.exercises[indexOrName]?.is_bonus) {
            delete this.currentSession.exercises[indexOrName];
            console.log('🗑️ Bonus exercise removed from session:', indexOrName);
            this.notifyListeners('bonusExerciseRemoved', { exerciseName: indexOrName });
            this.persistSession();
        }
    }
    
    /**
     * Get all bonus exercises from current session OR pre-workout list
     * @returns {Array} Array of bonus exercise objects
     */
    getBonusExercises() {
        // If no active session, return pre-workout list
        if (!this.currentSession) {
            return this.preWorkoutBonusExercises;
        }
        
        // Active session - return from session exercises
        if (!this.currentSession.exercises) {
            return [];
        }
        
        return Object.entries(this.currentSession.exercises)
            .filter(([name, data]) => data.is_bonus)
            .map(([name, data]) => ({
                name: name,
                ...data
            }));
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
        console.log('🧹 Pre-workout bonus exercises cleared');
    }
    
    /**
     * Transfer pre-workout bonus exercises to active session
     */
    transferPreWorkoutBonusToSession() {
        if (!this.currentSession || this.preWorkoutBonusExercises.length === 0) {
            return;
        }
        
        console.log('🔄 Transferring pre-workout bonus exercises to session...');
        
        this.preWorkoutBonusExercises.forEach(bonus => {
            this.addBonusExercise(bonus);
        });
        
        // Clear pre-workout list after transfer
        this.preWorkoutBonusExercises = [];
        console.log('✅ Pre-workout bonus exercises transferred to session');
    }
    
    /**
     * Fetch bonus exercises from last session for this workout
     * @param {string} workoutId - Workout template ID
     * @returns {Promise<Array>} Array of bonus exercises from last session
     */
    async getLastSessionBonusExercises(workoutId) {
        try {
            console.log('📊 Fetching last session bonus exercises for workout:', workoutId);
            
            // Get auth token
            const token = await window.authService.getIdToken();
            if (!token) {
                console.warn('No auth token, skipping bonus history fetch');
                return [];
            }
            
            // Use centralized API config
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
            
            console.log('✅ Bonus exercise history loaded:', data.bonus_exercises?.length || 0, 'exercises');
            
            return data.bonus_exercises || [];
            
        } catch (error) {
            console.error('❌ Error fetching bonus exercise history:', error);
            // Non-fatal error - continue without history
            return [];
        }
    }
    
    /**
     * Pre-populate session with bonus exercises from last session
     * @param {Array} bonusExercises - Array of bonus exercises to add
     */
    prePopulateBonusExercises(bonusExercises) {
        if (!this.currentSession || !bonusExercises || bonusExercises.length === 0) {
            return;
        }
        
        console.log('🔄 Pre-populating bonus exercises from last session...');
        
        bonusExercises.forEach(bonus => {
            this.addBonusExercise(
                bonus.exercise_name,
                bonus.target_sets,
                bonus.target_reps,
                '30s', // Default rest
                bonus.weight || '',
                bonus.weight_unit || 'lbs',
                ''
            );
        });
        
        console.log('✅ Pre-populated', bonusExercises.length, 'bonus exercises');
    }
    
    /**
     * SESSION PERSISTENCE METHODS
     * These methods handle saving/restoring sessions to/from localStorage
     * for seamless recovery after page refresh or browser close
     */
    
    /**
     * Persist current session to localStorage
     * Automatically called after session changes to ensure data is never lost
     */
    persistSession() {
        if (!this.currentSession) {
            console.warn('⚠️ No active session to persist');
            return;
        }
        
        const sessionData = {
            sessionId: this.currentSession.id,
            workoutId: this.currentSession.workoutId,
            workoutName: this.currentSession.workoutName,
            startedAt: this.currentSession.startedAt.toISOString(),
            status: this.currentSession.status,
            exercises: this.currentSession.exercises || {},
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };
        
        try {
            localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
            console.log('💾 Session persisted:', sessionData.sessionId);
        } catch (error) {
            console.error('❌ Failed to persist session:', error);
            // Non-fatal - continue without persistence
            // This can happen in private browsing mode or if storage is full
        }
    }
    
    /**
     * Restore session from localStorage
     * Called on page load to check for interrupted sessions
     * @returns {Object|null} Restored session data or null
     */
    restoreSession() {
        try {
            const stored = localStorage.getItem('ghost_gym_active_workout_session');
            if (!stored) {
                console.log('ℹ️ No persisted session found');
                return null;
            }
            
            const sessionData = JSON.parse(stored);
            
            // Validate required fields
            if (!sessionData.sessionId || !sessionData.workoutId || !sessionData.startedAt) {
                console.warn('⚠️ Invalid session data, clearing...');
                this.clearPersistedSession();
                return null;
            }
            
            // Check expiration (24 hours)
            const lastUpdated = new Date(sessionData.lastUpdated);
            const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceUpdate > 24) {
                console.log('⏰ Session expired (>24 hours), clearing...');
                this.clearPersistedSession();
                return null;
            }
            
            console.log('✅ Session restored:', sessionData.sessionId);
            return sessionData;
            
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            this.clearPersistedSession();
            return null;
        }
    }
    
    /**
     * Clear persisted session from localStorage
     * Called when session is completed or explicitly abandoned
     */
    clearPersistedSession() {
        try {
            localStorage.removeItem('ghost_gym_active_workout_session');
            console.log('🧹 Persisted session cleared');
        } catch (error) {
            console.error('❌ Error clearing persisted session:', error);
        }
    }
    
    /**
     * Check if a persisted session exists
     * @returns {boolean} True if persisted session exists
     */
    hasPersistedSession() {
        return !!localStorage.getItem('ghost_gym_active_workout_session');
    }
}

// Create global instance
window.workoutSessionService = new WorkoutSessionService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutSessionService;
}

console.log('📦 Workout Session Service loaded');