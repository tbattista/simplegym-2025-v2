/**
 * Ghost Gym - Pre-Session Editing Service
 * Manages exercise edits, skips, and ordering before session starts
 * Extracted from WorkoutSessionService for single responsibility
 * @version 1.0.0
 * @date 2026-02-06
 */

class PreSessionEditingService {
    constructor(options = {}) {
        // State
        this.preSessionEdits = {};
        this.preSessionSkips = {};
        this.preSessionOrder = [];

        // Callbacks for session service coordination
        this.onNotify = options.onNotify || (() => {});

        console.log('✏️ Pre-Session Editing Service initialized');
    }

    // ============================================
    // PRE-SESSION EXERCISE EDITS
    // ============================================

    /**
     * Store pre-session exercise edit
     * @param {string} exerciseName - Exercise name
     * @param {Object} details - Updated details
     */
    updatePreSessionExercise(exerciseName, details) {
        console.log('📝 Storing pre-session edit for:', exerciseName, details);

        this.preSessionEdits[exerciseName] = {
            target_sets: details.sets || '3',
            target_reps: details.reps || '8-12',
            rest: details.rest || '60s',
            weight: details.weight || '',
            weight_unit: details.weightUnit || 'lbs',
            edited_at: new Date().toISOString()
        };

        console.log('✅ Pre-session edit stored. Total edits:', Object.keys(this.preSessionEdits).length);
        this.onNotify('preSessionExerciseUpdated', { exerciseName, details });
    }

    /**
     * Get pre-session edits for an exercise
     * @param {string} exerciseName - Exercise name
     * @returns {Object|null} Pre-session edit data or null
     */
    getPreSessionEdits(exerciseName) {
        return this.preSessionEdits[exerciseName] || null;
    }

    /**
     * Get all pre-session edits
     * @returns {Object} All pre-session edits
     */
    getAllPreSessionEdits() {
        return { ...this.preSessionEdits };
    }

    /**
     * Apply all pre-session edits to a session
     * @param {Object} session - Session object with exercises property
     */
    applyPreSessionEdits(session) {
        if (!session?.exercises) {
            console.warn('⚠️ No session exercises to apply edits to');
            return;
        }

        let appliedCount = 0;

        Object.keys(this.preSessionEdits).forEach(exerciseName => {
            const edits = this.preSessionEdits[exerciseName];

            if (session.exercises[exerciseName]) {
                session.exercises[exerciseName] = {
                    ...session.exercises[exerciseName],
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
        this.preSessionEdits = {};
    }

    /**
     * Clear all pre-session edits
     */
    clearPreSessionEdits() {
        this.preSessionEdits = {};
        console.log('🧹 Pre-session edits cleared');
    }

    /**
     * Check if any edits are pending
     * @returns {boolean} True if edits exist
     */
    hasEdits() {
        return Object.keys(this.preSessionEdits).length > 0;
    }

    // ============================================
    // PRE-SESSION EXERCISE SKIPS
    // ============================================

    /**
     * Mark exercise as skipped BEFORE session starts
     * @param {string} exerciseName - Exercise name
     * @param {string} reason - Optional reason for skipping
     */
    skipPreSessionExercise(exerciseName, reason = '') {
        console.log('⏭️ Marking exercise as pre-session skipped:', exerciseName);
        this.preSessionSkips[exerciseName] = {
            is_skipped: true,
            skip_reason: reason || 'Skipped before workout',
            skipped_at: new Date().toISOString()
        };
        console.log('✅ Pre-session skip stored. Total skips:', Object.keys(this.preSessionSkips).length);
        this.onNotify('preSessionExerciseSkipped', { exerciseName, reason });
    }

    /**
     * Remove pre-session skip for an exercise
     * @param {string} exerciseName - Exercise name
     */
    unskipPreSessionExercise(exerciseName) {
        console.log('↩️ Removing pre-session skip for:', exerciseName);
        delete this.preSessionSkips[exerciseName];
        this.onNotify('preSessionExerciseUnskipped', { exerciseName });
    }

    /**
     * Check if exercise is pre-session skipped
     * @param {string} exerciseName - Exercise name
     * @returns {boolean} True if exercise is marked for skip
     */
    isPreSessionSkipped(exerciseName) {
        return !!this.preSessionSkips[exerciseName]?.is_skipped;
    }

    /**
     * Get all pre-session skips
     * @returns {Object} Pre-session skip data
     */
    getPreSessionSkips() {
        return { ...this.preSessionSkips };
    }

    /**
     * Apply all pre-session skips to a session
     * @param {Object} session - Session object with exercises property
     */
    applyPreSessionSkips(session) {
        if (!session?.exercises) {
            console.warn('⚠️ No session exercises to apply skips to');
            return;
        }

        let appliedCount = 0;

        Object.keys(this.preSessionSkips).forEach(exerciseName => {
            const skipData = this.preSessionSkips[exerciseName];

            if (session.exercises[exerciseName]) {
                session.exercises[exerciseName].is_skipped = true;
                session.exercises[exerciseName].skip_reason = skipData.skip_reason;
                session.exercises[exerciseName].skipped_at = skipData.skipped_at;
                appliedCount++;
                console.log(`  ✅ Applied pre-session skip to: ${exerciseName}`);
            } else {
                console.warn(`  ⚠️ Exercise not found in session: ${exerciseName}`);
            }
        });

        console.log(`✅ Applied ${appliedCount} pre-session skips to session`);
        this.preSessionSkips = {};
    }

    /**
     * Clear all pre-session skips
     */
    clearPreSessionSkips() {
        this.preSessionSkips = {};
        console.log('🧹 Pre-session skips cleared');
    }

    /**
     * Check if any skips are pending
     * @returns {boolean} True if skips exist
     */
    hasSkips() {
        return Object.keys(this.preSessionSkips).length > 0;
    }

    // ============================================
    // EXERCISE ORDER
    // ============================================

    /**
     * Set custom exercise order for reordering
     * @param {string[]} exerciseNames - Ordered array of exercise names
     */
    setExerciseOrder(exerciseNames) {
        console.log('📋 Setting custom exercise order:', exerciseNames);
        this.preSessionOrder = [...exerciseNames];
        this.onNotify('exerciseOrderUpdated', { order: this.preSessionOrder });
    }

    /**
     * Get current exercise order
     * @returns {string[]} Array of exercise names in custom order
     */
    getExerciseOrder() {
        return [...this.preSessionOrder];
    }

    /**
     * Clear exercise order
     */
    clearExerciseOrder() {
        this.preSessionOrder = [];
        console.log('🧹 Custom exercise order cleared');
        this.onNotify('exerciseOrderCleared', {});
    }

    /**
     * Check if custom exercise order is set
     * @returns {boolean} True if exercises have been reordered
     */
    hasCustomOrder() {
        return this.preSessionOrder.length > 0;
    }

    // ============================================
    // COMBINED OPERATIONS
    // ============================================

    /**
     * Apply all pre-session modifications to a session
     * @param {Object} session - Session object with exercises property
     */
    applyAllToSession(session) {
        if (this.hasEdits()) {
            console.log('📝 Applying pre-session edits...');
            this.applyPreSessionEdits(session);
        }
        if (this.hasSkips()) {
            console.log('⏭️ Applying pre-session skips...');
            this.applyPreSessionSkips(session);
        }
    }

    /**
     * Clear all pre-session data
     */
    clearAll() {
        this.clearPreSessionEdits();
        this.clearPreSessionSkips();
        this.clearExerciseOrder();
        console.log('🧹 All pre-session data cleared');
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreSessionEditingService;
}

console.log('📦 Pre-Session Editing Service loaded');
