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
        
        // Update session state
        this.currentSession.exercises[exerciseName] = {
            weight: weight,
            weight_unit: unit,
            previous_weight: previousWeight,
            weight_change: weightChange
        };
        
        console.log('💪 Updated weight:', exerciseName, weight, unit);
        this.notifyListeners('weightUpdated', { exerciseName, weight, unit });
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
}

// Create global instance
window.workoutSessionService = new WorkoutSessionService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutSessionService;
}

console.log('📦 Workout Session Service loaded');