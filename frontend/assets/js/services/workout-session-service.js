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
        this.exerciseStartTimes = {}; // Track when each exercise was expanded
        this.autoCompleteTimers = {}; // Store auto-complete timers
        
        // PHASE 1: Pre-session editing storage
        this.preSessionEdits = {}; // Store exercise edits before session starts
        this.preSessionOrder = []; // Store custom exercise order before session starts
        
        console.log('📦 Workout Session Service initialized');
    }
    
    /**
     * Start a new workout session
     * @param {string} workoutId - Workout ID
     * @param {string} workoutName - Workout name
     * @returns {Promise<Object>} Session object
     */
    async startSession(workoutId, workoutName, workoutData = null) {
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
            
            // PHASE 1: Pre-populate exercises from template
            if (workoutData) {
                this.currentSession.exercises = this._initializeExercisesFromTemplate(workoutData);
                console.log('✅ Pre-populated', Object.keys(this.currentSession.exercises).length, 'exercises from template');
            }
            
            // PHASE 1: Apply pre-session edits to new session
            if (Object.keys(this.preSessionEdits).length > 0) {
                console.log('🔄 Applying pre-session edits to new session...');
                this._applyPreSessionEdits();
            }
            
            // 🔧 FIX: Transfer pre-workout bonuses IMMEDIATELY after session creation
            if (this.preWorkoutBonusExercises.length > 0) {
                console.log('🔄 Transferring pre-workout bonuses to new session...');
                this._transferPreWorkoutBonusesImmediate();
            }
            
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
     * PHASE 1: Initialize exercises from workout template
     * Pre-populates all exercises with template defaults
     * @param {Object} workout - Workout template data
     * @returns {Object} Initialized exercises object
     * @private
     */
    _initializeExercisesFromTemplate(workout) {
        const exercises = {};
        
        // Initialize regular exercise groups
        if (workout.exercise_groups) {
            workout.exercise_groups.forEach((group, index) => {
                const exerciseName = group.exercises?.a;
                if (exerciseName) {
                    exercises[exerciseName] = {
                        weight: group.default_weight || null,
                        weight_unit: group.default_weight_unit || 'lbs',
                        target_sets: group.sets || '3',
                        target_reps: group.reps || '8-12',
                        rest: group.rest || '60s',
                        previous_weight: null,
                        weight_change: 0,
                        order_index: index,
                        is_bonus: false,
                        is_modified: false,  // Track if user changes it
                        is_skipped: false,   // For Phase 2
                        notes: ''
                    };
                }
            });
        }
        
        // Initialize bonus exercises from template
        if (workout.bonus_exercises) {
            const baseIndex = workout.exercise_groups?.length || 0;
            workout.bonus_exercises.forEach((bonus, index) => {
                exercises[bonus.name] = {
                    weight: bonus.default_weight || null,
                    weight_unit: bonus.default_weight_unit || 'lbs',
                    target_sets: bonus.sets || '3',
                    target_reps: bonus.reps || '12',
                    rest: bonus.rest || '30s',
                    previous_weight: null,
                    weight_change: 0,
                    order_index: baseIndex + index,
                    is_bonus: true,
                    is_modified: false,
                    is_skipped: false,
                    notes: ''
                };
            });
        }
        
        return exercises;
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
            
            // Prepare request body
            const requestBody = {
                completed_at: new Date().toISOString(),
                exercises_performed: exercisesPerformed,
                notes: ''
            };
            
            // PHASE 3: Include custom exercise order if present
            if (this.preSessionOrder && this.preSessionOrder.length > 0) {
                requestBody.exercise_order = this.preSessionOrder;
                console.log('📋 Including custom exercise order in completion:', this.preSessionOrder.length, 'exercises');
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
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
            
            // PHASE 3: Check for last session's custom exercise order
            if (historyData.last_exercise_order && Array.isArray(historyData.last_exercise_order)) {
                console.log('📋 Last session had custom order:', historyData.last_exercise_order.length, 'exercises');
                // Store as pre-session order so it will be applied when workout loads
                this.setExerciseOrder(historyData.last_exercise_order);
                console.log('✅ Custom order from last session applied');
            }
            
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
            weight_change: weightChange,
            is_modified: true,  // PHASE 1: Mark as user-modified
            modified_at: new Date().toISOString()  // PHASE 1: Track when
        };
        
        console.log('💪 Updated weight:', exerciseName, weight, unit);
        this.notifyListeners('weightUpdated', { exerciseName, weight, unit });
        
        // Persist after weight update
        this.persistSession();
    }
    
    /**
     * Update exercise details (sets, reps, rest, weight) in current session
     * @param {string} exerciseName - Exercise name
     * @param {Object} details - Updated details
     * @param {string} details.sets - Target sets
     * @param {string} details.reps - Target reps
     * @param {string} details.rest - Rest time
     * @param {string} details.weight - Weight value
     * @param {string} details.weightUnit - Weight unit
     */
    updateExerciseDetails(exerciseName, details) {
        if (!this.currentSession) {
            console.warn('⚠️ No active session to update');
            return;
        }
        
        if (!this.currentSession.exercises) {
            this.currentSession.exercises = {};
        }
        
        // Get previous weight for change calculation
        const history = this.exerciseHistory[exerciseName];
        const previousWeight = history?.last_weight || 0;
        const weightValue = parseFloat(details.weight) || 0;
        const weightChange = weightValue - previousWeight;
        
        // Merge with existing data to preserve flags like is_bonus
        const existingData = this.currentSession.exercises[exerciseName] || {};
        this.currentSession.exercises[exerciseName] = {
            ...existingData,
            target_sets: details.sets || existingData.target_sets || '3',
            target_reps: details.reps || existingData.target_reps || '8-12',
            rest: details.rest || existingData.rest || '60s',
            weight: details.weight,
            weight_unit: details.weightUnit || 'lbs',
            previous_weight: previousWeight,
            weight_change: weightChange,
            is_modified: true,
            modified_at: new Date().toISOString()
        };
        
        console.log('📝 Updated exercise details:', exerciseName, details);
        this.notifyListeners('exerciseDetailsUpdated', { exerciseName, details });
        
        // Persist after update
        this.persistSession();
    }
    
    /**
     * PHASE 1: Update exercise details BEFORE session starts (pre-session editing)
     * @param {string} exerciseName - Exercise name
     * @param {Object} details - Updated details
     * @param {string} details.sets - Target sets
     * @param {string} details.reps - Target reps
     * @param {string} details.rest - Rest time
     * @param {string} details.weight - Weight value
     * @param {string} details.weightUnit - Weight unit
     */
    updatePreSessionExercise(exerciseName, details) {
        console.log('📝 Storing pre-session edit for:', exerciseName, details);
        
        // Store in pre-session edits
        this.preSessionEdits[exerciseName] = {
            target_sets: details.sets || '3',
            target_reps: details.reps || '8-12',
            rest: details.rest || '60s',
            weight: details.weight || '',
            weight_unit: details.weightUnit || 'lbs',
            edited_at: new Date().toISOString()
        };
        
        console.log('✅ Pre-session edit stored. Total edits:', Object.keys(this.preSessionEdits).length);
        this.notifyListeners('preSessionExerciseUpdated', { exerciseName, details });
    }
    
    /**
     * PHASE 1: Get pre-session edits for an exercise
     * @param {string} exerciseName - Exercise name
     * @returns {Object|null} Pre-session edit data or null
     */
    getPreSessionEdits(exerciseName) {
        return this.preSessionEdits[exerciseName] || null;
    }
    
    /**
     * PHASE 1: Apply all pre-session edits to the active session
     * Called internally by startSession()
     * @private
     */
    _applyPreSessionEdits() {
        if (!this.currentSession?.exercises) {
            console.warn('⚠️ No session exercises to apply edits to');
            return;
        }
        
        let appliedCount = 0;
        
        Object.keys(this.preSessionEdits).forEach(exerciseName => {
            const edits = this.preSessionEdits[exerciseName];
            
            // Only apply if exercise exists in session
            if (this.currentSession.exercises[exerciseName]) {
                this.currentSession.exercises[exerciseName] = {
                    ...this.currentSession.exercises[exerciseName],
                    ...edits,
                    is_modified: true,
                    modified_at: edits.edited_at
                };
                appliedCount++;
                console.log(`  ✅ Applied pre-session edit to: ${exerciseName}`);
            } else {
                console.warn(`  ⚠️ Exercise not found in session: ${exerciseName}`);
            }
        });
        
        console.log(`✅ Applied ${appliedCount} pre-session edits to session`);
        
        // Clear pre-session edits after applying
        this.preSessionEdits = {};
    }
    
    /**
     * PHASE 1: Clear all pre-session edits
     */
    clearPreSessionEdits() {
        this.preSessionEdits = {};
        console.log('🧹 Pre-session edits cleared');
    }
    
    /**
     * PHASE 2: Set custom exercise order for reordering
     * Stores the exercise order for drag-and-drop reordering before session starts
     * @param {string[]} exerciseNames - Ordered array of exercise names
     * @fires exerciseOrderUpdated - Notifies listeners when order changes
     */
    setExerciseOrder(exerciseNames) {
        console.log('📋 Setting custom exercise order:', exerciseNames);
        this.preSessionOrder = [...exerciseNames];
        this.notifyListeners('exerciseOrderUpdated', { order: this.preSessionOrder });
    }
    
    /**
     * PHASE 2: Get current exercise order
     * Returns the custom exercise order if set, or empty array
     * @returns {string[]} Array of exercise names in custom order
     */
    getExerciseOrder() {
        return this.preSessionOrder;
    }
    
    /**
     * PHASE 2: Clear exercise order
     * Resets the custom order back to empty (template order will be used)
     * @fires exerciseOrderCleared - Notifies listeners when order is cleared
     */
    clearExerciseOrder() {
        this.preSessionOrder = [];
        console.log('🧹 Custom exercise order cleared');
        this.notifyListeners('exerciseOrderCleared', {});
    }
    
    /**
     * PHASE 2: Check if custom exercise order is set
     * @returns {boolean} True if exercises have been reordered from template order
     */
    hasCustomOrder() {
        return this.preSessionOrder.length > 0;
    }
    
    /**
     * PHASE 2: Mark exercise as skipped
     * @param {string} exerciseName - Exercise name
     * @param {string} reason - Optional reason for skipping (max 200 chars)
     */
    skipExercise(exerciseName, reason = '') {
        if (!this.currentSession?.exercises) {
            console.warn('⚠️ No active session to skip exercise');
            return;
        }
        
        const existingData = this.currentSession.exercises[exerciseName] || {};
        
        this.currentSession.exercises[exerciseName] = {
            ...existingData,
            is_skipped: true,
            skip_reason: reason.substring(0, 200), // Enforce 200 char limit
            skipped_at: new Date().toISOString()
        };
        
        console.log('⏭️ Exercise skipped:', exerciseName, reason ? `(${reason})` : '');
        this.notifyListeners('exerciseSkipped', { exerciseName, reason });
        this.persistSession();
    }

    /**
     * PHASE 2: Unskip exercise (if user changes mind)
     * @param {string} exerciseName - Exercise name
     */
    unskipExercise(exerciseName) {
        if (!this.currentSession?.exercises?.[exerciseName]) {
            console.warn('⚠️ Exercise not found in session:', exerciseName);
            return;
        }
        
        this.currentSession.exercises[exerciseName].is_skipped = false;
        this.currentSession.exercises[exerciseName].skip_reason = null;
        delete this.currentSession.exercises[exerciseName].skipped_at;
        
        console.log('↩️ Exercise unskipped:', exerciseName);
        this.notifyListeners('exerciseUnskipped', { exerciseName });
        this.persistSession();
    }
    
    /**
     * PHASE 3: Mark exercise as completed
     * @param {string} exerciseName - Exercise name
     */
    completeExercise(exerciseName) {
        if (!this.currentSession?.exercises) {
            console.warn('⚠️ No active session to complete exercise');
            return;
        }
        
        const existingData = this.currentSession.exercises[exerciseName] || {};
        
        this.currentSession.exercises[exerciseName] = {
            ...existingData,
            is_completed: true,
            completed_at: new Date().toISOString()
        };
        
        console.log('✅ Exercise completed:', exerciseName);
        this.notifyListeners('exerciseCompleted', { exerciseName });
        this.persistSession();
    }
    
    /**
     * PHASE 3: Uncomplete exercise (if user changes mind)
     * @param {string} exerciseName - Exercise name
     */
    uncompleteExercise(exerciseName) {
        if (!this.currentSession?.exercises?.[exerciseName]) {
            console.warn('⚠️ Exercise not found in session:', exerciseName);
            return;
        }
        
        this.currentSession.exercises[exerciseName].is_completed = false;
        delete this.currentSession.exercises[exerciseName].completed_at;
        
        console.log('↩️ Exercise uncompleted:', exerciseName);
        this.notifyListeners('exerciseUncompleted', { exerciseName });
        this.persistSession();
    }
    
    /**
     * Start auto-complete timer for an exercise
     * Called when exercise card is expanded
     * @param {string} exerciseName - Exercise name
     * @param {number} timeoutMinutes - Minutes until auto-complete (default 10)
     */
    startAutoCompleteTimer(exerciseName, timeoutMinutes = 10) {
        if (!this.isSessionActive()) return;
        
        // Don't start timer if already completed or skipped
        const exerciseData = this.currentSession?.exercises?.[exerciseName];
        if (exerciseData?.is_completed || exerciseData?.is_skipped) {
            console.log('⏭️ Skipping auto-complete timer - exercise already completed/skipped');
            return;
        }
        
        // Clear existing timer for this exercise
        this.clearAutoCompleteTimer(exerciseName);
        
        // Track start time
        this.exerciseStartTimes[exerciseName] = Date.now();
        
        // Set timer for auto-complete
        const timeoutMs = timeoutMinutes * 60 * 1000;
        this.autoCompleteTimers[exerciseName] = setTimeout(() => {
            console.log(`⏰ Auto-completing ${exerciseName} after ${timeoutMinutes} minutes`);
            this.completeExercise(exerciseName);
            this.notifyListeners('exerciseAutoCompleted', { exerciseName, timeoutMinutes });
        }, timeoutMs);
        
        console.log(`⏱️ Auto-complete timer started for ${exerciseName}: ${timeoutMinutes} minutes`);
    }
    
    /**
     * Clear auto-complete timer for an exercise
     * Called when card is collapsed or manually completed
     * @param {string} exerciseName - Exercise name
     */
    clearAutoCompleteTimer(exerciseName) {
        if (this.autoCompleteTimers[exerciseName]) {
            clearTimeout(this.autoCompleteTimers[exerciseName]);
            delete this.autoCompleteTimers[exerciseName];
            delete this.exerciseStartTimes[exerciseName];
            console.log(`⏱️ Auto-complete timer cleared for ${exerciseName}`);
        }
    }
    
    /**
     * Clear all auto-complete timers
     * Called when session ends
     */
    clearAllAutoCompleteTimers() {
        Object.keys(this.autoCompleteTimers).forEach(exerciseName => {
            this.clearAutoCompleteTimer(exerciseName);
        });
        console.log('🧹 All auto-complete timers cleared');
    }
    
    /**
     * Get remaining time for auto-complete
     * @param {string} exerciseName - Exercise name
     * @returns {number|null} Seconds remaining or null if no timer
     */
    getAutoCompleteRemainingTime(exerciseName) {
        if (!this.exerciseStartTimes[exerciseName]) return null;
        
        const elapsed = (Date.now() - this.exerciseStartTimes[exerciseName]) / 1000;
        const remaining = (10 * 60) - elapsed; // 10 minutes default
        return Math.max(0, Math.floor(remaining));
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
        // Clear all auto-complete timers first
        this.clearAllAutoCompleteTimers();
        
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
            console.log(`✅ Pre-workout bonus added. Total pre-workout bonuses: ${this.preWorkoutBonusExercises.length}`);
            return;
        }
        
        // Active session - add to session exercises
        if (!this.currentSession.exercises) {
            this.currentSession.exercises = {};
        }
        
        // 🔧 FIX: Calculate order_index based on existing exercises
        // This ensures bonus exercises maintain proper order in history
        const existingExerciseCount = Object.keys(this.currentSession.exercises).length;
        const order_index = existingExerciseCount;
        
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
            order_index: order_index,  // 🔧 FIX: Add order_index for proper sequencing
            is_modified: false,
            is_skipped: false
        };
        
        this.currentSession.exercises[name] = bonusExercise;
        console.log('✅ Bonus exercise added to session:', name, 'at order_index:', order_index);
        console.log('📊 Session now has', Object.keys(this.currentSession.exercises).length, 'total exercises');
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
     * 🔧 FIXED: Normalize property names for consistent rendering
     * @returns {Array} Array of bonus exercise objects
     */
    getBonusExercises() {
        // If no active session, return pre-workout list
        if (!this.currentSession) {
            console.log('📋 getBonusExercises(): Returning pre-workout list (' + this.preWorkoutBonusExercises.length + ' exercises)');
            return this.preWorkoutBonusExercises;
        }
        
        // Active session - return from session exercises
        if (!this.currentSession.exercises) {
            console.log('📋 getBonusExercises(): No session exercises, returning empty array');
            return [];
        }
        
        // 🔧 FIX: Normalize property names to match what renderWorkout() expects
        // renderWorkout() expects: sets, reps, rest, weight, weight_unit
        // session stores as: target_sets, target_reps, rest, weight, weight_unit
        const bonusExercises = Object.entries(this.currentSession.exercises)
            .filter(([name, data]) => data.is_bonus)
            .map(([name, data]) => ({
                name: name,
                sets: data.target_sets || data.sets || '3',           // 🔧 Normalize to 'sets'
                reps: data.target_reps || data.reps || '12',          // 🔧 Normalize to 'reps'
                rest: data.rest || '60s',
                weight: data.weight || '',
                weight_unit: data.weight_unit || 'lbs',
                notes: data.notes || '',
                // Keep original session data for reference
                target_sets: data.target_sets,
                target_reps: data.target_reps,
                is_bonus: true,
                order_index: data.order_index
            }));
        
        console.log(`📋 getBonusExercises(): Returning ${bonusExercises.length} bonus exercises from session`);
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
        console.log('🧹 Pre-workout bonus exercises cleared');
    }
    
    /**
     * Transfer pre-workout bonus exercises to active session
     * @deprecated This method is now called internally by startSession()
     * Kept for backwards compatibility
     */
    transferPreWorkoutBonusToSession() {
        if (!this.currentSession) {
            console.warn('⚠️ Cannot transfer bonus exercises - no active session');
            return;
        }
        
        if (this.preWorkoutBonusExercises.length === 0) {
            console.log('ℹ️ No pre-workout bonus exercises to transfer');
            return;
        }
        
        console.log('🔄 Transferring', this.preWorkoutBonusExercises.length, 'pre-workout bonus exercises to session...');
        console.log('📋 Pre-workout bonuses:', this.preWorkoutBonusExercises.map(b => b.name));
        
        // Count exercises before transfer
        const exerciseCountBefore = Object.keys(this.currentSession.exercises || {}).length;
        console.log('📊 Session exercises before transfer:', exerciseCountBefore);
        
        // Transfer each bonus exercise
        let transferredCount = 0;
        this.preWorkoutBonusExercises.forEach((bonus, index) => {
            console.log(`  ${index + 1}. Transferring: ${bonus.name}`);
            this.addBonusExercise(bonus);
            transferredCount++;
        });
        
        // Count exercises after transfer
        const exerciseCountAfter = Object.keys(this.currentSession.exercises || {}).length;
        console.log('📊 Session exercises after transfer:', exerciseCountAfter);
        console.log('✅ Successfully transferred', transferredCount, 'bonus exercises');
        
        // Validate transfer
        if (exerciseCountAfter !== exerciseCountBefore + transferredCount) {
            console.error('❌ Transfer validation failed! Expected', exerciseCountBefore + transferredCount, 'but got', exerciseCountAfter);
        }
        
        // Clear pre-workout list after transfer
        this.preWorkoutBonusExercises = [];
        console.log('🧹 Pre-workout bonus list cleared');
        
        // Persist session with transferred bonuses
        this.persistSession();
        console.log('💾 Session persisted with transferred bonus exercises');
    }
    
    /**
     * Internal method to transfer pre-workout bonuses to session
     * Called ONLY during session creation (not async, no API calls)
     * @private
     */
    _transferPreWorkoutBonusesImmediate() {
        if (!this.currentSession || this.preWorkoutBonusExercises.length === 0) {
            return;
        }
        
        const exerciseCountBefore = Object.keys(this.currentSession.exercises || {}).length;
        console.log('📊 Session exercises before transfer:', exerciseCountBefore);
        
        // Transfer each bonus exercise
        this.preWorkoutBonusExercises.forEach((bonus, index) => {
            console.log(`  ${index + 1}. Adding: ${bonus.name}`);
            
            // Calculate order_index based on current exercise count
            const order_index = Object.keys(this.currentSession.exercises).length;
            
            this.currentSession.exercises[bonus.name] = {
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
        
        const exerciseCountAfter = Object.keys(this.currentSession.exercises || {}).length;
        console.log('✅ Transferred', this.preWorkoutBonusExercises.length, 'bonuses');
        console.log('📊 Session exercises after transfer:', exerciseCountAfter);
        
        // Clear pre-workout list
        this.preWorkoutBonusExercises = [];
        console.log('🧹 Pre-workout bonus list cleared');
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
            version: '2.0',  // PHASE 1: Bump version for new schema
            schemaVersion: 2  // PHASE 1: Explicit schema version
        };
        
        try {
            localStorage.setItem('ghost_gym_active_workout_session', JSON.stringify(sessionData));
            console.log('💾 Session persisted (v2.0):', sessionData.sessionId);
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
            
            let sessionData = JSON.parse(stored);
            
            // PHASE 1: Handle version migration
            if (!sessionData.version || sessionData.version === '1.0') {
                console.log('🔄 Migrating session from v1.0 to v2.0...');
                sessionData = this._migrateSessionV1toV2(sessionData);
            }
            
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
            
            console.log('✅ Session restored (v' + sessionData.version + '):', sessionData.sessionId);
            return sessionData;
            
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            this.clearPersistedSession();
            return null;
        }
    }
    
    /**
     * PHASE 1: Migrate session from v1.0 to v2.0
     * Adds new fields to existing exercises
     * @param {Object} sessionData - Old session data
     * @returns {Object} Migrated session data
     * @private
     */
    _migrateSessionV1toV2(sessionData) {
        sessionData.version = '2.0';
        sessionData.schemaVersion = 2;
        sessionData.exercises = sessionData.exercises || {};
        
        // Add new fields to existing exercises
        Object.keys(sessionData.exercises).forEach(exerciseName => {
            const exercise = sessionData.exercises[exerciseName];
            sessionData.exercises[exerciseName] = {
                ...exercise,
                is_modified: true,  // Assume modified if it exists in v1.0
                modified_at: sessionData.lastUpdated || new Date().toISOString(),
                is_skipped: false,
                notes: exercise.notes || ''
            };
        });
        
        console.log('✅ Session migrated to v2.0');
        return sessionData;
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
    
    /**
     * 🔧 DEBUG HELPER: Get comprehensive bonus exercise state
     * Call from console: window.workoutSessionService.debugBonusExercises()
     * @returns {Object} Complete bonus exercise state information
     */
    debugBonusExercises() {
        const state = {
            hasActiveSession: !!this.currentSession,
            sessionId: this.currentSession?.id || null,
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
        
        if (this.currentSession?.exercises) {
            const allExercises = Object.entries(this.currentSession.exercises);
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
        
        console.group('🔍 Bonus Exercise Debug State');
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

// Create global instance
window.workoutSessionService = new WorkoutSessionService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutSessionService;
}

console.log('📦 Workout Session Service loaded');