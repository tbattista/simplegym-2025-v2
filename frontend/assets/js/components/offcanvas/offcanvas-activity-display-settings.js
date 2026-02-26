/**
 * Activity Display Settings Offcanvas
 * Lets the user choose which 3 fields are shown on activity/cardio cards.
 *
 * @module offcanvas-activity-display-settings
 * @version 1.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/**
 * Create activity display settings offcanvas
 * @param {Object} config
 * @param {Function} [config.onSave] - Called after columns are saved
 * @returns {Object} Offcanvas instance
 */
export function createActivityDisplaySettings(config = {}) {
    const { onSave } = config;
    const id = `activityDisplaySettings-${Date.now()}`;

    const ADC = window.ActivityDisplayConfig;
    if (!ADC) {
        console.error('ActivityDisplayConfig not loaded');
        return;
    }

    const currentColumns = ADC.getColumns();
    const allFieldIds = ADC.getAllFieldIds();

    // Build field rows HTML
    const fieldsHtml = allFieldIds.map(fieldId => {
        const def = ADC.getFieldDef(fieldId);
        const checked = currentColumns.includes(fieldId) ? 'checked' : '';
        return `
            <label class="activity-display-field-row" data-field-id="${escapeHtml(fieldId)}">
                <div class="d-flex align-items-center gap-2 flex-grow-1">
                    <i class="bx ${escapeHtml(def.icon)} activity-display-field-icon"></i>
                    <span class="activity-display-field-label">${escapeHtml(def.label)}</span>
                </div>
                <input type="checkbox" class="form-check-input activity-display-checkbox"
                       value="${escapeHtml(fieldId)}" ${checked}>
            </label>`;
    }).join('');

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base"
             tabindex="-1" id="${id}" aria-labelledby="${id}Label"
             data-bs-scroll="false" style="height: auto; max-height: 85vh;">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="${id}Label">
                    <i class="bx bx-slider me-2"></i>Activity Display Fields
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body py-3" style="overflow-y: auto;">
                <p class="text-muted small mb-3">Choose 3 fields to display on activity cards.</p>
                <div class="activity-display-fields-list" id="fieldsList-${id}">
                    ${fieldsHtml}
                </div>
                <p class="text-muted small mt-2 mb-0" id="fieldsHint-${id}">
                    <span id="fieldsCount-${id}">${currentColumns.length}</span>/3 selected
                </p>
            </div>
            <div class="offcanvas-footer border-top p-3 d-flex gap-2">
                <button type="button" class="btn btn-secondary flex-fill" data-bs-dismiss="offcanvas">Cancel</button>
                <button type="button" class="btn btn-primary flex-fill" id="saveDisplaySettings-${id}">
                    <i class="bx bx-check me-1"></i>Save
                </button>
            </div>
        </div>`;

    return createOffcanvas(id, offcanvasHtml, (bsOffcanvasInstance, el) => {
        const fieldsList = el.querySelector(`#fieldsList-${id}`);
        const countSpan = el.querySelector(`#fieldsCount-${id}`);
        const saveBtn = el.querySelector(`#saveDisplaySettings-${id}`);

        function getCheckedCount() {
            return fieldsList.querySelectorAll('.activity-display-checkbox:checked').length;
        }

        function updateState() {
            const count = getCheckedCount();
            countSpan.textContent = count;

            // Disable unchecked checkboxes when 3 are selected
            fieldsList.querySelectorAll('.activity-display-checkbox').forEach(cb => {
                if (!cb.checked) {
                    cb.disabled = count >= 3;
                    cb.closest('.activity-display-field-row').classList.toggle('field-disabled', count >= 3);
                } else {
                    cb.disabled = false;
                    cb.closest('.activity-display-field-row').classList.remove('field-disabled');
                }
            });

            // Disable save if not exactly 3
            saveBtn.disabled = count !== 3;
        }

        // Wire checkbox changes
        fieldsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('activity-display-checkbox')) {
                updateState();
            }
        });

        // Save
        saveBtn.addEventListener('click', () => {
            const selected = [];
            fieldsList.querySelectorAll('.activity-display-checkbox:checked').forEach(cb => {
                selected.push(cb.value);
            });

            if (selected.length !== 3) return;

            ADC.setColumns(selected);

            // Dismiss offcanvas
            const bsOffcanvas = bootstrap.Offcanvas.getInstance(el);
            if (bsOffcanvas) bsOffcanvas.hide();

            if (onSave) onSave(selected);
        });

        // Initial state
        updateState();
    });
}
