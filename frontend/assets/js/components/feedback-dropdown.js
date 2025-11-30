/**
 * Feedback Dropdown Component
 * Handles the feedback form UI and interactions in a dropdown menu
 * @version 2.0.0 (converted from modal to dropdown)
 */

(function() {
    'use strict';

    class FeedbackDropdown {
        constructor() {
            this.dropdown = null;
            this.dropdownElement = null;
            this.form = null;
            this.autoSaveInterval = null;
            this.AUTO_SAVE_DELAY = 2000; // 2 seconds
            
            this.init();
        }

        /**
         * Initialize the feedback dropdown
         */
        async init() {
            console.log('🚀 Initializing Feedback Dropdown...');
            
            // Wait for navbar to be ready
            await this.waitForNavbar();
            
            // Inject dropdown content
            this.injectDropdownContent();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load draft if exists
            this.loadDraft();
            
            console.log('✅ Feedback Dropdown initialized');
        }

        /**
         * Wait for navbar dropdown element to be available
         */
        async waitForNavbar() {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    const dropdown = document.getElementById('feedbackDropdown');
                    if (dropdown) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    console.warn('⚠️ Feedback dropdown element not found after 10s');
                    resolve();
                }, 10000);
            });
        }

        /**
         * Inject dropdown content into the navbar dropdown menu
         */
        injectDropdownContent() {
            const dropdownMenu = document.getElementById('feedbackDropdown');
            if (!dropdownMenu) {
                console.error('❌ Feedback dropdown element not found');
                return;
            }

            dropdownMenu.innerHTML = this.getDropdownHTML();
            
            // Get references
            this.dropdownElement = dropdownMenu;
            this.form = document.getElementById('feedbackForm');
            
            // Get Bootstrap dropdown instance
            const triggerBtn = document.getElementById('navbarFeedbackBtn');
            if (triggerBtn) {
                this.dropdown = bootstrap.Dropdown.getInstance(triggerBtn) || new bootstrap.Dropdown(triggerBtn);
            }
        }

        /**
         * Generate dropdown HTML content
         */
        getDropdownHTML() {
            return `
                <!-- Header -->
                <div class="feedback-dropdown-header">
                    <h5>
                        <i class="bx bx-message-dots me-2"></i>
                        Send Feedback
                    </h5>
                </div>
                
                <!-- Body -->
                <div class="feedback-dropdown-body">
                    <form id="feedbackForm">
                        <!-- Feedback Type -->
                        <div class="mb-3">
                            <label for="feedbackType" class="form-label">
                                Feedback Type <span class="text-danger">*</span>
                            </label>
                            <select class="form-select form-select-sm" id="feedbackType" name="feedbackType" required>
                                <option value="general" selected>💡 General</option>
                                <option value="bug">🐛 Bug Report</option>
                                <option value="feature">✨ Feature Request</option>
                            </select>
                        </div>

                        <!-- Priority (for bugs) -->
                        <div class="mb-3 d-none" id="priorityField">
                            <label for="feedbackPriority" class="form-label">Priority</label>
                            <select class="form-select form-select-sm" id="feedbackPriority">
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
                                   class="form-control form-control-sm" 
                                   id="feedbackTitle" 
                                   placeholder="Brief description of your feedback"
                                   maxlength="100"
                                   required>
                            <div class="d-flex justify-content-between mt-1">
                                <small class="text-muted">Minimum 3 characters</small>
                                <small class="feedback-char-counter" id="titleCounter">0/100</small>
                            </div>
                        </div>

                        <!-- Description -->
                        <div class="mb-3">
                            <label for="feedbackDescription" class="form-label">
                                Description <span class="text-danger">*</span>
                            </label>
                            <textarea class="form-control form-control-sm" 
                                      id="feedbackDescription" 
                                      rows="4"
                                      placeholder="Please provide details..."
                                      maxlength="1000"
                                      required></textarea>
                            <div class="d-flex justify-content-between mt-1">
                                <small class="text-muted">Minimum 10 characters</small>
                                <small class="feedback-char-counter" id="descriptionCounter">0/1000</small>
                            </div>
                        </div>

                        <!-- Contact Me -->
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                       id="feedbackContact">
                                <label class="form-check-label" for="feedbackContact">
                                    I'd like to be contacted about this feedback
                                </label>
                            </div>
                            <small class="text-muted d-block mt-1" id="contactInfo"></small>
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
                
                <!-- Footer -->
                <div class="feedback-dropdown-footer">
                    <button type="button" class="btn btn-sm btn-secondary" 
                            id="cancelFeedbackBtn">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" 
                            id="submitFeedbackBtn">
                        <i class="bx bx-send me-1"></i>
                        Submit Feedback
                    </button>
                </div>
            `;
        }

        /**
         * Set up event listeners
         */
        setupEventListeners() {
            // Type change - show/hide priority field
            const typeSelect = document.getElementById('feedbackType');
            if (typeSelect) {
                typeSelect.addEventListener('change', () => this.handleTypeChange());
            }

            // Character counters
            const titleInput = document.getElementById('feedbackTitle');
            const descriptionInput = document.getElementById('feedbackDescription');
            
            if (titleInput) {
                titleInput.addEventListener('input', () => this.updateCharCounter('title'));
            }
            if (descriptionInput) {
                descriptionInput.addEventListener('input', () => this.updateCharCounter('description'));
            }

            // Auto-save on input
            if (titleInput) {
                titleInput.addEventListener('input', () => this.scheduleAutoSave());
            }
            if (descriptionInput) {
                descriptionInput.addEventListener('input', () => this.scheduleAutoSave());
            }
            if (typeSelect) {
                typeSelect.addEventListener('change', () => this.scheduleAutoSave());
            }

            // Cancel button
            const cancelBtn = document.getElementById('cancelFeedbackBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.close());
            }

            // Submit button
            const submitBtn = document.getElementById('submitFeedbackBtn');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => this.handleSubmit());
            }

            // Form submit (Enter key)
            if (this.form) {
                this.form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSubmit();
                });
            }

            // Dropdown events
            const triggerBtn = document.getElementById('navbarFeedbackBtn');
            if (triggerBtn) {
                triggerBtn.addEventListener('shown.bs.dropdown', () => this.onDropdownShown());
                triggerBtn.addEventListener('hidden.bs.dropdown', () => this.onDropdownHidden());
                triggerBtn.addEventListener('show.bs.dropdown', () => this.updateContactInfo());
            }
        }

        /**
         * Handle feedback type change
         */
        handleTypeChange() {
            const typeSelect = document.getElementById('feedbackType');
            const selectedType = typeSelect?.value;
            const priorityField = document.getElementById('priorityField');
            
            if (!priorityField) return;
            
            // Show priority field only for bug reports
            if (selectedType === 'bug') {
                priorityField.classList.remove('d-none');
            } else {
                priorityField.classList.add('d-none');
            }
        }

        /**
         * Update character counter
         */
        updateCharCounter(field) {
            if (field === 'title') {
                const input = document.getElementById('feedbackTitle');
                const counter = document.getElementById('titleCounter');
                if (input && counter) {
                    counter.textContent = `${input.value.length}/100`;
                }
            } else if (field === 'description') {
                const input = document.getElementById('feedbackDescription');
                const counter = document.getElementById('descriptionCounter');
                if (input && counter) {
                    counter.textContent = `${input.value.length}/1000`;
                }
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
            const titleInput = document.getElementById('feedbackTitle');
            const descriptionInput = document.getElementById('feedbackDescription');
            
            if (titleInput) titleInput.value = draft.title || '';
            if (descriptionInput) descriptionInput.value = draft.description || '';
            
            if (draft.type) {
                const typeSelect = document.getElementById('feedbackType');
                if (typeSelect) typeSelect.value = draft.type;
            }
            
            const prioritySelect = document.getElementById('feedbackPriority');
            if (draft.priority && prioritySelect) {
                prioritySelect.value = draft.priority;
            }
            
            const contactCheckbox = document.getElementById('feedbackContact');
            if (draft.contactMe && contactCheckbox) {
                contactCheckbox.checked = draft.contactMe;
            }

            // Update UI
            this.handleTypeChange();
            this.updateCharCounter('title');
            this.updateCharCounter('description');

            // Show draft notice
            const draftNotice = document.getElementById('draftNotice');
            if (draftNotice) {
                draftNotice.classList.remove('d-none');
            }
        }

        /**
         * Get form data
         */
        getFormData() {
            const typeSelect = document.getElementById('feedbackType');
            const type = typeSelect?.value || 'general';
            const titleInput = document.getElementById('feedbackTitle');
            const descriptionInput = document.getElementById('feedbackDescription');
            const prioritySelect = document.getElementById('feedbackPriority');
            const contactCheckbox = document.getElementById('feedbackContact');
            
            const title = titleInput?.value || '';
            const description = descriptionInput?.value || '';
            const priority = type === 'bug' ? (prioritySelect?.value || 'medium') : null;
            const contactMe = contactCheckbox?.checked || false;

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
            if (!submitBtn) return;
            
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting...';

            try {
                // Submit feedback
                const result = await window.feedbackService.submitFeedback(formData);

                if (result.success) {
                    this.showSuccess(result.message);
                    this.resetForm();
                    
                    // Close dropdown after 2 seconds
                    setTimeout(() => {
                        this.close();
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
            if (errorDiv) {
                errorDiv.textContent = message;
                errorDiv.classList.remove('d-none');
            }
        }

        /**
         * Show success message
         */
        showSuccess(message) {
            const successDiv = document.getElementById('feedbackSuccess');
            if (successDiv) {
                successDiv.textContent = message;
                successDiv.classList.remove('d-none');
            }
        }

        /**
         * Hide all messages
         */
        hideMessages() {
            const errorDiv = document.getElementById('feedbackError');
            const successDiv = document.getElementById('feedbackSuccess');
            const draftNotice = document.getElementById('draftNotice');
            
            if (errorDiv) errorDiv.classList.add('d-none');
            if (successDiv) successDiv.classList.add('d-none');
            if (draftNotice) draftNotice.classList.add('d-none');
        }

        /**
         * Reset form
         */
        resetForm() {
            if (this.form) {
                this.form.reset();
            }
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
            
            if (!contactInfo || !contactCheckbox) return;
            
            if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                const email = window.firebaseAuth.currentUser.email;
                contactInfo.textContent = `We'll contact you at: ${email}`;
                contactCheckbox.checked = true;
                contactCheckbox.disabled = false;
            } else {
                contactInfo.textContent = 'Sign in to enable email notifications';
                contactCheckbox.checked = false;
                contactCheckbox.disabled = true;
            }
        }

        /**
         * Dropdown shown event
         */
        onDropdownShown() {
            // Focus on title input
            const titleInput = document.getElementById('feedbackTitle');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }
        }

        /**
         * Dropdown hidden event
         */
        onDropdownHidden() {
            // Clear auto-save interval
            clearTimeout(this.autoSaveInterval);
            
            // Hide messages
            this.hideMessages();
        }

        /**
         * Open dropdown
         */
        open() {
            if (this.dropdown) {
                this.dropdown.show();
            }
        }

        /**
         * Close dropdown
         */
        close() {
            if (this.dropdown) {
                this.dropdown.hide();
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.feedbackDropdown = new FeedbackDropdown();
        });
    } else {
        window.feedbackDropdown = new FeedbackDropdown();
    }

    // Export for module use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FeedbackDropdown;
    }

    console.log('✅ Feedback Dropdown component loaded');
})();