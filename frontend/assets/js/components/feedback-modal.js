/**
 * Feedback Modal Component
 * Handles the feedback form UI and interactions
 * @version 1.0.0
 */

(function() {
    'use strict';

    class FeedbackModal {
        constructor() {
            this.modal = null;
            this.modalElement = null;
            this.form = null;
            this.autoSaveInterval = null;
            this.AUTO_SAVE_DELAY = 2000; // 2 seconds
            
            this.init();
        }

        /**
         * Initialize the feedback modal
         */
        init() {
            // Create modal HTML
            this.createModalHTML();
            
            // Get modal element
            this.modalElement = document.getElementById('feedbackModal');
            if (!this.modalElement) {
                console.error('❌ Feedback modal element not found');
                return;
            }

            // Initialize Bootstrap modal
            this.modal = new bootstrap.Modal(this.modalElement);
            
            // Get form element
            this.form = document.getElementById('feedbackForm');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load draft if exists
            this.loadDraft();
            
            console.log('✅ Feedback Modal initialized');
        }

        /**
         * Create modal HTML and inject into page
         */
        createModalHTML() {
            const modalHTML = `
                <!-- Feedback Modal -->
                <div class="modal fade" id="feedbackModal" tabindex="-1" aria-labelledby="feedbackModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="feedbackModalLabel">
                                    <i class="bx bx-message-dots me-2"></i>
                                    Send Feedback
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="feedbackForm">
                                    <!-- Feedback Type -->
                                    <div class="mb-3">
                                        <label class="form-label">Feedback Type <span class="text-danger">*</span></label>
                                        <div class="d-flex gap-2 flex-wrap">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="feedbackType" id="typeGeneral" value="general" checked>
                                                <label class="form-check-label" for="typeGeneral">
                                                    💡 General
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="feedbackType" id="typeBug" value="bug">
                                                <label class="form-check-label" for="typeBug">
                                                    🐛 Bug Report
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="feedbackType" id="typeFeature" value="feature">
                                                <label class="form-check-label" for="typeFeature">
                                                    ✨ Feature Request
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Priority (shown only for bug reports) -->
                                    <div class="mb-3" id="priorityField" style="display: none;">
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
                                        <input 
                                            type="text" 
                                            class="form-control" 
                                            id="feedbackTitle" 
                                            placeholder="Brief description of your feedback"
                                            maxlength="100"
                                            required
                                        >
                                        <div class="d-flex justify-content-between">
                                            <div class="form-text">Minimum 3 characters</div>
                                            <small class="text-muted" id="titleCounter">0/100</small>
                                        </div>
                                    </div>

                                    <!-- Description -->
                                    <div class="mb-3">
                                        <label for="feedbackDescription" class="form-label">
                                            Description <span class="text-danger">*</span>
                                        </label>
                                        <textarea 
                                            class="form-control" 
                                            id="feedbackDescription" 
                                            rows="5"
                                            placeholder="Please provide details..."
                                            maxlength="1000"
                                            required
                                        ></textarea>
                                        <div class="d-flex justify-content-between">
                                            <div class="form-text">Minimum 10 characters</div>
                                            <small class="text-muted" id="descriptionCounter">0/1000</small>
                                        </div>
                                    </div>

                                    <!-- Contact Me -->
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="feedbackContact">
                                            <label class="form-check-label" for="feedbackContact">
                                                I'd like to be contacted about this feedback
                                            </label>
                                        </div>
                                        <div class="form-text" id="contactInfo"></div>
                                    </div>

                                    <!-- Draft Notice -->
                                    <div class="alert alert-info d-none" id="draftNotice">
                                        <i class="bx bx-info-circle me-1"></i>
                                        <small>Draft restored from previous session</small>
                                    </div>

                                    <!-- Error Messages -->
                                    <div class="alert alert-danger d-none" id="feedbackError" role="alert"></div>

                                    <!-- Success Message -->
                                    <div class="alert alert-success d-none" id="feedbackSuccess" role="alert"></div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="submitFeedbackBtn">
                                    <i class="bx bx-send me-1"></i>
                                    Submit Feedback
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Inject modal into body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        /**
         * Set up event listeners
         */
        setupEventListeners() {
            // Type change - show/hide priority field
            const typeRadios = document.querySelectorAll('input[name="feedbackType"]');
            typeRadios.forEach(radio => {
                radio.addEventListener('change', () => this.handleTypeChange());
            });

            // Character counters
            const titleInput = document.getElementById('feedbackTitle');
            const descriptionInput = document.getElementById('feedbackDescription');
            
            titleInput.addEventListener('input', () => this.updateCharCounter('title'));
            descriptionInput.addEventListener('input', () => this.updateCharCounter('description'));

            // Auto-save on input
            titleInput.addEventListener('input', () => this.scheduleAutoSave());
            descriptionInput.addEventListener('input', () => this.scheduleAutoSave());
            typeRadios.forEach(radio => {
                radio.addEventListener('change', () => this.scheduleAutoSave());
            });

            // Submit button
            const submitBtn = document.getElementById('submitFeedbackBtn');
            submitBtn.addEventListener('click', () => this.handleSubmit());

            // Form submit (Enter key)
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });

            // Modal events
            this.modalElement.addEventListener('shown.bs.modal', () => this.onModalShown());
            this.modalElement.addEventListener('hidden.bs.modal', () => this.onModalHidden());

            // Update contact info when modal opens
            this.modalElement.addEventListener('show.bs.modal', () => this.updateContactInfo());
        }

        /**
         * Handle feedback type change
         */
        handleTypeChange() {
            const selectedType = document.querySelector('input[name="feedbackType"]:checked').value;
            const priorityField = document.getElementById('priorityField');
            
            // Show priority field only for bug reports
            if (selectedType === 'bug') {
                priorityField.style.display = 'block';
            } else {
                priorityField.style.display = 'none';
            }
        }

        /**
         * Update character counter
         */
        updateCharCounter(field) {
            if (field === 'title') {
                const input = document.getElementById('feedbackTitle');
                const counter = document.getElementById('titleCounter');
                counter.textContent = `${input.value.length}/100`;
            } else if (field === 'description') {
                const input = document.getElementById('feedbackDescription');
                const counter = document.getElementById('descriptionCounter');
                counter.textContent = `${input.value.length}/1000`;
            }
        }

        /**
         * Schedule auto-save
         */
        scheduleAutoSave() {
            clearTimeout(this.autoSaveInterval);
            this.autoSaveInterval = setTimeout(() => {
                this.saveDraft();
            }, this.AUTO_SAVE_DELAY);
        }

        /**
         * Save draft
         */
        saveDraft() {
            if (!window.feedbackService) return;

            const formData = this.getFormData();
            window.feedbackService.saveDraft(formData);
        }

        /**
         * Load draft
         */
        loadDraft() {
            if (!window.feedbackService) return;

            const draft = window.feedbackService.loadDraft();
            if (!draft) return;

            // Populate form with draft data
            document.getElementById('feedbackTitle').value = draft.title || '';
            document.getElementById('feedbackDescription').value = draft.description || '';
            
            if (draft.type) {
                const typeRadio = document.getElementById(`type${draft.type.charAt(0).toUpperCase() + draft.type.slice(1)}`);
                if (typeRadio) typeRadio.checked = true;
            }
            
            if (draft.priority) {
                document.getElementById('feedbackPriority').value = draft.priority;
            }
            
            if (draft.contactMe) {
                document.getElementById('feedbackContact').checked = draft.contactMe;
            }

            // Update UI
            this.handleTypeChange();
            this.updateCharCounter('title');
            this.updateCharCounter('description');

            // Show draft notice
            document.getElementById('draftNotice').classList.remove('d-none');
        }

        /**
         * Get form data
         */
        getFormData() {
            const type = document.querySelector('input[name="feedbackType"]:checked').value;
            const title = document.getElementById('feedbackTitle').value;
            const description = document.getElementById('feedbackDescription').value;
            const priority = type === 'bug' ? document.getElementById('feedbackPriority').value : null;
            const contactMe = document.getElementById('feedbackContact').checked;

            return {
                type,
                title,
                description,
                priority,
                contactMe
            };
        }

        /**
         * Handle form submission
         */
        async handleSubmit() {
            if (!window.feedbackService) {
                this.showError('Feedback service not available');
                return;
            }

            // Hide previous messages
            this.hideMessages();

            // Get form data
            const formData = this.getFormData();

            // Disable submit button
            const submitBtn = document.getElementById('submitFeedbackBtn');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting...';

            try {
                // Submit feedback
                const result = await window.feedbackService.submitFeedback(formData);

                if (result.success) {
                    this.showSuccess(result.message);
                    this.resetForm();
                    
                    // Close modal after 2 seconds
                    setTimeout(() => {
                        this.modal.hide();
                    }, 2000);
                } else {
                    this.showError(result.error);
                }
            } catch (error) {
                this.showError(error.message || 'An unexpected error occurred');
            } finally {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        }

        /**
         * Show error message
         */
        showError(message) {
            const errorDiv = document.getElementById('feedbackError');
            errorDiv.textContent = message;
            errorDiv.classList.remove('d-none');
        }

        /**
         * Show success message
         */
        showSuccess(message) {
            const successDiv = document.getElementById('feedbackSuccess');
            successDiv.textContent = message;
            successDiv.classList.remove('d-none');
        }

        /**
         * Hide all messages
         */
        hideMessages() {
            document.getElementById('feedbackError').classList.add('d-none');
            document.getElementById('feedbackSuccess').classList.add('d-none');
            document.getElementById('draftNotice').classList.add('d-none');
        }

        /**
         * Reset form
         */
        resetForm() {
            this.form.reset();
            this.updateCharCounter('title');
            this.updateCharCounter('description');
            this.handleTypeChange();
            
            // Clear draft
            if (window.feedbackService) {
                window.feedbackService.clearDraft();
            }
        }

        /**
         * Update contact info text
         */
        updateContactInfo() {
            const contactInfo = document.getElementById('contactInfo');
            const contactCheckbox = document.getElementById('feedbackContact');
            
            if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                const email = window.firebaseAuth.currentUser.email;
                contactInfo.textContent = `We'll contact you at: ${email}`;
                contactCheckbox.checked = true;
            } else {
                contactInfo.textContent = 'Sign in to enable email notifications';
                contactCheckbox.checked = false;
                contactCheckbox.disabled = true;
            }
        }

        /**
         * Modal shown event
         */
        onModalShown() {
            // Focus on title input
            document.getElementById('feedbackTitle').focus();
        }

        /**
         * Modal hidden event
         */
        onModalHidden() {
            // Clear auto-save interval
            clearTimeout(this.autoSaveInterval);
            
            // Hide messages
            this.hideMessages();
        }

        /**
         * Open modal
         */
        open() {
            if (this.modal) {
                this.modal.show();
            }
        }

        /**
         * Close modal
         */
        close() {
            if (this.modal) {
                this.modal.hide();
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.feedbackModal = new FeedbackModal();
        });
    } else {
        window.feedbackModal = new FeedbackModal();
    }

    // Export for module use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FeedbackModal;
    }

    console.log('✅ Feedback Modal component loaded');
})();