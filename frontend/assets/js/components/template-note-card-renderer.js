/**
 * Ghost Gym - Template Note Card Renderer
 * Handles rendering of note cards in workout-builder mode
 * Notes are permanent items saved with the workout template
 * Styled to match exercise-group-card exactly
 * @version 1.1.0
 * @date 2026-01-17
 */

class TemplateNoteCardRenderer {
    constructor() {
        console.log('📝 TemplateNoteCardRenderer initialized');
    }

    /**
     * Create a note card for workout builder
     * Matches exercise-group-card.compact structure with speech bubble icon
     * All text uses meta-text styling (smaller, muted) - no header formatting
     * @param {Object} note - Note data with id, content, order_index, created_at
     * @param {number} displayIndex - Visual position in card list (for move up/down)
     * @param {number} totalCards - Total number of cards
     * @returns {string} HTML string for the card
     */
    createNoteCard(note, displayIndex = 0, totalCards = 0) {
        const noteId = note.id || `template-note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const content = note.content || '';
        const hasContent = content.length > 0;

        // Build content HTML - all text uses meta-text styling (no header formatting)
        // Show full content, no truncation
        let contentHtml = '';
        if (hasContent) {
            contentHtml = `<span class="template-note-text">${this._escapeHtml(content)}</span>`;
        } else {
            contentHtml = `<span class="template-note-text text-muted">Click edit to add note content</span>`;
        }

        return `
            <div class="exercise-group-card compact template-note-card" data-note-id="${this._escapeHtml(noteId)}" data-card-type="note">
                <div class="card">
                    <div class="card-body">
                        <i class="bx bx-comment template-note-icon"></i>
                        <div class="exercise-content">
                            <div class="exercise-meta-text text-muted small">
                                ${contentHtml}
                            </div>
                        </div>
                        <div class="card-actions">
                            <button type="button" class="btn btn-sm btn-icon btn-edit-compact"
                                    onclick="event.preventDefault(); event.stopPropagation(); window.handleEditTemplateNote?.('${this._escapeHtml(noteId)}');"
                                    title="Edit note">
                                <i class="bx bx-edit"></i>
                            </button>
                        </div>
                        <div class="drag-handle" style="display: none;">
                            <i class="bx bx-menu"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create note edit offcanvas content
     * @param {Object} note - Note data
     * @returns {string} HTML string for offcanvas body
     */
    createEditOffcanvasContent(note) {
        const content = note.content || '';
        const noteId = note.id || '';

        return `
            <div class="template-note-editor" data-note-id="${this._escapeHtml(noteId)}">
                <div class="mb-3">
                    <label class="form-label">Note Content</label>
                    <textarea class="form-control template-note-textarea"
                              id="templateNoteContent"
                              rows="6"
                              maxlength="500"
                              placeholder="Add your note here... (e.g., 'Rest 2 minutes before heavy set', 'Use a belt for this exercise', 'Superset with next exercise')">${this._escapeHtml(content)}</textarea>
                    <div class="d-flex justify-content-between mt-2">
                        <small class="text-muted">
                            <span id="templateNoteCharCount">${content.length}</span>/500 characters
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update note card preview after editing
     * @param {string} noteId - Note ID
     * @param {string} content - New content
     */
    updateNoteCardPreview(noteId, content) {
        const card = document.querySelector(`[data-note-id="${noteId}"]`);
        if (!card) return;

        const noteTextSpan = card.querySelector('.template-note-text');
        if (noteTextSpan) {
            const hasContent = content.length > 0;

            if (hasContent) {
                noteTextSpan.textContent = content;
                noteTextSpan.classList.remove('text-muted');
            } else {
                noteTextSpan.textContent = 'Click edit to add note content';
                noteTextSpan.classList.add('text-muted');
            }
        }
    }

    /**
     * Remove note card from DOM
     * @param {string} noteId - Note ID to remove
     */
    removeNoteCard(noteId) {
        const card = document.querySelector(`[data-note-id="${noteId}"]`);
        if (card) {
            card.remove();
        }
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

// Create singleton instance
window.templateNoteCardRenderer = new TemplateNoteCardRenderer();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateNoteCardRenderer;
}

console.log('📦 TemplateNoteCardRenderer component loaded');
