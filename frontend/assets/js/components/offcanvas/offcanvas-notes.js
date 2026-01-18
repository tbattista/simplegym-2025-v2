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
        subtitle = 'Select where to insert the note'
    } = config;

    const id = `notePositionPickerOffcanvas-${Date.now()}`;

    // Build position options HTML
    let positionsHtml = '';

    // Position at the start
    positionsHtml += `
        <button type="button" class="list-group-item list-group-item-action position-option"
                data-position="0">
            <div class="d-flex align-items-center">
                <i class="bx bx-plus-circle text-primary me-2"></i>
                <span class="text-primary fw-medium">At the beginning</span>
            </div>
        </button>
    `;

    // Positions after each item
    items.forEach((item, index) => {
        const icon = item.type === 'note' ? 'bx-comment' : 'bx-dumbbell';
        const typeLabel = item.type === 'note' ? 'Note' : 'Exercise';

        positionsHtml += `
            <div class="list-group-item list-group-item-secondary py-2">
                <div class="d-flex align-items-center">
                    <i class="bx ${icon} me-2 text-muted"></i>
                    <span class="text-muted small">${escapeHtml(item.name)}</span>
                    <span class="badge bg-secondary ms-auto">${typeLabel}</span>
                </div>
            </div>
            <button type="button" class="list-group-item list-group-item-action position-option"
                    data-position="${index + 1}">
                <div class="d-flex align-items-center">
                    <i class="bx bx-plus-circle text-primary me-2"></i>
                    <span class="text-primary fw-medium">After ${escapeHtml(item.name)}</span>
                </div>
            </button>
        `;
    });

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
             tabindex="-1" id="${id}" aria-labelledby="${id}Label"
             data-bs-scroll="false" style="height: auto; max-height: 70vh;">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    <i class="bx bx-comment me-2"></i>${escapeHtml(title)}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body py-3" style="overflow-y: auto;">
                <p class="text-muted mb-3">${escapeHtml(subtitle)}</p>
                <div class="list-group">
                    ${positionsHtml}
                </div>
            </div>
        </div>
    `;

    return createOffcanvas(id, offcanvasHtml, (offcanvas, offcanvasElement) => {
        // Position option click handlers
        const positionBtns = offcanvasElement.querySelectorAll('.position-option');
        positionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const position = parseInt(btn.getAttribute('data-position'));
                offcanvas.hide();

                // Small delay to let offcanvas close
                setTimeout(() => {
                    if (onSelect) {
                        onSelect(position);
                    }
                }, 300);
            });
        });
    });
}

console.log('📦 Offcanvas Notes module loaded');
