/**
 * Ghost Gym - Session Persistence Service
 * Manages localStorage persistence and session recovery
 * Extracted from WorkoutSessionService for single responsibility
 * @version 1.0.0
 * @date 2026-02-06
 */

class SessionPersistenceService {
    constructor(options = {}) {
        // Storage key
        this.STORAGE_KEY = 'ffn_active_workout_session';

        // Callbacks for session service coordination
        this.onGetCurrentSession = options.onGetCurrentSession || (() => null);
        this.onGetSessionNotes = options.onGetSessionNotes || (() => []);
        this.onSetSessionNotes = options.onSetSessionNotes || (() => {});
        this.onGetExerciseOrder = options.onGetExerciseOrder || (() => []);
        this.onSetExerciseOrder = options.onSetExerciseOrder || (() => {});

        console.log('💾 Session Persistence Service initialized');
    }

    /**
     * Persist current session to localStorage
     * Automatically called after session changes to ensure data is never lost
     */
    persistSession() {
        const currentSession = this.onGetCurrentSession();
        if (!currentSession) {
            console.warn('⚠️ No active session to persist');
            return;
        }

        const now = new Date().toISOString();
        const sessionNotes = this.onGetSessionNotes();
        const exerciseOrder = this.onGetExerciseOrder();

        const sessionData = {
            sessionId: currentSession.id,
            workoutId: currentSession.workoutId,
            workoutName: currentSession.workoutName,
            startedAt: currentSession.startedAt.toISOString(),
            status: currentSession.status,
            sessionMode: currentSession.sessionMode || 'timed',
            exercises: currentSession.exercises || {},
            sessionNotes: sessionNotes || [],
            exerciseOrder: exerciseOrder || [],
            lastUpdated: now,
            lastPageActive: now,
            version: '2.4',
            schemaVersion: 2
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
            console.log('💾 Session persisted (v2.4):', sessionData.sessionId);
        } catch (error) {
            console.error('❌ Failed to persist session:', error);
        }
    }

    /**
     * Restore session from localStorage
     * Called on page load to check for interrupted sessions
     * @returns {Object|null} Restored session data or null
     */
    restoreSession() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                console.log('ℹ️ No persisted session found');
                return null;
            }

            let sessionData = JSON.parse(stored);

            // Handle version migrations
            if (!sessionData.version || sessionData.version === '1.0') {
                console.log('🔄 Migrating session from v1.0 to v2.0...');
                sessionData = this._migrateSessionV1toV2(sessionData);
            }

            if (sessionData.version === '2.0') {
                console.log('🔄 Migrating session from v2.0 to v2.1...');
                sessionData = this._migrateSessionV2toV2_1(sessionData);
            }

            if (sessionData.version === '2.1') {
                console.log('🔄 Migrating session from v2.1 to v2.2...');
                sessionData = this._migrateSessionV2_1toV2_2(sessionData);
            }

            if (sessionData.version === '2.2') {
                console.log('🔄 Migrating session from v2.2 to v2.3...');
                sessionData = this._migrateSessionV2_2toV2_3(sessionData);
            }

            if (sessionData.version === '2.3') {
                console.log('🔄 Migrating session from v2.3 to v2.4...');
                sessionData = this._migrateSessionV2_3toV2_4(sessionData);
            }

            // Restore session notes from persisted data
            this.onSetSessionNotes(sessionData.sessionNotes || []);

            // Restore exercise order from persisted data
            if (sessionData.exerciseOrder && sessionData.exerciseOrder.length > 0) {
                this.onSetExerciseOrder(sessionData.exerciseOrder);
                console.log('📋 Exercise order restored:', sessionData.exerciseOrder.length, 'exercises');
            }

            // Validate required fields
            if (!sessionData.sessionId || !sessionData.workoutId || !sessionData.startedAt) {
                console.warn('⚠️ Invalid session data, clearing...');
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
     * Clear persisted session from localStorage
     * Called when session is completed or explicitly abandoned
     */
    clearPersistedSession() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
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
        return !!localStorage.getItem(this.STORAGE_KEY);
    }

    // ============================================
    // VERSION MIGRATIONS
    // ============================================

    /**
     * Migrate session from v1.0 to v2.0
     * @private
     */
    _migrateSessionV1toV2(sessionData) {
        sessionData.version = '2.0';
        sessionData.schemaVersion = 2;
        sessionData.exercises = sessionData.exercises || {};

        Object.keys(sessionData.exercises).forEach(exerciseName => {
            const exercise = sessionData.exercises[exerciseName];
            sessionData.exercises[exerciseName] = {
                ...exercise,
                is_modified: true,
                modified_at: sessionData.lastUpdated || new Date().toISOString(),
                is_skipped: false,
                notes: exercise.notes || ''
            };
        });

        console.log('✅ Session migrated to v2.0');
        return sessionData;
    }

    /**
     * Migrate session from v2.0 to v2.1
     * @private
     */
    _migrateSessionV2toV2_1(sessionData) {
        sessionData.version = '2.1';
        sessionData.lastPageActive = sessionData.lastPageActive || sessionData.lastUpdated;
        console.log('✅ Session migrated to v2.1 (lastPageActive added)');
        return sessionData;
    }

    /**
     * Migrate session from v2.1 to v2.2
     * @private
     */
    _migrateSessionV2_1toV2_2(sessionData) {
        sessionData.version = '2.2';
        sessionData.sessionNotes = sessionData.sessionNotes || [];
        console.log('✅ Session migrated to v2.2 (sessionNotes added)');
        return sessionData;
    }

    /**
     * Migrate session from v2.2 to v2.3
     * @private
     */
    _migrateSessionV2_2toV2_3(sessionData) {
        sessionData.version = '2.3';
        sessionData.sessionMode = sessionData.sessionMode || 'timed';
        console.log('✅ Session migrated to v2.3 (sessionMode added)');
        return sessionData;
    }

    /**
     * Migrate session from v2.3 to v2.4
     * @private
     */
    _migrateSessionV2_3toV2_4(sessionData) {
        sessionData.version = '2.4';
        sessionData.exerciseOrder = sessionData.exerciseOrder || [];
        console.log('✅ Session migrated to v2.4 (exerciseOrder added)');
        return sessionData;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionPersistenceService;
}

console.log('📦 Session Persistence Service loaded');
