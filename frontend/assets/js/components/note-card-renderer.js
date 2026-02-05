/**
 * Ghost Gym - Note Card Renderer
 * Handles rendering of note cards in workout mode
 * Notes are session-only items that appear inline with exercise cards
 * @version 1.0.0
 * @date 2026-01-16
 */

class NoteCardRenderer {
    /**
     * @param {Object} sessionService - Workout session service instance
     */
    constructor(sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Render a note card
     * @param {Object} note - Note data with id, content, order_index, created_at
     * @param {number} displayIndex - Visual position in card list
     * @param {number} totalCards - Total number of cards (for move up/down bounds)
     * @returns {string} HTML string for the card
     */
    renderCard(note, displayIndex, totalCards = 0) {
        const noteId = note.id || '';
        const content = note.content || '';
        const truncatedContent = this._truncateText(content, 150);
        const displayText = truncatedContent || 'Empty note';
        const isSessionActive = this.sessionService.isSessionActive();

        return `
            <div class="workout-card note-card"
                 data-card-type="note"
                 data-note-id="${this._escapeHtml(noteId)}"
                 data-card-index="${displayIndex}"
                 onclick="if(!event.target.closest('.workout-more-btn, .note-edit-btn, .workout-menu, .note-editor')) { this.classList.toggle('expanded'); if(this.classList.contains('expanded')) setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }">
                <!-- Collapsed Header -->
                <div class="workout-card-header note-card-header">
                    <div class="workout-exercise-name-row">
                        <div class="workout-exercise-name note-card-title">
                            <i class="bx bx-comment note-icon"></i>
                            <span class="note-preview">${this._escapeHtml(displayText)}</span>
                        </div>
                        <div class="workout-header-actions">
                            <button class="workout-edit-btn note-edit-btn"
                                    aria-label="Edit note"
                                    title="Edit note"
                                    onclick="window.workoutModeController?.handleEditNote?.('${this._escapeHtml(noteId)}'); event.stopPropagation();">
                                <i class="bx bx-pencil"></i>
                            </button>
                            <button class="workout-more-btn"
                                    onclick="window.workoutModeController?.toggleNoteMenu?.(this, '${this._escapeHtml(noteId)}', ${displayIndex}); event.stopPropagation();"
                                    title="More options">
                                <i class="bx bx-dots-vertical"></i>
                            </button>
                            <i class="bx bx-chevron-down workout-chevron"></i>
                            ${this._renderMoreMenu(noteId, displayIndex, totalCards)}
                        </div>
                    </div>
                </div>

                <!-- Expanded Body -->
                <div class="workout-card-body note-card-body" onclick="event.stopPropagation()">
                    <!-- Display Mode -->
                    <div class="note-display">
                        <div class="note-full-content">${content ? this._escapeHtml(content) : '<em class="text-muted">No content yet. Click the edit button to add a note.</em>'}</div>
                    </div>

                    <!-- Edit Mode (hidden initially) -->
                    <div class="note-editor" style="display: none;">
                        <textarea class="note-textarea form-control"
                                  rows="4"
                                  maxlength="500"
                                  placeholder="Add your note here... (e.g., 'Rest 2 minutes before heavy set', 'Use a belt for this exercise')"
                                  data-note-id="${this._escapeHtml(noteId)}"
                                  onclick="event.stopPropagation();">${this._escapeHtml(content)}</textarea>
                        <div class="note-char-count">
                            <span class="note-char-current">${content.length}</span>/500
                        </div>
                        <div class="note-editor-actions">
                            <button class="btn btn-sm btn-success note-save-btn"
                                    type="button"
                                    onclick="window.workoutModeController?.handleSaveNote?.('${this._escapeHtml(noteId)}'); event.stopPropagation();"
                                    aria-label="Save note"
                                    title="Save">
                                <i class="bx bx-check"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary note-cancel-btn"
                                    type="button"
                                    onclick="window.workoutModeController?.handleCancelNoteEdit?.('${this._escapeHtml(noteId)}'); event.stopPropagation();"
                                    aria-label="Cancel edit"
                                    title="Cancel">
                                <i class="bx bx-x"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render more menu (⋯ menu) for note card
     * @param {string} noteId - Note ID
     * @param {number} displayIndex - Card index
     * @param {number} totalCards - Total number of cards (for move up/down boundaries)
     * @private
     */
    _renderMoreMenu(noteId, displayIndex, totalCards) {
        return `
            <div class="workout-menu note-menu" onclick="event.stopPropagation()">
                <button class="workout-menu-item"
                        onclick="window.workoutModeController?.handleDeleteNote?.('${this._escapeHtml(noteId)}'); event.stopPropagation();">
                    <i class="bx bx-trash"></i>
                    Delete note
                </button>
                <div class="workout-menu-divider"></div>
                <button class="workout-menu-item${displayIndex === 0 ? ' disabled' : ''}"
                        onclick="window.workoutModeController?.handleMoveUp?.(${displayIndex}); event.stopPropagation();"
                        ${displayIndex === 0 ? 'disabled' : ''}>
                    <i class="bx bx-chevron-up"></i>
                    Move up
                </button>
                <button class="workout-menu-item${displayIndex >= totalCards - 1 ? ' disabled' : ''}"
                        onclick="window.workoutModeController?.handleMoveDown?.(${displayIndex}); event.stopPropagation();"
                        ${displayIndex >= totalCards - 1 ? 'disabled' : ''}>
                    <i class="bx bx-chevron-down"></i>
                    Move down
                </button>
            </div>
        `;
    }

    /**
     * Truncate text to specified length with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     * @private
     */
    _truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export globally
window.NoteCardRenderer = NoteCardRenderer;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteCardRenderer;
}

console.log('📦 NoteCardRenderer component loaded');
