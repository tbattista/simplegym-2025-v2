/**
 * Ghost Gym - Auto Save Service
 * Manages auto-saving of workout sessions to the server
 * Extracted from WorkoutSessionService for single responsibility
 * @version 1.0.0
 * @date 2026-02-06
 */

class AutoSaveService {
    constructor(options = {}) {
        // State
        this.autoSaveTimer = null;

        // Callbacks for session service coordination
        this.onGetCurrentSession = options.onGetCurrentSession || (() => null);
        this.onNotify = options.onNotify || (() => {});
        this.onPersist = options.onPersist || (() => {});

        console.log('💾 Auto Save Service initialized');
    }

    /**
     * Auto-save session progress to the server
     * @param {Array} exercisesPerformed - Array of exercise data
     * @returns {Promise<void>}
     */
    async autoSaveSession(exercisesPerformed) {
        const currentSession = this.onGetCurrentSession();

        try {
            if (!currentSession || !currentSession.id || currentSession.status !== 'in_progress') {
                console.warn('No active session to save');
                return;
            }

            console.log('💾 Auto-saving session...');

            // Local-only sessions: skip API call, just persist to localStorage
            if (currentSession.id.startsWith('local-')) {
                console.log('💾 Local session - persisting to localStorage only');
                this.onPersist();
                this.onNotify('sessionSaved', { sessionId: currentSession.id });
                return;
            }

            // Get auth token
            const token = await window.authService.getIdToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Use centralized API config
            const url = window.config.api.getUrl(`/api/v3/workout-sessions/${currentSession.id}`);

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
            this.onNotify('sessionSaved', { sessionId: currentSession.id });

            // Persist after auto-save
            this.onPersist();

        } catch (error) {
            console.error('❌ Error auto-saving session:', error);
            this.onNotify('sessionSaveError', { error: error.message });
            throw error;
        }
    }

    /**
     * Schedule an auto-save with a delay
     * @param {Function} callback - Callback to execute
     * @param {number} delayMs - Delay in milliseconds
     */
    scheduleAutoSave(callback, delayMs = 30000) {
        this.cancelAutoSave();
        this.autoSaveTimer = setTimeout(() => {
            callback();
        }, delayMs);
        console.log(`⏱️ Auto-save scheduled in ${delayMs}ms`);
    }

    /**
     * Cancel any pending auto-save
     */
    cancelAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('⏱️ Auto-save cancelled');
        }
    }

    /**
     * Check if auto-save is pending
     * @returns {boolean} True if auto-save is scheduled
     */
    isAutoSavePending() {
        return this.autoSaveTimer !== null;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoSaveService;
}

console.log('📦 Auto Save Service loaded');
