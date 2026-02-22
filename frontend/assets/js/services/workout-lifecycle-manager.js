/**
 * Ghost Gym - Workout Lifecycle Manager
 * Orchestrates workout session lifecycle (start → in-progress → complete)
 * @version 1.0.0
 * @date 2026-01-05
 * Phase 5: Session Lifecycle Management
 */

class WorkoutLifecycleManager {
    constructor(options) {
        // Required services
        this.sessionService = options.sessionService;
        this.uiStateManager = options.uiStateManager;
        this.authService = options.authService;
        this.dataManager = options.dataManager;
        this.timerManager = options.timerManager;
        
        // Callbacks for controller coordination
        this.onRenderWorkout = options.onRenderWorkout || (() => {});
        this.onExpandFirstCard = options.onExpandFirstCard || (() => {});
        this.onCollectExerciseData = options.onCollectExerciseData || (() => []);
        this.onUpdateTemplateWeights = options.onUpdateTemplateWeights || (async () => {});
        this.onLoadWorkout = options.onLoadWorkout || (async () => {});
        
        // State
        this.isStartingSession = false;
        this.currentWorkout = null;
        
        console.log('🔄 Workout Lifecycle Manager initialized');
    }
    
    /**
     * Set current workout context
     * @param {Object} workout - Current workout object
     */
    setWorkout(workout) {
        this.currentWorkout = workout;
    }
    
    /**
     * Handle start workout button click (timed session)
     * Validates state, checks auth, handles conflicts
     * @returns {Promise<boolean>} Success status
     */
    async handleStartWorkout() {
        return this._handleStartSession('timed');
    }

    /**
     * Handle start Quick Log button click
     * Same validation as timed, but without timer
     * @returns {Promise<boolean>} Success status
     */
    async handleStartQuickLog() {
        return this._handleStartSession('quick_log');
    }

    /**
     * Internal handler for starting any session type
     * @param {string} sessionMode - 'timed' or 'quick_log'
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _handleStartSession(sessionMode = 'timed') {
        const modeIcon = sessionMode === 'quick_log' ? '📝' : '▶️';

        if (!this.currentWorkout) {
            console.error('❌ No workout loaded');
            return false;
        }

        // Prevent concurrent session creation using state flag
        if (this.isStartingSession) {
            console.log('🚫 Session already being created, ignoring click');
            return false;
        }

        // Check if user is authenticated
        if (!this.authService.isUserAuthenticated()) {
            this.showLoginPrompt();
            return false;
        }

        try {
            // Set flag to prevent concurrent calls
            this.isStartingSession = true;

            // Check if there's a different persisted session
            const persistedSession = this.sessionService.restoreSession();
            if (persistedSession && persistedSession.workoutId !== this.currentWorkout.id) {
                const modalManager = this.getModalManager();
                const modeName = sessionMode === 'quick_log' ? 'Quick Log' : 'timed session';

                return new Promise((resolve) => {
                    modalManager.confirm(
                        'Active Session Found',
                        `You have an active session for <strong>${WorkoutUtils.escapeHtml(persistedSession.workoutName)}</strong>. Starting a new ${modeName} will end that session. Continue?`,
                        async () => {
                            // User chose to start fresh - clear old session and start new one
                            this.sessionService.clearPersistedSession();
                            const result = await this.startNewSession(sessionMode);
                            resolve(result);
                        },
                        () => {
                            // User cancelled - reset flag
                            this.isStartingSession = false;
                            resolve(false);
                        }
                    );
                });
            }

            return await this.startNewSession(sessionMode);

        } catch (error) {
            console.error(`❌ Error starting ${sessionMode} session:`, error);
            this.isStartingSession = false;

            const modalManager = this.getModalManager();
            modalManager.alert('Error', error.message, 'danger');
            return false;
        }
    }

    /**
     * Start a new workout session
     * Creates session, fetches history, updates UI
     * @param {string} sessionMode - 'timed' (default) or 'quick_log'
     * @returns {Promise<boolean>} Success status
     */
    async startNewSession(sessionMode = 'timed') {
        try {
            const modeIcon = sessionMode === 'quick_log' ? '📝' : '🏋️';
            console.log(`${modeIcon} Starting ${sessionMode} session...`);

            // Pass workout data and session mode to create session
            await this.sessionService.startSession(
                this.currentWorkout.id,
                this.currentWorkout.name,
                this.currentWorkout,
                sessionMode
            );

            // Fetch exercise history
            await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);

            // Update UI
            this.uiStateManager.updateSessionState(true, this.sessionService.getCurrentSession());

            // Only start timer for timed sessions (not Quick Log)
            if (sessionMode !== 'quick_log') {
                this.timerManager.startSessionTimer();
            }

            // Show floating controls (mode-aware)
            this.showFloatingControls(true, sessionMode);

            // Show bottom action bar
            this.showBottomBar(true);

            // Re-render to show weight inputs
            this.onRenderWorkout();

            // Auto-expand first exercise card after render completes
            setTimeout(() => {
                this.onExpandFirstCard();
            }, 300);

            // Show success message (mode-aware)
            if (sessionMode === 'quick_log') {
                // Use toast notification for Quick Log - more prominent and follows UX best practices
                if (window.toastNotifications) {
                    window.toastNotifications.info(
                        'Log your completed exercises below',
                        'Quick Log Mode'
                    );
                } else if (window.showAlert) {
                    window.showAlert('Quick Log started! Log your exercises below.', 'success');
                }
            } else {
                // Use showAlert for timed sessions (existing behavior)
                if (window.showAlert) {
                    window.showAlert('Workout session started! 💪', 'success');
                }
            }

            // Reset flag
            this.isStartingSession = false;

            return true;

        } catch (error) {
            console.error(`❌ Error starting ${sessionMode} session:`, error);
            this.isStartingSession = false;

            const modalManager = this.getModalManager();
            modalManager.alert('Error', error.message, 'danger');
            return false;
        }
    }

    /**
     * Handle save Quick Log button click
     * Similar to handleCompleteWorkout but for Quick Log mode
     * @returns {Promise<boolean>} Success status
     */
    async handleSaveQuickLog() {
        console.log('💾 Saving Quick Log...');
        // Quick Log uses the same completion flow as timed sessions
        // The only difference is in how duration is calculated (manual vs auto)
        return this.handleCompleteWorkout();
    }
    
    /**
     * Handle complete workout button click
     * Shows completion offcanvas
     */
    handleCompleteWorkout() {
        // NOTE: Do NOT call showFloatingControls(false) here!
        // The timer/controls should remain visible while the completion offcanvas is open.
        // Controls will be reset when the workout is actually completed or cancelled.
        this.showCompleteWorkoutOffcanvas();
    }
    
    /**
     * Show complete workout offcanvas
     * Creates completion offcanvas with session stats
     */
    showCompleteWorkoutOffcanvas() {
        const session = this.sessionService.getCurrentSession();
        if (!session) return;

        // Detect session mode (Quick Log vs Timed)
        const isQuickLog = this.sessionService.isQuickLogMode();

        // Calculate session stats
        const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const exerciseCount = this.currentWorkout?.exercise_groups?.length || 0;
        const totalExercises = exerciseCount;

        // Use unified factory to create offcanvas
        window.UnifiedOffcanvasFactory.createCompleteWorkout({
            workoutName: this.currentWorkout.name,
            minutes,
            totalExercises,
            isQuickLog  // Pass Quick Log flag for mode-aware UI
        }, async (durationMinutes) => {
            try {
                // Collect exercise data
                const exercisesPerformed = this.onCollectExerciseData();

                // Complete session (pass durationMinutes for Quick Log mode)
                const completedSession = await this.sessionService.completeSession(
                    exercisesPerformed,
                    durationMinutes  // null for timed sessions, number for Quick Log
                );

                // Update template weights
                await this.onUpdateTemplateWeights(exercisesPerformed);

                // NOW hide floating controls after workout is actually completed
                this.showFloatingControls(false);

                // Hide Quick Log banner if it was showing
                if (window.bottomActionBar) {
                    window.bottomActionBar.showQuickLogBanner(false);
                }

                // Show completion summary
                this.showCompletionSummary(completedSession);
            } catch (error) {
                console.error('❌ Error completing workout:', error);

                // Show error to user
                const modalManager = this.getModalManager();
                modalManager.alert(
                    'Save Failed',
                    `Failed to save your workout: ${error.message}. Your data has been preserved locally - please try again.`,
                    'danger'
                );

                // Re-show floating controls so user can try again
                const sessionMode = this.sessionService.getSessionMode();
                this.showFloatingControls(true, sessionMode);
            }
        });
    }
    
    /**
     * Show completion summary
     * @param {Object} session - Completed session data
     */
    showCompletionSummary(session) {
        window.UnifiedOffcanvasFactory.createCompletionSummary({
            duration: session.duration_minutes || 0,
            exerciseCount: session.exercises_performed?.length || 0,
            workoutId: this.currentWorkout?.id
        });
    }
    
    /**
     * Show login prompt modal
     * Called when unauthenticated user tries to start workout
     */
    showLoginPrompt() {
        const modalHtml = `
            <div class="modal fade" id="loginPromptModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0 pb-0">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center pt-0">
                            <div class="mb-4">
                                <i class="bx bx-lock-alt" style="font-size: 4rem; color: var(--bs-primary);"></i>
                            </div>
                            <h4 class="mb-3">Login Required</h4>
                            <p class="text-muted mb-4">You need to be logged in to track your workouts and save weight progress.</p>
                            
                            <div class="mb-4">
                                <p class="mb-3"><strong>With an account you can:</strong></p>
                                <ul class="list-unstyled text-start" style="max-width: 300px; margin: 0 auto;">
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        Track weight progress
                                    </li>
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        Save workout history
                                    </li>
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        See personal records
                                    </li>
                                    <li class="mb-2">
                                        <i class="bx bx-check-circle text-success me-2"></i>
                                        Auto-save during workouts
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer border-0 justify-content-center">
                            <button type="button" class="btn btn-primary" onclick="window.authService.showLoginModal(); bootstrap.Modal.getInstance(document.getElementById('loginPromptModal')).hide();">
                                <i class="bx bx-log-in me-2"></i>Log In
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('loginPromptModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initialize Bootstrap modal
        const modalElement = document.getElementById('loginPromptModal');
        const modal = new window.bootstrap.Modal(modalElement);
        
        // Cleanup modal on hide
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
        
        // Show modal
        modal.show();
    }
    
    /**
     * Check for and handle persisted session on page load
     * @returns {Promise<boolean>} True if session was found and handled
     */
    async checkPersistedSession() {
        const persistedSession = this.sessionService.restoreSession();
        
        if (persistedSession) {
            // Calculate time since page was last active
            // Use lastPageActive (when page was visible) NOT lastUpdated (when data changed)
            // This prevents auto-resume when user has been changing weights for 50+ minutes
            const lastPageActive = new Date(persistedSession.lastPageActive || persistedSession.lastUpdated);
            const minutesSincePageActive = (Date.now() - lastPageActive.getTime()) / (1000 * 60);
            
            // Auto-resume threshold: 2 minutes
            // If user was away briefly (< 2 min), auto-resume silently without showing offcanvas
            const AUTO_RESUME_THRESHOLD_MINUTES = 2;
            
            if (minutesSincePageActive < AUTO_RESUME_THRESHOLD_MINUTES) {
                // User was away briefly - auto-resume silently
                console.log(`🔄 Auto-resuming session (page inactive for ${minutesSincePageActive.toFixed(1)} minutes, threshold: ${AUTO_RESUME_THRESHOLD_MINUTES} min)`);
                await this.resumeSession(persistedSession);
                return true;
            }
            
            // User was away longer - show resume prompt with options
            console.log(`🔄 Found persisted session (page inactive for ${minutesSincePageActive.toFixed(1)} minutes), showing resume prompt...`);
            await this.showResumeSessionPrompt(persistedSession);
            return true;
        }
        
        return false;
    }
    
    /**
     * Show resume session prompt
     * @param {Object} sessionData - Persisted session data
     */
    async showResumeSessionPrompt(sessionData) {
        // Calculate elapsed time
        const startedAt = new Date(sessionData.startedAt);
        const elapsedMinutes = Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60));
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        const remainingMinutes = elapsedMinutes % 60;
        
        // Format elapsed time display
        const elapsedDisplay = elapsedHours > 0
            ? `${elapsedHours}h ${remainingMinutes}m ago`
            : `${elapsedMinutes} minutes ago`;
        
        // Count exercises with weights
        const exercisesWithWeights = Object.keys(sessionData.exercises || {})
            .filter(name => sessionData.exercises[name].weight).length;
        const totalExercises = Object.keys(sessionData.exercises || {}).length;
        
        // Use unified factory to create offcanvas
        window.UnifiedOffcanvasFactory.createResumeSession({
            workoutName: sessionData.workoutName,
            elapsedDisplay,
            exercisesWithWeights,
            totalExercises
        },
        async () => await this.resumeSession(sessionData),  // onResume
        (onDiscardComplete) => {                             // onStartFresh
            this.sessionService.clearPersistedSession();
            if (onDiscardComplete) {
                onDiscardComplete();
            }
        },
        () => {                                              // onCancel (NEW)
            // Show confirmation before canceling workout
            const modalManager = this.getModalManager();
            modalManager.confirm(
                'Cancel Workout?',
                'Are you sure you want to cancel this workout session?<br><br>All progress from this session will be discarded and you will return to the workout database.',
                () => {
                    // User confirmed - clear session and redirect
                    this.sessionService.clearPersistedSession();
                    window.location.href = 'workout-database.html';
                },
                {
                    confirmText: 'Yes, Cancel Workout',
                    confirmClass: 'btn-danger',
                    cancelText: 'Go Back'
                }
            );
        });
    }
    
    /**
     * Resume a persisted session
     * @param {Object} sessionData - Persisted session data
     */
    async resumeSession(sessionData) {
        try {
            const sessionMode = sessionData.sessionMode || 'timed';
            const modeIcon = sessionMode === 'quick_log' ? '📝' : '🔄';
            console.log(`${modeIcon} Resuming ${sessionMode} workout session...`);

            // Verify session exists in Firestore before resuming
            // If not found, recreate it to avoid 404 on completion
            const verifiedSessionId = await this._verifyOrRecreateSession(sessionData);

            // Load the workout first (this will also hide loading state)
            await this.onLoadWorkout(sessionData.workoutId);

            // Restore session to service (including sessionMode)
            // Use verified session ID (may be different if recreated)
            this.sessionService.currentSession = {
                id: verifiedSessionId,
                workoutId: sessionData.workoutId,
                workoutName: sessionData.workoutName,
                startedAt: new Date(sessionData.startedAt),
                status: sessionData.status,
                sessionMode: sessionMode,
                exercises: sessionData.exercises || {}
            };

            // Render workout with session data
            this.onRenderWorkout();

            // Update UI to show active session
            this.uiStateManager.updateSessionState(true, this.sessionService.getCurrentSession());

            // Only start timer for timed sessions (not Quick Log)
            if (sessionMode !== 'quick_log') {
                this.timerManager.startSessionTimer(this.sessionService.getCurrentSession());
            }

            // Show floating controls for resumed session (mode-aware)
            this.showFloatingControls(true, sessionMode);

            // Show bottom action bar
            this.showBottomBar(true);

            // ✅ FIX: Persist session to update lastUpdated timestamp
            // This prevents offcanvas from showing on immediate subsequent refresh
            this.sessionService.persistSession();
            console.log('💾 Session timestamp updated after resume');

            // Show success message (mode-aware)
            if (window.showAlert) {
                if (sessionMode === 'quick_log') {
                    window.showAlert('Quick Log session resumed!', 'success');
                } else {
                    // Calculate elapsed time for timed sessions
                    const elapsedMinutes = Math.floor(
                        (Date.now() - this.sessionService.currentSession.startedAt.getTime()) / (1000 * 60)
                    );
                    window.showAlert(
                        `Workout resumed! You've been working out for ${elapsedMinutes} minutes.`,
                        'success'
                    );
                }
            }

            console.log('✅ Session resumed successfully');
            
        } catch (error) {
            console.error('❌ Error resuming session:', error);
            
            // Clear invalid session
            this.sessionService.clearPersistedSession();
            
            // Show error
            this.uiStateManager.showError('Failed to resume workout. The workout may have been deleted.');
            
            throw error;
        }
    }
    
    /**
     * Update UI for session state changes
     * @param {boolean} isActive - Whether session is active
     */
    updateSessionUI(isActive) {
        // Delegate to UI state manager
        this.uiStateManager.updateSessionState(isActive, this.sessionService.getCurrentSession());
        
        // Handle timers
        if (isActive) {
            this.timerManager.startSessionTimer(this.sessionService.getCurrentSession());
        } else {
            this.timerManager.stopSessionTimer();
        }
    }

    /**
     * Verify session exists in Firestore, recreate if missing
     * Prevents 404 errors when completing resumed sessions
     * @param {Object} sessionData - Session data from localStorage
     * @returns {Promise<string>} Verified or new session ID
     * @private
     */
    async _verifyOrRecreateSession(sessionData) {
        try {
            const token = await window.authService?.getIdToken();
            if (!token) {
                console.warn('⚠️ No auth token, skipping session verification');
                return sessionData.sessionId;
            }

            const exists = await this._verifySessionExists(sessionData.sessionId, token);

            if (exists) {
                console.log('✅ Session verified in Firestore:', sessionData.sessionId);
                return sessionData.sessionId;
            }

            // Session not found - recreate it
            console.warn('⚠️ Session not found in Firestore, recreating...');
            const newSessionId = await this._recreateSessionInFirestore(sessionData, token);
            return newSessionId;

        } catch (error) {
            console.warn('⚠️ Session verification failed:', error.message);
            // Return original ID and let completion handle recovery
            return sessionData.sessionId;
        }
    }

    /**
     * Check if session exists in Firestore
     * @param {string} sessionId - Session ID to verify
     * @param {string} token - Auth token
     * @returns {Promise<boolean>} True if session exists
     * @private
     */
    async _verifySessionExists(sessionId, token) {
        try {
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/${sessionId}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                return false;
            }

            return response.ok;
        } catch (error) {
            console.warn('⚠️ Session verification request failed:', error.message);
            return true; // Assume exists on network error, let completion handle it
        }
    }

    /**
     * Recreate session in Firestore from localStorage data
     * @param {Object} sessionData - Session data from localStorage
     * @param {string} token - Auth token
     * @returns {Promise<string>} New session ID
     * @private
     */
    async _recreateSessionInFirestore(sessionData, token) {
        const url = window.config.api.getUrl('/api/v3/workout-sessions');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workout_id: sessionData.workoutId,
                workout_name: sessionData.workoutName,
                started_at: sessionData.startedAt,
                session_mode: sessionData.sessionMode || 'timed'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to recreate session');
        }

        const newSession = await response.json();
        console.log('✅ Session recreated in Firestore:', newSession.id);

        // Update localStorage with new session ID
        sessionData.sessionId = newSession.id;
        this.sessionService.persistSession();

        return newSession.id;
    }

    /**
     * Get modal manager (lazy load to ensure it's available)
     * @returns {Object} Modal manager or fallback
     */
    getModalManager() {
        if (!window.ffnModalManager) {
            console.warn('⚠️ Modal manager not available, using fallback');
            return {
                confirm: (title, message, onConfirm, onCancel) => {
                    // Strip HTML tags for plain text
                    const plainMessage = this.stripHtml(message);
                    if (confirm(`${title}\n\n${plainMessage}`)) {
                        onConfirm();
                    } else if (onCancel) {
                        onCancel();
                    }
                },
                alert: (title, message, type) => {
                    // Strip HTML tags for plain text
                    const plainMessage = this.stripHtml(message);
                    alert(`${title}\n\n${plainMessage}`);
                }
            };
        }
        return window.ffnModalManager;
    }
    
    /**
     * Strip HTML tags from string
     * @param {string} html - HTML string
     * @returns {string} Plain text
     */
    stripHtml(html) {
        return WorkoutUtils.stripHtml(html);
    }
    
    /**
     * Show/hide floating controls (FAB and Timer+End combo)
     * Phase 8: Coordinate visibility of floating UI elements
     * @param {boolean} sessionActive - True to show timer+end, false to show FAB
     * @param {string} sessionMode - Session mode: 'timed' or 'quick_log'
     */
    showFloatingControls(sessionActive, sessionMode = 'timed') {
        console.log('🎮 showFloatingControls called:', { sessionActive, sessionMode });

        // ✅ PHASE 8 FIX: Use bottom-action-bar-service element IDs
        // Service creates: #floatingDualButtons, #floatingTimerEndCombo, #floatingQuickLogCombo
        // This replaces static HTML element IDs: #startWorkoutFAB

        // Delegate to bottom-action-bar-service for state management
        // Service registers as window.bottomActionBar (not bottomActionBarService)
        console.log('🔍 window.bottomActionBar exists:', !!window.bottomActionBar);

        if (window.bottomActionBar) {
            console.log('📞 Calling updateWorkoutModeState...');
            window.bottomActionBar.updateWorkoutModeState(sessionActive, sessionMode);
            const modeLabel = sessionActive ? (sessionMode === 'quick_log' ? 'Quick Log combo' : 'Timer+End combo') : 'Dual buttons';
            console.log(`✅ Floating controls updated via service: ${modeLabel} shown`);
        } else {
            console.warn('⚠️ bottom-action-bar (bottomActionBar) not available, controls may not update');
        }
    }
    
    /**
     * Show/hide bottom action bar
     * Phase 8: Control bottom bar visibility
     * @param {boolean} show - True to show, false to hide
     */
    showBottomBar(show) {
        // ✅ PHASE 8 FIX: Bottom bar is managed by bottom-action-bar-service
        // Service automatically shows/hides based on page and session state
        // This method is now a no-op, kept for backward compatibility
        console.log(`✅ Bottom action bar visibility delegated to service (show: ${show})`);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutLifecycleManager;
}

console.log('📦 Workout Lifecycle Manager loaded');
