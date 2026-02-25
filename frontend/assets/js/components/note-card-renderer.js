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
        const preview = content
            ? this._escapeHtml(content.length > 80 ? content.substring(0, 80) + '...' : content)
            : '<span class="text-muted">Tap edit to add note content</span>';

        return `
            <div class="exercise-group-card compact session-note-card"
                 data-card-type="note"
                 data-note-id="${this._escapeHtml(noteId)}"
                 data-card-index="${displayIndex}"
                 onclick="if(!event.target.closest('.btn-menu-compact, .btn-edit-compact, .workout-menu, .note-editor')) { this.classList.toggle('expanded'); if(this.classList.contains('expanded')) setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }">
                <div class="card">
                    <div class="card-body">
                        <div class="exercise-content">
                            <div class="exercise-list">
                                <div class="exercise-line">
                                    <i class="bx bx-comment text-muted me-1"></i>${preview}
                                </div>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button type="button" class="btn btn-sm btn-edit-compact"
                                    aria-label="Edit note"
                                    title="Edit note"
                                    onclick="event.preventDefault(); event.stopPropagation(); window.workoutModeController?.handleEditNote?.('${this._escapeHtml(noteId)}');">
                                <i class="bx bx-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-menu-compact"
                                    onclick="event.preventDefault(); event.stopPropagation(); window.workoutModeController?.toggleNoteMenu?.(this, '${this._escapeHtml(noteId)}', ${displayIndex});"
                                    title="More options">
                                <i class="bx bx-dots-vertical"></i>
                            </button>
                            ${this._renderMoreMenu(noteId, displayIndex, totalCards)}
                        </div>
                    </div>
                </div>

                <!-- Expanded Body -->
                <div class="note-card-body" onclick="event.stopPropagation()">
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
