/**
 * Ghost Gym - Plate Calculator Settings Offcanvas
 * Creates plate calculator configuration offcanvas
 *
 * @module offcanvas-plate-settings
 * @version 1.0.0
 * @date 2026-02-27
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/* ============================================
   PLATE CALCULATOR SETTINGS
   ============================================ */

/**
 * Create plate calculator settings offcanvas
 * @param {Function} onSave - Callback when user saves settings
 * @returns {Object} Offcanvas instance
 */
export function createPlateSettings(onSave) {
    // Load current config from service
    const config = window.plateCalculatorService?.getConfig() || {
        barWeight: 45,
        barUnit: 'lbs',
        availablePlates: {
            55: true,
            45: true,
            35: true,
            25: true,
            10: true,
            5: true,
            2.5: true
        },
        customPlates: []
    };

    const standardPlates = [55, 45, 35, 25, 10, 5, 2.5];

    const offcanvasHtml = `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base" tabindex="-1" id="plateSettingsOffcanvas" aria-labelledby="plateSettingsOffcanvasLabel" data-bs-scroll="false">
            <div class="offcanvas-header border-bottom">
                <h5 class="offcanvas-title" id="plateSettingsOffcanvasLabel">
                    <i class="bx bx-cog me-2"></i>Plate Calculator Settings
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div class="mb-4">
                    <h6 class="mb-3">Bar Weight</h6>
                    <div class="d-flex gap-2">
                        <input type="number" class="form-control" id="barWeightInput" value="${config.barWeight}" min="0" step="5" style="flex: 1;">
                        <select class="form-select" id="unitSelect" style="width: 100px;">
                            <option value="lbs" ${config.barUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                            <option value="kg" ${config.barUnit === 'kg' ? 'selected' : ''}>kg</option>
                        </select>
                    </div>
                    <small class="text-muted">Standard barbell is 45 lbs / 20 kg</small>
                </div>

                <div class="mb-4">
                    <h6 class="mb-3">Available Plates</h6>
                    <p class="small text-muted mb-2">Select which plates are available at your gym</p>
                    <div class="d-flex flex-wrap gap-2" id="standardPlatesContainer">
                        ${standardPlates.map(weight => {
                            const isEnabled = config.availablePlates[weight] === true;
                            return `
                                <label class="btn btn-sm ${isEnabled ? 'btn-primary' : 'btn-outline-primary'}" style="cursor: pointer;">
                                    <input type="checkbox" class="plate-checkbox" data-weight="${weight}"
                                           ${isEnabled ? 'checked' : ''} style="display: none;">
                                    ${weight}
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="mb-4">
                    <h6 class="mb-3">Custom Plates</h6>
                    <p class="small text-muted mb-2">Add non-standard plates (e.g., 15, 100)</p>
                    <div id="customPlatesContainer">
                        ${config.customPlates.map((weight, index) => `
                            <div class="d-flex gap-2 mb-2 custom-plate-row" data-index="${index}">
                                <input type="number" class="form-control custom-plate-input" value="${weight}" min="0" step="0.5" style="flex: 1;">
                                <button type="button" class="btn btn-sm btn-outline-danger remove-custom-plate" data-index="${index}">
                                    <i class="bx bx-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary" id="addCustomPlateBtn">
                        <i class="bx bx-plus me-1"></i>Add Custom Plate
                    </button>
                </div>

                <div class="alert alert-info d-flex align-items-start mb-4">
                    <i class="bx bx-info-circle me-2 mt-1"></i>
                    <div>
                        <strong>How it works</strong>
                        <p class="mb-0 small">The plate calculator will show you the optimal combination of plates needed to reach your target weight.</p>
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary" id="resetToDefaultsBtn">
                        <i class="bx bx-refresh me-1"></i>Reset to Defaults
                    </button>
                    <button type="button" class="btn btn-primary flex-fill" id="savePlateSettingsBtn">
                        <i class="bx bx-check me-1"></i>Save Settings
                    </button>
                </div>
            </div>
        </div>
    `;

    return createOffcanvas('plateSettingsOffcanvas', offcanvasHtml, (offcanvas) => {
        setupPlateSettingsListeners(offcanvas, onSave);
    });
}

/**
 * Setup plate settings event listeners
 */
function setupPlateSettingsListeners(offcanvas, onSave) {
    const saveBtn = document.getElementById('savePlateSettingsBtn');
    const resetBtn = document.getElementById('resetToDefaultsBtn');
    const addCustomBtn = document.getElementById('addCustomPlateBtn');
    const barWeightInput = document.getElementById('barWeightInput');
    const unitSelect = document.getElementById('unitSelect');
    const standardPlatesContainer = document.getElementById('standardPlatesContainer');
    const customPlatesContainer = document.getElementById('customPlatesContainer');

    // Toggle standard plate selection
    standardPlatesContainer.addEventListener('click', (e) => {
        const label = e.target.closest('label');
        if (label) {
            const checkbox = label.querySelector('.plate-checkbox');
            if (checkbox) {
                // Toggle checkbox
                checkbox.checked = !checkbox.checked;

                // Update button styling
                if (checkbox.checked) {
                    label.classList.remove('btn-outline-primary');
                    label.classList.add('btn-primary');
                } else {
                    label.classList.remove('btn-primary');
                    label.classList.add('btn-outline-primary');
                }
            }
        }
    });

    // Add custom plate
    addCustomBtn.addEventListener('click', () => {
        const index = customPlatesContainer.children.length;
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 mb-2 custom-plate-row';
        row.setAttribute('data-index', index);
        row.innerHTML = `
            <input type="number" class="form-control custom-plate-input" value="15" min="0" step="0.5" style="flex: 1;">
            <button type="button" class="btn btn-sm btn-outline-danger remove-custom-plate" data-index="${index}">
                <i class="bx bx-trash"></i>
            </button>
        `;
        customPlatesContainer.appendChild(row);
    });

    // Remove custom plate
    customPlatesContainer.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-custom-plate');
        if (removeBtn) {
            const row = removeBtn.closest('.custom-plate-row');
            row.remove();
        }
    });

    // Reset to defaults
    resetBtn.addEventListener('click', () => {
        if (confirm('Reset all plate settings to defaults?')) {
            window.plateCalculatorService?.resetToDefaults();
            offcanvas.hide();

            // Re-open with default values
            setTimeout(() => {
                createPlateSettings(onSave);
            }, 300);

            if (window.showAlert) {
                window.showAlert('Settings reset to defaults', 'info');
            }
        }
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const barWeight = parseFloat(barWeightInput.value) || 45;
        const barUnit = unitSelect.value;

        // Get selected standard plates as object
        const availablePlates = {};
        const standardPlates = [55, 45, 35, 25, 10, 5, 2.5];
        standardPlates.forEach(weight => {
            const checkbox = document.querySelector(`.plate-checkbox[data-weight="${weight}"]`);
            availablePlates[weight] = checkbox ? checkbox.checked : false;
        });

        // Get custom plates
        const customPlates = [];
        document.querySelectorAll('.custom-plate-input').forEach(input => {
            const value = parseFloat(input.value);
            if (value > 0) {
                customPlates.push(value);
            }
        });

        // Save to service
        const newConfig = {
            barWeight,
            barUnit,
            availablePlates,
            customPlates
        };

        window.plateCalculatorService?.saveConfig(newConfig);

        // Call callback
        if (onSave) {
            onSave(newConfig);
        }

        offcanvas.hide();

        if (window.showAlert) {
            window.showAlert('Plate settings saved successfully', 'success');
        }

        // Re-render workout to update plate calculations
        if (window.workoutModeController) {
            window.workoutModeController.renderWorkout();
        }
    });
}

console.log('📦 Offcanvas plate settings loaded');
