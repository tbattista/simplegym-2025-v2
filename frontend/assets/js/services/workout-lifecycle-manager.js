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
     * Handle start workout button click
     * Validates state, checks auth, handles conflicts
     * @returns {Promise<boolean>} Success status
     */
    async handleStartWorkout() {
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
                
                return new Promise((resolve) => {
                    modalManager.confirm(
                        'Active Session Found',
                        `You have an active session for <strong>${WorkoutUtils.escapeHtml(persistedSession.workoutName)}</strong>. Starting a new workout will end that session. Continue?`,
                        async () => {
                            // User chose to start fresh - clear old session and start new one
                            this.sessionService.clearPersistedSession();
                            const result = await this.startNewSession();
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
            
            return await this.startNewSession();
            
        } catch (error) {
            console.error('❌ Error starting workout:', error);
            this.isStartingSession = false;
            
            const modalManager = this.getModalManager();
            modalManager.alert('Error', error.message, 'danger');
            return false;
        }
    }
    
    /**
     * Start a new workout session
     * Creates session, fetches history, updates UI
     * @returns {Promise<boolean>} Success status
     */
    async startNewSession() {
        try {
            // Pass workout data to pre-populate exercises
            await this.sessionService.startSession(
                this.currentWorkout.id,
                this.currentWorkout.name,
                this.currentWorkout
            );
            
            // Fetch exercise history
            await this.sessionService.fetchExerciseHistory(this.currentWorkout.id);
            
            // Update UI
            this.uiStateManager.updateSessionState(true, this.sessionService.getCurrentSession());
            
            // Re-render to show weight inputs and transferred bonus exercises
            this.onRenderWorkout();
            
            // Auto-expand first exercise card after render completes
            setTimeout(() => {
                this.onExpandFirstCard();
            }, 300);
            
            // Show success message
            if (window.showAlert) {
                window.showAlert('Workout session started! 💪', 'success');
            }
            
            // Reset flag
            this.isStartingSession = false;
            
            return true;
            
        } catch (error) {
            console.error('❌ Error starting workout:', error);
            this.isStartingSession = false;
            
            const modalManager = this.getModalManager();
            modalManager.alert('Error', error.message, 'danger');
            return false;
        }
    }
    
    /**
     * Handle complete workout button click
     * Shows completion offcanvas
     */
    handleCompleteWorkout() {
        this.showCompleteWorkoutOffcanvas();
    }
    
    /**
     * Show complete workout offcanvas
     * Creates completion offcanvas with session stats
     */
    showCompleteWorkoutOffcanvas() {
        const session = this.sessionService.getCurrentSession();
        if (!session) return;
        
        // Calculate session stats
        const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const exerciseCount = this.currentWorkout?.exercise_groups?.length || 0;
        const bonusCount = this.currentWorkout?.bonus_exercises?.length || 0;
        const totalExercises = exerciseCount + bonusCount;
        
        // Use unified factory to create offcanvas
        window.UnifiedOffcanvasFactory.createCompleteWorkout({
            workoutName: this.currentWorkout.name,
            minutes,
            totalExercises
        }, async () => {
            // Collect exercise data
            const exercisesPerformed = this.onCollectExerciseData();
            
            // Complete session
            const completedSession = await this.sessionService.completeSession(exercisesPerformed);
            
            // Update template weights
            await this.onUpdateTemplateWeights(exercisesPerformed);
            
            // Show completion summary
            this.showCompletionSummary(completedSession);
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
            console.log('🔄 Found persisted session, showing resume prompt...');
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
        async () => await this.resumeSession(sessionData),
        (onDiscardComplete) => {
            this.sessionService.clearPersistedSession();
            if (onDiscardComplete) {
                onDiscardComplete();
            }
        });
    }
    
    /**
     * Resume a persisted session
     * @param {Object} sessionData - Persisted session data
     */
    async resumeSession(sessionData) {
        try {
            console.log('🔄 Resuming workout session...');
            
            // Load the workout first (this will also hide loading state)
            await this.onLoadWorkout(sessionData.workoutId);
            
            // Restore session to service
            this.sessionService.currentSession = {
                id: sessionData.sessionId,
                workoutId: sessionData.workoutId,
                workoutName: sessionData.workoutName,
                startedAt: new Date(sessionData.startedAt),
                status: sessionData.status,
                exercises: sessionData.exercises || {}
            };
            
            // Render workout with session data
            this.onRenderWorkout();
            
            // Update UI to show active session
            this.uiStateManager.updateSessionState(true, this.sessionService.getCurrentSession());
            
            // Start timer (will calculate from original start time)
            this.timerManager.startSessionTimer(this.sessionService.getCurrentSession());
            
            // Calculate elapsed time for display
            const elapsedMinutes = Math.floor(
                (Date.now() - this.sessionService.currentSession.startedAt.getTime()) / (1000 * 60)
            );
            
            // Show success message
            if (window.showAlert) {
                window.showAlert(
                    `Workout resumed! You've been working out for ${elapsedMinutes} minutes.`,
                    'success'
                );
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
     * Get modal manager (lazy load to ensure it's available)
     * @returns {Object} Modal manager or fallback
     */
    getModalManager() {
        if (!window.ghostGymModalManager) {
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
        return window.ghostGymModalManager;
    }
    
    /**
     * Strip HTML tags from string
     * @param {string} html - HTML string
     * @returns {string} Plain text
     */
    stripHtml(html) {
        return WorkoutUtils.stripHtml(html);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutLifecycleManager;
}

console.log('📦 Workout Lifecycle Manager loaded');
