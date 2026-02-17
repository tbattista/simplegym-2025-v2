/**
 * Ghost Gym - Import Wizard Offcanvas
 * Multi-step import wizard: Source Input → Preview → Load into Builder
 * Supports: Text, File (txt/csv/json/image/pdf), URL, Camera
 *
 * @module offcanvas-import
 * @version 2.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

// MIME types for routing file uploads
const IMAGE_TYPES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
]);
const PDF_TYPES = new Set(['application/pdf']);

/**
 * Check if a file is an image or PDF (needs AI parsing) vs a text file (regex parsing).
 */
function isMediaFile(file) {
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (IMAGE_TYPES.has(mime) || PDF_TYPES.has(mime)) return true;
    if (name.endsWith('.pdf')) return true;
    if (/\.(jpe?g|png|webp|gif)$/.test(name)) return true;
    return false;
}

/**
 * Create and show the import wizard offcanvas.
 * @param {Function} [onImportComplete] - Callback after successful import (receives workoutData)
 * @returns {Object} { offcanvas, offcanvasElement }
 */
export function createImportWizard(onImportComplete) {
    const id = 'importWizardOffcanvas';

    const html = `
    <div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-desktop-wide" tabindex="-1" id="${id}" data-bs-scroll="false">
        <div class="offcanvas-header border-bottom">
            <h5 class="offcanvas-title" id="importWizardTitle">
                <i class="bx bx-import me-2"></i>Import Workout
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <div class="offcanvas-body p-0">
            <!-- STEP 1: Source Input -->
            <div id="importStep1" class="import-step p-3">
                <!-- Tab selector (4 tabs) -->
                <div class="btn-group w-100 mb-3" role="group" style="gap: 1px;">
                    <button type="button" class="btn btn-outline-primary btn-sm active" id="importTabPaste">
                        <i class="bx bx-clipboard me-1"></i>Text
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="importTabFile">
                        <i class="bx bx-file me-1"></i>File
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="importTabURL">
                        <i class="bx bx-link me-1"></i>URL
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="importTabCamera">
                        <i class="bx bx-camera me-1"></i>Photo
                    </button>
                </div>

                <!-- Paste tab content -->
                <div id="importPasteContent">
                    <textarea
                        id="importTextArea"
                        class="form-control mb-2"
                        rows="10"
                        placeholder="Paste your workout here...&#10;&#10;Supports:&#10;• Plain text (e.g., Bench Press 3x10)&#10;• FFN export format&#10;• CSV data&#10;• JSON data&#10;• Any text - AI will extract exercises"
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
                        <small class="text-muted">.txt .csv .json .pdf .jpg .png</small>
                        <input type="file" id="importFileInput"
                               accept=".txt,.csv,.json,.tsv,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                               class="d-none" />
                    </div>
                    <div id="importFileName" class="text-muted small mb-3 d-none">
                        <i class="bx bx-file me-1"></i><span></span>
                    </div>
                </div>

                <!-- URL tab content (hidden by default) -->
                <div id="importURLContent" class="d-none">
                    <input type="url" id="importURLInput" class="form-control mb-2"
                           placeholder="https://example.com/workout-plan"
                           style="font-size: 14px;" />
                    <small class="text-muted d-block mb-3">
                        <i class="bx bx-info-circle me-1"></i>
                        Paste a link to a workout page, blog post, or social media post
                    </small>
                </div>

                <!-- Camera tab content (hidden by default) -->
                <div id="importCameraContent" class="d-none">
                    <div id="importCameraZone" class="border border-2 border-dashed rounded p-4 text-center mb-2"
                         style="cursor: pointer; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <i class="bx bx-camera text-primary" style="font-size: 2rem;"></i>
                        <p class="mb-1 mt-2">Tap to take a photo</p>
                        <small class="text-muted">Whiteboard, printed workout, screenshot</small>
                        <input type="file" id="importCameraInput" accept="image/*" capture="environment" class="d-none" />
                    </div>
                    <div id="importCameraPreview" class="d-none mb-2 text-center">
                        <img id="importCameraImg" class="img-fluid rounded" style="max-height: 200px;" alt="Preview" />
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

                <!-- AI fallback (shown when standard text parse fails or has low confidence) -->
                <div id="importAIFallback" class="d-none mt-2">
                    <div class="alert alert-info py-2 mb-0">
                        <small>
                            <i class="bx bx-bot me-1"></i>
                            Standard parsing had low confidence. Want to try AI-powered parsing?
                        </small>
                        <button type="button" class="btn btn-sm btn-info mt-1 w-100" id="importTryAIBtn">
                            <i class="bx bx-bot me-1"></i>Parse with AI
                        </button>
                    </div>
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
                <p id="importLoadingText" class="text-muted">Parsing workout data...</p>
                <small id="importLoadingAI" class="text-info d-none">
                    <i class="bx bx-bot me-1"></i>Using AI to extract exercises...
                </small>
            </div>
        </div>
    </div>`;

    let parsedResult = null;
    let selectedFile = null;
    let cameraFile = null;
    let activeTab = 'paste'; // 'paste', 'file', 'url', 'camera'
    let lastTextContent = ''; // Store text for AI fallback retry

    return createOffcanvas(id, html, (offcanvas, offcanvasElement) => {

        // ── Element refs ──────────────────────────────────────
        const step1 = offcanvasElement.querySelector('#importStep1');
        const step2 = offcanvasElement.querySelector('#importStep2');
        const loading = offcanvasElement.querySelector('#importLoading');
        const loadingText = offcanvasElement.querySelector('#importLoadingText');
        const loadingAI = offcanvasElement.querySelector('#importLoadingAI');
        const textArea = offcanvasElement.querySelector('#importTextArea');
        const parseBtn = offcanvasElement.querySelector('#importParseBtn');
        const backBtn = offcanvasElement.querySelector('#importBackBtn');
        const loadBtn = offcanvasElement.querySelector('#importLoadBtn');
        const errorDiv = offcanvasElement.querySelector('#importError');
        const errorText = offcanvasElement.querySelector('#importErrorText');
        const aiFallbackDiv = offcanvasElement.querySelector('#importAIFallback');
        const tryAIBtn = offcanvasElement.querySelector('#importTryAIBtn');

        // Tab buttons
        const tabPaste = offcanvasElement.querySelector('#importTabPaste');
        const tabFile = offcanvasElement.querySelector('#importTabFile');
        const tabURL = offcanvasElement.querySelector('#importTabURL');
        const tabCamera = offcanvasElement.querySelector('#importTabCamera');

        // Tab content
        const pasteContent = offcanvasElement.querySelector('#importPasteContent');
        const fileContent = offcanvasElement.querySelector('#importFileContent');
        const urlContent = offcanvasElement.querySelector('#importURLContent');
        const cameraContent = offcanvasElement.querySelector('#importCameraContent');

        // File elements
        const dropZone = offcanvasElement.querySelector('#importDropZone');
        const fileInput = offcanvasElement.querySelector('#importFileInput');
        const fileNameDiv = offcanvasElement.querySelector('#importFileName');

        // URL elements
        const urlInput = offcanvasElement.querySelector('#importURLInput');

        // Camera elements
        const cameraZone = offcanvasElement.querySelector('#importCameraZone');
        const cameraInput = offcanvasElement.querySelector('#importCameraInput');
        const cameraPreview = offcanvasElement.querySelector('#importCameraPreview');
        const cameraImg = offcanvasElement.querySelector('#importCameraImg');

        const allTabs = [tabPaste, tabFile, tabURL, tabCamera];
        const allContent = [pasteContent, fileContent, urlContent, cameraContent];

        // ── Tab switching ─────────────────────────────────────
        function switchTab(tab) {
            activeTab = tab;
            allTabs.forEach(t => t.classList.remove('active'));
            allContent.forEach(c => c.classList.add('d-none'));

            switch (tab) {
                case 'paste':
                    tabPaste.classList.add('active');
                    pasteContent.classList.remove('d-none');
                    break;
                case 'file':
                    tabFile.classList.add('active');
                    fileContent.classList.remove('d-none');
                    break;
                case 'url':
                    tabURL.classList.add('active');
                    urlContent.classList.remove('d-none');
                    break;
                case 'camera':
                    tabCamera.classList.add('active');
                    cameraContent.classList.remove('d-none');
                    break;
            }
            updateParseBtn();
            hideError();
            hideAIFallback();
        }

        tabPaste.addEventListener('click', () => switchTab('paste'));
        tabFile.addEventListener('click', () => switchTab('file'));
        tabURL.addEventListener('click', () => switchTab('url'));
        tabCamera.addEventListener('click', () => switchTab('camera'));

        // ── Text input ────────────────────────────────────────
        textArea.addEventListener('input', updateParseBtn);

        // ── URL input ─────────────────────────────────────────
        urlInput.addEventListener('input', updateParseBtn);

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

        // ── Camera capture ────────────────────────────────────
        cameraZone.addEventListener('click', () => cameraInput.click());

        cameraInput.addEventListener('change', () => {
            if (cameraInput.files.length > 0) {
                cameraFile = cameraInput.files[0];
                // Show preview
                const url = URL.createObjectURL(cameraFile);
                cameraImg.src = url;
                cameraImg.onload = () => URL.revokeObjectURL(url);
                cameraPreview.classList.remove('d-none');
                cameraZone.classList.add('border-primary');
                updateParseBtn();
            }
        });

        // ── Parse button enable/disable ───────────────────────
        function updateParseBtn() {
            switch (activeTab) {
                case 'paste':
                    parseBtn.disabled = !textArea.value.trim();
                    break;
                case 'file':
                    parseBtn.disabled = !selectedFile;
                    break;
                case 'url':
                    parseBtn.disabled = !urlInput.value.trim();
                    break;
                case 'camera':
                    parseBtn.disabled = !cameraFile;
                    break;
            }
            hideError();
            hideAIFallback();
        }

        // ── Determine if current action uses AI ──────────────
        function isAIAction() {
            if (activeTab === 'url' || activeTab === 'camera') return true;
            if (activeTab === 'file' && selectedFile && isMediaFile(selectedFile)) return true;
            return false;
        }

        // ── Parse action ──────────────────────────────────────
        parseBtn.addEventListener('click', async () => {
            hideError();
            hideAIFallback();

            const useAI = isAIAction();
            showLoading(useAI);

            try {
                let result;

                switch (activeTab) {
                    case 'paste': {
                        lastTextContent = textArea.value.trim();
                        result = await window.importService.parseText(lastTextContent);

                        // If standard parse failed, show AI fallback
                        if (!result.success) {
                            showStep('step1');
                            showError(result.errors?.join('. ') || 'Failed to parse workout');
                            showAIFallback();
                            return;
                        }

                        // If low confidence, still show preview but offer AI fallback
                        if (result.confidence < 0.5) {
                            parsedResult = result;
                            renderPreview(result);
                            showStep('step2');
                            return;
                        }
                        break;
                    }

                    case 'file': {
                        if (isMediaFile(selectedFile)) {
                            // Image or PDF → AI media endpoint
                            let fileToSend = selectedFile;
                            if (IMAGE_TYPES.has(selectedFile.type?.toLowerCase())) {
                                fileToSend = await window.importService.compressImage(selectedFile);
                            }
                            result = await window.importService.parseMedia(fileToSend);
                        } else {
                            // Text file → regex endpoint
                            result = await window.importService.parseFile(selectedFile);
                        }
                        break;
                    }

                    case 'url': {
                        const url = urlInput.value.trim();
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            showStep('step1');
                            showError('Please enter a valid URL starting with http:// or https://');
                            return;
                        }
                        result = await window.importService.parseURL(url);
                        break;
                    }

                    case 'camera': {
                        let fileToSend = await window.importService.compressImage(cameraFile);
                        result = await window.importService.parseMedia(fileToSend);
                        break;
                    }
                }

                if (result.success) {
                    parsedResult = result;
                    renderPreview(result);
                    showStep('step2');
                } else {
                    showStep('step1');
                    showError(result.errors?.join('. ') || 'Failed to parse workout');
                    // Show AI fallback for text tab failures
                    if (activeTab === 'paste') {
                        showAIFallback();
                    }
                }
            } catch (err) {
                showStep('step1');
                if (err.message && (err.message.includes('limit reached') || err.message.includes('429'))) {
                    showError(err.message + ' Standard text import is still available.');
                } else if (err.message && (err.message.includes('not available') || err.message.includes('503'))) {
                    showError('AI import is temporarily unavailable. Please paste your workout text directly.');
                } else {
                    showError(err.message || 'Failed to parse workout');
                }
            }
        });

        // ── AI fallback button ────────────────────────────────
        tryAIBtn.addEventListener('click', async () => {
            if (!lastTextContent) return;

            hideError();
            hideAIFallback();
            showLoading(true);

            try {
                const result = await window.importService.parseTextAI(lastTextContent);

                if (result.success) {
                    parsedResult = result;
                    renderPreview(result);
                    showStep('step2');
                } else {
                    showStep('step1');
                    showError(result.errors?.join('. ') || 'AI could not parse the workout');
                }
            } catch (err) {
                showStep('step1');
                showError(err.message || 'AI parsing failed');
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

        function showLoading(isAI = false) {
            showStep('loading');
            loadingText.textContent = isAI
                ? 'Analyzing content with AI...'
                : 'Parsing workout data...';
            if (isAI) {
                loadingAI.classList.remove('d-none');
            } else {
                loadingAI.classList.add('d-none');
            }
        }

        // ── Error handling ────────────────────────────────────
        function showError(msg) {
            errorText.textContent = msg;
            errorDiv.classList.remove('d-none');
        }

        function hideError() {
            errorDiv.classList.add('d-none');
        }

        function showAIFallback() {
            if (lastTextContent && window.importService.parseTextAI) {
                aiFallbackDiv.classList.remove('d-none');
            }
        }

        function hideAIFallback() {
            aiFallbackDiv.classList.add('d-none');
        }

        // ── Preview renderer ──────────────────────────────────
        function renderPreview(result) {
            const data = result.workout_data;

            // Name & format
            offcanvasElement.querySelector('#importPreviewName').textContent = data.name || 'Imported Workout';

            const confidencePercent = Math.round(result.confidence * 100);
            const formatEl = offcanvasElement.querySelector('#importPreviewFormat');

            if (result.source_format && result.source_format.startsWith('ai')) {
                formatEl.innerHTML =
                    `<span class="badge bg-info me-1"><i class="bx bx-bot"></i> AI</span> ` +
                    `Parsed as: ${escapeHtml(result.source_format)} (${confidencePercent}% confidence)`;
            } else {
                formatEl.textContent =
                    `Parsed as: ${result.source_format} (${confidencePercent}% confidence)`;
            }

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
