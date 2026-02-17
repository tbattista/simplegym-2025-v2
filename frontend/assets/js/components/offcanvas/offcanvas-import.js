/**
 * Ghost Gym - Import Wizard Offcanvas
 * Multi-step import wizard: Source Input → Preview → Load into Builder
 *
 * @module offcanvas-import
 * @version 1.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/**
 * Create and show the import wizard offcanvas.
 * @param {Function} [onImportComplete] - Callback after successful import (receives workoutData)
 * @returns {Object} { offcanvas, offcanvasElement }
 */
export function createImportWizard(onImportComplete) {
    const id = 'importWizardOffcanvas';

    const html = `
    <div class="offcanvas offcanvas-end" tabindex="-1" id="${id}" data-bs-scroll="false">
        <div class="offcanvas-header border-bottom">
            <h5 class="offcanvas-title" id="importWizardTitle">
                <i class="bx bx-import me-2"></i>Import Workout
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <div class="offcanvas-body p-0">
            <!-- STEP 1: Source Input -->
            <div id="importStep1" class="import-step p-3">
                <!-- Tab selector -->
                <div class="btn-group w-100 mb-3" role="group">
                    <button type="button" class="btn btn-outline-primary active" id="importTabPaste">
                        <i class="bx bx-clipboard me-1"></i>Paste Text
                    </button>
                    <button type="button" class="btn btn-outline-primary" id="importTabFile">
                        <i class="bx bx-file me-1"></i>Upload File
                    </button>
                </div>

                <!-- Paste tab content -->
                <div id="importPasteContent">
                    <textarea
                        id="importTextArea"
                        class="form-control mb-2"
                        rows="10"
                        placeholder="Paste your workout here...&#10;&#10;Supports:&#10;• Plain text (e.g., Bench Press 3x10)&#10;• FFN export format&#10;• CSV data&#10;• JSON data"
                        style="font-size: 14px; line-height: 1.5;"
                    ></textarea>
                    <small class="text-muted d-block mb-3">
                        <i class="bx bx-info-circle me-1"></i>
                        Copy a workout from any app, notes, or spreadsheet
                    </small>
                </div>

                <!-- File tab content (hidden by default) -->
                <div id="importFileContent" class="d-none">
                    <div id="importDropZone" class="border border-2 border-dashed rounded p-4 text-center mb-2"
                         style="cursor: pointer; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <i class="bx bx-cloud-upload text-primary" style="font-size: 2rem;"></i>
                        <p class="mb-1 mt-2">Tap to choose file</p>
                        <small class="text-muted">.txt &nbsp; .csv &nbsp; .json</small>
                        <input type="file" id="importFileInput" accept=".txt,.csv,.json,.tsv"
                               class="d-none" />
                    </div>
                    <div id="importFileName" class="text-muted small mb-3 d-none">
                        <i class="bx bx-file me-1"></i><span></span>
                    </div>
                </div>

                <!-- Parse button -->
                <button type="button" class="btn btn-primary w-100" id="importParseBtn" disabled>
                    <i class="bx bx-analyse me-1"></i>Parse Workout
                </button>

                <!-- Error display -->
                <div id="importError" class="alert alert-danger mt-3 d-none" role="alert">
                    <i class="bx bx-error-circle me-1"></i>
                    <span id="importErrorText"></span>
                </div>
            </div>

            <!-- STEP 2: Preview -->
            <div id="importStep2" class="import-step d-none">
                <!-- Header with back button -->
                <div class="d-flex align-items-center p-3 border-bottom">
                    <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="importBackBtn">
                        <i class="bx bx-chevron-left"></i>
                    </button>
                    <h6 class="mb-0">Import Preview</h6>
                </div>

                <div class="p-3">
                    <!-- Workout name & format -->
                    <h5 id="importPreviewName" class="mb-1"></h5>
                    <small id="importPreviewFormat" class="text-muted d-block mb-3"></small>

                    <!-- Exercise groups preview -->
                    <div id="importPreviewGroups" class="mb-3"></div>

                    <!-- Bonus exercises preview -->
                    <div id="importPreviewBonus" class="mb-3 d-none"></div>

                    <!-- Warnings -->
                    <div id="importPreviewWarnings" class="mb-3 d-none">
                        <div class="alert alert-warning py-2 mb-0">
                            <small><i class="bx bx-info-circle me-1"></i><strong>Notes:</strong></small>
                            <ul id="importWarningsList" class="mb-0 mt-1 small ps-3"></ul>
                        </div>
                    </div>

                    <!-- Action button -->
                    <button type="button" class="btn btn-primary w-100 mt-2" id="importLoadBtn">
                        <i class="bx bx-edit me-1"></i>Load into Builder
                    </button>
                </div>
            </div>

            <!-- Loading state -->
            <div id="importLoading" class="import-step d-none p-4 text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Parsing...</span>
                </div>
                <p class="text-muted">Parsing workout data...</p>
            </div>
        </div>
    </div>`;

    let parsedResult = null;
    let selectedFile = null;
    let activeTab = 'paste'; // 'paste' or 'file'

    return createOffcanvas(id, html, (offcanvas, offcanvasElement) => {

        // ── Element refs ──────────────────────────────────────
        const step1 = offcanvasElement.querySelector('#importStep1');
        const step2 = offcanvasElement.querySelector('#importStep2');
        const loading = offcanvasElement.querySelector('#importLoading');
        const textArea = offcanvasElement.querySelector('#importTextArea');
        const parseBtn = offcanvasElement.querySelector('#importParseBtn');
        const backBtn = offcanvasElement.querySelector('#importBackBtn');
        const loadBtn = offcanvasElement.querySelector('#importLoadBtn');
        const errorDiv = offcanvasElement.querySelector('#importError');
        const errorText = offcanvasElement.querySelector('#importErrorText');
        const tabPaste = offcanvasElement.querySelector('#importTabPaste');
        const tabFile = offcanvasElement.querySelector('#importTabFile');
        const pasteContent = offcanvasElement.querySelector('#importPasteContent');
        const fileContent = offcanvasElement.querySelector('#importFileContent');
        const dropZone = offcanvasElement.querySelector('#importDropZone');
        const fileInput = offcanvasElement.querySelector('#importFileInput');
        const fileNameDiv = offcanvasElement.querySelector('#importFileName');

        // ── Tab switching ─────────────────────────────────────
        tabPaste.addEventListener('click', () => {
            activeTab = 'paste';
            tabPaste.classList.add('active');
            tabFile.classList.remove('active');
            pasteContent.classList.remove('d-none');
            fileContent.classList.add('d-none');
            updateParseBtn();
        });

        tabFile.addEventListener('click', () => {
            activeTab = 'file';
            tabFile.classList.add('active');
            tabPaste.classList.remove('active');
            fileContent.classList.remove('d-none');
            pasteContent.classList.add('d-none');
            updateParseBtn();
        });

        // ── Text input ────────────────────────────────────────
        textArea.addEventListener('input', updateParseBtn);

        // ── File upload ───────────────────────────────────────
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0];
                fileNameDiv.classList.remove('d-none');
                fileNameDiv.querySelector('span').textContent = selectedFile.name;
                dropZone.classList.add('border-primary');
                updateParseBtn();
            }
        });

        // Drag-and-drop (desktop)
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-primary', 'bg-light');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-primary', 'bg-light');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('bg-light');
            if (e.dataTransfer.files.length > 0) {
                selectedFile = e.dataTransfer.files[0];
                fileInput.files = e.dataTransfer.files;
                fileNameDiv.classList.remove('d-none');
                fileNameDiv.querySelector('span').textContent = selectedFile.name;
                dropZone.classList.add('border-primary');
                updateParseBtn();
            }
        });

        // ── Parse button enable/disable ───────────────────────
        function updateParseBtn() {
            if (activeTab === 'paste') {
                parseBtn.disabled = !textArea.value.trim();
            } else {
                parseBtn.disabled = !selectedFile;
            }
            hideError();
        }

        // ── Parse action ──────────────────────────────────────
        parseBtn.addEventListener('click', async () => {
            hideError();
            showStep('loading');

            try {
                let result;
                if (activeTab === 'paste') {
                    result = await window.importService.parseText(textArea.value.trim());
                } else {
                    result = await window.importService.parseFile(selectedFile);
                }

                if (result.success) {
                    parsedResult = result;
                    renderPreview(result);
                    showStep('step2');
                } else {
                    showStep('step1');
                    showError(result.errors?.join('. ') || 'Failed to parse workout');
                }
            } catch (err) {
                showStep('step1');
                showError(err.message || 'Failed to parse workout');
            }
        });

        // ── Back button ───────────────────────────────────────
        backBtn.addEventListener('click', () => showStep('step1'));

        // ── Load into builder ─────────────────────────────────
        loadBtn.addEventListener('click', () => {
            if (!parsedResult?.workout_data) return;

            window.importService.populateBuilder(parsedResult.workout_data);
            offcanvas.hide();

            if (onImportComplete) {
                onImportComplete(parsedResult.workout_data);
            }
        });

        // ── Step navigation ───────────────────────────────────
        function showStep(step) {
            step1.classList.add('d-none');
            step2.classList.add('d-none');
            loading.classList.add('d-none');

            if (step === 'step1') step1.classList.remove('d-none');
            else if (step === 'step2') step2.classList.remove('d-none');
            else if (step === 'loading') loading.classList.remove('d-none');
        }

        // ── Error handling ────────────────────────────────────
        function showError(msg) {
            errorText.textContent = msg;
            errorDiv.classList.remove('d-none');
        }

        function hideError() {
            errorDiv.classList.add('d-none');
        }

        // ── Preview renderer ──────────────────────────────────
        function renderPreview(result) {
            const data = result.workout_data;

            // Name & format
            offcanvasElement.querySelector('#importPreviewName').textContent = data.name || 'Imported Workout';
            const confidencePercent = Math.round(result.confidence * 100);
            offcanvasElement.querySelector('#importPreviewFormat').textContent =
                `Parsed as: ${result.source_format} (${confidencePercent}% confidence)`;

            // Exercise groups
            const groupsContainer = offcanvasElement.querySelector('#importPreviewGroups');
            groupsContainer.innerHTML = '';

            (data.exercise_groups || []).forEach((group, idx) => {
                const exercises = group.exercises || {};
                const names = Object.values(exercises).filter(Boolean);
                const nameStr = names.map(n => escapeHtml(n)).join(' <span class="text-muted">/</span> ');
                const meta = `${escapeHtml(group.sets)} sets x ${escapeHtml(group.reps)} reps | ${escapeHtml(group.rest)} rest`;
                const weightStr = group.default_weight
                    ? ` | ${escapeHtml(group.default_weight)} ${escapeHtml(group.default_weight_unit || 'lbs')}`
                    : '';

                groupsContainer.insertAdjacentHTML('beforeend', `
                    <div class="card card-body p-2 mb-2">
                        <div class="fw-semibold small">${idx + 1}. ${nameStr}</div>
                        <div class="text-muted" style="font-size: 0.8rem;">${meta}${weightStr}</div>
                    </div>
                `);
            });

            // Bonus exercises
            const bonusContainer = offcanvasElement.querySelector('#importPreviewBonus');
            const bonuses = data.bonus_exercises || [];
            if (bonuses.length > 0) {
                bonusContainer.classList.remove('d-none');
                bonusContainer.innerHTML = '<h6 class="small text-muted mb-2">Bonus Exercises</h6>';
                bonuses.forEach(b => {
                    bonusContainer.insertAdjacentHTML('beforeend', `
                        <div class="small mb-1">
                            <span class="fw-medium">${escapeHtml(b.name)}</span>
                            <span class="text-muted">${escapeHtml(b.sets)}x${escapeHtml(b.reps)}</span>
                        </div>
                    `);
                });
            } else {
                bonusContainer.classList.add('d-none');
            }

            // Warnings
            const warningsDiv = offcanvasElement.querySelector('#importPreviewWarnings');
            const warningsList = offcanvasElement.querySelector('#importWarningsList');
            if (result.warnings && result.warnings.length > 0) {
                warningsDiv.classList.remove('d-none');
                warningsList.innerHTML = result.warnings
                    .map(w => `<li>${escapeHtml(w)}</li>`)
                    .join('');
            } else {
                warningsDiv.classList.add('d-none');
            }
        }

        // Show step 1 initially
        showStep('step1');

        // Focus textarea after offcanvas opens
        offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
            if (activeTab === 'paste') {
                textArea.focus();
            }
        });
    });
}
