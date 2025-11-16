/**
 * Toast Notification System
 * Bootstrap-based toast notifications following Sneat design patterns
 * @version 1.0.0
 */

(function() {
    'use strict';

    /**
     * Toast container - created once and reused
     */
    let toastContainer = null;

    /**
     * Initialize toast container
     */
    function initToastContainer() {
        if (toastContainer) return;

        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @param {string} options.message - Toast message
     * @param {string} options.type - Toast type: 'success', 'danger', 'warning', 'info', 'primary'
     * @param {string} options.title - Toast title (optional)
     * @param {number} options.delay - Auto-hide delay in ms (default: 3000)
     * @param {string} options.icon - Boxicon class (optional, auto-selected based on type)
     */
    function showToast(options) {
        // Initialize container if needed
        initToastContainer();

        // Default options
        const defaults = {
            message: '',
            type: 'info',
            title: '',
            delay: 3000,
            icon: null
        };

        const config = { ...defaults, ...options };

        // Auto-select icon based on type
        if (!config.icon) {
            const iconMap = {
                'success': 'bx-check-circle',
                'danger': 'bx-x-circle',
                'warning': 'bx-error',
                'info': 'bx-info-circle',
                'primary': 'bx-bell'
            };
            config.icon = iconMap[config.type] || 'bx-bell';
        }

        // Auto-select title based on type if not provided
        if (!config.title) {
            const titleMap = {
                'success': 'Success',
                'danger': 'Error',
                'warning': 'Warning',
                'info': 'Info',
                'primary': 'Notification'
            };
            config.title = titleMap[config.type] || 'Notification';
        }

        // Create toast element
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const toastHtml = `
            <div id="${toastId}" class="bs-toast toast fade bg-${config.type}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${config.delay}">
                <div class="toast-header">
                    <i class="bx ${config.icon} me-2"></i>
                    <div class="me-auto fw-medium">${config.title}</div>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${config.message}
                </div>
            </div>
        `;

        // Add toast to container
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        // Get toast element and initialize Bootstrap toast
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: config.delay
        });

        // Show toast
        bsToast.show();

        // Remove from DOM after hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });

        return bsToast;
    }

    /**
     * Convenience methods for common toast types
     */
    const toastNotifications = {
        success: (message, title = 'Success') => showToast({ message, type: 'success', title }),
        error: (message, title = 'Error') => showToast({ message, type: 'danger', title }),
        warning: (message, title = 'Warning') => showToast({ message, type: 'warning', title }),
        info: (message, title = 'Info') => showToast({ message, type: 'info', title }),
        
        // Specific for save operations
        saving: () => showToast({ 
            message: 'Saving your changes...', 
            type: 'info', 
            title: 'Saving',
            icon: 'bx-loader-alt bx-spin',
            delay: 2000
        }),
        
        saved: () => showToast({ 
            message: 'Your changes have been saved successfully!', 
            type: 'success', 
            title: 'Saved',
            delay: 2000
        }),
        
        saveFailed: (error) => showToast({ 
            message: error || 'Failed to save changes. Please try again.', 
            type: 'danger', 
            title: 'Save Failed',
            delay: 4000
        })
    };

    // Make available globally
    window.toastNotifications = toastNotifications;
    window.showToast = showToast;

    console.log('✅ Toast notification system loaded');
})();