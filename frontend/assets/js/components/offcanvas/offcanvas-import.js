/**
 * Ghost Gym - Import Wizard Offcanvas
 * Single-step import: Source Input → Parse → Populate Builder
 * Supports: Text, Picture/File (txt/csv/json/image/pdf), URL
 *
 * @module offcanvas-import
 * @version 3.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

// MIME types for routing file uploads
const IMAGE_TYPES = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
]);
const PDF_TYPES = new Set(['application/pdf']);

/**
 * Check if a file is an image or PDF (needs media parsing) vs a text file (regex parsing).
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
 * Format file size for display.
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
                <!-- Tab selector (3 tabs) -->
                <div class="btn-group w-100 mb-3" role="group" style="gap: 1px;">
                    <button type="button" class="btn btn-outline-primary btn-sm active" id="importTabPaste">
                        <i class="bx bx-clipboard me-1"></i>Text
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="importTabFile">
                        <i class="bx bx-image me-1"></i>Picture / File
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="importTabURL">
                        <i class="bx bx-link me-1"></i>URL
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
                        <p class="mb-1 mt-2">Tap to choose a picture or file</p>
                        <small class="text-muted">.txt .csv .json .pdf .jpg .png</small>
                        <input type="file" id="importFileInput"
                               accept=".txt,.csv,.json,.tsv,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                               class="d-none" />
                    </div>
                    <div id="importFilePreview" class="d-none mb-2 text-center">
                        <img id="importFilePreviewImg" class="img-fluid rounded mb-2 d-none" style="max-height: 200px;" alt="Preview" />
                        <div class="text-muted small">
                            <i class="bx bx-file me-1"></i><span id="importFilePreviewName"></span>
                        </div>
                        <button type="button" class="btn btn-sm btn-link p-0 mt-1" id="importFileChangeBtn">Change file</button>
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

            <!-- Loading state -->
            <div id="importLoading" class="import-step d-none p-4 text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Parsing...</span>
                </div>
                <p id="importLoadingText" class="text-muted">Parsing workout data...</p>
            </div>
        </div>
    </div>`;

    let selectedFile = null;
    let activeTab = 'paste'; // 'paste', 'file', 'url'

    return createOffcanvas(id, html, (offcanvas, offcanvasElement) => {

        // ── Element refs ──────────────────────────────────────
        const step1 = offcanvasElement.querySelector('#importStep1');
        const loading = offcanvasElement.querySelector('#importLoading');
        const loadingText = offcanvasElement.querySelector('#importLoadingText');
        const textArea = offcanvasElement.querySelector('#importTextArea');
        const parseBtn = offcanvasElement.querySelector('#importParseBtn');
        const errorDiv = offcanvasElement.querySelector('#importError');
        const errorText = offcanvasElement.querySelector('#importErrorText');

        // Tab buttons
        const tabPaste = offcanvasElement.querySelector('#importTabPaste');
        const tabFile = offcanvasElement.querySelector('#importTabFile');
        const tabURL = offcanvasElement.querySelector('#importTabURL');

        // Tab content
        const pasteContent = offcanvasElement.querySelector('#importPasteContent');
        const fileContent = offcanvasElement.querySelector('#importFileContent');
        const urlContent = offcanvasElement.querySelector('#importURLContent');

        // File elements
        const dropZone = offcanvasElement.querySelector('#importDropZone');
        const fileInput = offcanvasElement.querySelector('#importFileInput');
        const filePreview = offcanvasElement.querySelector('#importFilePreview');
        const filePreviewImg = offcanvasElement.querySelector('#importFilePreviewImg');
        const filePreviewName = offcanvasElement.querySelector('#importFilePreviewName');
        const fileChangeBtn = offcanvasElement.querySelector('#importFileChangeBtn');

        // URL elements
        const urlInput = offcanvasElement.querySelector('#importURLInput');

        const allTabs = [tabPaste, tabFile, tabURL];
        const allContent = [pasteContent, fileContent, urlContent];

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
            }
            updateParseBtn();
            hideError();
        }

        tabPaste.addEventListener('click', () => switchTab('paste'));
        tabFile.addEventListener('click', () => switchTab('file'));
        tabURL.addEventListener('click', () => switchTab('url'));

        // ── Text input ────────────────────────────────────────
        textArea.addEventListener('input', updateParseBtn);

        // ── URL input ─────────────────────────────────────────
        urlInput.addEventListener('input', updateParseBtn);

        // ── File upload ───────────────────────────────────────
        dropZone.addEventListener('click', () => fileInput.click());
        fileChangeBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0];
                showFilePreview(selectedFile);
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
                showFilePreview(selectedFile);
                updateParseBtn();
            }
        });

        // ── File preview ─────────────────────────────────────
        function showFilePreview(file) {
            // Hide drop zone, show preview
            dropZone.classList.add('d-none');
            filePreview.classList.remove('d-none');

            // File name + size
            filePreviewName.textContent = `${file.name} (${formatFileSize(file.size)})`;

            // Image thumbnail
            if (isMediaFile(file) && IMAGE_TYPES.has(file.type?.toLowerCase())) {
                const url = URL.createObjectURL(file);
                filePreviewImg.src = url;
                filePreviewImg.onload = () => URL.revokeObjectURL(url);
                filePreviewImg.classList.remove('d-none');
            } else {
                filePreviewImg.classList.add('d-none');
            }
        }

        function resetFilePreview() {
            dropZone.classList.remove('d-none', 'border-primary');
            filePreview.classList.add('d-none');
            filePreviewImg.classList.add('d-none');
            filePreviewImg.src = '';
            selectedFile = null;
        }

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
            }
            hideError();
        }

        // ── Helper: populate builder and close ───────────────
        function finishImport(workoutData) {
            window.importService.populateBuilder(workoutData);
            offcanvas.hide();
            if (onImportComplete) {
                onImportComplete(workoutData);
            }
        }

        // ── Parse action ──────────────────────────────────────
        parseBtn.addEventListener('click', async () => {
            hideError();
            showLoading();

            try {
                let result;

                switch (activeTab) {
                    case 'paste': {
                        const content = textArea.value.trim();
                        result = await window.importService.parseText(content);

                        // If standard parse failed or low confidence, silently try enhanced parsing
                        if (!result.success || result.confidence < 0.5) {
                            try {
                                const enhanced = await window.importService.parseTextAI(content);
                                if (enhanced.success) {
                                    result = enhanced;
                                }
                            } catch (_) {
                                // Enhanced parse unavailable, use original result if it had any success
                            }
                        }

                        if (!result.success) {
                            showStep('step1');
                            showError(result.errors?.join('. ') || 'Could not parse workout. Please check the format and try again.');
                            return;
                        }
                        break;
                    }

                    case 'file': {
                        if (isMediaFile(selectedFile)) {
                            // Image or PDF → media endpoint
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
                }

                if (result.success) {
                    finishImport(result.workout_data);
                } else {
                    showStep('step1');
                    showError(result.errors?.join('. ') || 'Failed to parse workout. Please try a different format.');
                }
            } catch (err) {
                showStep('step1');
                showError(err.message || 'Failed to parse workout. Please try again.');
            }
        });

        // ── Step navigation ───────────────────────────────────
        function showStep(step) {
            step1.classList.add('d-none');
            loading.classList.add('d-none');

            if (step === 'step1') step1.classList.remove('d-none');
            else if (step === 'loading') loading.classList.remove('d-none');
        }

        function showLoading() {
            showStep('loading');
            loadingText.textContent = 'Parsing workout data...';
        }

        // ── Error handling ────────────────────────────────────
        function showError(msg) {
            errorText.textContent = msg;
            errorDiv.classList.remove('d-none');
        }

        function hideError() {
            errorDiv.classList.add('d-none');
        }

        // Show step 1 initially
        showStep('step1');

        // Focus textarea after offcanvas opens
        offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
            if (activeTab === 'paste') {
                textArea.focus();
            }
        });

        // Reset file preview when offcanvas closes
        offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
            resetFilePreview();
        });
    });
}
