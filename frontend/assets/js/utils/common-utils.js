/**
 * Ghost Gym - Common Utility Functions
 * Shared utilities used across the application
 * Consolidates duplicate code from multiple modules
 * @version 1.0.0
 */

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML-safe text
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Format date for display with relative time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Show alert message with auto-dismiss
 * @param {string} message - Alert message to display
 * @param {string} type - Alert type: 'success', 'danger', 'warning', 'info'
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 */
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.warn('Alert container not found, using console instead:', message);
        return;
    }
    
    const alertId = 'alert-' + Date.now();
    const iconMap = {
        success: 'check-circle',
        danger: 'error',
        warning: 'error-circle',
        info: 'info-circle'
    };
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            <i class="bx bx-${iconMap[type] || 'info-circle'} me-2"></i>
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }
}

/**
 * Show/hide global loading state
 * @param {boolean} show - Whether to show or hide loading state
 */
function showLoading(show) {
    if (window.ghostGym) {
        window.ghostGym.isLoading = show;
    }
    
    // Update UI to show loading state
    const loadingElements = document.querySelectorAll('.loading-overlay');
    loadingElements.forEach(el => {
        el.style.display = show ? 'flex' : 'none';
    });
}

/**
 * Get API URL with proper base path
 * Ensures HTTPS in production
 * @param {string} path - API endpoint path
 * @returns {string} Full API URL
 */
function getApiUrl(path) {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    // Use current protocol and hostname
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    let baseUrl = `${protocol}//${hostname}`;
    
    // Only add port if it exists and is not standard (443 for HTTPS, 80 for HTTP)
    if (port && port !== '' && port !== '443' && port !== '80') {
        baseUrl += `:${port}`;
    }
    
    return `${baseUrl}${path}`;
}

/**
 * Deep clone an object (simple implementation)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated() {
    return !!(window.firebaseAuth?.currentUser || window.authService?.isUserAuthenticated?.());
}

/**
 * Get current user ID
 * @returns {string|null} User ID or null if not authenticated
 */
function getCurrentUserId() {
    if (window.firebaseAuth?.currentUser) {
        return window.firebaseAuth.currentUser.uid;
    }
    if (window.authService?.getCurrentUser) {
        const user = window.authService.getCurrentUser();
        return user?.uid || null;
    }
    return null;
}

// Make all functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.formatDate = formatDate;
    window.debounce = debounce;
    window.truncateText = truncateText;
    window.showAlert = showAlert;
    window.showLoading = showLoading;
    window.getApiUrl = getApiUrl;
    window.deepClone = deepClone;
    window.generateId = generateId;
    window.isAuthenticated = isAuthenticated;
    window.getCurrentUserId = getCurrentUserId;
}

// Export for module usage (if needed in future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        formatDate,
        debounce,
        truncateText,
        showAlert,
        showLoading,
        getApiUrl,
        deepClone,
        generateId,
        isAuthenticated,
        getCurrentUserId
    };
}

console.log('📦 Common utilities loaded');