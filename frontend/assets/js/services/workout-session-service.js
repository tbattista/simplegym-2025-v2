/**
 * Ghost Gym - Workout Session Service
 * Handles workout session lifecycle and weight logging
 * @version 1.0.0
 * @date 2025-11-07
 */

class WorkoutSessionService {
    constructor() {
        this.currentSession = null;
        this.listeners = new Set();
        this.preWorkoutBonusExercises = []; // Store bonus exercises before session starts
        this.exerciseStartTimes = {}; // Track when each exercise was expanded
        this.autoCompleteTimers = {}; // Store auto-complete timers

        // Initialize Weight History Service
        this.weightHistoryService = new WeightHistoryService({
            onHistoryLoaded: (history) => this.notifyListeners('historyLoaded', history),
            onExerciseOrderFromHistory: (order) => this.setExerciseOrder(order)
        });

        // Initialize Session Notes Service
        this.sessionNotesService = new SessionNotesService({
            onNotify: (event, data) => this.notifyListeners(event, data),
            onPersist: () => this.persistSession()
        });

        // Initialize Pre-Session Editing Service
        this.preSessionEditingService = new PreSessionEditingService({
            onNotify: (event, data) => this.notifyListeners(event, data)
        });

        // Initialize Session Persistence Service
        this.sessionPersistenceService = new SessionPersistenceService({
            onGetCurrentSession: () => this.currentSession,
            onGetSessionNotes: () => this.sessionNotes,
            onSetSessionNotes: (notes) => { this.sessionNotes = notes; },
            onGetExerciseOrder: () => this.preSessionOrder,
            onSetExerciseOrder: (order) => { this.preSessionOrder = order; }
        });

        // Initialize Auto Save Service
        this.autoSaveService = new AutoSaveService({
            onGetCurrentSession: () => this.currentSession,
            onNotify: (event, data) => this.notifyListeners(event, data),
            onPersist: () => this.persistSession()
        });

        console.log('📦 Workout Session Service initialized');
    }

    /**
     * Get autoSaveTimer (backward compatibility getter)
     * @returns {number|null} Timer ID or null
     */
    get autoSaveTimer() {
        return this.autoSaveService?.autoSaveTimer || null;
    }

    /**
     * Set autoSaveTimer (backward compatibility setter)
     * @param {number|null} value - Timer ID or null
     */
    set autoSaveTimer(value) {
        if (this.autoSaveService) {
            this.autoSaveService.autoSaveTimer = value;
        }
    }

    /**
     * Get exercise history (backward compatibility getter)
     * @returns {Object} Exercise history object
     */
    get exerciseHistory() {
        return this.weightHistoryService?.exerciseHistory || {};
    }

    /**
     * Set exercise history (backward compatibility setter)
     * @param {Object} value - Exercise history object
     */
    set exerciseHistory(value) {
        if (this.weightHistoryService) {
            this.weightHistoryService.exerciseHistory = value;
        }
    }

    /**
     * Get session notes (backward compatibility getter)
     * @returns {Array} Session notes array
     */
    get sessionNotes() {
        return this.sessionNotesService?.sessionNotes || [];
    }

    /**
     * Set session notes (backward compatibility setter)
     * @param {Array} value - Session notes array
     */
    set sessionNotes(value) {
        if (this.sessionNotesService) {
            this.sessionNotesService.sessionNotes = value;
        }
    }

    /**
     * Get pre-session edits (backward compatibility getter)
     * @returns {Object} Pre-session edits object
     */
    get preSessionEdits() {
        return this.preSessionEditingService?.preSessionEdits || {};
    }

    /**
     * Set pre-session edits (backward compatibility setter)
     * @param {Object} value - Pre-session edits object
     */
    set preSessionEdits(value) {
        if (this.preSessionEditingService) {
            this.preSessionEditingService.preSessionEdits = value;
        }
    }

    /**
     * Get pre-session order (backward compatibility getter)
     * @returns {Array} Pre-session order array
     */
    get preSessionOrder() {
        return this.preSessionEditingService?.preSessionOrder || [];
    }

    /**
     * Set pre-session order (backward compatibility setter)
     * @param {Array} value - Pre-session order array
     */
    set preSessionOrder(value) {
        if (this.preSessionEditingService) {
            this.preSessionEditingService.preSessionOrder = value;
        }
    }

    /**
     * Get pre-session skips (backward compatibility getter)
     * @returns {Object} Pre-session skips object
     */
    get preSessionSkips() {
        return this.preSessionEditingService?.preSessionSkips || {};
    }

    /**
     * Set pre-session skips (backward compatibility setter)
     * @param {Object} value - Pre-session skips object
     */
    set preSessionSkips(value) {
        if (this.preSessionEditingService) {
            this.preSessionEditingService.preSessionSkips = value;
        }
    }
    
    /**
     * Start a new workout session
     * @param {string} workoutId - Workout ID
     * @param {string} workoutName - Workout name
     * @param {Object|null} workoutData - Optional workout template data
     * @param {string} sessionMode - Session mode: 'timed' (default) or 'quick_log'
     * @returns {Promise<Object>} Session object
     */
    async startSession(workoutId, workoutName, workoutData = null, sessionMode = 'timed') {
        try {
            const modeIcon = sessionMode === 'quick_log' ? '📝' : '🏋️';
            console.log(`${modeIcon} Starting ${sessionMode} workout session:`, workoutName);

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
                    started_at: new Date().toISOString(),
                    session_mode: sessionMode
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
                sessionMode: sessionMode,
                exercises: {}
            };
            
            // PHASE 1: Pre-populate exercises from template
            if (workoutData) {
                this.currentSession.exercises = this._initializeExercisesFromTemplate(workoutData);
                console.log('✅ Pre-populated', Object.keys(this.currentSession.exercises).length, 'exercises from template');
            }
            
            // Apply all pre-session modifications to new session
            if (this.preSessionEditingService.hasEdits() || this.preSessionEditingService.hasSkips()) {
                console.log('🔄 Applying pre-session modifications to new session...');
                this.preSessionEditingService.applyAllToSession(this.currentSession);
            }
            
            //  FIX: Transfer pre-workout bonuses IMMEDIATELY after session creation
            if (this.preWorkoutBonusExercises.length > 0) {
                console.log('🔄 Transferring pre-workout bonuses to new session...');
                this._transferPreWorkoutBonusesImmediate();
            }
            
            console.log('✅ Workout session started:', session.id);
            this.notifyListeners('sessionStarted', this.currentSession);
            window.dispatchEvent(new CustomEvent('sessionStateChanged', { detail: { type: 'started' } }));
            
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
                    const templateWeight = group.default_weight || null;
                    const templateSets = group.sets || '3';
                    const templateReps = group.reps || '8-12';

                    exercises[exerciseName] = {
                        weight: templateWeight,
                        weight_unit: group.default_weight_unit || 'lbs',
                        target_sets: templateSets,
                        target_reps: templateReps,
                        rest: group.rest || '60s',
                        previous_weight: null,
                        weight_change: 0,
                        order_index: index,
                        is_bonus: false,
                        is_modified: false,  // Track if user changes it
                        is_skipped: false,   // For Phase 2
                        notes: '',
                        // Store original template values for modification tracking
                        original_weight: templateWeight,
                        original_sets: templateSets,
                        original_reps: templateReps
                    };
                }
            });
        }

        // Initialize bonus exercises from template
        if (workout.bonus_exercises) {
            const baseIndex = workout.exercise_groups?.length || 0;
            workout.bonus_exercises.forEach((bonus, index) => {
                const templateWeight = bonus.default_weight || null;
                const templateSets = bonus.sets || '3';
                const templateReps = bonus.reps || '12';

                exercises[bonus.name] = {
                    weight: templateWeight,
                    weight_unit: bonus.default_weight_unit || 'lbs',
                    target_sets: templateSets,
                    target_reps: templateReps,
                    rest: bonus.rest || '30s',
                    previous_weight: null,
                    weight_change: 0,
                    order_index: baseIndex + index,
                    is_bonus: true,
                    is_modified: false,
                    is_skipped: false,
                    notes: '',
                    // Store original template values for modification tracking
                    original_weight: templateWeight,
                    original_sets: templateSets,
                    original_reps: templateReps
                };
            });
        }

        return exercises;
    }
    
    /**
     * Complete the current workout session
     * @param {Array} exercisesPerformed - Array of exercise data
     * @param {number|null} durationMinutes - Optional manual duration for Quick Log mode
     * @returns {Promise<Object>} Completed session object
     */
    async completeSession(exercisesPerformed, durationMinutes = null) {
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
                notes: '',
                session_notes: (this.sessionNotes || []).map(note => ({
                    id: note.id,
                    content: note.content,
                    order_index: note.order_index,
                    created_at: note.created_at,
                    modified_at: note.modified_at || null
                }))
            };

            if (requestBody.session_notes.length > 0) {
                console.log('📝 Including', requestBody.session_notes.length, 'session notes in completion');
            }

            // PHASE 3: Include custom exercise order if present
            if (this.preSessionOrder && this.preSessionOrder.length > 0) {
                requestBody.exercise_order = this.preSessionOrder;
                console.log('📋 Including custom exercise order in completion:', this.preSessionOrder.length, 'exercises');
            }

            // Quick Log: Include manual duration if provided
            if (durationMinutes !== null && durationMinutes > 0) {
                requestBody.duration_minutes = durationMinutes;
                console.log('⏱️ Including manual duration for Quick Log:', durationMinutes, 'minutes');
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            // Handle session not found - create new session and complete it
            if (response.status === 404) {
                console.warn('⚠️ Session not found in database, creating new session to save workout data...');
                return await this._createAndCompleteSession(exercisesPerformed, durationMinutes, token);
            }

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
            window.dispatchEvent(new CustomEvent('sessionStateChanged', { detail: { type: 'completed' } }));

            // Clear persisted session after completion
            this.clearPersistedSession();

            return completedSession;

        } catch (error) {
            console.error('❌ Error completing workout session:', error);
            throw error;
        }
    }

    /**
     * Create a new session and immediately complete it (fallback for orphaned localStorage sessions)
     * Uses atomic endpoint first, then falls back to two-step with retry logic.
     * @param {Array} exercisesPerformed - Array of exercise data
     * @param {number|null} durationMinutes - Optional manual duration
     * @param {string} token - Auth token
     * @returns {Promise<Object>} Completed session object
     * @private
     */
    async _createAndCompleteSession(exercisesPerformed, durationMinutes, token) {
        console.log('🔄 Creating new session to preserve workout data...');

        // Strategy 1: Try atomic create-and-complete endpoint (preferred)
        try {
            const atomicResult = await this._tryAtomicCreateAndComplete(
                exercisesPerformed,
                durationMinutes,
                token
            );
            if (atomicResult) {
                return atomicResult;
            }
        } catch (error) {
            console.warn('⚠️ Atomic create-and-complete failed, falling back to two-step:', error.message);
        }

        // Strategy 2: Two-step with retry and exponential backoff
        return await this._createThenCompleteWithRetry(exercisesPerformed, durationMinutes, token);
    }

    /**
     * Try atomic create-and-complete endpoint (single API call)
     * @private
     */
    async _tryAtomicCreateAndComplete(exercisesPerformed, durationMinutes, token) {
        const url = window.config.api.getUrl('/api/v3/workout-sessions/create-and-complete');

        const requestBody = {
            workout_id: this.currentSession.workoutId,
            workout_name: this.currentSession.workoutName,
            started_at: this.currentSession.startedAt.toISOString(),
            completed_at: new Date().toISOString(),
            exercises_performed: exercisesPerformed,
            session_mode: this.currentSession.sessionMode || 'timed',
            notes: '',
            session_notes: (this.sessionNotes || []).map(note => ({
                id: note.id,
                content: note.content,
                order_index: note.order_index,
                created_at: note.created_at,
                modified_at: note.modified_at || null
            }))
        };

        if (this.preSessionOrder && this.preSessionOrder.length > 0) {
            requestBody.exercise_order = this.preSessionOrder;
        }

        if (durationMinutes !== null && durationMinutes > 0) {
            requestBody.duration_minutes = durationMinutes;
        }

        console.log('🚀 Trying atomic create-and-complete endpoint...');
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
            throw new Error(errorData.detail || `Atomic endpoint failed: ${response.status}`);
        }

        const completedSession = await response.json();

        // Update local session state
        this.currentSession.id = completedSession.id;
        this.currentSession.status = 'completed';
        this.currentSession.completedAt = new Date(completedSession.completed_at);

        console.log('✅ Atomic create-and-complete succeeded:', completedSession.id);
        this.notifyListeners('sessionCompleted', completedSession);
        window.dispatchEvent(new CustomEvent('sessionStateChanged', { detail: { type: 'completed' } }));
        this.clearPersistedSession();

        return completedSession;
    }

    /**
     * Two-step create then complete with retry and exponential backoff
     * Fallback for when atomic endpoint is unavailable
     * @private
     */
    async _createThenCompleteWithRetry(exercisesPerformed, durationMinutes, token) {
        const MAX_RETRIES = 3;
        const BASE_DELAY_MS = 150;

        // Step 1: Create session
        console.log('📝 Creating recovery session (two-step fallback)...');
        const createUrl = window.config.api.getUrl('/api/v3/workout-sessions');
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workout_id: this.currentSession.workoutId,
                workout_name: this.currentSession.workoutName,
                started_at: this.currentSession.startedAt.toISOString(),
                session_mode: this.currentSession.sessionMode || 'timed'
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to create recovery session');
        }

        const newSession = await createResponse.json();
        console.log('✅ Recovery session created:', newSession.id);

        // Step 2: Complete with retry and exponential backoff
        const requestBody = {
            completed_at: new Date().toISOString(),
            exercises_performed: exercisesPerformed,
            notes: '',
            session_notes: (this.sessionNotes || []).map(note => ({
                id: note.id,
                content: note.content,
                order_index: note.order_index,
                created_at: note.created_at,
                modified_at: note.modified_at || null
            }))
        };

        if (this.preSessionOrder && this.preSessionOrder.length > 0) {
            requestBody.exercise_order = this.preSessionOrder;
        }

        if (durationMinutes !== null && durationMinutes > 0) {
            requestBody.duration_minutes = durationMinutes;
        }

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            // Exponential backoff delay before attempt
            const delay = BASE_DELAY_MS * Math.pow(2, attempt);
            console.log(`⏱️ Waiting ${delay}ms before complete attempt ${attempt + 1}/${MAX_RETRIES}`);
            await this._sleep(delay);

            try {
                const completeUrl = window.config.api.getUrl(`/api/v3/workout-sessions/${newSession.id}/complete`);
                const completeResponse = await fetch(completeUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (completeResponse.ok) {
                    const completedSession = await completeResponse.json();

                    // Update local session state
                    this.currentSession.id = newSession.id;
                    this.currentSession.status = 'completed';
                    this.currentSession.completedAt = new Date(completedSession.completed_at);

                    console.log('✅ Recovery session completed successfully:', newSession.id);
                    this.notifyListeners('sessionCompleted', completedSession);
                    window.dispatchEvent(new CustomEvent('sessionStateChanged', { detail: { type: 'completed' } }));
                    this.clearPersistedSession();

                    return completedSession;
                }

                // If not 404, don't retry - it's a different error
                if (completeResponse.status !== 404) {
                    const errorData = await completeResponse.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'Failed to complete recovery session');
                }

                console.warn(`⚠️ Complete attempt ${attempt + 1} got 404, retrying...`);

            } catch (error) {
                if (attempt === MAX_RETRIES - 1) {
                    throw error;
                }
                console.warn(`⚠️ Complete attempt ${attempt + 1} failed:`, error.message);
            }
        }

        throw new Error('Failed to complete recovery session after all retries');
    }

    /**
     * Sleep helper for async delays
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Auto-save session progress (facade to AutoSaveService)
     * @param {Array} exercisesPerformed - Array of exercise data
     * @returns {Promise<void>}
     */
    async autoSaveSession(exercisesPerformed) {
        return this.autoSaveService.autoSaveSession(exercisesPerformed);
    }
    
    /**
     * Fetch exercise history for a workout (facade to WeightHistoryService)
     * @param {string} workoutId - Workout ID
     * @returns {Promise<Object>} Exercise history object
     */
    async fetchExerciseHistory(workoutId) {
        return this.weightHistoryService.fetchExerciseHistory(workoutId);
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
     * PRE-SESSION EDITING FACADE METHODS
     * Delegated to PreSessionEditingService
     */

    /** Update exercise details BEFORE session starts (facade) */
    updatePreSessionExercise(exerciseName, details) {
        return this.preSessionEditingService.updatePreSessionExercise(exerciseName, details);
    }

    /** Get pre-session edits for an exercise (facade) */
    getPreSessionEdits(exerciseName) {
        return this.preSessionEditingService.getPreSessionEdits(exerciseName);
    }

    /** Clear all pre-session edits (facade) */
    clearPreSessionEdits() {
        return this.preSessionEditingService.clearPreSessionEdits();
    }

    /** Mark exercise as skipped BEFORE session starts (facade) */
    skipPreSessionExercise(exerciseName, reason = '') {
        return this.preSessionEditingService.skipPreSessionExercise(exerciseName, reason);
    }

    /** Remove pre-session skip for an exercise (facade) */
    unskipPreSessionExercise(exerciseName) {
        return this.preSessionEditingService.unskipPreSessionExercise(exerciseName);
    }

    /** Check if exercise is pre-session skipped (facade) */
    isPreSessionSkipped(exerciseName) {
        return this.preSessionEditingService.isPreSessionSkipped(exerciseName);
    }

    /** Get all pre-session skips (facade) */
    getPreSessionSkips() {
        return this.preSessionEditingService.getPreSessionSkips();
    }

    /** Clear all pre-session skips (facade) */
    clearPreSessionSkips() {
        return this.preSessionEditingService.clearPreSessionSkips();
    }

    /** Set custom exercise order (facade) */
    setExerciseOrder(exerciseNames) {
        return this.preSessionEditingService.setExerciseOrder(exerciseNames);
    }

    /** Get current exercise order (facade) */
    getExerciseOrder() {
        return this.preSessionEditingService.getExerciseOrder();
    }

    /** Clear exercise order (facade) */
    clearExerciseOrder() {
        return this.preSessionEditingService.clearExerciseOrder();
    }

    /** Check if custom exercise order is set (facade) */
    hasCustomOrder() {
        return this.preSessionEditingService.hasCustomOrder();
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
     * Set weight direction indicator for an exercise
     * @param {string} exerciseName - Exercise name
     * @param {string|null} direction - 'up', 'down', 'same', or null to clear
     */
    setWeightDirection(exerciseName, direction) {
        if (!this.currentSession?.exercises) {
            console.warn('⚠️ No active session to set weight direction');
            return;
        }
        
        const validDirections = ['up', 'down', 'same', null];
        if (!validDirections.includes(direction)) {
            console.error('❌ Invalid weight direction:', direction);
            return;
        }
        
        const existingData = this.currentSession.exercises[exerciseName] || {};
        this.currentSession.exercises[exerciseName] = {
            ...existingData,
            next_weight_direction: direction,
            direction_set_at: direction ? new Date().toISOString() : null
        };
        
        const directionIcon = direction === 'up' ? '⬆️' : direction === 'down' ? '⬇️' : '⏹️';
        console.log(`${directionIcon} Weight direction set for ${exerciseName}: ${direction || 'cleared'}`);
        this.notifyListeners('weightDirectionUpdated', { exerciseName, direction });
        this.persistSession();
    }
    
    /**
     * Get weight direction for an exercise
     * @param {string} exerciseName - Exercise name
     * @returns {string|null} 'up', 'down', or null
     */
    getWeightDirection(exerciseName) {
        return this.currentSession?.exercises?.[exerciseName]?.next_weight_direction || null;
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
     * Check if current session is in Quick Log mode
     * @returns {boolean} True if session is Quick Log mode
     */
    isQuickLogMode() {
        return this.currentSession?.sessionMode === 'quick_log';
    }

    /**
     * Get session mode ('timed' or 'quick_log')
     * @returns {string} Session mode, defaults to 'timed'
     */
    getSessionMode() {
        return this.currentSession?.sessionMode || 'timed';
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

        // Clear session notes
        this.clearSessionNotes();

        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        console.log('🧹 Session cleared');
        this.notifyListeners('sessionCleared', {});
        window.dispatchEvent(new CustomEvent('sessionStateChanged', { detail: { type: 'cleared' } }));

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
     * @param {number|null} insertAtIndex - Optional index to insert at (for replace functionality)
     */
    addBonusExercise(exerciseData, insertAtIndex = null) {
        const { name, sets, reps, rest, weight = '', weight_unit = 'lbs', notes = '' } = exerciseData;
        
        // If no active session, add to pre-workout list
        if (!this.currentSession) {
            console.log('📝 Adding bonus exercise to pre-workout list:', name);
            
            // Handle insertion at specific index for pre-workout list
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
                console.log(`✅ Pre-workout bonus inserted at index ${insertAtIndex}`);
            } else {
                this.preWorkoutBonusExercises.push(exerciseToAdd);
                console.log(`✅ Pre-workout bonus added at end`);
            }
            
            this.notifyListeners('preWorkoutBonusExerciseAdded', { name });
            console.log(`✅ Pre-workout bonus added. Total pre-workout bonuses: ${this.preWorkoutBonusExercises.length}`);
            return;
        }
        
        // Active session - add to session exercises
        if (!this.currentSession.exercises) {
            this.currentSession.exercises = {};
        }
        
        // 🔧 FIX: Calculate order_index based on existing exercises or use insertAtIndex
        // This ensures bonus exercises maintain proper order in history
        const existingExerciseCount = Object.keys(this.currentSession.exercises).length;
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
            order_index: order_index,  // 🔧 FIX: Add order_index for proper sequencing
            is_modified: false,
            is_skipped: false
        };
        
        this.currentSession.exercises[name] = bonusExercise;
        console.log('✅ Bonus exercise added to session:', name, 'at order_index:', order_index);
        
        // 🔧 NEW: If inserting at a specific index, update the exercise order
        if (insertAtIndex !== null) {
            // Get current exercise order or build from template
            let currentOrder = this.getExerciseOrder();
            
            // If no custom order exists, build default order from exercises
            if (currentOrder.length === 0) {
                currentOrder = Object.entries(this.currentSession.exercises)
                    .sort(([, a], [, b]) => (a.order_index || 0) - (b.order_index || 0))
                    .map(([exerciseName]) => exerciseName);
            }
            
            // Remove the new exercise if it's already in the order (shouldn't happen, but safety)
            const existingIndex = currentOrder.indexOf(name);
            if (existingIndex !== -1) {
                currentOrder.splice(existingIndex, 1);
            }
            
            // Insert at the specified position
            const validIndex = Math.min(Math.max(0, insertAtIndex), currentOrder.length);
            currentOrder.splice(validIndex, 0, name);
            
            // Update the exercise order
            this.setExerciseOrder(currentOrder);
            console.log('✅ Exercise order updated with inserted exercise at position', validIndex);
        }
        
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
     * SESSION PERSISTENCE FACADE METHODS
     * Delegated to SessionPersistenceService
     */

    /** Persist current session to localStorage (facade) */
    persistSession() {
        return this.sessionPersistenceService.persistSession();
    }

    /** Restore session from localStorage (facade) */
    restoreSession() {
        return this.sessionPersistenceService.restoreSession();
    }

    /** Clear persisted session from localStorage (facade) */
    clearPersistedSession() {
        return this.sessionPersistenceService.clearPersistedSession();
    }

    /** Check if a persisted session exists (facade) */
    hasPersistedSession() {
        return this.sessionPersistenceService.hasPersistedSession();
    }
    
    /**
     * SESSION NOTES METHODS
     * Session Notes Facade Methods (delegated to SessionNotesService)
     * Notes are session-only and not saved to workout templates
     */

    /** Add a new session note (facade) */
    addSessionNote(position, content = '') {
        return this.sessionNotesService.addSessionNote(position, content);
    }

    /** Update session note content (facade) */
    updateSessionNote(noteId, content) {
        return this.sessionNotesService.updateSessionNote(noteId, content);
    }

    /** Delete a session note (facade) */
    deleteSessionNote(noteId) {
        return this.sessionNotesService.deleteSessionNote(noteId);
    }

    /** Get all session notes (facade) */
    getSessionNotes() {
        return this.sessionNotesService.getSessionNotes();
    }

    /** Get a specific session note by ID (facade) */
    getSessionNote(noteId) {
        return this.sessionNotesService.getSessionNote(noteId);
    }

    /** Clear all session notes (facade) */
    clearSessionNotes() {
        return this.sessionNotesService.clearSessionNotes();
    }

    /** Update note order index (facade) */
    updateSessionNoteOrder(noteId, newOrderIndex) {
        return this.sessionNotesService.updateSessionNoteOrder(noteId, newOrderIndex);
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