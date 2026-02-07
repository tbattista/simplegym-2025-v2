/**
 * Ghost Gym - Session Notes Service
 * Manages inline session notes during workouts
 * Extracted from WorkoutSessionService for single responsibility
 * @version 1.0.0
 * @date 2026-02-06
 */

class SessionNotesService {
    constructor(options = {}) {
        // State
        this.sessionNotes = [];

        // Callbacks for session service coordination
        this.onNotify = options.onNotify || (() => {});
        this.onPersist = options.onPersist || (() => {});

        console.log('📝 Session Notes Service initialized');
    }

    /**
     * Add a new session note
     * @param {number} position - Index to insert at (in the combined card list)
     * @param {string} content - Note text content (optional, can be empty initially)
     * @returns {Object} Created note object
     */
    addSessionNote(position, content = '') {
        const note = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            type: 'note',
            content: content.substring(0, 500), // Enforce max length
            created_at: new Date().toISOString(),
            order_index: position
        };

        this.sessionNotes.push(note);

        console.log('📝 Session note added:', note.id, 'at position', position);
        this.onNotify('sessionNoteAdded', { note });
        this.onPersist();

        return note;
    }

    /**
     * Update session note content
     * @param {string} noteId - Note ID
     * @param {string} content - New content
     * @returns {boolean} True if note was found and updated
     */
    updateSessionNote(noteId, content) {
        const note = this.sessionNotes.find(n => n.id === noteId);
        if (!note) {
            console.warn('⚠️ Note not found:', noteId);
            return false;
        }

        note.content = content.substring(0, 500); // Enforce max length
        note.modified_at = new Date().toISOString();

        console.log('📝 Session note updated:', noteId);
        this.onNotify('sessionNoteUpdated', { note });
        this.onPersist();

        return true;
    }

    /**
     * Delete a session note
     * @param {string} noteId - Note ID
     * @returns {boolean} True if note was found and deleted
     */
    deleteSessionNote(noteId) {
        const index = this.sessionNotes.findIndex(n => n.id === noteId);
        if (index === -1) {
            console.warn('⚠️ Note not found:', noteId);
            return false;
        }

        const note = this.sessionNotes.splice(index, 1)[0];

        console.log('🗑️ Session note deleted:', noteId);
        this.onNotify('sessionNoteDeleted', { noteId, note });
        this.onPersist();

        return true;
    }

    /**
     * Get all session notes
     * @returns {Array} Array of note objects
     */
    getSessionNotes() {
        return [...this.sessionNotes];
    }

    /**
     * Get a specific session note by ID
     * @param {string} noteId - Note ID
     * @returns {Object|null} Note object or null if not found
     */
    getSessionNote(noteId) {
        return this.sessionNotes.find(n => n.id === noteId) || null;
    }

    /**
     * Clear all session notes
     * Called when session ends or is cleared
     */
    clearSessionNotes() {
        const count = this.sessionNotes.length;
        this.sessionNotes = [];
        console.log('🧹 Session notes cleared:', count, 'notes removed');
        this.onNotify('sessionNotesCleared', { count });
    }

    /**
     * Update note order index (for reordering)
     * @param {string} noteId - Note ID
     * @param {number} newOrderIndex - New order index
     * @returns {boolean} True if note was found and updated
     */
    updateSessionNoteOrder(noteId, newOrderIndex) {
        const note = this.sessionNotes.find(n => n.id === noteId);
        if (!note) {
            console.warn('⚠️ Note not found for reorder:', noteId);
            return false;
        }

        note.order_index = newOrderIndex;
        console.log('📋 Session note reordered:', noteId, 'to position', newOrderIndex);
        this.onNotify('sessionNoteReordered', { noteId, newOrderIndex });
        this.onPersist();

        return true;
    }

    /**
     * Load session notes from saved data
     * @param {Array} notes - Array of note objects
     */
    loadNotes(notes) {
        this.sessionNotes = notes || [];
        console.log('📝 Session notes loaded:', this.sessionNotes.length, 'notes');
    }

    /**
     * Get notes count
     * @returns {number} Number of notes
     */
    getNotesCount() {
        return this.sessionNotes.length;
    }

    /**
     * Check if note exists
     * @param {string} noteId - Note ID
     * @returns {boolean} True if note exists
     */
    hasNote(noteId) {
        return this.sessionNotes.some(n => n.id === noteId);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionNotesService;
}

console.log('📦 Session Notes Service loaded');
