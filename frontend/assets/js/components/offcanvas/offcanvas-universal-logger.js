/**
 * Universal Logger Offcanvas Wizard
 * AI-powered session logging: photos + text → structured cardio or strength session.
 *
 * Steps:
 *   1. Input     — Describe tab (text) + Photos tab (multi-image), combinable
 *   2. Loading   — AI analysis spinner
 *   2b. Clarify  — AI follow-up questions (optional)
 *   3. Review    — Editable session form (cardio or strength)
 *   4. Success   — Confirmation with close button
 *
 * Reuses: createOffcanvas + escapeHtml from offcanvas-helpers.js
 * Reuses: window.universalLogService for API calls
 * Reuses: window.importService.compressImage for image compression
 *
 * @module offcanvas-universal-logger
 * @version 1.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

const CARDIO_ACTIVITY_TYPES = [
    { value: 'running',      label: 'Running',      icon: 'bx-run' },
    { value: 'cycling',      label: 'Cycling',      icon: 'bx-cycling' },
    { value: 'walking',      label: 'Walking',      icon: 'bx-walk' },
    { value: 'rowing',       label: 'Rowing',       icon: 'bx-swim' },
    { value: 'swimming',     label: 'Swimming',     icon: 'bx-swim' },
    { value: 'elliptical',   label: 'Elliptical',   icon: 'bx-run' },
    { value: 'stair_climber',label: 'Stair Climber',icon: 'bx-trending-up' },
    { value: 'hiking',       label: 'Hiking',       icon: 'bx-landscape' },
    { value: 'other',        label: 'Other',        icon: 'bx-dumbbell' },
];

// Wizard HTML template
function buildHtml(id) {
    return `
<div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-full offcanvas-desktop-wide" tabindex="-1"
     id="${id}" data-bs-scroll="false">
    <div class="offcanvas-header border-bottom" id="ul-header">
        <h5 class="offcanvas-title">
            <i class="bx bx-camera me-2"></i><span id="ul-title">Log with AI</span>
        </h5>
        <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary d-none" id="ul-back-btn">
                <i class="bx bx-arrow-back me-1"></i>Back
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
    </div>

    <div class="offcanvas-body p-0" style="overflow-y: auto;">

        <!-- ── STEP 1: Input ─────────────────────────── -->
        <div id="ul-step1" class="p-3">
            <!-- Tab selector -->
            <div class="btn-group w-100 mb-3" role="group">
                <button type="button" class="btn btn-outline-primary btn-sm active" id="ul-tab-describe">
                    <i class="bx bx-edit me-1"></i>Describe
                </button>
                <button type="button" class="btn btn-outline-primary btn-sm" id="ul-tab-photos">
                    <i class="bx bx-camera me-1"></i>Photos
                </button>
            </div>

            <!-- Describe tab -->
            <div id="ul-describe-content">
                <textarea id="ul-text-input" class="form-control mb-2" rows="6"
                    placeholder="Describe your activity...&#10;&#10;Examples:&#10;• 2.3 miles on the treadmill in 18:20, burned 340 cals&#10;• OrangeTheory class: bench press 3x10, squats 4x8, rows 3x12&#10;• 45 min spin class, avg HR 158&#10;&#10;Or switch to Photos to upload screenshots."
                    style="font-size: 14px; line-height: 1.6;"></textarea>
                <small class="text-muted d-block mb-3">
                    <i class="bx bx-info-circle me-1"></i>You can also add photos alongside your description
                </small>
            </div>

            <!-- Photos tab -->
            <div id="ul-photos-content" class="d-none">
                <!-- Drop zone -->
                <div id="ul-dropzone" class="border border-2 border-dashed rounded p-4 text-center mb-2"
                     style="cursor: pointer; min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <i class="bx bx-image-add text-primary" style="font-size: 2rem;"></i>
                    <p class="mb-1 mt-2">Tap to add photos</p>
                    <small class="text-muted">Treadmill screen · Watch · Whiteboard · Screenshot</small>
                    <input type="file" id="ul-file-input" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                           multiple class="d-none" />
                </div>
                <!-- Thumbnail strip -->
                <div id="ul-thumbnails" class="d-flex flex-wrap gap-2 mb-2" style="min-height: 0;"></div>
                <small class="text-muted d-block mb-1">
                    <i class="bx bx-info-circle me-1"></i>Up to 5 photos — combine with a description for best results
                </small>
            </div>

            <!-- Photo count badge (shown when photos exist while on Describe tab) -->
            <div id="ul-photo-badge" class="d-none mb-2">
                <span class="badge bg-label-primary">
                    <i class="bx bx-camera me-1"></i><span id="ul-photo-count">0</span> photo(s) added
                </span>
            </div>

            <!-- Analyze button -->
            <button type="button" class="btn btn-primary w-100 mt-2" id="ul-analyze-btn" disabled>
                <i class="bx bx-analyse me-1"></i>Analyze Activity
            </button>

            <!-- Error display -->
            <div id="ul-error" class="alert alert-danger mt-3 d-none" role="alert">
                <i class="bx bx-error-circle me-1"></i>
                <span id="ul-error-text"></span>
            </div>
        </div>

        <!-- ── STEP 2: Loading ────────────────────────── -->
        <div id="ul-loading" class="d-none p-4 text-center" style="min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Analyzing...</span>
            </div>
            <p class="text-muted mb-0" id="ul-loading-text">Analyzing your activity…</p>
            <small class="text-muted mt-1">This may take a few seconds</small>
        </div>

        <!-- ── STEP 2b: Clarify ───────────────────────── -->
        <div id="ul-clarify" class="d-none p-3">
            <div class="alert alert-info mb-3 py-2">
                <i class="bx bx-question-mark me-1"></i>
                <strong>A few quick questions</strong> to improve accuracy:
            </div>
            <div id="ul-questions-container"></div>
            <button type="button" class="btn btn-primary w-100 mt-2" id="ul-continue-btn">
                <i class="bx bx-check me-1"></i>Continue
            </button>
        </div>

        <!-- ── STEP 3: Review & Edit ──────────────────── -->
        <div id="ul-review" class="d-none p-3">

            <!-- Session type toggle -->
            <div class="mb-3">
                <label class="form-label fw-semibold text-muted small text-uppercase">Session Type</label>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm session-type-btn" id="ul-type-cardio" data-type="cardio">
                        <i class="bx bx-run me-1"></i>Cardio
                    </button>
                    <button type="button" class="btn btn-sm session-type-btn" id="ul-type-strength" data-type="strength">
                        <i class="bx bx-dumbbell me-1"></i>Strength Workout
                    </button>
                </div>
            </div>

            <!-- Date & Time (shared) -->
            <div class="mb-3">
                <label for="ul-session-date" class="form-label fw-semibold">Date & Time</label>
                <input type="datetime-local" class="form-control" id="ul-session-date">
            </div>

            <!-- ── CARDIO FIELDS ── -->
            <div id="ul-cardio-fields">
                <div class="mb-3">
                    <label for="ul-activity-type" class="form-label fw-semibold">Activity</label>
                    <select class="form-select" id="ul-activity-type">
                        ${CARDIO_ACTIVITY_TYPES.map(t =>
                            `<option value="${t.value}">${t.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="row mb-3">
                    <div class="col-6">
                        <label class="form-label fw-semibold">Duration</label>
                        <div class="input-group">
                            <input type="number" class="form-control" id="ul-duration-hours" min="0" max="23" value="0" placeholder="h">
                            <span class="input-group-text">h</span>
                            <input type="number" class="form-control" id="ul-duration-mins" min="0" max="59" value="0" placeholder="min">
                            <span class="input-group-text">min</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-semibold">Calories</label>
                        <div class="input-group">
                            <input type="number" class="form-control" id="ul-calories" min="0" placeholder="—">
                            <span class="input-group-text">cal</span>
                        </div>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-8">
                        <label for="ul-distance" class="form-label fw-semibold">Distance</label>
                        <input type="number" class="form-control" id="ul-distance" step="0.01" min="0" placeholder="—">
                    </div>
                    <div class="col-4">
                        <label for="ul-distance-unit" class="form-label fw-semibold">Unit</label>
                        <select class="form-select" id="ul-distance-unit">
                            <option value="mi">mi</option>
                            <option value="km">km</option>
                            <option value="m">m</option>
                            <option value="yd">yd</option>
                        </select>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-6">
                        <label for="ul-avg-hr" class="form-label fw-semibold">Avg Heart Rate</label>
                        <div class="input-group">
                            <input type="number" class="form-control" id="ul-avg-hr" min="30" max="250" placeholder="—">
                            <span class="input-group-text">bpm</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <label for="ul-max-hr" class="form-label fw-semibold">Max Heart Rate</label>
                        <div class="input-group">
                            <input type="number" class="form-control" id="ul-max-hr" min="30" max="250" placeholder="—">
                            <span class="input-group-text">bpm</span>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="ul-notes-cardio" class="form-label fw-semibold">Notes <small class="text-muted fw-normal">(optional)</small></label>
                    <textarea class="form-control" id="ul-notes-cardio" rows="2" placeholder="Any extra details…"></textarea>
                </div>
            </div>

            <!-- ── STRENGTH FIELDS ── -->
            <div id="ul-strength-fields" class="d-none">
                <div class="mb-3">
                    <label for="ul-workout-name" class="form-label fw-semibold">Workout Name</label>
                    <input type="text" class="form-control" id="ul-workout-name" maxlength="50" placeholder="e.g. OrangeTheory Power Day">
                </div>
                <div class="mb-2">
                    <label class="form-label fw-semibold">Duration <small class="text-muted fw-normal">(optional)</small></label>
                    <div class="input-group" style="max-width: 220px;">
                        <input type="number" class="form-control" id="ul-strength-duration" min="1" max="600" placeholder="—">
                        <span class="input-group-text">min</span>
                    </div>
                </div>

                <!-- Exercise list -->
                <label class="form-label fw-semibold mt-2">Exercises</label>
                <div id="ul-exercise-list" class="mb-2"></div>
                <button type="button" class="btn btn-sm btn-outline-secondary mb-3" id="ul-add-exercise-btn">
                    <i class="bx bx-plus me-1"></i>Add Exercise
                </button>

                <div class="mb-3">
                    <label for="ul-notes-strength" class="form-label fw-semibold">Notes <small class="text-muted fw-normal">(optional)</small></label>
                    <textarea class="form-control" id="ul-notes-strength" rows="2" placeholder="Any extra details…"></textarea>
                </div>

                <!-- Save as template toggle -->
                <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" role="switch" id="ul-save-template">
                    <label class="form-check-label" for="ul-save-template">
                        Save as reusable template
                        <small class="text-muted d-block">Adds to your workout library for future sessions</small>
                    </label>
                </div>
            </div>

            <!-- Save button + error -->
            <button type="button" class="btn btn-success w-100 mt-1" id="ul-save-btn">
                <i class="bx bx-save me-1"></i>Save Session
            </button>
            <div id="ul-save-error" class="alert alert-danger mt-3 d-none" role="alert">
                <i class="bx bx-error-circle me-1"></i>
                <span id="ul-save-error-text"></span>
            </div>
        </div>

        <!-- ── STEP 4: Success ────────────────────────── -->
        <div id="ul-success" class="d-none p-4 text-center">
            <i class="bx bx-check-circle text-success" style="font-size: 3rem;"></i>
            <h5 class="mt-3 mb-1">Session Logged!</h5>
            <p class="text-muted mb-3" id="ul-success-text">Your activity has been saved.</p>
            <button type="button" class="btn btn-outline-primary" data-bs-dismiss="offcanvas">
                <i class="bx bx-x me-1"></i>Close
            </button>
        </div>

    </div>
</div>`;
}

/**
 * Create and show the Universal Logger offcanvas.
 * @param {Object} [options]
 * @param {Function} [options.onSaveComplete] - Called after successful save (to refresh session list)
 * @returns {{ offcanvas, offcanvasElement }}
 */
export function createUniversalLogger({ onSaveComplete, prefillText = null, prefillImages = [], autoAnalyze = false } = {}) {
    const id = 'universalLoggerOffcanvas';

    const html = buildHtml(id);

    // State
    let selectedImages = [];           // File[] — multi-image array
    let currentParsedResult = null;    // Last AI parse result
    let currentSessionType = 'cardio'; // 'cardio' | 'strength'
    let pendingQuestions = [];         // UniversalLogQuestion[] from AI
    let activeTab = 'describe';        // 'describe' | 'photos'

    const STEPS = ['step1', 'loading', 'clarify', 'review', 'success'];

    return createOffcanvas(id, html, (offcanvas, el) => {

        // ── Element refs ─────────────────────────────────────────────────
        const titleEl       = el.querySelector('#ul-title');
        const backBtn       = el.querySelector('#ul-back-btn');

        const step1         = el.querySelector('#ul-step1');
        const loadingEl     = el.querySelector('#ul-loading');
        const clarifyEl     = el.querySelector('#ul-clarify');
        const reviewEl      = el.querySelector('#ul-review');
        const successEl     = el.querySelector('#ul-success');

        const tabDescribe   = el.querySelector('#ul-tab-describe');
        const tabPhotos     = el.querySelector('#ul-tab-photos');
        const describeContent = el.querySelector('#ul-describe-content');
        const photosContent = el.querySelector('#ul-photos-content');
        const textInput     = el.querySelector('#ul-text-input');

        const dropzone      = el.querySelector('#ul-dropzone');
        const fileInput     = el.querySelector('#ul-file-input');
        const thumbnailsEl  = el.querySelector('#ul-thumbnails');
        const photoBadge    = el.querySelector('#ul-photo-badge');
        const photoCountEl  = el.querySelector('#ul-photo-count');

        const analyzeBtn    = el.querySelector('#ul-analyze-btn');
        const errorDiv      = el.querySelector('#ul-error');
        const errorText     = el.querySelector('#ul-error-text');

        const questionsContainer = el.querySelector('#ul-questions-container');
        const continueBtn   = el.querySelector('#ul-continue-btn');

        const typeCardioBtn = el.querySelector('#ul-type-cardio');
        const typeStrengthBtn = el.querySelector('#ul-type-strength');
        const cardioFields  = el.querySelector('#ul-cardio-fields');
        const strengthFields = el.querySelector('#ul-strength-fields');

        const sessionDateEl = el.querySelector('#ul-session-date');
        const saveBtn       = el.querySelector('#ul-save-btn');
        const saveErrorDiv  = el.querySelector('#ul-save-error');
        const saveErrorText = el.querySelector('#ul-save-error-text');
        const successText   = el.querySelector('#ul-success-text');

        const exerciseList  = el.querySelector('#ul-exercise-list');
        const addExerciseBtn = el.querySelector('#ul-add-exercise-btn');
        const saveTemplateToggle = el.querySelector('#ul-save-template');

        // ── Step navigation ───────────────────────────────────────────────
        function showStep(name) {
            step1.classList.toggle('d-none',    name !== 'step1');
            loadingEl.classList.toggle('d-none', name !== 'loading');
            clarifyEl.classList.toggle('d-none', name !== 'clarify');
            reviewEl.classList.toggle('d-none',  name !== 'review');
            successEl.classList.toggle('d-none', name !== 'success');

            backBtn.classList.toggle('d-none', name === 'step1' || name === 'loading' || name === 'success');

            const titles = {
                step1: 'Log with AI',
                loading: 'Analyzing…',
                clarify: 'Quick Questions',
                review: 'Review & Save',
                success: 'Logged!',
            };
            titleEl.textContent = titles[name] || 'Log with AI';
        }

        backBtn.addEventListener('click', () => {
            if (!clarifyEl.classList.contains('d-none')) showStep('step1');
            else showStep('step1');
        });

        // ── Tab switching ─────────────────────────────────────────────────
        function switchTab(tab) {
            activeTab = tab;
            tabDescribe.classList.toggle('active', tab === 'describe');
            tabPhotos.classList.toggle('active',   tab === 'photos');
            describeContent.classList.toggle('d-none', tab !== 'describe');
            photosContent.classList.toggle('d-none',   tab !== 'photos');
            updatePhotoBadge();
            updateAnalyzeBtn();
            hideError();
        }

        tabDescribe.addEventListener('click', () => switchTab('describe'));
        tabPhotos.addEventListener('click',   () => switchTab('photos'));
        textInput.addEventListener('input',   () => { updateAnalyzeBtn(); hideError(); });

        // ── Photo badge (visible on Describe tab when photos are present) ─
        function updatePhotoBadge() {
            const hasPhotos = selectedImages.length > 0;
            photoBadge.classList.toggle('d-none', !hasPhotos || activeTab !== 'describe');
            if (hasPhotos) photoCountEl.textContent = selectedImages.length;
        }

        // ── Image upload & thumbnails ─────────────────────────────────────
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            addFiles(Array.from(fileInput.files));
            fileInput.value = ''; // reset so same files can be re-added
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('border-primary', 'bg-light');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('border-primary', 'bg-light');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('border-primary', 'bg-light');
            addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
        });

        function addFiles(files) {
            const remaining = 5 - selectedImages.length;
            const toAdd = files.slice(0, remaining);
            selectedImages = selectedImages.concat(toAdd);
            renderThumbnails();
            updateAnalyzeBtn();
            updatePhotoBadge();
        }

        function renderThumbnails() {
            // Revoke previous object URLs
            thumbnailsEl.querySelectorAll('img').forEach(img => {
                if (img._objectUrl) URL.revokeObjectURL(img._objectUrl);
            });
            thumbnailsEl.innerHTML = '';

            selectedImages.forEach((file, idx) => {
                const url = URL.createObjectURL(file);
                const wrapper = document.createElement('div');
                wrapper.className = 'position-relative d-inline-flex';
                wrapper.innerHTML = `
                    <img src="${escapeHtml(url)}" alt="${escapeHtml(file.name)}"
                         class="rounded border"
                         style="height:64px;width:64px;object-fit:cover;">
                    <button type="button"
                            class="btn-close btn-close-sm position-absolute bg-white rounded-circle shadow-sm"
                            style="top:-4px;right:-4px;padding:3px;font-size:0.5rem;"
                            aria-label="Remove photo"
                            data-idx="${idx}"></button>
                `;
                const img = wrapper.querySelector('img');
                img._objectUrl = url;
                img.onload = () => {}; // revoke on next render
                thumbnailsEl.appendChild(wrapper);
            });

            // Add more button if < 5 photos
            if (selectedImages.length > 0 && selectedImages.length < 5) {
                const addMore = document.createElement('div');
                addMore.className = 'border rounded d-flex align-items-center justify-content-center text-muted';
                addMore.style = 'height:64px;width:64px;cursor:pointer;font-size:1.5rem;';
                addMore.innerHTML = '<i class="bx bx-plus"></i>';
                addMore.addEventListener('click', () => fileInput.click());
                thumbnailsEl.appendChild(addMore);
            }

            // Remove buttons
            thumbnailsEl.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-idx]');
                if (!btn) return;
                const idx = parseInt(btn.dataset.idx, 10);
                if (!isNaN(idx)) {
                    selectedImages.splice(idx, 1);
                    renderThumbnails();
                    updateAnalyzeBtn();
                    updatePhotoBadge();
                }
            });
        }

        // ── Analyze button state ──────────────────────────────────────────
        function updateAnalyzeBtn() {
            const hasText   = textInput.value.trim().length > 0;
            const hasPhotos = selectedImages.length > 0;
            analyzeBtn.disabled = !(hasText || hasPhotos);
        }

        // ── Error helpers ─────────────────────────────────────────────────
        function showError(msg) {
            errorText.textContent = msg;
            errorDiv.classList.remove('d-none');
        }
        function hideError() {
            errorDiv.classList.add('d-none');
        }
        function showSaveError(msg) {
            saveErrorText.textContent = msg;
            saveErrorDiv.classList.remove('d-none');
        }
        function hideSaveError() {
            saveErrorDiv.classList.add('d-none');
        }

        // ── Analyze ───────────────────────────────────────────────────────
        async function runAnalyze() {
            hideError();
            showStep('loading');
            try {
                const text = textInput.value.trim() || null;
                const result = await window.universalLogService.parse(text, selectedImages, null);
                currentParsedResult = result;

                if (!result.success) {
                    showStep('step1');
                    showError(result.errors?.[0] || 'Could not analyze activity. Please try again.');
                    return;
                }

                if (result.needs_clarification && result.questions?.length > 0) {
                    pendingQuestions = result.questions;
                    renderQuestions(result.questions);
                    showStep('clarify');
                } else {
                    populateReview(result);
                    showStep('review');
                }
            } catch (err) {
                showStep('step1');
                showError(err.message || 'Analysis failed. Please try again.');
            }
        }

        analyzeBtn.addEventListener('click', runAnalyze);

        // ── Clarify ───────────────────────────────────────────────────────
        function renderQuestions(questions) {
            questionsContainer.innerHTML = '';
            questions.forEach(q => {
                const wrapper = document.createElement('div');
                wrapper.className = 'mb-3';
                const label = `<label class="form-label fw-semibold">${escapeHtml(q.question)}</label>`;
                let input = '';
                if (q.type === 'select' && q.options?.length) {
                    input = `<select class="form-select" data-qid="${escapeHtml(q.id)}">
                        <option value="">— Select —</option>
                        ${q.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
                    </select>`;
                } else if (q.type === 'number') {
                    input = `<input type="number" class="form-control" data-qid="${escapeHtml(q.id)}" placeholder="Enter a number">`;
                } else {
                    input = `<input type="text" class="form-control" data-qid="${escapeHtml(q.id)}" placeholder="Your answer…">`;
                }
                wrapper.innerHTML = label + input;
                questionsContainer.appendChild(wrapper);
            });
        }

        continueBtn.addEventListener('click', async () => {
            // Collect answers
            const answers = {};
            questionsContainer.querySelectorAll('[data-qid]').forEach(input => {
                const val = input.value.trim();
                if (val) answers[input.dataset.qid] = val;
            });

            showStep('loading');
            try {
                const text = textInput.value.trim() || null;
                const result = await window.universalLogService.parse(text, selectedImages, answers);
                currentParsedResult = result;

                if (!result.success) {
                    showStep('clarify');
                    return;
                }

                populateReview(result);
                showStep('review');
            } catch (err) {
                showStep('clarify');
            }
        });

        // ── Review ────────────────────────────────────────────────────────
        function setSessionType(type) {
            currentSessionType = type;
            typeCardioBtn.classList.toggle('btn-primary', type === 'cardio');
            typeCardioBtn.classList.toggle('btn-outline-secondary', type !== 'cardio');
            typeStrengthBtn.classList.toggle('btn-primary', type === 'strength');
            typeStrengthBtn.classList.toggle('btn-outline-secondary', type !== 'strength');
            cardioFields.classList.toggle('d-none', type !== 'cardio');
            strengthFields.classList.toggle('d-none', type !== 'strength');
        }

        typeCardioBtn.addEventListener('click',   () => setSessionType('cardio'));
        typeStrengthBtn.addEventListener('click', () => setSessionType('strength'));

        function populateReview(result) {
            hideSaveError();

            // Default date to now
            const now = new Date();
            now.setSeconds(0, 0);
            sessionDateEl.value = now.toISOString().slice(0, 16);

            const type = result.session_type === 'strength' ? 'strength' : 'cardio';
            setSessionType(type);

            if (type === 'cardio' && result.cardio_data) {
                populateCardioFields(result.cardio_data);
            } else if (type === 'strength' && result.strength_data) {
                populateStrengthFields(result.strength_data);
            }
        }

        function populateCardioFields(cd) {
            el.querySelector('#ul-activity-type').value = cd.activity_type || 'other';

            const totalMins = cd.duration_minutes || 0;
            el.querySelector('#ul-duration-hours').value = Math.floor(totalMins / 60) || 0;
            el.querySelector('#ul-duration-mins').value  = Math.round(totalMins % 60) || 0;

            el.querySelector('#ul-calories').value      = cd.calories || '';
            el.querySelector('#ul-distance').value      = cd.distance || '';
            el.querySelector('#ul-distance-unit').value = cd.distance_unit || 'mi';
            el.querySelector('#ul-avg-hr').value        = cd.avg_heart_rate || '';
            el.querySelector('#ul-max-hr').value        = cd.max_heart_rate || '';
            el.querySelector('#ul-notes-cardio').value  = cd.notes || '';
        }

        function populateStrengthFields(sd) {
            el.querySelector('#ul-workout-name').value = sd.workout_name || 'Ad-Hoc Workout';
            el.querySelector('#ul-notes-strength').value = sd.notes || '';
            el.querySelector('#ul-strength-duration').value = '';
            saveTemplateToggle.checked = false;
            renderExerciseList(sd.exercise_groups || []);
        }

        // ── Exercise list (strength review) ──────────────────────────────
        function renderExerciseList(groups) {
            exerciseList.innerHTML = '';
            groups.forEach((g, idx) => {
                addExerciseRow(
                    list(g.exercises) || '',
                    g.sets || '3',
                    g.reps || '8-12',
                    g.default_weight || '',
                    g.default_weight_unit || 'lbs',
                    idx
                );
            });
        }

        function addExerciseRow(name = '', sets = '3', reps = '8-12', weight = '', weightUnit = 'lbs') {
            const row = document.createElement('div');
            row.className = 'exercise-row d-flex align-items-center gap-1 mb-2';
            row.innerHTML = `
                <input class="form-control form-control-sm ex-name" value="${escapeHtml(name)}"
                       placeholder="Exercise name" style="flex:2;min-width:0;">
                <input class="form-control form-control-sm ex-sets text-center" value="${escapeHtml(sets)}"
                       placeholder="Sets" style="width:46px;flex-shrink:0;">
                <span class="text-muted small">×</span>
                <input class="form-control form-control-sm ex-reps text-center" value="${escapeHtml(reps)}"
                       placeholder="Reps" style="width:60px;flex-shrink:0;">
                <input class="form-control form-control-sm ex-weight text-center" value="${escapeHtml(weight)}"
                       placeholder="Wt" style="width:52px;flex-shrink:0;">
                <select class="form-select form-select-sm ex-weight-unit" style="width:56px;flex-shrink:0;padding-right:1.5rem;">
                    <option value="lbs" ${weightUnit === 'lbs' ? 'selected' : ''}>lbs</option>
                    <option value="kg"  ${weightUnit === 'kg'  ? 'selected' : ''}>kg</option>
                </select>
                <button type="button" class="btn btn-sm btn-link text-danger p-0 remove-ex-btn" aria-label="Remove">
                    <i class="bx bx-x fs-5"></i>
                </button>
            `;
            row.querySelector('.remove-ex-btn').addEventListener('click', () => row.remove());
            exerciseList.appendChild(row);
        }

        /** Get the first exercise name from an exercises dict {"a": "Bench Press"} */
        function list(exercises) {
            if (!exercises) return '';
            return Object.values(exercises)[0] || '';
        }

        addExerciseBtn.addEventListener('click', () => addExerciseRow());

        // ── Collect review data ───────────────────────────────────────────
        function collectCardioData() {
            const hours = parseFloat(el.querySelector('#ul-duration-hours').value) || 0;
            const mins  = parseFloat(el.querySelector('#ul-duration-mins').value)  || 0;
            return {
                activity_type:  el.querySelector('#ul-activity-type').value,
                duration_minutes: hours * 60 + mins,
                calories:       parseIntOrNull('#ul-calories'),
                distance:       parseFloatOrNull('#ul-distance'),
                distance_unit:  el.querySelector('#ul-distance-unit').value,
                avg_heart_rate: parseIntOrNull('#ul-avg-hr'),
                max_heart_rate: parseIntOrNull('#ul-max-hr'),
                notes:          el.querySelector('#ul-notes-cardio').value.trim() || null,
                sessionDate:    sessionDateEl.value ? new Date(sessionDateEl.value).toISOString() : null,
            };
        }

        function collectStrengthData() {
            const rows = exerciseList.querySelectorAll('.exercise-row');
            const exercise_groups = [];
            rows.forEach(row => {
                const name = row.querySelector('.ex-name').value.trim();
                if (!name) return;
                exercise_groups.push({
                    exercises: { a: name },
                    sets: row.querySelector('.ex-sets').value.trim() || '3',
                    reps: row.querySelector('.ex-reps').value.trim() || '8-12',
                    rest: '60s',
                    default_weight: row.querySelector('.ex-weight').value.trim() || null,
                    default_weight_unit: row.querySelector('.ex-weight-unit').value,
                });
            });

            const durationMins = parseFloat(el.querySelector('#ul-strength-duration').value) || null;

            return {
                workout_name:     el.querySelector('#ul-workout-name').value.trim() || 'Ad-Hoc Workout',
                exercise_groups,
                duration_minutes: durationMins,
                notes:            el.querySelector('#ul-notes-strength').value.trim() || null,
                started_at:       sessionDateEl.value ? new Date(sessionDateEl.value).toISOString() : null,
            };
        }

        function parseIntOrNull(selector) {
            const val = parseInt(el.querySelector(selector).value, 10);
            return isNaN(val) ? null : val;
        }
        function parseFloatOrNull(selector) {
            const val = parseFloat(el.querySelector(selector).value);
            return isNaN(val) ? null : val;
        }

        // ── Save ──────────────────────────────────────────────────────────
        saveBtn.addEventListener('click', async () => {
            hideSaveError();
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';

            try {
                if (currentSessionType === 'cardio') {
                    const data = collectCardioData();
                    if (!data.duration_minutes || data.duration_minutes < 1) {
                        throw new Error('Please enter a duration greater than 0');
                    }
                    await window.universalLogService.saveCardio(data);
                    successText.textContent = `${CARDIO_ACTIVITY_TYPES.find(t => t.value === data.activity_type)?.label || 'Activity'} session saved!`;
                } else {
                    const data = collectStrengthData();
                    if (data.exercise_groups.length === 0) {
                        throw new Error('Please add at least one exercise');
                    }
                    await window.universalLogService.saveStrength(data, saveTemplateToggle.checked);
                    successText.textContent = saveTemplateToggle.checked
                        ? `"${escapeHtml(data.workout_name)}" saved and added to your library!`
                        : `"${escapeHtml(data.workout_name)}" logged successfully!`;
                }

                showStep('success');
                onSaveComplete?.();
            } catch (err) {
                showSaveError(err.message || 'Save failed. Please try again.');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Session';
            }
        });

        // ── Init ──────────────────────────────────────────────────────────
        if (autoAnalyze && (prefillText || prefillImages.length > 0)) {
            if (prefillText) textInput.value = prefillText;
            if (prefillImages.length > 0) {
                selectedImages = [...prefillImages];
                updateAnalyzeBtn();
            }
            showStep('loading');
        } else {
            showStep('step1');
        }
        setSessionType('cardio');

        el.addEventListener('shown.bs.offcanvas', () => {
            if (autoAnalyze && (prefillText || prefillImages.length > 0)) {
                runAnalyze();
            } else {
                textInput.focus();
            }
        });

        // Clean up object URLs on close
        el.addEventListener('hidden.bs.offcanvas', () => {
            thumbnailsEl.querySelectorAll('img').forEach(img => {
                if (img._objectUrl) URL.revokeObjectURL(img._objectUrl);
            });
        });
    });
}

// Attach to window for non-module usage
window.createUniversalLogger = createUniversalLogger;
