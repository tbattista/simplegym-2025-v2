/**
 * Universal Logger Offcanvas Wizard
 * AI-powered session logging: photos + text → structured activity session.
 *
 * Steps:
 *   1. Input     — Describe tab (text) + Photos tab (multi-image), combinable
 *   2. Loading   — AI analysis spinner
 *   2b. Clarify  — AI follow-up questions (optional)
 *   3. Review    — Editable session form (unified activity logging)
 *   4. Success   — Confirmation with close button
 *
 * Supports two modes:
 *   - Offcanvas (mobile): full-screen bottom sheet wizard
 *   - Inline (desktop): renders wizard steps inside a provided container element
 *
 * Reuses: createOffcanvas + escapeHtml from offcanvas-helpers.js
 * Reuses: window.universalLogService for API calls
 * Reuses: window.ActivityTypeRegistry for activity types
 *
 * @module offcanvas-universal-logger
 * @version 2.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

/**
 * Build activity type <option> elements grouped by category from the registry.
 * Falls back to a basic list if the registry is not loaded.
 */
function buildActivityOptions() {
    const registry = window.ActivityTypeRegistry;
    if (registry) {
        const categories = registry.getCategories();
        return categories.map(cat => {
            const types = registry.getByCategory(cat.id);
            const options = types.map(t =>
                `<option value="${t.id}">${t.name}</option>`
            ).join('');
            return `<optgroup label="${cat.name}">${options}</optgroup>`;
        }).join('');
    }
    // Fallback if registry not loaded
    return ['running','cycling','walking','rowing','swimming','elliptical','stair_climber','hiking','yoga','hiit','crossfit','other']
        .map(v => `<option value="${v}">${v.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`).join('');
}

/**
 * Get the display name for an activity type.
 */
function getActivityName(activityType) {
    const registry = window.ActivityTypeRegistry;
    if (registry) return registry.getName(activityType) || activityType;
    return activityType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Wizard body HTML (shared between offcanvas and inline modes) ─────────

function buildBodyHtml({ isInline = false } = {}) {
    const closeBtnHtml = isInline
        ? '<button type="button" class="btn btn-outline-primary" id="ul-close-btn"><i class="bx bx-x me-1"></i>Close</button>'
        : '<button type="button" class="btn btn-outline-primary" data-bs-dismiss="offcanvas"><i class="bx bx-x me-1"></i>Close</button>';

    return `
        <!-- ── STEP 1: Input ─────────────────────────── -->
        <div id="ul-step1" class="p-3">
            <!-- Text input -->
            <div id="ul-describe-content">
                <textarea id="ul-text-input" class="form-control mb-3" rows="4"
                    placeholder="Describe your activity...&#10;&#10;Examples:&#10;• 2.3 miles on the treadmill in 18:20, burned 340 cals&#10;• Bench press 3x10, squats 4x8, rows 3x12&#10;• 45 min spin class, avg HR 158"
                    style="font-size: 14px; line-height: 1.6;"></textarea>
            </div>

            <!-- Photo upload -->
            <div id="ul-photos-content">
                <!-- Drop zone -->
                <div id="ul-dropzone" class="border border-2 border-dashed rounded p-3 text-center mb-2"
                     style="cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <i class="bx bx-image-add text-primary" style="font-size: 1.5rem;"></i>
                    <p class="mb-0 mt-1" style="font-size: 14px;">Tap to add photos</p>
                    <small class="text-muted">Treadmill screen · Watch · Whiteboard · Screenshot</small>
                    <input type="file" id="ul-file-input" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                           multiple class="d-none" />
                </div>
                <!-- Thumbnail strip -->
                <div id="ul-thumbnails" class="d-flex flex-wrap gap-2 mb-2" style="min-height: 0;"></div>
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

            <!-- Date & Time -->
            <div class="mb-3">
                <label for="ul-session-date" class="form-label fw-semibold">Date & Time</label>
                <input type="datetime-local" class="form-control" id="ul-session-date">
            </div>

            <!-- Activity (all types from registry) -->
            <div class="mb-3">
                <label for="ul-activity-type" class="form-label fw-semibold">Activity</label>
                <select class="form-select" id="ul-activity-type">
                    ${buildActivityOptions()}
                </select>
            </div>

            <!-- Duration + Calories -->
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

            <!-- Distance + Unit -->
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

            <!-- Heart Rate -->
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

            <!-- RPE -->
            <div class="mb-3">
                <label class="form-label fw-semibold">RPE <small class="text-muted fw-normal">(perceived effort)</small></label>
                <div class="d-flex gap-1" id="ul-rpe-selector">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n =>
                        `<button type="button" class="btn btn-sm btn-outline-secondary ul-rpe-btn" data-rpe="${n}" style="min-width:32px;padding:2px 6px;">${n}</button>`
                    ).join('')}
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <small class="text-muted">Easy</small>
                    <small class="text-muted">Max Effort</small>
                </div>
            </div>

            <!-- Elevation Gain -->
            <div class="mb-3">
                <label for="ul-elevation" class="form-label fw-semibold">Elevation Gain</label>
                <div class="input-group">
                    <input type="number" class="form-control" id="ul-elevation" min="0" placeholder="—">
                    <select class="form-select" id="ul-elevation-unit" style="max-width: 70px;">
                        <option value="ft">ft</option>
                        <option value="m">m</option>
                    </select>
                </div>
            </div>

            <!-- Notes -->
            <div class="mb-3">
                <label for="ul-notes" class="form-label fw-semibold">Notes <small class="text-muted fw-normal">(optional)</small></label>
                <textarea class="form-control" id="ul-notes" rows="2" placeholder="Any extra details…"></textarea>
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
            ${closeBtnHtml}
        </div>`;
}

// ── Offcanvas wrapper HTML ───────────────────────────────────────────────

function buildOffcanvasHtml(id) {
    return `
<div class="offcanvas offcanvas-bottom offcanvas-bottom-base offcanvas-bottom-full offcanvas-desktop-wide" tabindex="-1"
     id="${id}" data-bs-scroll="false">
    <div class="offcanvas-header border-bottom" id="ul-header">
        <h5 class="offcanvas-title">
            <i class="bx bx-camera me-2"></i><span id="ul-title">Quick Log</span>
        </h5>
        <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary d-none" id="ul-back-btn">
                <i class="bx bx-arrow-back me-1"></i>Back
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
    </div>

    <div class="offcanvas-body p-0" style="overflow-y: auto;">
        ${buildBodyHtml({ isInline: false })}
    </div>
</div>`;
}

// ── Shared wizard logic ──────────────────────────────────────────────────

function setupWizardLogic(el, { onSaveComplete, prefillText, prefillImages, autoAnalyze, isInline, onReset }) {

    // State
    let selectedImages = [];
    let currentParsedResult = null;
    let selectedRpe = null;
    let pendingQuestions = [];

    // ── Element refs ─────────────────────────────────────────────────
    const titleEl       = el.querySelector('#ul-title');
    const backBtn       = el.querySelector('#ul-back-btn');

    const step1         = el.querySelector('#ul-step1');
    const loadingEl     = el.querySelector('#ul-loading');
    const clarifyEl     = el.querySelector('#ul-clarify');
    const reviewEl      = el.querySelector('#ul-review');
    const successEl     = el.querySelector('#ul-success');

    const textInput     = el.querySelector('#ul-text-input');

    const dropzone      = el.querySelector('#ul-dropzone');
    const fileInput     = el.querySelector('#ul-file-input');
    const thumbnailsEl  = el.querySelector('#ul-thumbnails');
    const analyzeBtn    = el.querySelector('#ul-analyze-btn');
    const errorDiv      = el.querySelector('#ul-error');
    const errorText     = el.querySelector('#ul-error-text');

    const questionsContainer = el.querySelector('#ul-questions-container');
    const continueBtn   = el.querySelector('#ul-continue-btn');

    const sessionDateEl = el.querySelector('#ul-session-date');
    const saveBtn       = el.querySelector('#ul-save-btn');
    const saveErrorDiv  = el.querySelector('#ul-save-error');
    const saveErrorText = el.querySelector('#ul-save-error-text');
    const successText   = el.querySelector('#ul-success-text');
    const rpeSelector   = el.querySelector('#ul-rpe-selector');

    const closeBtn      = el.querySelector('#ul-close-btn'); // inline mode only

    // ── Step navigation ───────────────────────────────────────────────
    function showStep(name) {
        step1.classList.toggle('d-none',    name !== 'step1');
        loadingEl.classList.toggle('d-none', name !== 'loading');
        clarifyEl.classList.toggle('d-none', name !== 'clarify');
        reviewEl.classList.toggle('d-none',  name !== 'review');
        successEl.classList.toggle('d-none', name !== 'success');

        if (backBtn) backBtn.classList.toggle('d-none', name === 'step1' || name === 'loading' || name === 'success');

        if (titleEl) {
            const titles = {
                step1: 'Quick Log',
                loading: 'Analyzing…',
                clarify: 'Quick Questions',
                review: 'Review & Save',
                success: 'Logged!',
            };
            titleEl.textContent = titles[name] || 'Quick Log';
        }
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => showStep('step1'));
    }

    // ── Inline close button (resets wizard) ───────────────────────────
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            cleanupObjectUrls();
            if (onReset) onReset();
        });
    }

    textInput.addEventListener('input', () => { updateAnalyzeBtn(); hideError(); });

    // ── Image upload & thumbnails ─────────────────────────────────────
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        addFiles(Array.from(fileInput.files));
        fileInput.value = '';
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
    }

    function renderThumbnails() {
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
            thumbnailsEl.appendChild(wrapper);
        });

        if (selectedImages.length > 0 && selectedImages.length < 5) {
            const addMore = document.createElement('div');
            addMore.className = 'border rounded d-flex align-items-center justify-content-center text-muted';
            addMore.style = 'height:64px;width:64px;cursor:pointer;font-size:1.5rem;';
            addMore.innerHTML = '<i class="bx bx-plus"></i>';
            addMore.addEventListener('click', () => fileInput.click());
            thumbnailsEl.appendChild(addMore);
        }

        thumbnailsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-idx]');
            if (!btn) return;
            const idx = parseInt(btn.dataset.idx, 10);
            if (!isNaN(idx)) {
                selectedImages.splice(idx, 1);
                renderThumbnails();
                updateAnalyzeBtn();
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

    // ── RPE selector ─────────────────────────────────────────────────
    if (rpeSelector) {
        rpeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.ul-rpe-btn');
            if (!btn) return;
            const rpe = parseInt(btn.dataset.rpe, 10);
            // Toggle off if same button clicked again
            if (selectedRpe === rpe) {
                selectedRpe = null;
                rpeSelector.querySelectorAll('.ul-rpe-btn').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline-secondary');
                });
            } else {
                selectedRpe = rpe;
                rpeSelector.querySelectorAll('.ul-rpe-btn').forEach(b => {
                    const val = parseInt(b.dataset.rpe, 10);
                    b.classList.toggle('btn-primary', val === rpe);
                    b.classList.toggle('btn-outline-secondary', val !== rpe);
                });
            }
        });
    }

    // ── Review ────────────────────────────────────────────────────────
    function populateReview(result) {
        hideSaveError();

        const now = new Date();
        now.setSeconds(0, 0);
        sessionDateEl.value = now.toISOString().slice(0, 16);

        // Reset RPE
        selectedRpe = null;
        if (rpeSelector) {
            rpeSelector.querySelectorAll('.ul-rpe-btn').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline-secondary');
            });
        }

        if (result.session_type === 'strength' && result.strength_data) {
            // Convert strength data to unified activity form
            populateFromStrength(result.strength_data);
        } else if (result.cardio_data) {
            populateFields(result.cardio_data);
        }
    }

    function populateFields(cd) {
        el.querySelector('#ul-activity-type').value = cd.activity_type || 'other';

        const totalMins = cd.duration_minutes || 0;
        el.querySelector('#ul-duration-hours').value = Math.floor(totalMins / 60) || 0;
        el.querySelector('#ul-duration-mins').value  = Math.round(totalMins % 60) || 0;

        el.querySelector('#ul-calories').value      = cd.calories || '';
        el.querySelector('#ul-distance').value      = cd.distance || '';
        el.querySelector('#ul-distance-unit').value = cd.distance_unit || 'mi';
        el.querySelector('#ul-avg-hr').value        = cd.avg_heart_rate || '';
        el.querySelector('#ul-max-hr').value        = cd.max_heart_rate || '';
        el.querySelector('#ul-elevation').value     = cd.elevation_gain || '';
        el.querySelector('#ul-elevation-unit').value = cd.elevation_unit || 'ft';
        el.querySelector('#ul-notes').value         = cd.notes || '';

        // Set RPE if present
        if (cd.rpe) {
            selectedRpe = cd.rpe;
            if (rpeSelector) {
                rpeSelector.querySelectorAll('.ul-rpe-btn').forEach(b => {
                    const val = parseInt(b.dataset.rpe, 10);
                    b.classList.toggle('btn-primary', val === cd.rpe);
                    b.classList.toggle('btn-outline-secondary', val !== cd.rpe);
                });
            }
        }
    }

    function populateFromStrength(sd) {
        // Map strength data into the unified activity form
        el.querySelector('#ul-activity-type').value = 'crossfit';
        el.querySelector('#ul-duration-hours').value = 0;
        el.querySelector('#ul-duration-mins').value  = 0;
        el.querySelector('#ul-calories').value       = '';
        el.querySelector('#ul-distance').value       = '';
        el.querySelector('#ul-avg-hr').value         = '';
        el.querySelector('#ul-max-hr').value         = '';
        el.querySelector('#ul-elevation').value      = '';

        // Build notes from exercise details
        const lines = [];
        if (sd.workout_name && sd.workout_name !== 'Ad-Hoc Workout') {
            lines.push(sd.workout_name);
        }
        (sd.exercise_groups || []).forEach(g => {
            const name = g.exercises ? (Object.values(g.exercises)[0] || '') : '';
            if (!name) return;
            let line = name;
            if (g.sets && g.reps) line += ` ${g.sets}×${g.reps}`;
            if (g.default_weight) line += ` @ ${g.default_weight}${g.default_weight_unit || 'lbs'}`;
            lines.push(line);
        });
        if (sd.notes) lines.push(sd.notes);
        el.querySelector('#ul-notes').value = lines.join('\n');
    }

    // ── Collect review data ───────────────────────────────────────────
    function collectFormData() {
        const hours = parseFloat(el.querySelector('#ul-duration-hours').value) || 0;
        const mins  = parseFloat(el.querySelector('#ul-duration-mins').value)  || 0;
        return {
            activity_type:   el.querySelector('#ul-activity-type').value,
            duration_minutes: hours * 60 + mins,
            calories:        parseIntOrNull('#ul-calories'),
            distance:        parseFloatOrNull('#ul-distance'),
            distance_unit:   el.querySelector('#ul-distance-unit').value,
            avg_heart_rate:  parseIntOrNull('#ul-avg-hr'),
            max_heart_rate:  parseIntOrNull('#ul-max-hr'),
            rpe:             selectedRpe,
            elevation_gain:  parseIntOrNull('#ul-elevation'),
            elevation_unit:  el.querySelector('#ul-elevation-unit').value,
            notes:           el.querySelector('#ul-notes').value.trim() || null,
            sessionDate:     sessionDateEl.value ? new Date(sessionDateEl.value).toISOString() : null,
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
            const data = collectFormData();
            if (!data.duration_minutes || data.duration_minutes < 1) {
                throw new Error('Please enter a duration greater than 0');
            }
            await window.universalLogService.saveCardio(data);
            successText.textContent = `${getActivityName(data.activity_type)} session saved!`;

            showStep('success');
            onSaveComplete?.();
        } catch (err) {
            showSaveError(err.message || 'Save failed. Please try again.');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bx bx-save me-1"></i>Save Session';
        }
    });

    // ── Cleanup helper ────────────────────────────────────────────────
    function cleanupObjectUrls() {
        thumbnailsEl.querySelectorAll('img').forEach(img => {
            if (img._objectUrl) URL.revokeObjectURL(img._objectUrl);
        });
    }

    // ── Init ──────────────────────────────────────────────────────────
    if (prefillText) textInput.value = prefillText;
    if (prefillImages && prefillImages.length > 0) {
        selectedImages = [...prefillImages];
        updateAnalyzeBtn();
    }

    if (autoAnalyze && (prefillText || (prefillImages && prefillImages.length > 0))) {
        showStep('loading');
    } else {
        showStep('step1');
    }

    // Return control functions for the caller
    return { runAnalyze, cleanupObjectUrls, focusInput: () => textInput.focus() };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Create and show the Universal Logger.
 * @param {Object} [options]
 * @param {Function} [options.onSaveComplete] - Called after successful save
 * @param {string|null} [options.prefillText] - Pre-fill the text input
 * @param {File[]} [options.prefillImages] - Pre-fill with image files
 * @param {boolean} [options.autoAnalyze] - Immediately start analysis
 * @param {HTMLElement|null} [options.inlineContainer] - If provided, renders inline into this element (desktop mode)
 * @param {Function|null} [options.onReset] - Called when inline wizard "Close" is clicked (to restore original content)
 * @returns {{ offcanvas?, offcanvasElement?, destroy? }}
 */
export function createUniversalLogger({ onSaveComplete, prefillText = null, prefillImages = [], autoAnalyze = false, inlineContainer = null, onReset = null } = {}) {

    // ── Inline mode (desktop) ────────────────────────────────────────
    if (inlineContainer) {
        inlineContainer.innerHTML = buildBodyHtml({ isInline: true });
        const controls = setupWizardLogic(inlineContainer, {
            onSaveComplete,
            prefillText,
            prefillImages,
            autoAnalyze,
            isInline: true,
            onReset,
        });

        // Auto-analyze immediately (no offcanvas show event to wait for)
        if (autoAnalyze && (prefillText || prefillImages.length > 0)) {
            controls.runAnalyze();
        } else {
            controls.focusInput();
        }

        return {
            destroy: () => {
                controls.cleanupObjectUrls();
                inlineContainer.innerHTML = '';
            },
        };
    }

    // ── Offcanvas mode (mobile) ──────────────────────────────────────
    const id = 'universalLoggerOffcanvas';
    const html = buildOffcanvasHtml(id);

    return createOffcanvas(id, html, (offcanvas, el) => {
        const controls = setupWizardLogic(el, {
            onSaveComplete,
            prefillText,
            prefillImages,
            autoAnalyze,
            isInline: false,
        });

        el.addEventListener('shown.bs.offcanvas', () => {
            if (autoAnalyze && (prefillText || prefillImages.length > 0)) {
                controls.runAnalyze();
            } else {
                controls.focusInput();
            }
        });

        el.addEventListener('hidden.bs.offcanvas', () => {
            controls.cleanupObjectUrls();
        });
    });
}

// Attach to window for non-module usage
window.createUniversalLogger = createUniversalLogger;
