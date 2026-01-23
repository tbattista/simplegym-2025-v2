/**
 * Ghost Gym - Note Offcanvas Components
 * Creates note-related offcanvas: template note editor, position picker
 *
 * @module offcanvas-notes
 * @version 1.0.0
 * @date 2026-01-16
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/* ============================================
   TEMPLATE NOTE EDITOR
   ============================================ */

/**
 * Create template note editor offcanvas
 * @param {Object} config - Configuration
 * @param {Object} config.note - Note data with id, content
 * @param {Function} config.onSave - Callback when save clicked (receives content)
 * @param {Function} config.onDelete - Callback when delete clicked
 * @returns {Object} Offcanvas instance
 */
export function createTemplateNoteEditor(config) {
    const { note, onSave, onDelete } = config;
    const noteId = note?.id || 'new-note';
    const content = note?.content || '';
    const id = `templateNoteEditorOffcanvas-${Date.now()}`;

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
             tabindex="-1" id="${id}" aria-labelledby="${id}Label"
             data-bs-scroll="false" style="height: auto; max-height: 70vh;">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    <i class="bx bx-edit me-2"></i>Edit Note
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body py-3">
                <div class="mb-3">
                    <label class="form-label">Note Content</label>
                    <textarea class="form-control template-note-textarea"
                              id="templateNoteContent-${noteId}"
                              rows="6"
                              maxlength="500"
                              placeholder="Add your note here... (e.g., 'Rest 2 minutes before heavy set', 'Use a belt for this exercise', 'Superset with next exercise')">${escapeHtml(content)}</textarea>
                    <div class="d-flex justify-content-between mt-2">
                        <small class="text-muted">
                            <span id="templateNoteCharCount-${noteId}">${content.length}</span>/500 characters
                        </small>
                    </div>
                </div>
            </div>
            <div class="offcanvas-footer border-top p-3">
                <div class="d-flex gap-2 workout-builder-buttons">
                    <button type="button" class="btn btn-primary flex-fill" id="saveTemplateNoteBtn-${noteId}">
                        <i class="bx bx-save me-1"></i>Save
                    </button>
                    <button type="button" class="btn btn-label-secondary flex-fill" data-bs-dismiss="offcanvas">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-outline-danger flex-fill" id="deleteTemplateNoteBtn-${noteId}">
                        <i class="bx bx-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    return createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
        const textarea = offcanvasElement.querySelector(`#templateNoteContent-${noteId}`);
        const charCount = offcanvasElement.querySelector(`#templateNoteCharCount-${noteId}`);
        const saveBtn = offcanvasElement.querySelector(`#saveTemplateNoteBtn-${noteId}`);
        const deleteBtn = offcanvasElement.querySelector(`#deleteTemplateNoteBtn-${noteId}`);

        // Character counter
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;

                // Visual feedback for limit
                if (textarea.value.length >= 450) {
                    charCount.classList.add('text-warning');
                } else {
                    charCount.classList.remove('text-warning');
                }
                if (textarea.value.length >= 500) {
                    charCount.classList.add('text-danger');
                } else {
                    charCount.classList.remove('text-danger');
                }
            });

            // Focus textarea on open
            offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
                textarea.focus();
                // Move cursor to end
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            });
        }

        // Save button
        if (saveBtn && onSave) {
            saveBtn.addEventListener('click', () => {
                const newContent = textarea?.value || '';
                onSave(newContent);
                offcanvas.hide();
            });
        }

        // Delete button
        if (deleteBtn && onDelete) {
            deleteBtn.addEventListener('click', () => {
                offcanvas.hide();
                // Small delay to let offcanvas close before showing confirm
                setTimeout(() => {
                    onDelete();
                }, 300);
            });
        }
    });
}

/* ============================================
   NOTE POSITION PICKER
   ============================================ */

/**
 * Create note position picker offcanvas
 * Shows a list of current items (exercises + notes) with "Insert here" buttons
 * Matches the workout-mode style with clean button layout
 * @param {Object} config - Configuration
 * @param {Array} config.items - Array of items to show positions between
 * @param {Function} config.onSelect - Callback when position selected (receives index)
 * @param {string} config.title - Optional title (default: 'Add Note')
 * @param {string} config.subtitle - Optional subtitle
 * @returns {Object} Offcanvas instance
 */
export function createNotePositionPicker(config) {
    const {
        items = [],
        onSelect,
        title = 'Add Note',
        subtitle = 'Choose where to insert your note:'
    } = config;

    const id = `notePositionPickerOffcanvas-${Date.now()}`;

    // Build insert point list matching workout-mode style
    const insertPointsHtml = [];

    // Add "At the beginning" option
    insertPointsHtml.push(`
        <button class="position-picker-item btn btn-outline-primary w-100 mb-2"
                data-position="0">
            <i class="bx bx-plus-circle me-2"></i>
            At the beginning
        </button>
    `);

    // Add "After [item]" options for each item
    items.forEach((item, index) => {
        const displayName = item.displayName || item.name;
        const truncatedName = displayName.length > 30
            ? displayName.substring(0, 30) + '...'
            : displayName;
        const icon = item.type === 'note' ? 'bx-note-text' : 'bx-dumbbell';

        insertPointsHtml.push(`
            <button class="position-picker-item btn btn-outline-primary w-100 mb-2"
                    data-position="${index + 1}">
                <i class="bx bx-plus-circle me-2"></i>
                After <i class="bx ${icon} mx-1"></i> ${escapeHtml(truncatedName)}
            </button>
        `);
    });

    // Style last item as "At the end" with success color if there are items
    if (items.length > 0) {
        insertPointsHtml[insertPointsHtml.length - 1] = `
            <button class="position-picker-item quick-add btn btn-outline-success w-100 mb-2"
                    data-position="${items.length}">
                <i class="bx bx-plus-circle me-2"></i>
                At the end (after all exercises)
            </button>
        `;
    }

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
             tabindex="-1" id="${id}" aria-labelledby="${id}Label"
             data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    <i class="bx bx-note me-2"></i>${escapeHtml(title)}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <p class="text-muted mb-3">${escapeHtml(subtitle)}</p>
                <div class="position-picker-list">
                    ${insertPointsHtml.join('')}
                </div>
            </div>
        </div>
    `;

    return createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
        // Add click handlers to position buttons
        offcanvasElement.querySelectorAll('.position-picker-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = parseInt(btn.dataset.position, 10);
                offcanvas.hide();
                // Call callback after offcanvas is hidden
                setTimeout(() => {
                    if (onSelect) {
                        onSelect(position);
                    }
                }, 150);
            });
        });
    });
}

console.log('📦 Offcanvas Notes module loaded');
