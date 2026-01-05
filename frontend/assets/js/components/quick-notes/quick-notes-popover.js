/**
 * Ghost Gym - Quick Notes Popover Component
 * Reusable popover for inline note-taking
 * @version 1.0.0
 * @date 2026-01-05
 */

class QuickNotesPopover {
    /**
     * Create a Quick Notes Popover
     * @param {HTMLElement} triggerElement - The button that triggers the popover
     * @param {Object} options - Configuration options
     * @param {string} options.type - Preset type or 'custom'
     * @param {string} options.entityId - What this note is for (e.g., exercise name)
     * @param {string} options.currentValue - Current selected value
     * @param {Function} options.onAction - Callback when action is taken
     * @param {Function} options.onClose - Callback when popover closes
     */
    constructor(triggerElement, options = {}) {
        this.trigger = triggerElement;
        this.currentValue = options.currentValue || null;
        
        // Load preset configuration if type is specified
        const preset = options.type && window.QuickNotesPresets
            ? window.QuickNotesPresets[options.type]
            : {};
        
        // Merge preset with custom options
        this.options = {
            type: 'custom',
            title: 'Quick Notes',
            entityId: null,
            entityType: 'exercise',
            placement: 'bottom',
            actions: [],
            showTextInput: false,
            textInputPlaceholder: 'Add a note...',
            onAction: null,
            onClose: null,
            ...preset,
            ...options
        };
        
        this.popoverInstance = null;
        this.isVisible = false;
        
        console.log('📝 Quick Notes Popover created for:', this.options.entityId);
        
        // Initialize the popover
        this.init();
    }
    
    /**
     * Initialize the Bootstrap popover
     */
    init() {
        if (!this.trigger) {
            console.error('❌ No trigger element provided');
            return;
        }
        
        // Create popover content
        const content = this._createPopoverContent();
        
        // Initialize Bootstrap 5 Popover
        this.popoverInstance = new window.bootstrap.Popover(this.trigger, {
            html: true,
            content: content,
            placement: this.options.placement,
            trigger: 'manual', // We'll control show/hide manually
            sanitize: false, // We control the HTML
            customClass: 'quick-notes-popover-container'
        });
        
        console.log('✅ Popover initialized');
    }
    
    /**
     * Create the HTML content for the popover
     * @returns {string} HTML content
     * @private
     */
    _createPopoverContent() {
        const actionsHtml = this.options.actions.map(action => {
            const isActive = this.currentValue === action.id;
            const activeClass = isActive ? 'active' : '';
            
            return `
                <button class="btn btn-outline-${action.color} quick-notes-action ${activeClass}"
                        data-action="${action.id}"
                        type="button">
                    ${action.icon ? `<i class="bx ${action.icon} me-1"></i>` : ''}${action.label}
                </button>
            `;
        }).join('');
        
        const textInputHtml = this.options.showTextInput ? `
            <div class="quick-notes-text-section" style="display: none;">
                <textarea class="form-control quick-notes-textarea" 
                          placeholder="${this.options.textInputPlaceholder}"></textarea>
                <button class="btn btn-sm btn-primary quick-notes-save-text" type="button">
                    Save
                </button>
            </div>
        ` : '';
        
        // Always show header with close button, title is optional
        const titleHtml = this.options.title ? `<span class="quick-notes-title">${this.options.title}</span>` : '';
        
        return `
            <div class="quick-notes-popover">
                <div class="quick-notes-header">
                    ${titleHtml}
                    <button class="quick-notes-close" type="button" aria-label="Close">
                        <i class="bx bx-x"></i>
                    </button>
                </div>
                <div class="quick-notes-body">
                    <div class="quick-notes-actions">
                        ${actionsHtml}
                    </div>
                    ${textInputHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Show the popover
     */
    show() {
        if (!this.popoverInstance) {
            console.error('❌ Popover not initialized');
            return;
        }
        
        // Show the popover
        this.popoverInstance.show();
        this.isVisible = true;
        
        // Bind events after popover is shown
        setTimeout(() => {
            this._bindEvents();
        }, 50);
        
        console.log('👁️ Popover shown');
    }
    
    /**
     * Hide the popover
     */
    hide() {
        if (!this.popoverInstance) {
            return;
        }
        
        this.popoverInstance.hide();
        this.isVisible = false;
        
        // Call onClose callback if provided
        if (this.options.onClose) {
            this.options.onClose();
        }
        
        console.log('👁️ Popover hidden');
        
        // Cleanup - destroy the popover instance after hiding
        setTimeout(() => {
            this.destroy();
        }, 300);
    }
    
    /**
     * Bind event handlers to popover elements
     * @private
     */
    _bindEvents() {
        // Get the popover element
        const popoverEl = document.querySelector('.quick-notes-popover');
        if (!popoverEl) {
            console.warn('⚠️ Popover element not found');
            return;
        }
        
        // Close button
        const closeBtn = popoverEl.querySelector('.quick-notes-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Action buttons
        const actionButtons = popoverEl.querySelectorAll('.quick-notes-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.getAttribute('data-action');
                this._handleAction(action);
            });
        });
        
        // Click outside to close
        setTimeout(() => {
            document.addEventListener('click', this._handleOutsideClick.bind(this), {
                once: true,
                capture: true
            });
        }, 100);
        
        console.log('🔗 Events bound');
    }
    
    /**
     * Handle action button click
     * @param {string} action - Action ID
     * @private
     */
    _handleAction(action) {
        console.log('🎯 Action triggered:', action);
        
        // Fire callback if provided
        if (this.options.onAction) {
            this.options.onAction(action, {
                noteType: this.options.type,
                entityId: this.options.entityId,
                entityType: this.options.entityType,
                previousValue: this.currentValue
            });
        }
        
        // Hide the popover
        this.hide();
    }
    
    /**
     * Handle clicks outside the popover
     * @param {Event} event - Click event
     * @private
     */
    _handleOutsideClick(event) {
        const popoverEl = document.querySelector('.quick-notes-popover');
        
        // Check if click is outside popover and trigger
        if (popoverEl && 
            !popoverEl.contains(event.target) &&
            !this.trigger.contains(event.target)) {
            this.hide();
        }
    }
    
    /**
     * Set the current value
     * @param {*} value - New value
     */
    setValue(value) {
        this.currentValue = value;
    }
    
    /**
     * Get the current value
     * @returns {*} Current value
     */
    getValue() {
        return this.currentValue;
    }
    
    /**
     * Update the trigger button state based on whether a value is set
     * @param {boolean} hasValue - Whether a value is set
     */
    updateTriggerState(hasValue) {
        if (!this.trigger) return;
        
        const icon = this.trigger.querySelector('i');
        
        if (hasValue) {
            this.trigger.classList.add('has-note');
            if (icon && this.options.iconFilled) {
                icon.className = `bx ${this.options.iconFilled}`;
                if (this.options.iconColorFilled) {
                    icon.classList.add(this.options.iconColorFilled);
                }
            }
        } else {
            this.trigger.classList.remove('has-note');
            if (icon && this.options.iconEmpty) {
                icon.className = `bx ${this.options.iconEmpty}`;
            }
        }
    }
    
    /**
     * Destroy the popover instance and cleanup
     */
    destroy() {
        if (this.popoverInstance) {
            this.popoverInstance.dispose();
            this.popoverInstance = null;
        }
        
        this.isVisible = false;
        console.log('🧹 Popover destroyed');
    }
}

// Export globally
window.QuickNotesPopover = QuickNotesPopover;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuickNotesPopover;
}

console.log('📦 Quick Notes Popover component loaded');
