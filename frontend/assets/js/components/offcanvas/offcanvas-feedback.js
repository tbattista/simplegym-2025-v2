/**
 * Ghost Gym - Feedback Offcanvas Component
 * Unified feedback panel with voting and submission tabs
 *
 * @module offcanvas-feedback
 * @version 1.0.0
 */

import { createOffcanvas, escapeHtml } from './offcanvas-helpers.js';

// Constants
const AUTO_SAVE_DELAY = 2000;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Create and show the feedback offcanvas
 * @param {Object} config - Configuration options
 * @param {string} config.defaultTab - 'vote' or 'submit' (default: 'vote')
 * @param {string} config.presetType - Pre-select type filter ('feature', 'bug', 'general')
 * @returns {Object} { offcanvas, offcanvasElement }
 */
export function createFeedbackOffcanvas(config = {}) {
    const { defaultTab = 'vote', presetType = 'feature' } = config;

    const id = 'feedbackOffcanvas';
    const html = generateOffcanvasHTML(defaultTab);

    return createOffcanvas(id, html, (offcanvas, offcanvasElement) => {
        setupFeedbackOffcanvas(offcanvas, offcanvasElement, { defaultTab, presetType });
    });
}

/**
 * Generate the offcanvas HTML
 */
function generateOffcanvasHTML(defaultTab) {
    const voteActive = defaultTab === 'vote';

    return `
        <div class="offcanvas offcanvas-bottom offcanvas-bottom-base feedback-offcanvas"
             tabindex="-1" id="feedbackOffcanvas"
             aria-labelledby="feedbackOffcanvasLabel"
             data-bs-scroll="false"
             style="height: auto; max-height: 85vh;">

            <!-- Header with Tabs -->
            <div class="offcanvas-header border-bottom pb-3">
                <div class="d-flex flex-column w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="offcanvas-title mb-0" id="feedbackOffcanvasLabel">
                            <i class="bx bx-message-dots me-2"></i>Feedback
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                    </div>

                    <!-- Tab Navigation -->
                    <ul class="nav feedback-offcanvas-tabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link ${voteActive ? 'active' : ''}"
                                    id="voteTab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#voteTabPanel"
                                    type="button"
                                    role="tab"
                                    aria-controls="voteTabPanel"
                                    aria-selected="${voteActive}">
                                <i class="bx bx-like"></i>
                                <span>Vote & Support</span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link ${!voteActive ? 'active' : ''}"
                                    id="submitTab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#submitTabPanel"
                                    type="button"
                                    role="tab"
                                    aria-controls="submitTabPanel"
                                    aria-selected="${!voteActive}">
                                <i class="bx bx-edit"></i>
                                <span>Submit New</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Tab Content -->
            <div class="offcanvas-body p-0">
                <div class="tab-content">
                    <!-- Vote & Support Tab -->
                    <div class="tab-pane fade ${voteActive ? 'show active' : ''}"
                         id="voteTabPanel"
                         role="tabpanel"
                         aria-labelledby="voteTab">

                        <!-- Type Filter Pills -->
                        <div class="feedback-type-pills p-3 border-bottom">
                            <div class="btn-group btn-group-sm w-100">
                                <button class="btn btn-outline-primary active" data-type="feature">
                                    Features <span class="badge" id="featureCount">0</span>
                                </button>
                                <button class="btn btn-outline-primary" data-type="bug">
                                    Bugs <span class="badge" id="bugCount">0</span>
                                </button>
                                <button class="btn btn-outline-primary" data-type="general">
                                    General <span class="badge" id="generalCount">0</span>
                                </button>
                            </div>
                        </div>

                        <!-- Search -->
                        <div class="feedback-search p-3 border-bottom">
                            <input type="text"
                                   class="form-control form-control-sm"
                                   placeholder="Search feedback..."
                                   id="feedbackSearchInput">
                        </div>

                        <!-- Login Prompt (shown when not authenticated) -->
                        <div class="login-prompt m-3 d-none" id="offcanvasLoginPrompt">
                            <i class="bx bx-info-circle me-2"></i>
                            <span>Sign in to vote on feedback</span>
                            <button class="btn btn-sm btn-primary ms-auto" id="loginFromFeedbackBtn">
                                Sign In
                            </button>
                        </div>

                        <!-- Feedback List -->
                        <div class="feedback-list-container" style="max-height: 40vh; overflow-y: auto;">
                            <!-- Loading State -->
                            <div class="loading-state text-center py-4" id="feedbackLoading">
                                <div class="spinner-border spinner-border-sm text-primary"></div>
                                <span class="ms-2 text-muted">Loading feedback...</span>
                            </div>

                            <!-- Empty State -->
                            <div class="empty-state d-none" id="feedbackEmpty">
                                <i class="bx bx-bulb"></i>
                                <p>No feedback yet. Be the first!</p>
                            </div>

                            <!-- Feedback Items -->
                            <div class="feedback-list" id="feedbackList"></div>
                        </div>
                    </div>

                    <!-- Submit Feedback Tab -->
                    <div class="tab-pane fade ${!voteActive ? 'show active' : ''}"
                         id="submitTabPanel"
                         role="tabpanel"
                         aria-labelledby="submitTab">

                        <div class="feedback-submit-content">
                            <form id="feedbackForm">
                                <!-- Draft Notice -->
                                <div class="draft-notice d-none" id="draftNotice">
                                    <span><i class="bx bx-history me-1"></i>Draft restored</span>
                                    <button type="button" class="btn btn-link btn-sm" id="clearDraftBtn">Clear</button>
                                </div>

                                <!-- Feedback Type -->
                                <div class="mb-3">
                                    <label for="feedbackType" class="form-label">Type</label>
                                    <select class="form-select" id="feedbackType" name="feedbackType" required>
                                        <option value="general" selected>General</option>
                                        <option value="bug">Bug Report</option>
                                        <option value="feature">Feature Request</option>
                                    </select>
                                </div>

                                <!-- Priority (for bugs only) -->
                                <div class="mb-3 d-none" id="priorityField">
                                    <label for="feedbackPriority" class="form-label">Priority</label>
                                    <select class="form-select" id="feedbackPriority">
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                    <div class="form-text">How urgent is this issue?</div>
                                </div>

                                <!-- Title -->
                                <div class="mb-3">
                                    <label for="feedbackTitle" class="form-label">
                                        Title <span class="text-danger">*</span>
                                    </label>
                                    <input type="text"
                                           class="form-control"
                                           id="feedbackTitle"
                                           placeholder="Brief summary"
                                           maxlength="${TITLE_MAX_LENGTH}"
                                           required>
                                    <div class="d-flex justify-content-between mt-1">
                                        <small class="form-text">Min 3 characters</small>
                                        <small class="char-counter" id="titleCounter">0/${TITLE_MAX_LENGTH}</small>
                                    </div>
                                </div>

                                <!-- Description -->
                                <div class="mb-3">
                                    <label for="feedbackDescription" class="form-label">
                                        Description <span class="text-danger">*</span>
                                    </label>
                                    <textarea class="form-control"
                                              id="feedbackDescription"
                                              rows="4"
                                              placeholder="Please provide details..."
                                              maxlength="${DESCRIPTION_MAX_LENGTH}"
                                              required></textarea>
                                    <div class="d-flex justify-content-between mt-1">
                                        <small class="form-text">Min 10 characters</small>
                                        <small class="char-counter" id="descriptionCounter">0/${DESCRIPTION_MAX_LENGTH}</small>
                                    </div>
                                </div>

                                <!-- Contact Me -->
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input"
                                               type="checkbox"
                                               id="feedbackContact">
                                        <label class="form-check-label" for="feedbackContact">
                                            Notify me about updates
                                        </label>
                                    </div>
                                    <small class="form-text d-block" id="contactInfo"></small>
                                </div>

                                <!-- Error Message -->
                                <div class="alert alert-danger d-none" id="feedbackError" role="alert"></div>

                                <!-- Success Message -->
                                <div class="alert alert-success d-none" id="feedbackSuccess" role="alert"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="offcanvas-footer" id="feedbackFooter">
                <!-- Vote tab footer -->
                <div id="voteFooter" class="${voteActive ? '' : 'd-none'}">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="offcanvas">
                        Close
                    </button>
                </div>

                <!-- Submit tab footer -->
                <div id="submitFooter" class="d-flex gap-2 w-100 ${!voteActive ? '' : 'd-none'}">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="offcanvas">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary flex-fill" id="submitFeedbackBtn">
                        <i class="bx bx-send me-1"></i>Submit
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Setup all event listeners and functionality
 */
function setupFeedbackOffcanvas(offcanvas, offcanvasElement, config) {
    // State
    let currentType = config.presetType || 'feature';
    let autoSaveTimeout = null;
    let feedbackCounts = { feature: 0, bug: 0, general: 0 };

    // Elements
    const voteTab = offcanvasElement.querySelector('#voteTab');
    const submitTab = offcanvasElement.querySelector('#submitTab');
    const voteFooter = offcanvasElement.querySelector('#voteFooter');
    const submitFooter = offcanvasElement.querySelector('#submitFooter');
    const feedbackList = offcanvasElement.querySelector('#feedbackList');
    const feedbackLoading = offcanvasElement.querySelector('#feedbackLoading');
    const feedbackEmpty = offcanvasElement.querySelector('#feedbackEmpty');
    const searchInput = offcanvasElement.querySelector('#feedbackSearchInput');
    const typePills = offcanvasElement.querySelectorAll('.feedback-type-pills .btn');
    const loginPrompt = offcanvasElement.querySelector('#offcanvasLoginPrompt');
    const loginBtn = offcanvasElement.querySelector('#loginFromFeedbackBtn');

    // Form elements
    const form = offcanvasElement.querySelector('#feedbackForm');
    const typeSelect = offcanvasElement.querySelector('#feedbackType');
    const priorityField = offcanvasElement.querySelector('#priorityField');
    const titleInput = offcanvasElement.querySelector('#feedbackTitle');
    const descriptionInput = offcanvasElement.querySelector('#feedbackDescription');
    const contactCheckbox = offcanvasElement.querySelector('#feedbackContact');
    const contactInfo = offcanvasElement.querySelector('#contactInfo');
    const titleCounter = offcanvasElement.querySelector('#titleCounter');
    const descriptionCounter = offcanvasElement.querySelector('#descriptionCounter');
    const submitBtn = offcanvasElement.querySelector('#submitFeedbackBtn');
    const draftNotice = offcanvasElement.querySelector('#draftNotice');
    const clearDraftBtn = offcanvasElement.querySelector('#clearDraftBtn');
    const errorDiv = offcanvasElement.querySelector('#feedbackError');
    const successDiv = offcanvasElement.querySelector('#feedbackSuccess');

    // ==========================================
    // TAB SWITCHING
    // ==========================================

    voteTab?.addEventListener('shown.bs.tab', () => {
        voteFooter?.classList.remove('d-none');
        submitFooter?.classList.add('d-none');
    });

    submitTab?.addEventListener('shown.bs.tab', () => {
        submitFooter?.classList.remove('d-none');
        voteFooter?.classList.add('d-none');
        updateContactInfo();
        // Focus title input
        setTimeout(() => titleInput?.focus(), 100);
    });

    // ==========================================
    // VOTE TAB - TYPE PILLS
    // ==========================================

    typePills.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            typePills.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Load feedback for this type
            currentType = btn.dataset.type;
            loadFeedback(currentType);
        });
    });

    // Set initial active type from config
    if (config.presetType) {
        typePills.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === config.presetType);
        });
    }

    // ==========================================
    // VOTE TAB - SEARCH
    // ==========================================

    let searchTimeout = null;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value;
            if (window.feedbackVotingService) {
                const filtered = window.feedbackVotingService.searchFeedback(query, currentType);
                renderFeedbackList(filtered);
            }
        }, 300);
    });

    // ==========================================
    // VOTE TAB - LOGIN PROMPT
    // ==========================================

    function updateLoginPrompt() {
        const isLoggedIn = window.feedbackVotingService?.isLoggedIn?.() ||
                          (window.firebaseAuth?.currentUser != null);
        loginPrompt?.classList.toggle('d-none', isLoggedIn);
    }

    loginBtn?.addEventListener('click', () => {
        // Trigger login modal
        if (window.authUIManager?.showLoginModal) {
            window.authUIManager.showLoginModal();
        } else if (window.authService?.login) {
            window.authService.login();
        }
    });

    // Listen for auth changes
    window.addEventListener('authStateChanged', () => {
        updateLoginPrompt();
        // Reload current feedback to update support button states
        loadFeedback(currentType);
    });

    // ==========================================
    // VOTE TAB - LOAD FEEDBACK
    // ==========================================

    async function loadFeedback(type) {
        if (!window.feedbackVotingService) {
            console.warn('Feedback voting service not available');
            feedbackLoading?.classList.add('d-none');
            feedbackEmpty?.classList.remove('d-none');
            return;
        }

        // Show loading
        feedbackLoading?.classList.remove('d-none');
        feedbackEmpty?.classList.add('d-none');
        feedbackList.innerHTML = '';

        try {
            const items = await window.feedbackVotingService.loadPublicFeedback(type);
            feedbackCounts[type] = items.length;
            updateCountBadge(type, items.length);
            renderFeedbackList(items);
        } catch (error) {
            console.error('Error loading feedback:', error);
            feedbackEmpty?.classList.remove('d-none');
            feedbackEmpty.querySelector('p').textContent = 'Failed to load feedback';
        } finally {
            feedbackLoading?.classList.add('d-none');
        }
    }

    function updateCountBadge(type, count) {
        const badge = offcanvasElement.querySelector(`#${type}Count`);
        if (badge) {
            badge.textContent = count;
        }
    }

    // ==========================================
    // VOTE TAB - RENDER FEEDBACK LIST
    // ==========================================

    function renderFeedbackList(items) {
        feedbackList.innerHTML = '';

        if (!items || items.length === 0) {
            feedbackEmpty?.classList.remove('d-none');
            return;
        }

        feedbackEmpty?.classList.add('d-none');

        items.forEach(item => {
            const itemEl = createFeedbackItem(item);
            feedbackList.appendChild(itemEl);
        });
    }

    function createFeedbackItem(item) {
        const isLoggedIn = window.feedbackVotingService?.isLoggedIn?.() || false;
        const hasSupported = window.feedbackVotingService?.hasUserSupported?.(item.supporters) || false;
        const supportCount = item.votes?.support || 0;
        const relativeTime = window.feedbackVotingService?.formatRelativeTime?.(item.createdAt) || '';

        const div = document.createElement('div');
        div.className = 'feedback-item';
        div.dataset.id = item.id;
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'button');

        div.innerHTML = `
            <button class="support-btn ${hasSupported ? 'active' : ''} ${!isLoggedIn ? 'disabled' : ''}"
                    ${!isLoggedIn ? 'title="Sign in to support"' : ''}
                    data-id="${item.id}">
                <i class="bx ${hasSupported ? 'bxs-like' : 'bx-like'}"></i>
                <span class="support-count">${supportCount}</span>
            </button>
            <div class="feedback-item-content">
                <div class="feedback-item-title">${escapeHtml(item.title)}</div>
                <div class="feedback-item-description">${escapeHtml(item.description || '')}</div>
                <div class="feedback-item-meta">${relativeTime}</div>
            </div>
        `;

        // Support button click
        const supportBtn = div.querySelector('.support-btn');
        supportBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!isLoggedIn) {
                // Trigger login
                if (window.authUIManager?.showLoginModal) {
                    window.authUIManager.showLoginModal();
                }
                return;
            }
            await handleSupport(item.id, supportBtn);
        });

        // Item click - expand details
        div.addEventListener('click', () => {
            toggleItemDetails(div, item);
        });

        // Keyboard support
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleItemDetails(div, item);
            }
        });

        return div;
    }

    async function handleSupport(feedbackId, buttonEl) {
        if (!window.feedbackVotingService) return;

        try {
            const result = await window.feedbackVotingService.toggleSupport(feedbackId);

            // Update button state
            const icon = buttonEl.querySelector('i');
            const countSpan = buttonEl.querySelector('.support-count');

            if (result.isSupporting) {
                buttonEl.classList.add('active');
                icon?.classList.replace('bx-like', 'bxs-like');
            } else {
                buttonEl.classList.remove('active');
                icon?.classList.replace('bxs-like', 'bx-like');
            }

            // Animate count
            if (countSpan) {
                countSpan.textContent = result.votes.support;
                countSpan.classList.add('animate');
                setTimeout(() => countSpan.classList.remove('animate'), 150);
            }
        } catch (error) {
            console.error('Error toggling support:', error);
        }
    }

    function toggleItemDetails(itemEl, item) {
        const existingDetails = itemEl.querySelector('.feedback-detail-expanded');

        if (existingDetails) {
            // Collapse
            existingDetails.remove();
            return;
        }

        // Collapse any other expanded items
        feedbackList.querySelectorAll('.feedback-detail-expanded').forEach(el => el.remove());

        // Expand this item
        const isLoggedIn = window.feedbackVotingService?.isLoggedIn?.() || false;
        const hasSupported = window.feedbackVotingService?.hasUserSupported?.(item.supporters) || false;
        const supportCount = item.votes?.support || 0;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'feedback-detail-expanded';
        detailsDiv.innerHTML = `
            <div class="detail-title">${escapeHtml(item.title)}</div>
            <div class="detail-description">${escapeHtml(item.description || 'No description provided.')}</div>
            <div class="detail-actions">
                <button class="btn ${hasSupported ? 'btn-primary' : 'btn-outline-primary'} support-btn-large ${!isLoggedIn ? 'disabled' : ''}"
                        data-id="${item.id}">
                    <i class="bx ${hasSupported ? 'bxs-like' : 'bx-like'}"></i>
                    <span class="support-count">${supportCount}</span>
                    <span class="support-label">${hasSupported ? 'Supported' : 'Support'}</span>
                </button>
            </div>
        `;

        // Support button in details
        const detailSupportBtn = detailsDiv.querySelector('.support-btn-large');
        detailSupportBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!isLoggedIn) {
                if (window.authUIManager?.showLoginModal) {
                    window.authUIManager.showLoginModal();
                }
                return;
            }

            await handleSupport(item.id, detailSupportBtn);

            // Also update the main item's button
            const mainBtn = itemEl.querySelector('.support-btn');
            if (mainBtn) {
                const result = await window.feedbackVotingService.loadPublicFeedback(currentType);
                const updatedItem = result.find(i => i.id === item.id);
                if (updatedItem) {
                    const mainIcon = mainBtn.querySelector('i');
                    const mainCount = mainBtn.querySelector('.support-count');
                    const newHasSupported = window.feedbackVotingService.hasUserSupported(updatedItem.supporters);

                    mainBtn.classList.toggle('active', newHasSupported);
                    mainIcon?.classList.toggle('bxs-like', newHasSupported);
                    mainIcon?.classList.toggle('bx-like', !newHasSupported);
                    if (mainCount) mainCount.textContent = updatedItem.votes.support;
                }
            }
        });

        itemEl.appendChild(detailsDiv);
    }

    // ==========================================
    // SUBMIT TAB - FORM HANDLING
    // ==========================================

    // Type change - show/hide priority
    typeSelect?.addEventListener('change', () => {
        priorityField?.classList.toggle('d-none', typeSelect.value !== 'bug');
        scheduleAutoSave();
    });

    // Character counters
    titleInput?.addEventListener('input', () => {
        updateCharCounter(titleInput, titleCounter, TITLE_MAX_LENGTH);
        scheduleAutoSave();
    });

    descriptionInput?.addEventListener('input', () => {
        updateCharCounter(descriptionInput, descriptionCounter, DESCRIPTION_MAX_LENGTH);
        scheduleAutoSave();
    });

    function updateCharCounter(input, counter, max) {
        if (!input || !counter) return;
        const length = input.value.length;
        counter.textContent = `${length}/${max}`;

        // Add warning/danger classes
        counter.classList.remove('warning', 'danger');
        if (length > max * 0.9) {
            counter.classList.add('danger');
        } else if (length > max * 0.75) {
            counter.classList.add('warning');
        }
    }

    // Contact info
    function updateContactInfo() {
        if (!contactCheckbox || !contactInfo) return;

        const user = window.firebaseAuth?.currentUser;
        if (user) {
            contactInfo.textContent = `We'll contact you at: ${user.email}`;
            contactCheckbox.checked = true;
            contactCheckbox.disabled = false;
        } else {
            contactInfo.textContent = 'Sign in to enable notifications';
            contactCheckbox.checked = false;
            contactCheckbox.disabled = true;
        }
    }

    // Auto-save draft
    function scheduleAutoSave() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            saveDraft();
        }, AUTO_SAVE_DELAY);
    }

    function saveDraft() {
        if (!window.feedbackService) return;
        window.feedbackService.saveDraft(getFormData());
    }

    function loadDraft() {
        if (!window.feedbackService) return;

        const draft = window.feedbackService.loadDraft();
        if (!draft) return;

        if (titleInput) titleInput.value = draft.title || '';
        if (descriptionInput) descriptionInput.value = draft.description || '';
        if (typeSelect && draft.type) typeSelect.value = draft.type;

        const prioritySelect = offcanvasElement.querySelector('#feedbackPriority');
        if (prioritySelect && draft.priority) prioritySelect.value = draft.priority;
        if (contactCheckbox && draft.contactMe) contactCheckbox.checked = draft.contactMe;

        // Update UI
        priorityField?.classList.toggle('d-none', typeSelect?.value !== 'bug');
        updateCharCounter(titleInput, titleCounter, TITLE_MAX_LENGTH);
        updateCharCounter(descriptionInput, descriptionCounter, DESCRIPTION_MAX_LENGTH);

        // Show draft notice
        draftNotice?.classList.remove('d-none');
    }

    clearDraftBtn?.addEventListener('click', () => {
        if (window.feedbackService) {
            window.feedbackService.clearDraft();
        }
        form?.reset();
        updateCharCounter(titleInput, titleCounter, TITLE_MAX_LENGTH);
        updateCharCounter(descriptionInput, descriptionCounter, DESCRIPTION_MAX_LENGTH);
        draftNotice?.classList.add('d-none');
    });

    function getFormData() {
        const type = typeSelect?.value || 'general';
        const prioritySelect = offcanvasElement.querySelector('#feedbackPriority');

        return {
            type,
            title: titleInput?.value || '',
            description: descriptionInput?.value || '',
            priority: type === 'bug' ? (prioritySelect?.value || 'medium') : null,
            contactMe: contactCheckbox?.checked || false
        };
    }

    // Submit handler
    submitBtn?.addEventListener('click', handleSubmit);
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit();
    });

    async function handleSubmit() {
        if (!window.feedbackService) {
            showError('Feedback service not available');
            return;
        }

        hideMessages();

        const formData = getFormData();

        // Disable button
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting...';

        try {
            const result = await window.feedbackService.submitFeedback(formData);

            if (result.success) {
                showSuccess(result.message);
                resetForm();

                // Dispatch event
                window.dispatchEvent(new CustomEvent('feedbackSubmitted', {
                    detail: { id: result.id, type: formData.type }
                }));

                // Switch to vote tab and highlight new item
                setTimeout(() => {
                    voteTab?.click();

                    // Set type filter to match submitted type
                    typePills.forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.type === formData.type);
                    });
                    currentType = formData.type;

                    // Reload and highlight
                    loadFeedback(formData.type).then(() => {
                        const newItem = feedbackList.querySelector(`[data-id="${result.id}"]`);
                        if (newItem) {
                            newItem.classList.add('highlight');
                            newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                }, 1500);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError(error.message || 'An unexpected error occurred');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    }

    function showError(message) {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('d-none');
        }
    }

    function showSuccess(message) {
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.classList.remove('d-none');
        }
    }

    function hideMessages() {
        errorDiv?.classList.add('d-none');
        successDiv?.classList.add('d-none');
    }

    function resetForm() {
        form?.reset();
        updateCharCounter(titleInput, titleCounter, TITLE_MAX_LENGTH);
        updateCharCounter(descriptionInput, descriptionCounter, DESCRIPTION_MAX_LENGTH);
        priorityField?.classList.add('d-none');
        draftNotice?.classList.add('d-none');

        if (window.feedbackService) {
            window.feedbackService.clearDraft();
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    // Initial load
    updateLoginPrompt();
    updateContactInfo();
    loadDraft();

    // Load initial feedback
    if (config.defaultTab === 'vote') {
        loadFeedback(currentType);
    }

    // Load all counts in background
    ['feature', 'bug', 'general'].forEach(async type => {
        if (type !== currentType) {
            try {
                const items = await window.feedbackVotingService?.loadPublicFeedback(type);
                if (items) {
                    updateCountBadge(type, items.length);
                }
            } catch (e) {
                // Ignore errors for background loading
            }
        }
    });

    // Listen for new feedback submissions
    window.addEventListener('feedbackSubmitted', (e) => {
        const { type } = e.detail || {};
        if (type === currentType) {
            loadFeedback(currentType);
        }
    });

    // Cleanup on close
    offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
        clearTimeout(autoSaveTimeout);
        clearTimeout(searchTimeout);
    });
}

console.log('📦 Offcanvas Feedback module loaded');
